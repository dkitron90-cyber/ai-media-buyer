import type { NextFunction, Request, Response } from 'express';
import {
  listPlacements,
  createPlacement,
  patchPlacement,
  isValidListType,
  isValidSource,
  isValidPlacementStatus,
  deletePlacement,
} from '../services/placementListService';
import { refreshCampaignState } from '../services/campaignRefreshService';

const parsePositiveInt = (value: string): number | null => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export const listPlacementsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = parsePositiveInt(req.params.id);
    if (!campaignId) {
      return res.status(400).json({ error: 'Invalid campaign id.' });
    }
    const entries = await listPlacements(campaignId);
    return res.status(200).json(entries);
  } catch (err) {
    return next(err);
  }
};

export const listBlacklistHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = parsePositiveInt(req.params.id);
    if (!campaignId) {
      return res.status(400).json({ error: 'Invalid campaign id.' });
    }
    const entries = await listPlacements(campaignId, 'blacklist');
    return res.status(200).json(entries);
  } catch (err) {
    return next(err);
  }
};

export const listWhitelistHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = parsePositiveInt(req.params.id);
    if (!campaignId) {
      return res.status(400).json({ error: 'Invalid campaign id.' });
    }
    const entries = await listPlacements(campaignId, 'whitelist');
    return res.status(200).json(entries);
  } catch (err) {
    return next(err);
  }
};

export const createPlacementHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = parsePositiveInt(req.params.id);
    if (!campaignId) {
      return res.status(400).json({ error: 'Invalid campaign id.' });
    }

    const { listType, placement, source } = req.body ?? {};

    if (!listType || typeof listType !== 'string' || !isValidListType(listType)) {
      return res.status(400).json({
        error: '"listType" is required and must be "blacklist" or "whitelist".',
      });
    }

    if (!placement || typeof placement !== 'string') {
      return res.status(400).json({
        error: '"placement" is required and must be a non-empty string.',
      });
    }

    if (source !== undefined && !isValidSource(source)) {
      return res.status(400).json({
        error: '"source" must be one of: manual, ai, imported.',
      });
    }

    const entry = await createPlacement(campaignId, req.body);
    if (entry.source !== 'ai') {
      void refreshCampaignState(campaignId).catch(() => {});
    }
    return res.status(201).json(entry);
  } catch (err) {
    return next(err);
  }
};

export const patchPlacementHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = parsePositiveInt(req.params.id);
    if (!campaignId) {
      return res.status(400).json({ error: 'Invalid campaign id.' });
    }
    const placementId = parsePositiveInt(req.params.placementId);
    if (!placementId) {
      return res.status(400).json({ error: 'Invalid placement id.' });
    }

    if (
      req.body.status !== undefined &&
      !isValidPlacementStatus(req.body.status)
    ) {
      return res.status(400).json({
        error: 'Invalid status. Must be one of: active, archived.',
      });
    }

    const updated = await patchPlacement(campaignId, placementId, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Placement entry not found.' });
    }
    if (updated.source !== 'ai') {
      void refreshCampaignState(campaignId).catch(() => {});
    }
    return res.status(200).json(updated);
  } catch (err) {
    return next(err);
  }
};

export const deletePlacementHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = parsePositiveInt(req.params.id);
    if (!campaignId) {
      return res.status(400).json({ error: 'Invalid campaign id.' });
    }
    const placementId = parsePositiveInt(req.params.placementId);
    if (!placementId) {
      return res.status(400).json({ error: 'Invalid placement id.' });
    }

    const deleted = await deletePlacement(campaignId, placementId);
    if (!deleted) {
      return res.status(404).json({ error: 'Placement entry not found.' });
    }
    void refreshCampaignState(campaignId).catch(() => {});

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
};
