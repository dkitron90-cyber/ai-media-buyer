import type { NextFunction, Request, Response } from 'express';
import { getCampaignById } from '../services/campaignService';
import {
  createCampaignGoal,
  listCampaignGoals,
  getCampaignGoalById,
  updateCampaignGoalById,
  deleteCampaignGoalById,
} from '../services/campaignGoalService';

export const createCampaignGoalHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = Number(req.params.id);
    if (!Number.isInteger(campaignId) || campaignId <= 0) {
      return res.status(400).json({
        error: 'Invalid "id" parameter. It must be a positive integer.',
      });
    }

    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    const {
      name,
      metric,
      description,
      targetValue,
      startDate,
      endDate,
    } = req.body as {
      name?: unknown;
      metric?: unknown;
      description?: unknown;
      targetValue?: unknown;
      startDate?: unknown;
      endDate?: unknown;
    };

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        error: 'Invalid payload: "name" is required and must be a non-empty string.',
      });
    }

    if (typeof metric !== 'string' || !metric.trim()) {
      return res.status(400).json({
        error: 'Invalid payload: "metric" is required and must be a non-empty string.',
      });
    }

    let numericTargetValue: number | undefined;
    if (targetValue !== undefined && targetValue !== null) {
      numericTargetValue = Number(targetValue);
      if (Number.isNaN(numericTargetValue)) {
        return res.status(400).json({
          error: 'Invalid payload: "targetValue" must be a number when provided.',
        });
      }
    }

    const parseOptionalDate = (value: unknown, fieldName: string) => {
      if (value === undefined || value === null || value === '') {
        return undefined;
      }
      if (typeof value !== 'string') {
        throw new Error(
          `Invalid payload: "${fieldName}" must be an ISO date string when provided.`
        );
      }
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        throw new Error(
          `Invalid payload: "${fieldName}" must be a valid ISO date string when provided.`
        );
      }
      return date;
    };

    let parsedStartDate: Date | undefined;
    let parsedEndDate: Date | undefined;

    try {
      parsedStartDate = parseOptionalDate(startDate, 'startDate');
      parsedEndDate = parseOptionalDate(endDate, 'endDate');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Invalid date payload.';
      return res.status(400).json({ error: message });
    }

    const goal = await createCampaignGoal({
      campaignId,
      name,
      metric,
      description:
        typeof description === 'string' && description.trim()
          ? description
          : undefined,
      targetValue: numericTargetValue ?? undefined,
      startDate: parsedStartDate ?? undefined,
      endDate: parsedEndDate ?? undefined,
    });

    return res.status(201).json(goal);
  } catch (err) {
    return next(err);
  }
};

export const listCampaignGoalsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = Number(req.params.id);
    if (!Number.isInteger(campaignId) || campaignId <= 0) {
      return res.status(400).json({
        error: 'Invalid "id" parameter. It must be a positive integer.',
      });
    }

    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    const goals = await listCampaignGoals(campaignId);
    return res.status(200).json(goals);
  } catch (err) {
    return next(err);
  }
};

export const patchCampaignGoalHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = Number(req.params.id);
    const goalId = Number(req.params.goalId);
    if (!Number.isInteger(campaignId) || campaignId <= 0) {
      return res.status(400).json({
        error: 'Invalid "id" parameter. It must be a positive integer.',
      });
    }
    if (!Number.isInteger(goalId) || goalId <= 0) {
      return res.status(400).json({
        error: 'Invalid \"goalId\" parameter. It must be a positive integer.',
      });
    }

    const existing = await getCampaignGoalById(campaignId, goalId);
    if (!existing) {
      return res.status(404).json({ error: 'Goal not found.' });
    }

    const {
      name,
      metric,
      description,
      targetValue,
      startDate,
      endDate,
    } = req.body as {
      name?: unknown;
      metric?: unknown;
      description?: unknown;
      targetValue?: unknown;
      startDate?: unknown;
      endDate?: unknown;
    };

    const data: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          error: 'Invalid payload: "name" must be a non-empty string when provided.',
        });
      }
      data.name = name.trim();
    }

    if (metric !== undefined) {
      if (typeof metric !== 'string' || !metric.trim()) {
        return res.status(400).json({
          error: 'Invalid payload: \"metric\" must be a non-empty string when provided.',
        });
      }
      data.metric = metric.trim();
    }

    if (description !== undefined) {
      if (description !== null && typeof description !== 'string') {
        return res.status(400).json({
          error:
            'Invalid payload: \"description\" must be a string or null when provided.',
        });
      }
      data.description =
        description === null ? null : (description as string).trim() || null;
    }

    if (targetValue !== undefined) {
      if (targetValue === null || targetValue === '') {
        data.targetValue = null;
      } else {
        const value = Number(targetValue);
        if (Number.isNaN(value)) {
          return res.status(400).json({
            error: 'Invalid payload: \"targetValue\" must be a number when provided.',
          });
        }
        data.targetValue = value;
      }
    }

    const parseOptionalDate = (value: unknown, fieldName: string) => {
      if (value === undefined) return undefined;
      if (value === null || value === '') return null;
      if (typeof value !== 'string') {
        throw new Error(
          `Invalid payload: \"${fieldName}\" must be an ISO date string when provided.`
        );
      }
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        throw new Error(
          `Invalid payload: \"${fieldName}\" must be a valid ISO date string when provided.`
        );
      }
      return date;
    };

    try {
      const parsedStart = parseOptionalDate(startDate, 'startDate');
      const parsedEnd = parseOptionalDate(endDate, 'endDate');
      if (startDate !== undefined) data.startDate = parsedStart;
      if (endDate !== undefined) data.endDate = parsedEnd;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid date payload.';
      return res.status(400).json({ error: message });
    }

    const updated = await updateCampaignGoalById(campaignId, goalId, data);
    if (!updated) {
      return res.status(404).json({ error: 'Goal not found.' });
    }

    return res.status(200).json(updated);
  } catch (err) {
    return next(err);
  }
};

export const deleteCampaignGoalHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = Number(req.params.id);
    const goalId = Number(req.params.goalId);
    if (!Number.isInteger(campaignId) || campaignId <= 0) {
      return res.status(400).json({
        error: 'Invalid \"id\" parameter. It must be a positive integer.',
      });
    }
    if (!Number.isInteger(goalId) || goalId <= 0) {
      return res.status(400).json({
        error: 'Invalid \"goalId\" parameter. It must be a positive integer.',
      });
    }

    const deleted = await deleteCampaignGoalById(campaignId, goalId);
    if (!deleted) {
      return res.status(404).json({ error: 'Goal not found.' });
    }

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
};

