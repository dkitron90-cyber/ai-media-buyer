import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import {
  CAMPAIGN_REFRESH_DONE_TYPE,
} from '../services/campaignRefreshService';

const parseCampaignId = (raw: string | undefined): number | null => {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export const getCampaignAnalysisStatusHandler = async (
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

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true },
    });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    const latestAnalysis = await prisma.campaignAnalysis.findFirst({
      where: { campaignId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, evidenceStrength: true, createdAt: true },
    });

    const latestRefreshDone = await prisma.campaignEvent.findFirst({
      where: { campaignId, type: CAMPAIGN_REFRESH_DONE_TYPE },
      orderBy: { occurredAt: 'desc' },
      select: { occurredAt: true, metadataJson: true },
    });

    let lastAnalysisStatus: string = 'never';
    if (latestRefreshDone?.metadataJson) {
      try {
        const meta = JSON.parse(latestRefreshDone.metadataJson) as {
          analysisStatus?: string;
        };
        lastAnalysisStatus = meta.analysisStatus ?? 'never';
      } catch {
        lastAnalysisStatus = 'never';
      }
    }

    return res.status(200).json({
      campaignId,
      lastAnalysisAt: latestAnalysis?.createdAt ?? null,
      lastAnalysisStatus,
      latestAnalysisId: latestAnalysis?.id ?? null,
      latestEvidenceStrength: latestAnalysis?.evidenceStrength ?? null,
      lastRefreshAt: latestRefreshDone?.occurredAt ?? null,
    });
  } catch (err) {
    return next(err);
  }
};

