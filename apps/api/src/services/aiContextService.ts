import type { CampaignGapsResult, CampaignGap } from './gapDetectionService';
import { getCampaignGaps } from './gapDetectionService';
import type { CampaignSummary, SegmentSummary, AnalysisReadiness } from './analysisService';
import { getCampaignAnalysisReadiness, getCampaignSummary } from './analysisService';
import type { DataWindow } from './dataWindowService';
import { getDataWindow } from './dataWindowService';
import { getCampaignById } from './campaignService';
import { getCampaignSettingsView } from './campaignSettingsService';
import { getCampaignTypeRules } from './campaignTypeRulesService';
import {
  getCampaignTypeRegistryEntry,
  resolveCanonicalCampaignType,
  type CanonicalCampaignTypeCode,
  type ChecklistTemplate,
  type PlaybookTemplate,
  type CampaignTypeRegistryEntry,
} from '../campaignTypes';
import type { ReportType } from '../lib/reportTypes';
import { getReportStatus, listUploadedReports } from './reportService';
import type { ReportStatus } from './reportService';
import { listPlacements } from './placementListService';
import { listActions } from './actionPlanService';
import { getActionImpactSummary } from './actionImpactService';
import { listAnalyses } from './campaignAnalysisHistoryService';
import { listCampaignNotes } from './campaignNoteService';
import { listCampaignEvents } from './campaignEventService';
import { getAdvisoryProfileForClient } from './advisoryProfileService';
import { getBenchmarkForVertical } from '../data/verticalBenchmarks';
import type { LandingPageAnalysisResult } from './landingPageAnalyzerService';

import type { ActionPlanItemDto } from './actionPlanService';
import type { PlacementListEntryDto } from './placementListService';
import { getCampaignTypeRules as legacyGetCampaignTypeRules } from './campaignTypeRulesService';

// -----------------------------
// Context type (prompt input)
// -----------------------------

export type AiCampaignContext = {
  campaign: {
    id: number;
    clientId: number;
    name: string;
    type: string;
    status: string;
    monthlyBudget?: string | null;
    targetCpa?: string | null;
    product?: string | null;
    productUrl?: string | null;
  };
  settings: {
    canonicalCampaignType: CanonicalCampaignTypeCode;
    settingsSchemaVersion: number;
    settings: unknown;
    createdAt: string | null;
    updatedAt: string | null;
  };
  campaignTypeTemplate: {
    code: CanonicalCampaignTypeCode;
    label: string;
    importantReportTypes: ReportType[];
    optimizationPriorities: string[];
    aiInstructions: string[];
    specialWarnings: string[];
    missingReportGuidance: Partial<Record<ReportType, string>>;
    defaultPlaybookTemplate: PlaybookTemplate;
    defaultChecklistTemplate: ChecklistTemplate;
  };
  checklist: {
    completion: {
      status: 'unknown';
      completionPercent: number | null;
    };
    items: Array<{
      id: string;
      label: string;
      detail?: string;
      phase: 'launch' | 'optimization';
    }>;
  };
  trust: {
    readiness: AnalysisReadiness;
    dataWindow: DataWindow;
    readinessReasons: string[];
    evidenceStrengthHint: 'weak' | 'directional' | 'strong' | 'unknown';
  };
  reports: {
    reportStatus: ReportStatus;
    uploadedReports: Array<{
      id: number;
      reportType: string;
      uploadStatus: string;
      uploadedAt?: string;
    }>;
  };
  gaps: CampaignGap[];
  performanceSummary: {
    totals: CampaignSummary['totals'];
    strongestSegments: SegmentSummary[];
    weakestSegments: SegmentSummary[];
    wastedSpendCandidates: SegmentSummary[];
    scaleCandidates: SegmentSummary[];
    exclusionsCandidates: SegmentSummary[];
    missingDataNotes: string[];
    breakdowns: NonNullable<CampaignSummary['breakdowns']>;
  };
  /** How totals were computed + row counts (helps the model interpret coverage vs volume). */
  performanceSummaryMeta: {
    totalsProvenance: string;
    segmentRowCounts: Record<string, number>;
    breakdownCounts: Record<string, number>;
  };
  placements: Array<{
    id: number;
    listType: string;
    placement: string;
    displayName: string | null;
    source: string;
    reason: string | null;
    status: string;
    analysisId: number | null;
    createdAt: string;
  }>;
  actions: Array<{
    id: number;
    actionType: string;
    title: string;
    priority: string;
    confidence: string;
    status: string;
    analysisId: number | null;
    createdAt: string;
  }>;
  actionImpact: Array<{
    actionId: number;
    assessment: {
      status: 'insufficient_data' | 'measured';
      message: string;
      highlights?: string[];
    };
    delta: Record<string, unknown> | null;
  }>;
  /** Client-level advisor context (vertical, conversion model, LP signals). */
  advisory: {
    websiteUrl: string | null;
    industryVertical: string | null;
    conversionType: string | null;
    accountMaturity: string | null;
    approximateMonthlySpend: string | null;
    landingPageAnalysis: LandingPageAnalysisResult | null;
  };
  /** Directional industry priors — compare to performanceSummary cautiously. */
  verticalBenchmark: {
    vertical: string;
    avgCpcRange: string;
    avgCtrRange: string;
    avgConvRateRange: string;
    avgCpaRange: string;
    notes?: string;
  } | null;
  history: {
    analyses: Array<{
      id: number;
      createdAt: string;
      evidenceStrength: string;
      executiveSummary: string | null;
      missingData: string[];
      findings: string[];
    }>;
    notes: Array<{
      id: number;
      createdAt: string;
      pinned: boolean;
      contentPreview: string;
    }>;
    events: Array<{
      id: number;
      occurredAt: string;
      type: string;
      title: string;
    }>;
  };
};

// -----------------------------
// Token safety controls
// -----------------------------

const MAX_PLACEMENTS = 20;
const MAX_ACTIONS = 10;
const MAX_ACTION_IMPACT = 5;
const MAX_BREAKDOWN_SEGMENTS = 10;
const MAX_SEGMENTS = 10;
const MAX_HISTORY_ANALYSES = 5;
const MAX_HISTORY_NOTES = 10;
const MAX_HISTORY_EVENTS = 10;
const MAX_REPORTS = 20;
const MAX_GAPS = 10;
const MAX_CHECKLIST_ITEMS = 20;

function trimText(input: string, maxLen: number): string {
  const s = input.trim();
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 1) + '…';
}

function capArray<T>(arr: readonly T[], max: number): T[] {
  return Array.isArray(arr) ? arr.slice(0, max) : [];
}

function capByCostDesc(segments: SegmentSummary[], max: number): SegmentSummary[] {
  if (!Array.isArray(segments)) return [];
  return [...segments]
    .sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0))
    .slice(0, max);
}

function safeCompletionUnknown(items: ChecklistTemplate['launch'] | ChecklistTemplate['optimization'] | Array<unknown>): never[] {
  // Placeholder to satisfy TS narrowing in older TS versions.
  return [] as never[];
}

function mapCampaignToContextRow(campaign: Awaited<ReturnType<typeof getCampaignById>>): AiCampaignContext['campaign'] | null {
  if (!campaign) return null;
  return {
    id: campaign.id,
    clientId: campaign.clientId,
    name: campaign.name,
    type: campaign.type,
    status: campaign.status,
    monthlyBudget: (campaign.monthlyBudget ?? null)?.toString() ?? null,
    targetCpa: (campaign.targetCpa ?? null)?.toString() ?? null,
    product: campaign.product ?? null,
    productUrl: campaign.productUrl ?? null,
  };
}

function checklistFromTemplate(template: ChecklistTemplate): AiCampaignContext['checklist'] {
  const items = [...template.launch, ...template.optimization].slice(0, MAX_CHECKLIST_ITEMS);
  return {
    completion: { status: 'unknown', completionPercent: null },
    items: items.map((it) => ({
      id: it.id,
      label: it.label,
      detail: it.detail,
      phase: it.phase,
    })),
  };
}

function evidenceHintFromReadiness(readiness: AnalysisReadiness): AiCampaignContext['trust']['evidenceStrengthHint'] {
  if (readiness.sufficiencyLabel === 'STRONG') return 'strong';
  if (readiness.sufficiencyLabel === 'DIRECTIONAL') return 'directional';
  return 'weak';
}

function toGapTopN(gaps: CampaignGap[]): CampaignGap[] {
  const score = (s: string) => (s === 'high' ? 0 : s === 'medium' ? 1 : 2);
  return [...(gaps ?? [])]
    .sort((a, b) => score(a.severity) - score(b.severity))
    .slice(0, MAX_GAPS);
}

function trimBreakdowns(breakdowns: NonNullable<CampaignSummary['breakdowns']>): NonNullable<CampaignSummary['breakdowns']> {
  const cap = (arr?: SegmentSummary[]): SegmentSummary[] | undefined => {
    if (!arr) return undefined;
    // Deterministic cap: top 10 by cost.
    return capByCostDesc(arr, MAX_BREAKDOWN_SEGMENTS);
  };

  return {
    searchTerms: cap(breakdowns.searchTerms),
    keywords: cap(breakdowns.keywords),
    devices: cap(breakdowns.devices),
    placements: cap(breakdowns.placements),
    geographic: cap(breakdowns.geographic),
    demographics: cap(breakdowns.demographics),
    audiences: cap(breakdowns.audiences),
    adSchedule: cap(breakdowns.adSchedule),
    campaigns: cap(breakdowns.campaigns),
  };
}

// -----------------------------
// Main builder
// -----------------------------

export async function buildCampaignAiContext(
  campaignId: number
): Promise<AiCampaignContext | null> {
  const campaign = await getCampaignById(campaignId);
  const campaignRow = mapCampaignToContextRow(campaign);
  if (!campaignRow) return null;

  const canonicalType = resolveCanonicalCampaignType(campaign!.type);

  const trustNotes: string[] = [];

  const advisoryRow = await (async () => {
    try {
      return await getAdvisoryProfileForClient(campaign!.clientId);
    } catch (e) {
      trustNotes.push(`advisory profile unavailable: ${(e as Error).message}`);
      return null;
    }
  })();

  const rawLp = advisoryRow?.landingPageAnalysis ?? null;
  const landingPageAnalysisForAi: LandingPageAnalysisResult | null = rawLp
    ? {
        ...rawLp,
        title: rawLp.title ? trimText(rawLp.title, 180) : null,
        metaDescription: rawLp.metaDescription
          ? trimText(rawLp.metaDescription, 240)
          : null,
        h1: rawLp.h1 ? trimText(rawLp.h1, 120) : null,
        warnings: capArray(rawLp.warnings ?? [], 8),
      }
    : null;

  const advisory: AiCampaignContext['advisory'] = {
    websiteUrl: advisoryRow?.websiteUrl ?? null,
    industryVertical: advisoryRow?.industryVertical ?? null,
    conversionType: advisoryRow?.conversionType ?? null,
    accountMaturity: advisoryRow?.accountMaturity ?? null,
    approximateMonthlySpend: advisoryRow?.approximateMonthlySpend ?? null,
    landingPageAnalysis: landingPageAnalysisForAi,
  };

  const verticalBenchmark = (() => {
    const b = getBenchmarkForVertical(advisory.industryVertical);
    if (!b) return null;
    const pct = (a: number, bmax: number) =>
      `${(a * 100).toFixed(1)}%–${(bmax * 100).toFixed(1)}%`;
    return {
      vertical: b.vertical,
      avgCpcRange: `${b.avgCpc.min}–${b.avgCpc.max}`,
      avgCtrRange: pct(b.avgCtr.min, b.avgCtr.max),
      avgConvRateRange: pct(b.avgConvRate.min, b.avgConvRate.max),
      avgCpaRange: `${b.avgCpa.min}–${b.avgCpa.max}`,
      notes: b.notes,
    };
  })();

  const settingsView = await (async () => {
    try {
      return await getCampaignSettingsView(campaignId);
    } catch (e) {
      trustNotes.push(`settings unavailable: ${(e as Error).message}`);
      return null;
    }
  })();

  const settings = settingsView
    ? {
        canonicalCampaignType: settingsView.canonicalCampaignType,
        settingsSchemaVersion: settingsView.settingsSchemaVersion,
        settings: settingsView.settings,
        createdAt: settingsView.createdAt,
        updatedAt: settingsView.updatedAt,
      }
    : {
        canonicalCampaignType: canonicalType,
        settingsSchemaVersion: 0,
        settings: {},
        createdAt: null,
        updatedAt: null,
      };

  let registry: CampaignTypeRegistryEntry;
  try {
    registry = getCampaignTypeRegistryEntry(canonicalType);
  } catch {
    registry = getCampaignTypeRegistryEntry('OTHER');
  }

  const rules = (() => {
    try {
      return getCampaignTypeRules(campaign!.type);
    } catch {
      return legacyGetCampaignTypeRules('OTHER');
    }
  })();

  const checklist = checklistFromTemplate(registry.defaultChecklistTemplate);

  const readiness = await (async () => {
    try {
      return await getCampaignAnalysisReadiness(campaignId, campaign!.type);
    } catch (e) {
      trustNotes.push(`analysis readiness unavailable: ${(e as Error).message}`);
      const fallback: AnalysisReadiness = {
        campaignId,
        campaignType: campaign!.type,
        relevantReportTypes: [],
        uploadedReportTypes: [],
        parsedReportTypes: [],
        sufficiencyLabel: 'WEAK',
        reasons: ['Analysis readiness could not be computed (service failure).'],
        totals: { clicks: 0, impressions: 0, cost: 0, conversions: 0 },
        freshnessStatus: 'UNKNOWN',
        alignmentStatus: 'UNKNOWN',
      };
      return fallback;
    }
  })();

  const dataWindow = await (async () => {
    try {
      return await getDataWindow(campaignId);
    } catch (e) {
      trustNotes.push(`data window unavailable: ${(e as Error).message}`);
      return {
        campaignId,
        activeReportRanges: [],
        recommendedAnalysisWindow: { start: null, end: null },
        alignmentStatus: 'UNKNOWN',
        freshnessStatus: 'UNKNOWN',
        notes: [],
      } as DataWindow;
    }
  })();

  const trust: AiCampaignContext['trust'] = {
    readiness,
    dataWindow,
    readinessReasons: [
      ...(readiness.reasons ?? []),
      ...(dataWindow.notes ?? []),
      ...(trustNotes ?? []),
    ].slice(0, 20),
    evidenceStrengthHint: evidenceHintFromReadiness(readiness),
  };

  const [reportStatus, uploadedReportsAll] = await (async () => {
    try {
      const status = await getReportStatus(campaignId, campaign!.type);
      const uploadedAll = await listUploadedReports(campaignId);
      return [status, uploadedAll] as const;
    } catch (e) {
      trustNotes.push(`report status unavailable: ${(e as Error).message}`);
      const fallbackStatus: ReportStatus = {
        campaignId,
        campaignType: campaign!.type,
        relevantReportTypes: [],
        uploadedReportTypes: [],
        missingReportTypes: [],
        uploadedReports: [],
      };
      return [fallbackStatus, []] as const;
    }
  })();

  const uploadedReports = capArray(uploadedReportsAll, MAX_REPORTS).map((r) => ({
    id: r.id,
    reportType: r.reportType,
    uploadStatus: r.uploadStatus,
    uploadedAt: r.uploadedAt?.toISOString(),
  }));

  const gaps = await (async () => {
    try {
      const result: CampaignGapsResult | null = await getCampaignGaps(campaignId);
      return toGapTopN(result?.gaps ?? []);
    } catch (e) {
      trustNotes.push(`gaps unavailable: ${(e as Error).message}`);
      return [];
    }
  })();

  const { performanceSummary, performanceSummaryMeta } = await (async (): Promise<{
    performanceSummary: AiCampaignContext['performanceSummary'];
    performanceSummaryMeta: AiCampaignContext['performanceSummaryMeta'];
  }> => {
    try {
      const summary = await getCampaignSummary(campaignId, campaign!.type);

      const breakdowns = trimBreakdowns(summary.breakdowns);

      const breakdownCounts: Record<string, number> = {
        searchTerms: summary.breakdowns.searchTerms?.length ?? 0,
        keywords: summary.breakdowns.keywords?.length ?? 0,
        devices: summary.breakdowns.devices?.length ?? 0,
        placements: summary.breakdowns.placements?.length ?? 0,
        geographic: summary.breakdowns.geographic?.length ?? 0,
        demographics: summary.breakdowns.demographics?.length ?? 0,
        audiences: summary.breakdowns.audiences?.length ?? 0,
        adSchedule: summary.breakdowns.adSchedule?.length ?? 0,
        campaigns: summary.breakdowns.campaigns?.length ?? 0,
      };

      // Cap potentially large candidate lists deterministically.
      return {
        performanceSummary: {
          totals: summary.totals,
          strongestSegments: capByCostDesc(summary.strongestSegments, MAX_SEGMENTS),
          weakestSegments: capByCostDesc(summary.weakestSegments, MAX_SEGMENTS),
          wastedSpendCandidates: capByCostDesc(summary.wastedSpendCandidates, MAX_SEGMENTS),
          scaleCandidates: capByCostDesc(summary.scaleCandidates, MAX_SEGMENTS),
          exclusionsCandidates: capByCostDesc(summary.exclusionsCandidates, MAX_SEGMENTS),
          missingDataNotes: capArray(summary.missingDataNotes ?? [], 10),
          breakdowns,
        },
        performanceSummaryMeta: {
          totalsProvenance: summary.totalsProvenance ?? 'unknown',
          segmentRowCounts: summary.segmentRowCounts ?? {},
          breakdownCounts,
        },
      };
    } catch (e) {
      trustNotes.push(`performance summary unavailable: ${(e as Error).message}`);

      return {
        performanceSummary: {
          totals: {
            clicks: 0,
            impressions: 0,
            cost: 0,
            conversions: 0,
            conversionValue: 0,
            roas: null,
          },
          strongestSegments: [],
          weakestSegments: [],
          wastedSpendCandidates: [],
          scaleCandidates: [],
          exclusionsCandidates: [],
          missingDataNotes: ['Performance summary could not be computed (service failure).'],
          breakdowns: {
            searchTerms: [],
            keywords: [],
            devices: [],
            placements: [],
            geographic: [],
            demographics: [],
            audiences: [],
            adSchedule: [],
            campaigns: [],
          },
        },
        performanceSummaryMeta: {
          totalsProvenance: 'ERROR',
          segmentRowCounts: {},
          breakdownCounts: {},
        },
      };
    }
  })();

  const placements = await (async () => {
    try {
      const rows: PlacementListEntryDto[] = await listPlacements(campaignId);
      return capArray(rows, MAX_PLACEMENTS).map((p) => ({
        id: p.id,
        listType: p.listType,
        placement: p.placement,
        displayName: p.displayName,
        source: p.source,
        reason: p.reason,
        status: p.status,
        analysisId: p.analysisId,
        createdAt: p.createdAt.toISOString(),
      }));
    } catch (e) {
      trustNotes.push(`placements unavailable: ${(e as Error).message}`);
      return [];
    }
  })();

  const actions = await (async () => {
    try {
      const rows: ActionPlanItemDto[] = await listActions(campaignId);
      return capArray(rows, MAX_ACTIONS).map((a) => ({
        id: a.id,
        actionType: a.actionType,
        title: a.title,
        priority: a.priority,
        confidence: a.confidence,
        status: a.status,
        analysisId: a.analysisId,
        createdAt: a.createdAt.toISOString(),
      }));
    } catch (e) {
      trustNotes.push(`actions unavailable: ${(e as Error).message}`);
      return [];
    }
  })();

  const actionImpact = await (async () => {
    const top = actions.slice(0, MAX_ACTION_IMPACT);
    const summaries = await Promise.all(
      top.map(async (a) => {
        try {
          const impact = await getActionImpactSummary(campaignId, a.id);
          return {
            actionId: a.id,
            assessment: impact.assessment,
            delta: impact.delta ? { ...impact.delta } : null,
          };
        } catch (e) {
          // No throw: treat as unknown impact.
          return {
            actionId: a.id,
            assessment: {
              status: 'insufficient_data' as const,
              message: `Impact unavailable for action ${a.id} (service failure).`,
            },
            delta: null,
          };
        }
      })
    );
    return summaries;
  })();

  const history = await (async () => {
    try {
      const [analyses, notes, events] = await Promise.all([
        listAnalyses(campaignId),
        listCampaignNotes(campaignId),
        listCampaignEvents(campaignId),
      ]);

      const cappedAnalyses = capArray(analyses, MAX_HISTORY_ANALYSES);
      const cappedNotes = capArray(notes, MAX_HISTORY_NOTES);

      const lastEvents = capArray(events.slice(-MAX_HISTORY_EVENTS), MAX_HISTORY_EVENTS);

      return {
        analyses: cappedAnalyses.map((a) => {
          const diagnosis = a.outputJson as unknown as {
            evidenceStrength?: string;
            executiveSummary?: string | null;
            whatIsHappening?: string[];
            missingData?: string[];
          };
          return {
            id: a.id,
            createdAt: a.createdAt.toISOString(),
            evidenceStrength: String(diagnosis.evidenceStrength ?? ''),
            executiveSummary:
              typeof diagnosis.executiveSummary === 'string'
                ? diagnosis.executiveSummary
                : null,
            findings: capArray(diagnosis.whatIsHappening ?? [], 10),
            missingData: capArray(diagnosis.missingData ?? [], 10),
          };
        }),
        notes: cappedNotes.map((n) => ({
          id: n.id,
          createdAt: n.createdAt.toISOString(),
          pinned: Boolean(n.pinned),
          contentPreview: trimText(n.content, 220),
        })),
        events: lastEvents.map((e) => ({
          id: e.id,
          occurredAt: e.occurredAt ? e.occurredAt.toISOString() : '',
          type: e.type,
          title: e.title,
        })).reverse(),
      };
    } catch (e) {
      trustNotes.push(`history unavailable: ${(e as Error).message}`);
      return { analyses: [], notes: [], events: [] };
    }
  })();

  return {
    campaign: campaignRow,
    advisory,
    verticalBenchmark,
    settings,
    campaignTypeTemplate: {
      code: canonicalType,
      label: rules.label ?? registry.label,
      importantReportTypes: rules.importantReportTypes ?? registry.importantReportTypes,
      optimizationPriorities: rules.optimizationPriorities ?? registry.optimizationPriorities,
      aiInstructions: rules.aiInstructions ?? registry.aiInstructions,
      specialWarnings: rules.specialWarnings ?? registry.specialWarnings,
      missingReportGuidance: rules.missingReportGuidance ?? registry.missingReportGuidance,
      defaultPlaybookTemplate: registry.defaultPlaybookTemplate,
      defaultChecklistTemplate: registry.defaultChecklistTemplate,
    },
    checklist,
    trust,
    reports: {
      reportStatus,
      uploadedReports,
    },
    gaps,
    performanceSummary,
    performanceSummaryMeta,
    placements,
    actions,
    actionImpact,
    history,
  };
}

/**
 * Safe, shortened payload for debugging what the AI analyzer receives (no secrets).
 */
export async function buildCampaignAiContextDebug(
  campaignId: number
): Promise<Record<string, unknown> | null> {
  const ctx = await buildCampaignAiContext(campaignId);
  if (!ctx) return null;

  return {
    campaignId,
    campaign: {
      id: ctx.campaign.id,
      name: ctx.campaign.name,
      type: ctx.campaign.type,
      status: ctx.campaign.status,
    },
    advisory: ctx.advisory,
    verticalBenchmark: ctx.verticalBenchmark,
    trust: {
      evidenceStrengthHint: ctx.trust.evidenceStrengthHint,
      sufficiencyLabel: ctx.trust.readiness.sufficiencyLabel,
      readinessReasons: ctx.trust.readinessReasons.slice(0, 15),
      dataWindow: ctx.trust.dataWindow,
    },
    performanceSummaryMeta: ctx.performanceSummaryMeta,
    performanceSummary: {
      totals: ctx.performanceSummary.totals,
      candidateCounts: {
        strongest: ctx.performanceSummary.strongestSegments.length,
        weakest: ctx.performanceSummary.weakestSegments.length,
        wasted: ctx.performanceSummary.wastedSpendCandidates.length,
        scale: ctx.performanceSummary.scaleCandidates.length,
      },
      strongestSegments: ctx.performanceSummary.strongestSegments,
      weakestSegments: ctx.performanceSummary.weakestSegments,
      wastedSpendCandidates: ctx.performanceSummary.wastedSpendCandidates,
      scaleCandidates: ctx.performanceSummary.scaleCandidates,
      missingDataNotes: ctx.performanceSummary.missingDataNotes,
      breakdowns: ctx.performanceSummary.breakdowns,
    },
    reports: ctx.reports,
    gaps: ctx.gaps,
    settingsGapSignal: {
      canonicalCampaignType: ctx.settings.canonicalCampaignType,
    },
  };
}

