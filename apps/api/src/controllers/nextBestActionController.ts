import type { NextFunction, Request, Response } from 'express';
import { getNextBestAction } from '../services/nextBestActionService';

const parseCampaignId = (raw: string | undefined): number | null => {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export const getNextBestActionHandler = async (
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

    const result = await getNextBestAction(campaignId);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
};

