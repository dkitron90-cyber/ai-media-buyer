import type { NextFunction, Request, Response } from 'express';
import {
  getCampaignTypeRegistryEntry,
  listCampaignTypeRegistryEntries,
  parseCampaignTypeParam,
} from '../campaignTypes';

/** Core metadata for list endpoint (no full templates). */
const toListItem = (entry: ReturnType<typeof listCampaignTypeRegistryEntries>[number]) => ({
  code: entry.code,
  label: entry.label,
  description: entry.description,
  importantReportTypes: entry.importantReportTypes,
  recommendedReportTypes: entry.recommendedReportTypes,
  defaultObjectives: entry.defaultObjectives,
  optimizationPriorities: entry.optimizationPriorities,
  specialWarnings: entry.specialWarnings,
});

export const listCampaignTypesHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const types = listCampaignTypeRegistryEntries().map(toListItem);
    return res.status(200).json({ types });
  } catch (err) {
    return next(err);
  }
};

export const getCampaignTypeByCodeHandler = async (
  req: Request<{ type: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const code = parseCampaignTypeParam(req.params.type ?? '');
    if (!code) {
      return res.status(404).json({ error: 'Unknown campaign type code.' });
    }
    const entry = getCampaignTypeRegistryEntry(code);
    return res.status(200).json({ type: entry });
  } catch (err) {
    return next(err);
  }
};
