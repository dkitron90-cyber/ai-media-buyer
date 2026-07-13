import type { NextFunction, Request, Response } from 'express';
import {
  createPlacementsFromAnalysis,
  executeAction,
  ValidationError,
} from '../services/placementExecutionService';
import { isValidListType } from '../services/placementListService';
import { refreshCampaignState } from '../services/campaignRefreshService';

const parsePositiveInt = (value: string): number | null => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export const createPlacementsFromAnalysisHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = parsePositiveInt(req.params.id);
    if (!campaignId) {
      return res.status(400).json({ error: 'Invalid campaign id.' });
    }

    const { analysisId, type } = req.body ?? {};

    if (!analysisId || typeof analysisId !== 'number' || analysisId <= 0) {
      return res.status(400).json({
        error: '"analysisId" is required and must be a positive integer.',
      });
    }

    if (!type || typeof type !== 'string' || !isValidListType(type)) {
      return res.status(400).json({
        error: '"type" is required and must be "blacklist" or "whitelist".',
      });
    }

    const result = await createPlacementsFromAnalysis(campaignId, analysisId, type);
    void refreshCampaignState(campaignId).catch(() => {});
    return res.status(201).json(result);
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(422).json({ error: err.message });
    }
    return next(err);
  }
};

export const executeActionHandler = async (
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

    const result = await executeAction(campaignId, actionId);
    void refreshCampaignState(campaignId).catch(() => {});
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(422).json({ error: err.message });
    }
    return next(err);
  }
};
