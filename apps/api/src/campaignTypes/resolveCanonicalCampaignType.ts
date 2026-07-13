import type { CanonicalCampaignTypeCode } from './types';

/**
 * Maps stored Campaign.type (any casing / aliases) to a canonical registry code.
 * Unknown values map to OTHER (conservative defaults in registry).
 */
export const resolveCanonicalCampaignType = (
  raw: string
): CanonicalCampaignTypeCode => {
  const t = raw.trim().toUpperCase().replace(/\s+/g, '_');

  if (t === 'SEARCH') return 'SEARCH';
  if (t === 'DISPLAY') return 'DISPLAY';
  if (t === 'PERFORMANCE_MAX' || t === 'PERFORMANCEMAX' || t === 'PMAX') {
    return 'PERFORMANCE_MAX';
  }
  if (t === 'VIDEO' || t === 'YOUTUBE' || t === 'VIDEO_ACTION') return 'VIDEO';
  if (t === 'SHOPPING' || t === 'SHOPPING_ADS') return 'SHOPPING';
  if (t === 'APP' || t === 'APP_CAMPAIGN' || t === 'UNIVERSAL_APP') return 'APP';
  if (t === 'DEMAND_GEN' || t === 'DEMANDGEN' || t === 'DISCOVERY') {
    return 'DEMAND_GEN';
  }
  if (t === 'OTHER' || t === 'UNKNOWN') return 'OTHER';

  return 'OTHER';
};

export const parseCampaignTypeParam = (
  param: string
): CanonicalCampaignTypeCode | null => {
  const upper = param.trim().toUpperCase();
  const normalized = upper.replace(/-/g, '_');
  const aliases: Record<string, CanonicalCampaignTypeCode> = {
    SEARCH: 'SEARCH',
    DISPLAY: 'DISPLAY',
    PERFORMANCE_MAX: 'PERFORMANCE_MAX',
    PMAX: 'PERFORMANCE_MAX',
    VIDEO: 'VIDEO',
    YOUTUBE: 'VIDEO',
    SHOPPING: 'SHOPPING',
    APP: 'APP',
    DEMAND_GEN: 'DEMAND_GEN',
    DEMANDGEN: 'DEMAND_GEN',
    DISCOVERY: 'DEMAND_GEN',
    OTHER: 'OTHER',
  };
  return aliases[normalized] ?? null;
};
