import type { CanonicalCampaignTypeCode } from './types';
import type { CampaignSettingsPayload } from './settingsTypes';

export interface SettingsValidationResult {
  ok: true;
  value: CampaignSettingsPayload;
}

export interface SettingsValidationError {
  ok: false;
  errors: string[];
}

export type ValidateSettingsOutcome = SettingsValidationResult | SettingsValidationError;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

const allowedKeys: Record<CanonicalCampaignTypeCode, Set<string>> = {
  SEARCH: new Set([
    'biddingStrategy',
    'targetCpa',
    'targetRoas',
    'brandVsNonBrand',
    'matchTypeStrategy',
    'networkTargeting',
  ]),
  DISPLAY: new Set([
    'audienceMode',
    'audienceSource',
    'placementPolicy',
    'demographicExclusions',
    'audienceStrategy',
    'placementStrategy',
    'exclusionsPolicy',
  ]),
  PERFORMANCE_MAX: new Set([
    'targetGoalType',
    'audienceSignalsPresent',
    'assetGroupCount',
    'feedAttached',
  ]),
  VIDEO: new Set(['videoObjective', 'audienceStrategy', 'placementStrategy']),
  SHOPPING: new Set(['feedStatus', 'segmentationStrategy', 'targetRoas']),
  APP: new Set(['appPlatform', 'installGoal', 'eventTrackingReady']),
  DEMAND_GEN: new Set(['audienceStrategy', 'creativeCoverage', 'landingPageType']),
  OTHER: new Set(['notes']),
};

const err = (errors: string[]): SettingsValidationError => ({ ok: false, errors });

/**
 * Validates parsed JSON object for the given canonical campaign type.
 * Unknown keys are rejected. Types are checked per field.
 */
export const validateSettingsForCampaignType = (
  campaignType: CanonicalCampaignTypeCode,
  input: unknown
): ValidateSettingsOutcome => {
  if (input === undefined || input === null) {
    return { ok: true, value: {} as CampaignSettingsPayload };
  }
  if (!isPlainObject(input)) {
    return err(['settings must be a JSON object']);
  }

  const allowed = allowedKeys[campaignType];
  const errors: string[] = [];

  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) {
      errors.push(`Unknown field "${key}" for campaign type ${campaignType}`);
    }
  }
  if (errors.length) return err(errors);

  const o = input;

  const checkString = (k: string): void => {
    const v = o[k];
    if (v === undefined) return;
    if (typeof v !== 'string') errors.push(`"${k}" must be a string`);
  };

  const checkBool = (k: string): void => {
    const v = o[k];
    if (v === undefined) return;
    if (typeof v !== 'boolean') errors.push(`"${k}" must be a boolean`);
  };

  const checkNumberOrNull = (k: string): void => {
    const v = o[k];
    if (v === undefined || v === null) return;
    if (typeof v !== 'number' || Number.isNaN(v)) {
      errors.push(`"${k}" must be a number or null`);
    }
  };

  const checkInt = (k: string): void => {
    const v = o[k];
    if (v === undefined) return;
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) {
      errors.push(`"${k}" must be a non-negative integer`);
    }
  };

  switch (campaignType) {
    case 'SEARCH':
      checkString('biddingStrategy');
      checkNumberOrNull('targetCpa');
      checkNumberOrNull('targetRoas');
      checkString('brandVsNonBrand');
      checkString('matchTypeStrategy');
      checkString('networkTargeting');
      break;
    case 'DISPLAY':
      checkString('audienceMode');
      checkString('audienceSource');
      checkString('placementPolicy');
      checkBool('demographicExclusions');
      checkString('audienceStrategy');
      checkString('placementStrategy');
      checkString('exclusionsPolicy');
      break;
    case 'PERFORMANCE_MAX':
      checkString('targetGoalType');
      checkBool('audienceSignalsPresent');
      checkInt('assetGroupCount');
      checkBool('feedAttached');
      break;
    case 'VIDEO':
      checkString('videoObjective');
      checkString('audienceStrategy');
      checkString('placementStrategy');
      break;
    case 'SHOPPING':
      checkString('feedStatus');
      checkString('segmentationStrategy');
      checkNumberOrNull('targetRoas');
      break;
    case 'APP':
      checkString('appPlatform');
      checkString('installGoal');
      checkBool('eventTrackingReady');
      break;
    case 'DEMAND_GEN':
      checkString('audienceStrategy');
      checkString('creativeCoverage');
      checkString('landingPageType');
      break;
    case 'OTHER':
      checkString('notes');
      break;
  }

  if (errors.length) return err(errors);
  return { ok: true, value: o as CampaignSettingsPayload };
};

export const parseSettingsJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error('Stored settingsJson is not valid JSON');
  }
};
