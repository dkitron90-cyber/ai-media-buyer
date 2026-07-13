import fs from 'fs/promises';
import type { NextFunction, Request, Response } from 'express';
import { getCampaignById } from '../services/campaignService';
import {
  autoParseReport,
  getReportStatus,
  listUploadedReports,
  saveUploadedReport,
  getUploadedReportById,
  deleteUploadedReportById,
} from '../services/reportService';
import { refreshCampaignState } from '../services/campaignRefreshService';
import { getActiveReportsSummary } from '../services/activeReportService';

const sanitizeReportForClient = <T extends { filePath?: string }>(
  report: T
): Omit<T, 'filePath'> => {
  const { filePath: _filePath, ...rest } = report;
  return rest;
};

const parseCampaignId = (value: string): number | null => {
  const campaignId = Number(value);
  if (!Number.isInteger(campaignId) || campaignId <= 0) {
    return null;
  }
  return campaignId;
};

export const uploadCampaignReportHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = parseCampaignId(req.params.id);
    if (!campaignId) {
      return res.status(400).json({
        error: 'Invalid "id" parameter. It must be a positive integer.',
      });
    }

    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded. Use multipart/form-data with a "file" field.',
      });
    }

    try {
      const report = await saveUploadedReport({
        campaignId,
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileSizeBytes: req.file.size,
      });

      const parseResult = await autoParseReport(report.id, report.reportType);

      if (parseResult.attempted && parseResult.success) {
        const updated = await listUploadedReports(campaignId).then((reports) =>
          reports.find((r) => r.id === report.id)
        );
        // Best-effort AI refresh so downstream decision engine stays up to date.
        void refreshCampaignState(campaignId).catch(() => undefined);
        return res.status(201).json({
          ...sanitizeReportForClient(updated ?? report),
          autoParse: parseResult,
        });
      }

      return res.status(201).json({
        ...sanitizeReportForClient(report),
        autoParse: parseResult,
      });
    } catch (err) {
      await fs.unlink(req.file.path).catch(() => undefined);
      const message =
        err instanceof Error ? err.message : 'Could not process uploaded report.';
      return res.status(400).json({ error: message });
    }
  } catch (err) {
    return next(err);
  }
};

export const listCampaignReportsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = parseCampaignId(req.params.id);
    if (!campaignId) {
      return res.status(400).json({
        error: 'Invalid "id" parameter. It must be a positive integer.',
      });
    }

    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    const reports = await listUploadedReports(campaignId);
    return res.status(200).json(reports.map(sanitizeReportForClient));
  } catch (err) {
    return next(err);
  }
};

export const campaignReportStatusHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = parseCampaignId(req.params.id);
    if (!campaignId) {
      return res.status(400).json({
        error: 'Invalid "id" parameter. It must be a positive integer.',
      });
    }

    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    const status = await getReportStatus(campaignId, campaign.type);
    return res.status(200).json(status);
  } catch (err) {
    return next(err);
  }
};

export const activeReportsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = parseCampaignId(req.params.id);
    if (!campaignId) {
      return res.status(400).json({
        error: 'Invalid "id" parameter. It must be a positive integer.',
      });
    }

    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    const summary = await getActiveReportsSummary(campaignId);
    return res.status(200).json(summary);
  } catch (err) {
    return next(err);
  }
};

export const deleteCampaignReportHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = parseCampaignId(req.params.id);
    if (!campaignId) {
      return res.status(400).json({
        error: 'Invalid \"id\" parameter. It must be a positive integer.',
      });
    }

    const reportId = Number(req.params.reportId);
    if (!Number.isInteger(reportId) || reportId <= 0) {
      return res.status(400).json({
        error: 'Invalid \"reportId\" parameter. It must be a positive integer.',
      });
    }

    const report = await getUploadedReportById(reportId);
    if (!report || report.campaignId !== campaignId) {
      return res.status(404).json({ error: 'Report not found for campaign.' });
    }

    const { deleted, filePath } = await deleteUploadedReportById(reportId);
    if (!deleted) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    if (filePath) {
      await fs.unlink(filePath).catch(() => undefined);
    }

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
};
