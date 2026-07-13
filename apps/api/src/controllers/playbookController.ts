import type { Request, Response, NextFunction } from 'express';
import { buildCampaignPlaybook } from '../services/playbookService';

export const getCampaignPlaybookHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = Number(req.params.id);
    if (!Number.isInteger(campaignId) || campaignId <= 0) {
      return res.status(400).json({ error: 'Invalid campaign id.' });
    }

    const playbook = await buildCampaignPlaybook(campaignId);
    if (!playbook) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    return res.status(200).json(playbook);
  } catch (err) {
    return next(err);
  }
};
