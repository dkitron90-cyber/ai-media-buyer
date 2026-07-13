import { prisma } from '../db/prisma';
import { getReportStatus } from './reportService';
import { getActiveReportIds, getActiveReportMap } from './activeReportService';
import {
  getDataWindow,
  type AlignmentStatus,
  type FreshnessStatus,
} from './dataWindowService';
import type { ReportType } from '../lib/reportTypes';
import { getCampaignTypeRules } from './campaignTypeRulesService';

export type SufficiencyLabel = 'WEAK' | 'DIRECTIONAL' | 'STRONG';

export interface AnalysisReadiness {
  campaignId: number;
  campaignType: string;
  relevantReportTypes: ReportType[];
  uploadedReportTypes: ReportType[];
  parsedReportTypes: ReportType[];
  sufficiencyLabel: SufficiencyLabel;
  reasons: string[];
  totals: {
    clicks: number;
    impressions: number;
    cost: number;
    conversions: number;
  };
  freshnessStatus: FreshnessStatus;
  alignmentStatus: AlignmentStatus;
}

const loadSegmentSummaries = async (
  campaignId: number,
  activeIds: Set<number>
) => {
  const activeFilter =
    activeIds.size > 0
      ? { campaignId, uploadedReportId: { in: Array.from(activeIds) } }
      : { campaignId };

  try {
    const [
      searchTerms,
      keywords,
      devices,
      placements,
      geographic,
      demographics,
      audiences,
      adSchedule,
      campaignRows,
    ] = await Promise.all([
      prisma.searchTermReportRow.findMany({ where: activeFilter }),
      prisma.keywordReportRow.findMany({ where: activeFilter }),
      prisma.deviceReportRow.findMany({ where: activeFilter }),
      prisma.placementReportRow.findMany({ where: activeFilter }),
      prisma.geographicReportRow.findMany({ where: activeFilter }),
      prisma.demographicsReportRow.findMany({ where: activeFilter }),
      prisma.audienceReportRow.findMany({ where: activeFilter }),
      prisma.adScheduleReportRow.findMany({ where: activeFilter }),
      prisma.campaignReportRow.findMany({ where: activeFilter }),
    ]);

    return {
      searchTerms,
      keywords,
      devices,
      placements,
      geographic,
      demographics,
      audiences,
      adSchedule,
      campaignRows,
    };
  } catch {
    return {
      searchTerms: [],
      keywords: [],
      devices: [],
      placements: [],
      geographic: [],
      demographics: [],
      audiences: [],
      adSchedule: [],
      campaignRows: [],
    };
  }
};

type CoreTotals = {
  clicks: number;
  impressions: number;
  cost: number;
  conversions: number;
};

type SegmentBundle = Awaited<ReturnType<typeof loadSegmentSummaries>>;

const sumRowMetrics = (
  rows: Array<{
    clicks?: number | null;
    impressions?: number | null;
    cost?: number | null;
    conversions?: number | null;
  }>
): CoreTotals =>
  rows.reduce<CoreTotals>(
    (acc, row) => ({
      clicks: acc.clicks + (row.clicks ?? 0),
      impressions: acc.impressions + (row.impressions ?? 0),
      cost: acc.cost + (row.cost ?? 0),
      conversions: acc.conversions + (row.conversions ?? 0),
    }),
    { clicks: 0, impressions: 0, cost: 0, conversions: 0 }
  );

const scoreTotals = (t: CoreTotals): number =>
  t.cost * 1_000_000 + t.impressions + t.clicks;

/**
 * Campaign-level totals should prefer CAMPAIGN report rows. Many real accounts only upload
 * breakdown reports (placement, device, etc.) — those rows still carry spend/clicks and must
 * feed readiness + AI context when CAMPAIGN rows are missing or all-zero.
 */
const inferCoreTotalsFromSegments = (
  campaignType: string,
  segments: SegmentBundle
): { totals: CoreTotals; provenance: string } => {
  const fromCampaign = sumRowMetrics(segments.campaignRows);
  if (scoreTotals(fromCampaign) > 0) {
    return { totals: fromCampaign, provenance: 'CAMPAIGN_REPORT' };
  }

  const n = campaignType.trim().toUpperCase();
  const candidates: Array<{ label: string; rows: SegmentBundle[keyof SegmentBundle] }> = [];

  if (n === 'SEARCH') {
    candidates.push({ label: 'KEYWORDS', rows: segments.keywords });
    candidates.push({ label: 'SEARCH_TERMS', rows: segments.searchTerms });
    candidates.push({ label: 'DEVICE', rows: segments.devices });
    candidates.push({ label: 'GEOGRAPHIC', rows: segments.geographic });
  } else if (n === 'DISPLAY') {
    candidates.push({ label: 'PLACEMENT', rows: segments.placements });
    candidates.push({ label: 'AUDIENCE', rows: segments.audiences });
    candidates.push({ label: 'DEMOGRAPHICS', rows: segments.demographics });
    candidates.push({ label: 'DEVICE', rows: segments.devices });
    candidates.push({ label: 'GEOGRAPHIC', rows: segments.geographic });
  } else if (
    n === 'PERFORMANCE_MAX' ||
    n === 'PERFORMANCE MAX' ||
    n === 'PMAX'
  ) {
    candidates.push({ label: 'SEARCH_TERMS', rows: segments.searchTerms });
    candidates.push({ label: 'AUDIENCE', rows: segments.audiences });
    candidates.push({ label: 'DEVICE', rows: segments.devices });
    candidates.push({ label: 'GEOGRAPHIC', rows: segments.geographic });
  } else if (n === 'VIDEO' || n === 'YOUTUBE') {
    candidates.push({ label: 'PLACEMENT', rows: segments.placements });
    candidates.push({ label: 'AUDIENCE', rows: segments.audiences });
    candidates.push({ label: 'DEVICE', rows: segments.devices });
    candidates.push({ label: 'AD_SCHEDULE', rows: segments.adSchedule });
  } else if (n === 'SHOPPING') {
    candidates.push({ label: 'SEARCH_TERMS', rows: segments.searchTerms });
    candidates.push({ label: 'DEVICE', rows: segments.devices });
    candidates.push({ label: 'GEOGRAPHIC', rows: segments.geographic });
  } else {
    candidates.push({ label: 'DEVICE', rows: segments.devices });
    candidates.push({ label: 'PLACEMENT', rows: segments.placements });
    candidates.push({ label: 'GEOGRAPHIC', rows: segments.geographic });
  }

  let best: CoreTotals = fromCampaign;
  let bestLabel = 'NONE';
  let bestScore = 0;

  for (const c of candidates) {
    const t = sumRowMetrics(c.rows as Parameters<typeof sumRowMetrics>[0]);
    const sc = scoreTotals(t);
    if (sc > bestScore) {
      bestScore = sc;
      best = t;
      bestLabel = c.label;
    }
  }

  if (bestScore > 0) {
    return {
      totals: best,
      provenance: `SEGMENT_FALLBACK:${bestLabel}`,
    };
  }

  return { totals: fromCampaign, provenance: 'EMPTY' };
};

/**
 * Full summary totals including conversionValue (only present on CAMPAIGN rows today).
 * When CAMPAIGN rows are absent, we still roll up spend/clicks from the best matching
 * parsed breakdown so AI + readiness see real performance signals.
 */
const buildCampaignSummaryTotals = (
  campaignType: string,
  segments: SegmentBundle
): { totals: Omit<CampaignSummary['totals'], never>; provenance: string } => {
  const fromCampaign = segments.campaignRows.reduce(
    (acc, row) => {
      acc.clicks += row.clicks ?? 0;
      acc.impressions += row.impressions ?? 0;
      acc.cost += row.cost ?? 0;
      acc.conversions += row.conversions ?? 0;
      acc.conversionValue += row.conversionValue ?? 0;
      return acc;
    },
    {
      clicks: 0,
      impressions: 0,
      cost: 0,
      conversions: 0,
      conversionValue: 0,
    }
  );

  const campaignCore = sumRowMetrics(segments.campaignRows);
  if (scoreTotals(campaignCore) > 0) {
    const roas =
      fromCampaign.cost > 0 && fromCampaign.conversionValue > 0
        ? (fromCampaign.conversionValue / fromCampaign.cost) * 100
        : null;
    return {
      totals: { ...fromCampaign, roas },
      provenance: 'CAMPAIGN_REPORT',
    };
  }

  const { totals: core, provenance } = inferCoreTotalsFromSegments(
    campaignType,
    segments
  );

  const roas =
    core.cost > 0 && fromCampaign.conversionValue > 0
      ? (fromCampaign.conversionValue / core.cost) * 100
      : null;

  return {
    totals: {
      clicks: core.clicks,
      impressions: core.impressions,
      cost: core.cost,
      conversions: core.conversions,
      conversionValue: fromCampaign.conversionValue,
      roas,
    },
    provenance,
  };
};

const aggregateCampaignCore = async (
  campaignId: number,
  campaignType: string,
  activeIds: Set<number>
): Promise<{ totals: CoreTotals; totalsProvenance: string }> => {
  try {
    const segments = await loadSegmentSummaries(campaignId, activeIds);
    const { totals, provenance } = inferCoreTotalsFromSegments(
      campaignType,
      segments
    );
    return { totals, totalsProvenance: provenance };
  } catch {
    return {
      totals: { clicks: 0, impressions: 0, cost: 0, conversions: 0 },
      totalsProvenance: 'ERROR',
    };
  }
};

export const getCampaignAnalysisReadiness = async (
  campaignId: number,
  campaignType: string
): Promise<AnalysisReadiness> => {
  const status = await getReportStatus(campaignId, campaignType);
  const rules = getCampaignTypeRules(campaignType);
  const activeMap = await getActiveReportMap(campaignId);
  const activeIds = new Set(activeMap.values());

  const parsedRelevant = new Set<ReportType>();
  for (const [type] of activeMap) {
    if (status.relevantReportTypes.includes(type as ReportType)) {
      parsedRelevant.add(type as ReportType);
    }
  }

  const { totals, totalsProvenance } = await aggregateCampaignCore(
    campaignId,
    campaignType,
    activeIds
  );

  const reasons: string[] = [];

  const relevantCount = status.relevantReportTypes.length;
  const uploadedRelevantCount = status.uploadedReportTypes.length;
  const parsedRelevantCount = parsedRelevant.size;

  const importantTypes = rules.importantReportTypes;
  const uploadedImportantCount = importantTypes.filter((t) =>
    status.uploadedReportTypes.includes(t)
  ).length;
  const parsedImportantCount = importantTypes.filter((t) =>
    parsedRelevant.has(t)
  ).length;

  if (uploadedRelevantCount === 0) {
    reasons.push('No relevant reports uploaded for this campaign type.');
  } else if (uploadedRelevantCount < relevantCount) {
    reasons.push(
      `Only ${uploadedRelevantCount} of ${relevantCount} relevant report types are uploaded.`
    );
  } else {
    reasons.push('All relevant report types are uploaded.');
  }

  reasons.push(
    `Important coverage (${rules.label}): ${parsedImportantCount}/${importantTypes.length} important report types are parsed.`
  );

  for (const missing of status.missingReportTypes) {
    const guidance = rules.missingReportGuidance[missing];
    if (guidance) reasons.push(guidance);
  }

  for (const warning of rules.specialWarnings) {
    reasons.push(warning);
  }

  if (parsedRelevantCount === 0) {
    reasons.push('No relevant reports have been parsed yet.');
  } else if (parsedRelevantCount < uploadedRelevantCount) {
    reasons.push(
      `Only ${parsedRelevantCount} uploaded relevant report types have parsed rows.`
    );
  } else {
    reasons.push('All uploaded relevant report types have parsed rows.');
  }

  if (totalsProvenance.startsWith('SEGMENT_FALLBACK')) {
    reasons.push(
      'Campaign-level totals are rolled up from parsed breakdown data (CAMPAIGN report rows are missing or all-zero). Performance signals still reflect uploaded segment reports.'
    );
  }

  if (totals.clicks < 100) {
    reasons.push(`Low click volume (${totals.clicks} < 100).`);
  }
  if (totals.cost < 100) {
    reasons.push(`Low spend (${totals.cost.toFixed(2)} < 100).`);
  }
  if (totals.conversions < 10) {
    reasons.push(`Low conversion volume (${totals.conversions} < 10).`);
  }

  let sufficiencyLabel: SufficiencyLabel = 'WEAK';

  const hasCoreMetrics = totals.impressions > 0 && totals.cost > 0;
  const strongReportsCoverage =
    parsedImportantCount >= rules.minimumRecommendedCoverage.strong &&
    parsedRelevantCount >= 2;

  if (
    strongReportsCoverage &&
    hasCoreMetrics &&
    totals.clicks >= 300 &&
    totals.cost >= 500 &&
    totals.conversions >= 30
  ) {
    sufficiencyLabel = 'STRONG';
  } else if (
    uploadedImportantCount >= rules.minimumRecommendedCoverage.directional &&
    parsedImportantCount >= 1 &&
    hasCoreMetrics &&
    (totals.clicks >= 50 || totals.cost >= 150)
  ) {
    sufficiencyLabel = 'DIRECTIONAL';
  }

  if (!hasCoreMetrics) {
    reasons.push('Core campaign metrics (impressions, cost) are missing or zero.');
  }

  const dataWindow = await getDataWindow(campaignId);

  if (dataWindow.freshnessStatus === 'STALE') {
    reasons.push('Report data is stale (>30 days old). Analysis quality will be limited.');
    if (sufficiencyLabel === 'STRONG') {
      sufficiencyLabel = 'DIRECTIONAL';
    }
  } else if (dataWindow.freshnessStatus === 'AGING') {
    reasons.push('Report data is aging (14–30 days old). Consider uploading newer reports.');
  }

  if (dataWindow.alignmentStatus === 'MISALIGNED') {
    reasons.push(
      'Active report date ranges are misaligned. Cross-report comparisons may be unreliable.'
    );
    if (sufficiencyLabel === 'STRONG') {
      sufficiencyLabel = 'DIRECTIONAL';
    }
  } else if (dataWindow.alignmentStatus === 'PARTIAL') {
    reasons.push(
      'Active report date ranges only partially overlap. Some comparisons are directional.'
    );
  }

  return {
    campaignId,
    campaignType,
    relevantReportTypes: status.relevantReportTypes,
    uploadedReportTypes: status.uploadedReportTypes,
    parsedReportTypes: Array.from(parsedRelevant),
    sufficiencyLabel,
    reasons,
    totals,
    freshnessStatus: dataWindow.freshnessStatus,
    alignmentStatus: dataWindow.alignmentStatus,
  };
};

export interface SegmentSummary {
  key: string;
  clicks: number;
  impressions: number;
  cost: number;
  conversions: number;
  ctr?: number | null;
  cpc?: number | null;
  cpa?: number | null;
  roas?: number | null;
}

export interface CampaignSummary {
  campaignId: number;
  campaignType: string;
  totals: {
    clicks: number;
    impressions: number;
    cost: number;
    conversions: number;
    conversionValue: number;
    roas: number | null;
  };
  strongestSegments: SegmentSummary[];
  weakestSegments: SegmentSummary[];
  wastedSpendCandidates: SegmentSummary[];
  scaleCandidates: SegmentSummary[];
  exclusionsCandidates: SegmentSummary[];
  missingDataNotes: string[];
  breakdowns: {
    searchTerms?: SegmentSummary[];
    keywords?: SegmentSummary[];
    devices?: SegmentSummary[];
    placements?: SegmentSummary[];
    geographic?: SegmentSummary[];
    demographics?: SegmentSummary[];
    audiences?: SegmentSummary[];
    adSchedule?: SegmentSummary[];
    campaigns?: SegmentSummary[];
  };
  /** How `totals` were computed (campaign aggregate vs best segment rollup). */
  totalsProvenance?: string;
  /** Parsed row counts by report family (active reports only). */
  segmentRowCounts?: Record<string, number>;
}

const toSegmentSummary = (
  key: string,
  clicks: number,
  impressions: number,
  cost: number,
  conversions: number,
  conversionValue?: number | null
): SegmentSummary => {
  const ctr =
    impressions > 0 && clicks > 0 ? (clicks / impressions) * 100 : null;
  const cpc = clicks > 0 && cost > 0 ? cost / clicks : null;
  const cpa = conversions > 0 && cost > 0 ? cost / conversions : null;
  const roas =
    conversionValue && cost > 0 ? (conversionValue / cost) * 100 : null;

  return {
    key,
    clicks,
    impressions,
    cost,
    conversions,
    ctr,
    cpc,
    cpa,
    roas,
  };
};

const pickTopAndBottomSegments = (segments: SegmentSummary[]) => {
  // Include rows with spend OR volume. A strict $10 floor hid real segments when:
  // - cost column was missing in export (zeros), or
  // - rows were low spend but still decision-relevant.
  const filtered = segments.filter((s) => {
    const cost = s.cost ?? 0;
    const imp = s.impressions ?? 0;
    const clk = s.clicks ?? 0;
    return cost > 0 || imp > 0 || clk > 0;
  });

  const byCpa = [...filtered].sort((a, b) => {
    const aCpa = a.cpa ?? Number.POSITIVE_INFINITY;
    const bCpa = b.cpa ?? Number.POSITIVE_INFINITY;
    return aCpa - bCpa;
  });

  const strongest = byCpa.slice(0, 5);
  const weakest = byCpa
    .slice()
    .reverse()
    .slice(0, 5);

  const refCpa = strongest[0]?.cpa ?? 0;

  const wasted = filtered.filter((s) => {
    const cost = s.cost ?? 0;
    const clk = s.clicks ?? 0;
    if (cost >= 20) {
      return (
        s.conversions === 0 || (refCpa > 0 && (s.cpa ?? 0) > 2 * refCpa)
      );
    }
    if (cost >= 5 && s.conversions === 0) return true;
    if (cost === 0 && clk >= 50 && s.conversions === 0) return true;
    return false;
  });

  const scale = strongest.filter(
    (s) =>
      s.conversions >= 3 &&
      (s.cpa ?? Number.POSITIVE_INFINITY) <=
        (strongest[0]?.cpa ?? Number.POSITIVE_INFINITY)
  );

  return { strongest, weakest, wasted, scale };
};

export const getCampaignSummary = async (
  campaignId: number,
  campaignType: string
): Promise<CampaignSummary> => {
  const rules = getCampaignTypeRules(campaignType);
  const activeIds = await getActiveReportIds(campaignId);

  const {
    searchTerms,
    keywords,
    devices,
    placements,
    geographic,
    demographics,
    audiences,
    adSchedule,
    campaignRows,
  } = await loadSegmentSummaries(campaignId, activeIds);

  const { totals: rollupTotals, provenance: totalsProvenance } =
    buildCampaignSummaryTotals(campaignType, {
      searchTerms,
      keywords,
      devices,
      placements,
      geographic,
      demographics,
      audiences,
      adSchedule,
      campaignRows,
    });

  const totals = rollupTotals;
  const totalsRoas = totals.roas;

  const segmentRowCounts: Record<string, number> = {
    CAMPAIGN: campaignRows.length,
    SEARCH_TERMS: searchTerms.length,
    KEYWORDS: keywords.length,
    DEVICE: devices.length,
    PLACEMENT: placements.length,
    GEOGRAPHIC: geographic.length,
    DEMOGRAPHICS: demographics.length,
    AUDIENCE: audiences.length,
    AD_SCHEDULE: adSchedule.length,
  };

  const searchTermSegments: SegmentSummary[] = searchTerms.map((row) =>
    toSegmentSummary(
      row.searchTerm,
      row.clicks,
      row.impressions,
      row.cost,
      row.conversions
    )
  );

  const keywordSegments: SegmentSummary[] = keywords.map((row) =>
    toSegmentSummary(
      row.keywordText,
      row.clicks,
      row.impressions,
      row.cost,
      row.conversions
    )
  );

  const deviceSegments: SegmentSummary[] = devices.map((row) =>
    toSegmentSummary(
      row.device,
      row.clicks,
      row.impressions,
      row.cost,
      row.conversions
    )
  );

  const placementSegments: SegmentSummary[] = placements.map((row) =>
    toSegmentSummary(
      row.placement,
      row.clicks,
      row.impressions,
      row.cost,
      row.conversions
    )
  );

  const geographicSegments: SegmentSummary[] = geographic.map((row) =>
    toSegmentSummary(
      row.location,
      row.clicks,
      row.impressions,
      row.cost,
      row.conversions
    )
  );

  const demographicsSegments: SegmentSummary[] = demographics.map((row) =>
    toSegmentSummary(
      `${row.demographicType}:${row.demographicValue}`,
      row.clicks,
      row.impressions,
      row.cost,
      row.conversions
    )
  );

  const audienceSegments: SegmentSummary[] = audiences.map((row) =>
    toSegmentSummary(
      row.audienceName,
      row.clicks,
      row.impressions,
      row.cost,
      row.conversions
    )
  );

  const adScheduleSegments: SegmentSummary[] = adSchedule.map((row) =>
    toSegmentSummary(
      `${row.dayOfWeek} ${row.hourOfDay}:00`,
      row.clicks,
      row.impressions,
      row.cost,
      row.conversions
    )
  );

  const campaignSegments: SegmentSummary[] = campaignRows.map((row) =>
    toSegmentSummary(
      row.campaignName,
      row.clicks,
      row.impressions,
      row.cost,
      row.conversions,
      row.conversionValue
    )
  );

  const strongestSegments: SegmentSummary[] = [];
  const weakestSegments: SegmentSummary[] = [];
  const wastedSpendCandidates: SegmentSummary[] = [];
  const scaleCandidates: SegmentSummary[] = [];

  const addFrom = (segments: SegmentSummary[]) => {
    const { strongest, weakest, wasted, scale } = pickTopAndBottomSegments(segments);
    strongestSegments.push(...strongest);
    weakestSegments.push(...weakest);
    wastedSpendCandidates.push(...wasted);
    scaleCandidates.push(...scale);
  };

  const normalizedType = campaignType.trim().toUpperCase();
  if (normalizedType === 'SEARCH') {
    addFrom(searchTermSegments);
    addFrom(keywordSegments);
    addFrom(deviceSegments);
    addFrom(geographicSegments);
  } else if (normalizedType === 'DISPLAY') {
    addFrom(placementSegments);
    addFrom(audienceSegments);
    addFrom(demographicsSegments);
    addFrom(deviceSegments);
    addFrom(geographicSegments);
  } else if (normalizedType === 'PERFORMANCE_MAX' || normalizedType === 'PERFORMANCE MAX' || normalizedType === 'PMAX') {
    addFrom(campaignSegments);
    if (searchTermSegments.length > 0) addFrom(searchTermSegments);
    addFrom(audienceSegments);
    addFrom(deviceSegments);
    addFrom(geographicSegments);
  } else if (normalizedType === 'VIDEO' || normalizedType === 'YOUTUBE') {
    addFrom(placementSegments);
    addFrom(audienceSegments);
    addFrom(deviceSegments);
    addFrom(adScheduleSegments);
  } else if (normalizedType === 'SHOPPING') {
    addFrom(campaignSegments);
    if (searchTermSegments.length > 0) addFrom(searchTermSegments);
    addFrom(deviceSegments);
    addFrom(geographicSegments);
  } else {
    // Conservative default: aggregate and device patterns
    addFrom(campaignSegments);
    addFrom(deviceSegments);
  }

  const missingDataNotes: string[] = [];
  if (campaignRows.length === 0) {
    missingDataNotes.push('No parsed CAMPAIGN report rows loaded.');
  }
  if (searchTerms.length === 0) {
    missingDataNotes.push('No parsed SEARCH_TERMS rows loaded.');
  }
  if (keywords.length === 0) {
    missingDataNotes.push('No parsed KEYWORDS rows loaded.');
  }
  if (devices.length === 0) {
    missingDataNotes.push('No parsed DEVICE rows loaded.');
  }
  if (placements.length === 0) {
    missingDataNotes.push('No parsed PLACEMENT rows loaded.');
  }
  if (geographic.length === 0) {
    missingDataNotes.push('No parsed GEOGRAPHIC rows loaded.');
  }
  if (audiences.length === 0) {
    missingDataNotes.push('No parsed AUDIENCE rows loaded.');
  }
  if (demographics.length === 0) {
    missingDataNotes.push('No parsed DEMOGRAPHICS rows loaded.');
  }
  if (adSchedule.length === 0) {
    missingDataNotes.push('No parsed AD_SCHEDULE rows loaded.');
  }

  if (totalsProvenance.startsWith('SEGMENT_FALLBACK')) {
    missingDataNotes.push(
      `Campaign-level totals are rolled up from parsed breakdown data (${totalsProvenance.replace(
        'SEGMENT_FALLBACK:',
        ''
      )}) because CAMPAIGN report rows are missing or all-zero.`
    );
  }

  for (const type of rules.importantReportTypes) {
    const guidance = rules.missingReportGuidance[type];
    if (!guidance) continue;
    const hasData =
      (type === 'CAMPAIGN' && campaignRows.length > 0) ||
      (type === 'SEARCH_TERMS' && searchTerms.length > 0) ||
      (type === 'KEYWORDS' && keywords.length > 0) ||
      (type === 'DEVICE' && devices.length > 0) ||
      (type === 'PLACEMENT' && placements.length > 0) ||
      (type === 'GEOGRAPHIC' && geographic.length > 0) ||
      (type === 'AUDIENCE' && audiences.length > 0) ||
      (type === 'DEMOGRAPHICS' && demographics.length > 0) ||
      (type === 'AD_SCHEDULE' && adSchedule.length > 0);
    if (!hasData) missingDataNotes.push(guidance);
  }

  return {
    campaignId,
    campaignType,
    totals: {
      ...totals,
      roas: totalsRoas,
    },
    totalsProvenance,
    segmentRowCounts,
    strongestSegments,
    weakestSegments,
    wastedSpendCandidates,
    scaleCandidates,
    exclusionsCandidates: wastedSpendCandidates,
    missingDataNotes,
    breakdowns: {
      searchTerms: searchTermSegments,
      keywords: keywordSegments,
      devices: deviceSegments,
      placements: placementSegments,
      geographic: geographicSegments,
      demographics: demographicsSegments,
      audiences: audienceSegments,
      adSchedule: adScheduleSegments,
      campaigns: campaignSegments,
    },
  };
};

