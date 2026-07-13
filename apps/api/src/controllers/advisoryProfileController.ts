import type { Request, Response, NextFunction } from 'express';
import {
  getAdvisoryProfileForClient,
  upsertAdvisoryProfile,
} from '../services/advisoryProfileService';
import type { LandingPageAnalysisResult } from '../services/landingPageAnalyzerService';

export const getAdvisoryProfileHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const clientId = Number(req.params.id);
    if (!Number.isInteger(clientId) || clientId <= 0) {
      return res.status(400).json({ error: 'Invalid client id.' });
    }
    const profile = await getAdvisoryProfileForClient(clientId);
    if (!profile) {
      return res.status(404).json({ error: 'Client not found.' });
    }
    return res.status(200).json(profile);
  } catch (err) {
    return next(err);
  }
};

export const patchAdvisoryProfileHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const clientId = Number(req.params.id);
    if (!Number.isInteger(clientId) || clientId <= 0) {
      return res.status(400).json({ error: 'Invalid client id.' });
    }

    const body = req.body as Record<string, unknown>;
    const patch: Parameters<typeof upsertAdvisoryProfile>[1] = {};

    if ('websiteUrl' in body) {
      const v = body.websiteUrl;
      patch.websiteUrl =
        v === null || v === undefined
          ? null
          : typeof v === 'string'
            ? v.trim() || null
            : undefined;
      if (v !== null && v !== undefined && typeof v !== 'string') {
        return res.status(400).json({ error: 'websiteUrl must be a string or null.' });
      }
    }
    if ('industryVertical' in body) {
      const v = body.industryVertical;
      patch.industryVertical =
        v === null || v === undefined
          ? null
          : typeof v === 'string'
            ? v.trim() || null
            : undefined;
      if (v !== null && v !== undefined && typeof v !== 'string') {
        return res.status(400).json({ error: 'industryVertical must be a string or null.' });
      }
    }
    if ('conversionType' in body) {
      const v = body.conversionType;
      patch.conversionType =
        v === null || v === undefined
          ? null
          : typeof v === 'string'
            ? v.trim() || null
            : undefined;
      if (v !== null && v !== undefined && typeof v !== 'string') {
        return res.status(400).json({ error: 'conversionType must be a string or null.' });
      }
    }
    if ('accountMaturity' in body) {
      const v = body.accountMaturity;
      patch.accountMaturity =
        v === null || v === undefined
          ? null
          : typeof v === 'string'
            ? v.trim() || null
            : undefined;
      if (v !== null && v !== undefined && typeof v !== 'string') {
        return res.status(400).json({ error: 'accountMaturity must be a string or null.' });
      }
    }
    if ('approximateMonthlySpend' in body) {
      const v = body.approximateMonthlySpend;
      if (v === null || v === undefined) {
        patch.approximateMonthlySpend = null;
      } else if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
        patch.approximateMonthlySpend = v;
      } else if (typeof v === 'string' && v.trim() !== '') {
        const n = parseFloat(v.replace(/[,$\s]/g, ''));
        if (Number.isFinite(n) && n >= 0) patch.approximateMonthlySpend = n;
        else return res.status(400).json({ error: 'Invalid approximateMonthlySpend.' });
      } else {
        return res.status(400).json({ error: 'Invalid approximateMonthlySpend.' });
      }
    }

    if ('landingPageAnalysis' in body) {
      const v = body.landingPageAnalysis;
      if (v === null) {
        patch.landingPageAnalysis = null;
      } else if (v !== undefined && typeof v === 'object' && v !== null) {
        patch.landingPageAnalysis = v as LandingPageAnalysisResult;
      } else {
        return res.status(400).json({
          error: 'landingPageAnalysis must be an object or null.',
        });
      }
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }

    const updated = await upsertAdvisoryProfile(clientId, patch);
    if (!updated) {
      return res.status(404).json({ error: 'Client not found.' });
    }
    return res.status(200).json(updated);
  } catch (err) {
    return next(err);
  }
};
