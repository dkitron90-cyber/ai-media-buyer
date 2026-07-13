import type { ReportType } from './reportTypeCodes';
import type { CanonicalCampaignTypeCode } from '../campaignTypes/types';
import { resolveCanonicalCampaignType } from '../campaignTypes/resolveCanonicalCampaignType';

export type CampaignTypeInferenceSource = 'campaign_name' | 'report_type' | 'default';

export interface CampaignTypeInference {
  type: CanonicalCampaignTypeCode;
  source: CampaignTypeInferenceSource;
  confidence: 'high' | 'medium' | 'low';
}

const NAME_PATTERNS: Array<{
  type: CanonicalCampaignTypeCode;
  pattern: RegExp;
}> = [
  { type: 'PERFORMANCE_MAX', pattern: /\b(pmax|performance\s*max)\b/i },
  { type: 'DEMAND_GEN', pattern: /\bdemand\s*gen\b/i },
  { type: 'SHOPPING', pattern: /\b(shopping|merchant|pmax\s*shopping)\b/i },
  { type: 'VIDEO', pattern: /\b(video|youtube|trueview|bumper)\b/i },
  { type: 'DISPLAY', pattern: /\b(display|gdn|remarketing)\b/i },
  { type: 'APP', pattern: /\b(app|uac|install)\b/i },
  { type: 'SEARCH', pattern: /\b(search|brand|non-?brand|nb)\b/i },
];

/**
 * Strong report-type → campaign-type signals only.
 * Ambiguous segment reports (DEVICE, CAMPAIGN summary, etc.) return null.
 */
export const inferCampaignTypeFromReportType = (
  reportType: ReportType | string | null | undefined
): CanonicalCampaignTypeCode | null => {
  if (!reportType) return null;
  switch (reportType) {
    case 'SEARCH_TERMS':
    case 'KEYWORDS':
      return 'SEARCH';
    case 'PLACEMENT':
      return 'DISPLAY';
    default:
      return null;
  }
};

export const inferCampaignTypeFromCampaignName = (
  campaignName: string | null | undefined
): CanonicalCampaignTypeCode | null => {
  const trimmed = campaignName?.trim();
  if (!trimmed) return null;
  for (const { type, pattern } of NAME_PATTERNS) {
    if (pattern.test(trimmed)) return type;
  }
  return null;
};

export const inferCampaignTypeForImport = (input: {
  reportType?: ReportType | string | null;
  campaignName?: string | null;
}): CampaignTypeInference => {
  const fromName = inferCampaignTypeFromCampaignName(input.campaignName);
  if (fromName) {
    return { type: fromName, source: 'campaign_name', confidence: 'high' };
  }

  const fromReport = inferCampaignTypeFromReportType(input.reportType ?? null);
  if (fromReport) {
    return { type: fromReport, source: 'report_type', confidence: 'medium' };
  }

  return { type: 'OTHER', source: 'default', confidence: 'low' };
};

/** User override wins; otherwise same rules as import inference. */
export const resolveCampaignTypeForCreate = (input: {
  reportType?: ReportType | string | null;
  campaignName: string;
  override?: string | null;
}): CanonicalCampaignTypeCode => {
  if (input.override != null && String(input.override).trim().length > 0) {
    return resolveCanonicalCampaignType(String(input.override));
  }
  return inferCampaignTypeForImport({
    reportType: input.reportType,
    campaignName: input.campaignName,
  }).type;
};
