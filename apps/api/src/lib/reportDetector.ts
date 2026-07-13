import type { ReportType } from './reportTypeCodes';
import {
  normalizeAndMapHeaders,
  type NormalizedHeaderResult,
} from './headerNormalizer';

const FILENAME_KEYWORDS_BY_TYPE: Record<ReportType, string[]> = {
  SEARCH_TERMS: ['search_terms', 'search terms', 'searchterms', 'query'],
  KEYWORDS: ['keyword', 'keywords'],
  DEVICE: ['device'],
  PLACEMENT: ['placement'],
  GEOGRAPHIC: ['geo', 'geographic', 'location'],
  DEMOGRAPHICS: ['demographic', 'demographics', 'age', 'gender'],
  AUDIENCE: ['audience'],
  AD_SCHEDULE: ['ad_schedule', 'ad schedule', 'adschedule'],
  CAMPAIGN: ['campaign'],
};

interface DetectionRule {
  type: ReportType;
  check: (fields: Set<string>) => boolean;
}

/**
 * Ordered from most-specific to least-specific.
 * SEARCH_TERMS must come before KEYWORDS to win when both searchTerm
 * and keywordText are present. CAMPAIGN is last as the catch-all.
 */
const DETECTION_RULES: DetectionRule[] = [
  {
    type: 'SEARCH_TERMS',
    check: (f) =>
      f.has('searchTerm') && (f.has('matchType') || f.has('addedExcluded')),
  },
  {
    type: 'KEYWORDS',
    check: (f) => f.has('keywordText') && !f.has('searchTerm'),
  },
  {
    type: 'AD_SCHEDULE',
    check: (f) => f.has('dayOfWeek') || f.has('hourOfDay'),
  },
  {
    type: 'DEMOGRAPHICS',
    check: (f) =>
      f.has('ageRange') ||
      f.has('gender') ||
      f.has('parentalStatus') ||
      f.has('householdIncome'),
  },
  {
    type: 'AUDIENCE',
    check: (f) => f.has('audienceName') || f.has('audienceType'),
  },
  {
    type: 'GEOGRAPHIC',
    check: (f) =>
      f.has('location') ||
      f.has('country') ||
      f.has('region') ||
      f.has('city'),
  },
  {
    type: 'PLACEMENT',
    check: (f) => f.has('placement') || f.has('displayName'),
  },
  {
    type: 'DEVICE',
    check: (f) => f.has('device'),
  },
  {
    type: 'CAMPAIGN',
    check: (f) => f.has('campaignName'),
  },
];

export interface DetectionResult {
  reportType: ReportType | null;
  source: 'headers' | 'filename' | null;
  headerResult: NormalizedHeaderResult;
}

const detectFromHeaders = (
  headerResult: NormalizedHeaderResult
): ReportType | null => {
  const { canonicalFields } = headerResult;
  for (const rule of DETECTION_RULES) {
    if (rule.check(canonicalFields)) {
      return rule.type;
    }
  }
  return null;
};

const detectFromFilename = (fileName: string): ReportType | null => {
  const normalized = fileName.toLowerCase().replace(/[_-]/g, ' ');

  const orderedTypes: ReportType[] = [
    'SEARCH_TERMS',
    'KEYWORDS',
    'AD_SCHEDULE',
    'DEMOGRAPHICS',
    'AUDIENCE',
    'GEOGRAPHIC',
    'PLACEMENT',
    'DEVICE',
    'CAMPAIGN',
  ];

  for (const reportType of orderedTypes) {
    const keywords = FILENAME_KEYWORDS_BY_TYPE[reportType];
    if (keywords.some((kw) => normalized.includes(kw))) {
      return reportType;
    }
  }

  return null;
};

/**
 * Primary detection: headers first (signature-based), filename second.
 * If headers and filename conflict, headers win.
 * If headers are ambiguous, filename is used as fallback.
 */
export const detectReportTypeAdvanced = (
  fileName: string,
  rawHeaders: string[]
): DetectionResult => {
  const headerResult = normalizeAndMapHeaders(rawHeaders);

  const fromHeaders = detectFromHeaders(headerResult);
  if (fromHeaders) {
    return { reportType: fromHeaders, source: 'headers', headerResult };
  }

  const fromFilename = detectFromFilename(fileName);
  if (fromFilename) {
    return { reportType: fromFilename, source: 'filename', headerResult };
  }

  return { reportType: null, source: null, headerResult };
};

export const buildDetectionErrorMessage = (
  fileName: string,
  headerResult: NormalizedHeaderResult
): string => {
  const canonicalList = Array.from(headerResult.canonicalFields).join(', ');
  const normalizedList = headerResult.normalizedHeaders.join(', ');
  const originalList = headerResult.originalHeaders.join(', ');

  return [
    'Could not detect report type.',
    `Filename: ${fileName}`,
    `Original headers: ${originalList}`,
    `Normalized headers: ${normalizedList}`,
    `Recognized fields: ${canonicalList || '(none)'}`,
    'Ensure the CSV is a standard Google Ads report export with recognizable column headers.',
  ].join('\n');
};
