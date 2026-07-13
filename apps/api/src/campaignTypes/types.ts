import type { ReportType } from '../lib/reportTypeCodes';

export const CANONICAL_CAMPAIGN_TYPE_CODES = [
  'SEARCH',
  'DISPLAY',
  'PERFORMANCE_MAX',
  'VIDEO',
  'SHOPPING',
  'APP',
  'DEMAND_GEN',
  'OTHER',
] as const;

export type CanonicalCampaignTypeCode =
  (typeof CANONICAL_CAMPAIGN_TYPE_CODES)[number];

export interface ChecklistItem {
  id: string;
  label: string;
  detail?: string;
  phase: 'launch' | 'optimization';
}

export interface ChecklistTemplate {
  launch: ChecklistItem[];
  optimization: ChecklistItem[];
}

export interface PlaybookMissingReportSeverity {
  strongWarnings: string[];
  moderateWarnings: string[];
}

export interface PlaybookTemplate {
  expectedReportsSummary: string;
  missingReportSeverity: PlaybookMissingReportSeverity;
  aiPlaybookGuidance: string[];
}

/**
 * Full registry row: metadata + templates + analysis-engine fields (coverage, AI hints).
 */
export interface CampaignTypeRegistryEntry {
  code: CanonicalCampaignTypeCode;
  label: string;
  description: string;
  importantReportTypes: ReportType[];
  recommendedReportTypes: ReportType[];
  /** Suggested objective labels for forms / AI context */
  defaultObjectives: string[];
  optimizationPriorities: string[];
  specialWarnings: string[];
  defaultChecklistTemplate: ChecklistTemplate;
  defaultPlaybookTemplate: PlaybookTemplate;
  /** Used by analysis readiness / sufficiency (legacy campaignTypeRules shape). */
  minimumRecommendedCoverage: {
    directional: number;
    strong: number;
  };
  missingReportGuidance: Partial<Record<ReportType, string>>;
  aiInstructions: string[];
}

export const SETTINGS_SCHEMA_VERSION = 1 as const;
export type SettingsSchemaVersion = typeof SETTINGS_SCHEMA_VERSION;
