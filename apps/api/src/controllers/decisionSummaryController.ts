import type { NextFunction, Request, Response } from 'express';
import { getCampaignDecisionSummary } from '../services/decisionSummaryService';

const parseCampaignId = (value: string): number | null => {
  const campaignId = Number(value);
  if (!Number.isInteger(campaignId) || campaignId <= 0) {
    return null;
  }
  return campaignId;
};

export const getCampaignDecisionSummaryHandler = async (
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

    const summary = await getCampaignDecisionSummary(campaignId);
    if (!summary) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    return res.status(200).json(summary);
  } catch (err) {
    return next(err);
  }
};
