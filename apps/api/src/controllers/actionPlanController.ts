import type { NextFunction, Request, Response } from 'express';
import {
  listActions,
  getActionById,
  createAction,
  patchAction,
  isValidStatus,
  createActionsFromAnalysis,
  deleteAction,
} from '../services/actionPlanService';
import { getAnalysisById } from '../services/campaignAnalysisHistoryService';

const parsePositiveInt = (value: string): number | null => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export const listActionsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = parsePositiveInt(req.params.id);
    if (!campaignId) {
      return res.status(400).json({ error: 'Invalid campaign id.' });
    }
    const actions = await listActions(campaignId);
    return res.status(200).json(actions);
  } catch (err) {
    return next(err);
  }
};

export const getActionByIdHandler = async (
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
    const action = await getActionById(campaignId, actionId);
    if (!action) {
      return res.status(404).json({ error: 'Action not found.' });
    }
    return res.status(200).json(action);
  } catch (err) {
    return next(err);
  }
};

export const createActionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = parsePositiveInt(req.params.id);
    if (!campaignId) {
      return res.status(400).json({ error: 'Invalid campaign id.' });
    }

    const { actionType, title } = req.body ?? {};
    if (!actionType || typeof actionType !== 'string') {
      return res.status(400).json({ error: '"actionType" is required.' });
    }
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: '"title" is required.' });
    }

    const action = await createAction(campaignId, req.body);
    return res.status(201).json(action);
  } catch (err) {
    return next(err);
  }
};

export const patchActionHandler = async (
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

    if (req.body.status !== undefined && !isValidStatus(req.body.status)) {
      return res.status(400).json({
        error: 'Invalid status. Must be one of: draft, approved, done, dismissed.',
      });
    }

    const updated = await patchAction(campaignId, actionId, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Action not found.' });
    }
    return res.status(200).json(updated);
  } catch (err) {
    return next(err);
  }
};

export const createActionsFromAnalysisHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = parsePositiveInt(req.params.id);
    if (!campaignId) {
      return res.status(400).json({ error: 'Invalid campaign id.' });
    }
    const analysisId = parsePositiveInt(req.params.analysisId);
    if (!analysisId) {
      return res.status(400).json({ error: 'Invalid analysis id.' });
    }

    const analysis = await getAnalysisById(campaignId, analysisId);
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found.' });
    }

    const diagnosis = analysis.outputJson;
    if (!diagnosis.prioritizedActions || diagnosis.prioritizedActions.length === 0) {
      return res.status(200).json([]);
    }

    const actions = await createActionsFromAnalysis(
      campaignId,
      analysisId,
      diagnosis.prioritizedActions
    );
    return res.status(201).json(actions);
  } catch (err) {
    return next(err);
  }
};

export const deleteActionHandler = async (
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

    const deleted = await deleteAction(campaignId, actionId);
    if (!deleted) {
      return res.status(404).json({ error: 'Action not found.' });
    }

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
};
