import { normalizeHeader } from './csv';

/**
 * Maps text-normalized Google Ads CSV headers to canonical field names.
 * Keys are the output of normalizeHeader() applied to raw CSV headers.
 * Only includes unambiguous mappings safe for global detection and parsing.
 */
export const CANONICAL_HEADER_MAP: Record<string, string> = {
  // ── Search Terms dimension ──
  'search term': 'searchTerm',
  'search terms': 'searchTerm',
  'query': 'searchTerm',
  'match type': 'matchType',
  'added/excluded': 'addedExcluded',

  // ── Keywords dimension ──
  'keyword text': 'keywordText',
  'keyword': 'keywordText',
  'keyword text matching query': 'keywordText',

  // ── Device dimension ──
  'device': 'device',

  // ── Placement dimension ──
  'placement': 'placement',
  'where ads showed': 'placement',
  'website': 'placement',
  'app': 'placement',
  'url': 'placement',
  'display name': 'displayName',
  'domain': 'displayName',

  // ── Geographic dimension ──
  'location': 'location',
  'location group': 'location',
  'most specific location': 'location',
  'country': 'country',
  'country/territory': 'country',
  'region': 'region',
  'state': 'region',
  'province': 'region',
  'city': 'city',

  // ── Demographics dimension ──
  'age range': 'ageRange',
  'gender': 'gender',
  'parental status': 'parentalStatus',
  'household income': 'householdIncome',

  // ── Audience dimension ──
  'audience': 'audienceName',
  'audience name': 'audienceName',
  'audience segment': 'audienceName',
  'audience type': 'audienceType',
  'segment type': 'audienceType',

  // ── Ad Schedule dimension ──
  'day of week': 'dayOfWeek',
  'hour of day': 'hourOfDay',

  // ── Date / Day dimension ──
  'day': 'day',
  'date': 'day',
  'report date': 'day',

  // ── Campaign / Ad Group identifiers ──
  'campaign': 'campaignName',
  'campaign name': 'campaignName',
  'campaign id': 'campaignId',
  'campaign type': 'campaignType',
  'ad group': 'adGroupName',
  'ad group name': 'adGroupName',

  // ── Performance metrics ──
  'clicks': 'clicks',
  'impr': 'impressions',
  'impressions': 'impressions',
  'cost': 'cost',
  'conversions': 'conversions',
  'conv': 'conversions',
  'all conv': 'conversions',
  'ctr': 'ctr',
  'avg cpc': 'avgCpc',
  'average cpc': 'avgCpc',
  'cpc': 'cpc',
  'avg cost': 'avgCost',
  'cpa': 'costPerConversion',
  'avg cpa': 'costPerConversion',
  'average cpa': 'costPerConversion',
  'cost / conv': 'costPerConversion',
  'conv rate': 'conversionRate',
  'conversion rate': 'conversionRate',
  'conv value': 'conversionValue',
  'all conv value': 'conversionValue',
  'conversion value': 'conversionValue',
  'value / conv': 'valuePerConversion',
  'avg cpm': 'avgCpm',
  'roas': 'roas',
  'conv value / cost': 'roas',
  'interactions': 'interactions',
  'interaction rate': 'interactionRate',
  'currency code': 'currencyCode',
};

export interface NormalizedHeaderResult {
  originalHeaders: string[];
  normalizedHeaders: string[];
  canonicalFields: Set<string>;
  fieldIndexMap: Map<string, number>;
}

/**
 * Normalizes raw CSV headers and maps them to canonical field names.
 * Uses exact matching against CANONICAL_HEADER_MAP.
 */
export const normalizeAndMapHeaders = (
  rawHeaders: string[]
): NormalizedHeaderResult => {
  const originalHeaders = rawHeaders;
  const normalizedHeaders = rawHeaders.map(normalizeHeader);
  const canonicalFields = new Set<string>();
  const fieldIndexMap = new Map<string, number>();

  for (let i = 0; i < normalizedHeaders.length; i++) {
    const normalized = normalizedHeaders[i];
    const canonical = CANONICAL_HEADER_MAP[normalized];
    if (canonical) {
      canonicalFields.add(canonical);
      if (!fieldIndexMap.has(canonical)) {
        fieldIndexMap.set(canonical, i);
      }
    }
  }

  return { originalHeaders, normalizedHeaders, canonicalFields, fieldIndexMap };
};

/**
 * Resolves a column index by trying canonical field names first,
 * then falling back to alias-based resolution on normalizedHeaders.
 */
export const resolveFieldIndex = (
  headerResult: NormalizedHeaderResult,
  canonicalNames: string[],
  fallbackAliases: string[]
): number => {
  for (const name of canonicalNames) {
    const idx = headerResult.fieldIndexMap.get(name);
    if (idx !== undefined) return idx;
  }

  const { normalizedHeaders } = headerResult;

  for (const alias of fallbackAliases) {
    const idx = normalizedHeaders.findIndex((h) => h === alias);
    if (idx >= 0) return idx;
  }

  for (const alias of fallbackAliases) {
    const idx = normalizedHeaders.findIndex(
      (h) => h.includes(alias) || alias.includes(h)
    );
    if (idx >= 0) return idx;
  }

  return -1;
};

/**
 * Asserts that required fields can be resolved, throwing with
 * diagnostic information (original headers, normalized headers,
 * recognized canonical fields) on failure.
 */
export const assertRequiredFieldsCanonical = (
  headerResult: NormalizedHeaderResult,
  requiredSpecs: Array<{
    key: string;
    canonical: string[];
    aliases: string[];
  }>,
  label: string
): void => {
  const missing: string[] = [];
  for (const spec of requiredSpecs) {
    if (resolveFieldIndex(headerResult, spec.canonical, spec.aliases) < 0) {
      missing.push(spec.key);
    }
  }

  if (missing.length > 0) {
    const canonicalList = Array.from(headerResult.canonicalFields).join(', ');
    const normalizedList = headerResult.normalizedHeaders.join(', ');
    throw new Error(
      `Missing required ${label} headers: ${missing.join(', ')}. ` +
        `Normalized headers: [${normalizedList}]. ` +
        `Recognized fields: [${canonicalList || '(none)'}]`
    );
  }
};
