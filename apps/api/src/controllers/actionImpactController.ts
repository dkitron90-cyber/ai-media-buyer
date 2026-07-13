import type { NextFunction, Request, Response } from 'express';
import {
  captureActionImpactSnapshot,
  getActionImpactSummary,
  ImpactValidationError,
} from '../services/actionImpactService';
import { refreshCampaignState } from '../services/campaignRefreshService';

const parsePositiveInt = (value: string): number | null => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export const captureActionImpactHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = parsePositiveInt(req.params.id);
    if (!campaignId) {
      return res.status(400).json({ error: 'Invalid campaign id.' });
    }
    const actionId = parsePositiveInt(req.params.actionId);
    if (!actionId) {
      return res.status(400).json({ error: 'Invalid action id.' });
    }

    await captureActionImpactSnapshot(campaignId, actionId, 'after');
    const summary = await getActionImpactSummary(campaignId, actionId);
    void refreshCampaignState(campaignId).catch(() => {});
    return res.status(201).json(summary);
  } catch (err) {
    if (err instanceof ImpactValidationError) {
      return res.status(422).json({ error: err.message });
    }
    return next(err);
  }
};

export const getActionImpactHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = parsePositiveInt(req.params.id);
    if (!campaignId) {
      return res.status(400).json({ error: 'Invalid campaign id.' });
    }
    const actionId = parsePositiveInt(req.params.actionId);
    if (!actionId) {
      return res.status(400).json({ error: 'Invalid action id.' });
    }

    const summary = await getActionImpactSummary(campaignId, actionId);
    return res.status(200).json(summary);
  } catch (err) {
    if (err instanceof ImpactValidationError) {
      return res.status(422).json({ error: err.message });
    }
    return next(err);
  }
};

