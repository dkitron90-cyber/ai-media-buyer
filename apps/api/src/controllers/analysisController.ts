import type { NextFunction, Request, Response } from 'express';
import { getCampaignById } from '../services/campaignService';
import {
  getCampaignAnalysisReadiness,
  getCampaignSummary,
} from '../services/analysisService';

const parseCampaignId = (value: string): number | null => {
  const campaignId = Number(value);
  if (!Number.isInteger(campaignId) || campaignId <= 0) {
    return null;
  }
  return campaignId;
};

export const getCampaignAnalysisReadinessHandler = async (
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

    const readiness = await getCampaignAnalysisReadiness(
      campaignId,
      campaign.type
    );
    return res.status(200).json(readiness);
  } catch (err) {
    return next(err);
  }
};

export const getCampaignSummaryHandler = async (
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

    const summary = await getCampaignSummary(campaignId, campaign.type);
    return res.status(200).json(summary);
  } catch (err) {
    return next(err);
  }
};

