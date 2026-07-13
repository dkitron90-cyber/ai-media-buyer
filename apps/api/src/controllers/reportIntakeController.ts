import type { NextFunction, Request, Response } from 'express';
import {
  autoParseReport,
  saveUploadedReport,
} from '../services/reportService';
import {
  inspectUploadedReportFile,
  splitStagedReportByCampaign,
  type AttachMapping,
} from '../services/reportIntakeService';
import { buildReportIntakeIntelligence } from '../services/reportIntakeIntelligenceService';
import { refreshCampaignState } from '../services/campaignRefreshService';
import { resolveCampaignTypeForCreate } from '../lib/inferCampaignType';
import type { ReportType } from '../lib/reportTypeCodes';

export const inspectReportIntakeHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded. Use multipart/form-data with a "file" field.',
      });
    }

    const rawClientId = req.query.clientId;
    const clientId =
      typeof rawClientId === 'string' && rawClientId.trim().length > 0
        ? Number(rawClientId)
        : undefined;

    const result = await inspectUploadedReportFile(
      req.file.path,
      req.file.originalname,
      Number.isFinite(clientId) ? clientId : undefined
    );

    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
};

interface LegacyAttachBody {
  stagingId?: string;
  fileName?: string;
  mappings?: AttachMapping[];
}

interface ImportMappingInput {
  detectedCampaignName?: string;
  existingCampaignId?: number;
  createNewCampaign?: boolean;
  campaignType?: string;
  skip?: boolean;
}

interface ImportBody {
  clientId?: number;
  stagingId?: string;
  fileName?: string;
  reportType?: string | null;
  mappings?: ImportMappingInput[];
}

export const attachReportIntakeHandler = async (
  req: Request<unknown, unknown, LegacyAttachBody | ImportBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { stagingId, fileName } = req.body;

    if (!stagingId || typeof stagingId !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid "stagingId" in request body.',
      });
    }

    // New client-scoped import payload (Phase 34): if clientId is present,
    // treat this as a client-level import that can create campaigns.
    if ('clientId' in req.body) {
      const body = req.body as ImportBody;
      const clientId = body.clientId;
      const mappings = body.mappings;

      if (!clientId || !Number.isInteger(clientId) || clientId <= 0) {
        return res.status(400).json({
          error: 'Missing or invalid "clientId" in request body.',
        });
      }

      if (!Array.isArray(mappings) || mappings.length === 0) {
        return res.status(400).json({
          error:
            'Missing or invalid "mappings" in request body. Provide at least one mapping entry.',
        });
      }

      // Build plan for each detected campaign: map to existing, create new, or skip.
      type Plan =
        | {
            kind: 'skip';
            detectedCampaignName: string;
          }
        | {
            kind: 'existing';
            detectedCampaignName: string;
            existingCampaignId: number;
          }
        | {
            kind: 'create';
            detectedCampaignName: string;
            campaignType?: string;
          };

      const plans: Plan[] = [];
      for (const m of mappings) {
        const name = (m.detectedCampaignName ?? '').trim();
        if (!name) continue;
        const skip = m.skip === true;
        const hasExisting =
          typeof m.existingCampaignId === 'number' &&
          Number.isInteger(m.existingCampaignId) &&
          m.existingCampaignId > 0;
        const wantsCreate = m.createNewCampaign === true;

        if (skip || (!hasExisting && !wantsCreate)) {
          plans.push({ kind: 'skip', detectedCampaignName: name });
        } else if (hasExisting && !wantsCreate) {
          plans.push({
            kind: 'existing',
            detectedCampaignName: name,
            existingCampaignId: m.existingCampaignId as number,
          });
        } else if (wantsCreate && !hasExisting) {
          plans.push({
            kind: 'create',
            detectedCampaignName: name,
            campaignType:
              typeof m.campaignType === 'string' && m.campaignType.trim().length > 0
                ? m.campaignType.trim()
                : undefined,
          });
        } else if (hasExisting && wantsCreate) {
          // Prefer explicit mapping over creation when both are set.
          plans.push({
            kind: 'existing',
            detectedCampaignName: name,
            existingCampaignId: m.existingCampaignId as number,
          });
        }
      }

      if (plans.length === 0) {
        return res.status(400).json({
          error:
            'No valid mapping instructions provided. Each entry must specify existingCampaignId, createNewCampaign, or skip.',
        });
      }

      // Load existing campaigns for this client and validate existingCampaignId values.
      const existingIds = Array.from(
        new Set(
          plans
            .filter((p): p is Extract<Plan, { kind: 'existing' }> => p.kind === 'existing')
            .map((p) => p.existingCampaignId)
        )
      );

      const existingCampaigns =
        existingIds.length > 0
          ? await (async () =>
              await (await import('../db/prisma')).prisma.campaign.findMany({
                where: {
                  id: { in: existingIds },
                  clientId,
                },
                select: { id: true, name: true, type: true },
              }))()
          : [];

      const existingById = new Map<
        number,
        { id: number; name: string; type: string }
      >(existingCampaigns.map((c) => [c.id, c]));

      const importReportType =
        typeof body.reportType === 'string' && body.reportType.trim().length > 0
          ? (body.reportType.trim() as ReportType)
          : null;

      // Create any new campaigns requested under this client.
      const createdByName = new Map<string, { id: number; name: string; type: string }>();
      for (const plan of plans) {
        if (plan.kind !== 'create') continue;
        const safeName = plan.detectedCampaignName;
        const campaignType = resolveCampaignTypeForCreate({
          reportType: importReportType,
          campaignName: safeName,
          override: plan.campaignType,
        });
        const created = await (await import('../db/prisma')).prisma.campaign.create({
          data: {
            clientId,
            name: safeName,
            type: campaignType,
            status: 'DRAFT',
          },
        });
        createdByName.set(safeName, {
          id: created.id,
          name: created.name,
          type: created.type,
        });
      }

      // Build attach mappings (campaignId-level) for all non-skipped, valid plans.
      const attachMappings: AttachMapping[] = [];
      type Summary = {
        detectedCampaignName: string;
        outcome: 'mapped_existing' | 'created_new' | 'skipped';
        campaignId: number | null;
        createdCampaignType?: string | null;
        uploadedReportId: number | null;
        autoParse:
          | (Awaited<ReturnType<typeof autoParseReport>> & { attempted: boolean })
          | null;
        warnings: string[];
      };
      const summaries: Summary[] = [];

      for (const plan of plans) {
        if (plan.kind === 'skip') {
          summaries.push({
            detectedCampaignName: plan.detectedCampaignName,
            outcome: 'skipped',
            campaignId: null,
            uploadedReportId: null,
            autoParse: null,
            warnings: [],
          });
          continue;
        }

        if (plan.kind === 'existing') {
          const existing = existingById.get(plan.existingCampaignId);
          if (!existing) {
            summaries.push({
              detectedCampaignName: plan.detectedCampaignName,
              outcome: 'mapped_existing',
              campaignId: null,
              uploadedReportId: null,
              autoParse: null,
              warnings: [
                `Existing campaign id ${plan.existingCampaignId.toString()} is not valid for this client.`,
              ],
            });
            continue;
          }
          attachMappings.push({
            campaignId: existing.id,
            campaignName: existing.name,
            sourceCampaignName: plan.detectedCampaignName,
          });
          summaries.push({
            detectedCampaignName: plan.detectedCampaignName,
            outcome: 'mapped_existing',
            campaignId: existing.id,
            uploadedReportId: null,
            autoParse: null,
            warnings: [],
          });
        } else if (plan.kind === 'create') {
          const created = createdByName.get(plan.detectedCampaignName);
          if (!created) {
            summaries.push({
              detectedCampaignName: plan.detectedCampaignName,
              outcome: 'created_new',
              campaignId: null,
              uploadedReportId: null,
              autoParse: null,
              warnings: ['Failed to create campaign for this name.'],
            });
            continue;
          }
          attachMappings.push({
            campaignId: created.id,
            campaignName: created.name,
            sourceCampaignName: plan.detectedCampaignName,
          });
          summaries.push({
            detectedCampaignName: plan.detectedCampaignName,
            outcome: 'created_new',
            campaignId: created.id,
            createdCampaignType: created.type,
            uploadedReportId: null,
            autoParse: null,
            warnings: [],
          });
        }
      }

      if (attachMappings.length === 0) {
        return res.status(200).json({
          results: summaries,
          note: 'No campaigns to import; all were skipped or invalid.',
        });
      }

      const splitResult = await splitStagedReportByCampaign(
        stagingId,
        attachMappings
      );

      // Now import per-campaign CSVs.
      const safeFileName =
        typeof fileName === 'string' && fileName.trim().length > 0
          ? fileName
          : stagingId;

      const importedByCampaignId = new Map<
        number,
        {
          uploadedReportId: number;
          autoParse: Awaited<ReturnType<typeof autoParseReport>>;
        }
      >();

      for (const [campaignId, info] of splitResult.byCampaign.entries()) {
        const uploaded = await saveUploadedReport({
          campaignId,
          fileName: safeFileName,
          filePath: info.filePath,
        });

        const autoParse = await autoParseReport(
          uploaded.id,
          uploaded.reportType
        );

        importedByCampaignId.set(campaignId, {
          uploadedReportId: uploaded.id,
          autoParse,
        });
      }

      // Non-blocking auto refresh after successful per-campaign parsing.
      for (const [campaignId, info] of importedByCampaignId.entries()) {
        if (info.autoParse?.success) {
          void refreshCampaignState(campaignId).catch(() => {});
        }
      }

      // Merge import info back into summaries.
      const finalSummaries = summaries.map((s) => {
        if (!s.campaignId) return s;
        const imported = importedByCampaignId.get(s.campaignId);
        if (!imported) {
          return {
            ...s,
            warnings: [
              ...s.warnings,
              'No rows in the staged report matched this campaign name.',
            ],
          };
        }
        return {
          ...s,
          uploadedReportId: imported.uploadedReportId,
          autoParse: imported.autoParse,
        };
      });

      return res.status(201).json({ results: finalSummaries });
    }

    // Legacy campaign-level attach: expect mappings as array of { campaignId }.
    const legacyBody = req.body as LegacyAttachBody;
    const legacyMappings = legacyBody.mappings;

    if (!Array.isArray(legacyMappings) || legacyMappings.length === 0) {
      return res.status(400).json({
        error:
          'Missing or invalid \"mappings\" in request body. Provide at least one campaign mapping.',
      });
    }

    const splitResult = await splitStagedReportByCampaign(
      stagingId,
      legacyMappings
    );

    const results: Array<{
      campaignId: number;
      uploadedReportId: number;
      autoParse: Awaited<ReturnType<typeof autoParseReport>>;
    }> = [];

    for (const [campaignId, info] of splitResult.byCampaign.entries()) {
      const safeFileName =
        typeof fileName === 'string' && fileName.trim().length > 0
          ? fileName
          : stagingId;

      const uploaded = await saveUploadedReport({
        campaignId,
        fileName: safeFileName,
        filePath: info.filePath,
      });

      const autoParse = await autoParseReport(
        uploaded.id,
        uploaded.reportType
      );

      results.push({
        campaignId,
        uploadedReportId: uploaded.id,
        autoParse,
      });
    }

    if (results.length === 0) {
      return res.status(400).json({
        error:
          'No rows in the staged report matched the selected campaign mappings.',
      });
    }

    for (const result of results) {
      if (result.autoParse?.success) {
        void refreshCampaignState(result.campaignId).catch(() => {});
      }
    }

    return res.status(201).json({ results });
  } catch (err) {
    return next(err);
  }
};

interface ReportIntakeIntelligenceBody {
  stagingId?: string;
  fileName?: string;
  clientId?: number;
  selectedCampaignId?: number;
  campaignMapping?: {
    existingCampaignId?: number;
  };
}

export const reportIntakeIntelligenceHandler = async (
  req: Request<unknown, unknown, ReportIntakeIntelligenceBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const stagingId = req.body.stagingId;
    if (!stagingId || typeof stagingId !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid "stagingId" in request body.',
      });
    }

    const fileName =
      typeof req.body.fileName === 'string' && req.body.fileName.trim().length > 0
        ? req.body.fileName
        : undefined;
    const clientId =
      typeof req.body.clientId === 'number' &&
      Number.isInteger(req.body.clientId) &&
      req.body.clientId > 0
        ? req.body.clientId
        : undefined;

    const selectedCampaignId =
      typeof req.body.selectedCampaignId === 'number' &&
      Number.isInteger(req.body.selectedCampaignId) &&
      req.body.selectedCampaignId > 0
        ? req.body.selectedCampaignId
        : typeof req.body.campaignMapping?.existingCampaignId === 'number' &&
            Number.isInteger(req.body.campaignMapping.existingCampaignId) &&
            req.body.campaignMapping.existingCampaignId > 0
          ? req.body.campaignMapping.existingCampaignId
          : undefined;

    const result = await buildReportIntakeIntelligence({
      stagingId,
      fileName,
      clientId,
      selectedCampaignId,
    });

    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
};

