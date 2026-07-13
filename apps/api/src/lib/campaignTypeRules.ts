import type { ReportType } from './reportTypeCodes';
import {
  getCampaignTypeRegistryEntry,
  resolveCanonicalCampaignType,
  type CanonicalCampaignTypeCode,
} from '../campaignTypes';

/**
 * Analysis-engine projection of the campaign type registry (readiness, AI hints).
 * Backed by {@link getCampaignTypeRegistryEntry}; unknown DB types resolve to OTHER.
 */
export interface CampaignTypeRules {
  key: CanonicalCampaignTypeCode;
  label: string;
  importantReportTypes: ReportType[];
  minimumRecommendedCoverage: {
    directional: number;
    strong: number;
  };
  specialWarnings: string[];
  optimizationPriorities: string[];
  missingReportGuidance: Partial<Record<ReportType, string>>;
  aiInstructions: string[];
}

export function getCampaignTypeRules(campaignType: string): CampaignTypeRules {
  const code = resolveCanonicalCampaignType(campaignType);
  const entry = getCampaignTypeRegistryEntry(code);
  return {
    key: entry.code,
    label: entry.label,
    importantReportTypes: entry.importantReportTypes,
    minimumRecommendedCoverage: entry.minimumRecommendedCoverage,
    specialWarnings: entry.specialWarnings,
    optimizationPriorities: entry.optimizationPriorities,
    missingReportGuidance: entry.missingReportGuidance,
    aiInstructions: entry.aiInstructions,
  };
}
