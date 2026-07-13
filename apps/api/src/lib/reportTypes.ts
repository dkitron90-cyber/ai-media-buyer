import { detectReportTypeAdvanced as _detectAdvanced } from './reportDetector';
import { getCampaignTypeRules } from './campaignTypeRules';
import type { ReportType } from './reportTypeCodes';

export { SUPPORTED_REPORT_TYPES, type ReportType } from './reportTypeCodes';

export { detectReportTypeAdvanced, buildDetectionErrorMessage } from './reportDetector';
export type { DetectionResult } from './reportDetector';

/**
 * Detects report type using header-first signature matching with filename fallback.
 * Headers are normalized and mapped to canonical field names before matching.
 * If headers and filename conflict, headers always win.
 */
export const detectReportType = (
  fileName: string,
  headers: string[]
): ReportType | null => {
  const result = _detectAdvanced(fileName, headers);
  return result.reportType;
};

export const determineRequiredReports = (campaignType: string): ReportType[] => {
  const rules = getCampaignTypeRules(campaignType);
  // Ensure uniqueness, preserve order.
  return Array.from(new Set(rules.importantReportTypes));
};
