import type { NextFunction, Request, Response } from 'express';
import { getCampaignById } from '../services/campaignService';
import { getDataWindow } from '../services/dataWindowService';

const parseCampaignId = (value: string): number | null => {
  const campaignId = Number(value);
  if (!Number.isInteger(campaignId) || campaignId <= 0) {
    return null;
  }
  return campaignId;
};

export const getDataWindowHandler = async (
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

    const dataWindow = await getDataWindow(campaignId);
    return res.status(200).json(dataWindow);
  } catch (err) {
    return next(err);
  }
};
