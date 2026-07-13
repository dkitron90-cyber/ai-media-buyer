import type { NextFunction, Request, Response } from 'express';
import { patchCampaignChecklistItem, getCampaignChecklist } from '../services/campaignChecklistService';
import type { ChecklistItemStatus } from '../services/campaignChecklistService';
import { refreshCampaignState } from '../services/campaignRefreshService';

const parseCampaignId = (raw: string | undefined): number | null => {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export const getCampaignChecklistHandler = async (
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

    const result = await getCampaignChecklist(campaignId);
    if (!result) return res.status(404).json({ error: 'Campaign not found.' });
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
};

export const patchCampaignChecklistItemHandler = async (
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

    const itemId = req.params.itemId;
    const status = req.body?.status as ChecklistItemStatus | undefined;

    if (!itemId) {
      return res.status(400).json({ error: 'Missing itemId.' });
    }
    if (status !== 'pending' && status !== 'done' && status !== 'skipped') {
      return res.status(400).json({
        error: 'Invalid status. Must be one of: pending, done, skipped.',
      });
    }

    const updated = await patchCampaignChecklistItem(campaignId, itemId, status);
    if (!updated) return res.status(404).json({ error: 'Checklist item not found.' });

    // Non-blocking auto refresh after checklist status changes.
    try {
      void refreshCampaignState(campaignId).catch(() => {});
    } catch {
      // never block checklist updates due to refresh pipeline failures
    }
    return res.status(200).json(updated);
  } catch (err) {
    return next(err);
  }
};

