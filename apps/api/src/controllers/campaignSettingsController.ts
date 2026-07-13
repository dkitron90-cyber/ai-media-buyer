import type { NextFunction, Request, Response } from 'express';
import { SETTINGS_SCHEMA_VERSION } from '../campaignTypes';
import {
  getCampaignSettingsView,
  upsertCampaignSettings,
} from '../services/campaignSettingsService';
import { refreshCampaignState } from '../services/campaignRefreshService';

export const getCampaignSettingsHandler = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = Number(req.params.id);
    if (!Number.isInteger(campaignId) || campaignId <= 0) {
      return res.status(400).json({ error: 'Invalid campaign id.' });
    }
    const view = await getCampaignSettingsView(campaignId);
    if (!view) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }
    return res.status(200).json(view);
  } catch (err) {
    return next(err);
  }
};

interface PatchBody {
  settings?: unknown;
  settingsSchemaVersion?: number;
}

export const patchCampaignSettingsHandler = async (
  req: Request<{ id: string }, unknown, PatchBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = Number(req.params.id);
    if (!Number.isInteger(campaignId) || campaignId <= 0) {
      return res.status(400).json({ error: 'Invalid campaign id.' });
    }
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'JSON body required.' });
    }
    if (!('settings' in req.body)) {
      return res.status(400).json({
        error: 'Missing "settings" object in body.',
      });
    }

    try {
      const view = await upsertCampaignSettings(campaignId, {
        settings: req.body.settings,
        settingsSchemaVersion: req.body.settingsSchemaVersion,
      });

      // Non-blocking auto refresh after settings materially change.
      void refreshCampaignState(campaignId).catch(() => {});
      return res.status(200).json(view);
    } catch (e: unknown) {
      if (e instanceof Error) {
        if (e.message === 'CAMPAIGN_NOT_FOUND') {
          return res.status(404).json({ error: 'Campaign not found.' });
        }
        if (e.message === 'SETTINGS_SCHEMA_VERSION_MISMATCH') {
          return res.status(400).json({
            error: `settingsSchemaVersion must be ${String(SETTINGS_SCHEMA_VERSION)} for this API version.`,
          });
        }
        if (e.message === 'SETTINGS_VALIDATION_FAILED') {
          const validationErrors = (e as Error & { validationErrors?: string[] })
            .validationErrors ?? ['Validation failed'];
          return res.status(400).json({
            error: 'Settings validation failed.',
            details: validationErrors,
          });
        }
      }
      throw e;
    }
  } catch (err) {
    return next(err);
  }
};
