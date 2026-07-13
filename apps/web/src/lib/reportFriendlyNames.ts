/** User-facing names for Google Ads report types */
/** Sentence-style names for “Upload placement report” / “Upload campaign report” */
export function reportTypeTitle(code: string): string {
  const map: Record<string, string> = {
    PLACEMENT: 'placement report',
    CAMPAIGN: 'campaign report',
    SEARCH_TERMS: 'search terms report',
    KEYWORDS: 'keywords report',
    DEVICE: 'device report',
    GEOGRAPHIC: 'location report',
    DEMOGRAPHICS: 'demographics report',
    AUDIENCE: 'audience report',
    AD_SCHEDULE: 'ad schedule report',
    CAMPAIGN_REPORT: 'campaign report',
  };
  return map[code] ?? `${code.replace(/_/g, ' ').toLowerCase()} report`;
}

export function reportTypeWhy(code: string): string {
  const map: Record<string, string> = {
    PLACEMENT: 'Shows where your ads appeared so we can cut waste and bad sites.',
    CAMPAIGN: 'Shows overall spend and results so we can judge performance.',
    SEARCH_TERMS: 'Shows real searches so we can add negatives and match intent.',
    KEYWORDS: 'Shows keyword performance so we can tune bids and match types.',
    DEVICE: 'Shows phone vs desktop so we can adjust bids.',
    GEOGRAPHIC: 'Shows which regions work so we can focus spend.',
    DEMOGRAPHICS: 'Shows age/gender performance for smarter targeting.',
    AUDIENCE: 'Shows how audiences perform together.',
    AD_SCHEDULE: 'Shows which hours and days convert best.',
  };
  return (
    map[code] ??
    'Helps the assistant give specific recommendations for this campaign.'
  );
}

/** Prefer high-impact reports first in the checklist */
export function sortReportTypesForDisplay(types: string[]): string[] {
  const priority = [
    'PLACEMENT',
    'CAMPAIGN',
    'SEARCH_TERMS',
    'KEYWORDS',
    'DEVICE',
    'GEOGRAPHIC',
    'AUDIENCE',
    'DEMOGRAPHICS',
    'AD_SCHEDULE',
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of priority) {
    if (types.includes(p) && !seen.has(p)) {
      out.push(p);
      seen.add(p);
    }
  }
  for (const t of types) {
    if (!seen.has(t)) {
      out.push(t);
      seen.add(t);
    }
  }
  return out;
}
