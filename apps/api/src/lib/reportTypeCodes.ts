/**
 * Canonical report type literals (shared by registry, parsers, and analysis).
 * Kept separate from reportTypes.ts to avoid circular imports with campaign type registry.
 */
export const SUPPORTED_REPORT_TYPES = [
  'PLACEMENT',
  'DEVICE',
  'GEOGRAPHIC',
  'AUDIENCE',
  'DEMOGRAPHICS',
  'AD_SCHEDULE',
  'SEARCH_TERMS',
  'KEYWORDS',
  'CAMPAIGN',
] as const;

export type ReportType = (typeof SUPPORTED_REPORT_TYPES)[number];
