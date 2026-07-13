import type { NextFunction, Request, Response } from 'express';
import { getCampaignGaps } from '../services/gapDetectionService';

const parseCampaignId = (raw: string | undefined): number | null => {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export const getCampaignGapsHandler = async (
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

    const result = await getCampaignGaps(campaignId);
    if (!result) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
};

