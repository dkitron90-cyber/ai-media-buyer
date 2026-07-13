import { prisma } from '../db/prisma';
import {
  resolveCanonicalCampaignType,
  type CanonicalCampaignTypeCode,
} from '../campaignTypes';
import {
  getDataWindow,
  type AlignmentStatus,
  type FreshnessStatus,
} from './dataWindowService';
import {
  getCampaignAnalysisReadiness,
  type AnalysisReadiness,
} from './analysisService';
import { getCampaignGaps, type CampaignGapsResult, type CampaignGap } from './gapDetectionService';
import { listAnalyses } from './campaignAnalysisHistoryService';
import type { CampaignDiagnosis } from '../ai/openaiProvider';
import { listActions, type ActionPlanItemDto } from './actionPlanService';

export type HealthTone = 'healthy' | 'needs_work' | 'critical' | 'unknown';

export interface DecisionEngineTopIssue {
  id: string;
  source: 'gap' | 'ai' | 'data';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommendation: string;
}

export interface DecisionEngineRecommendedAction {
  id: number;
  actionType: string;
  title: string;
  rationale: string;
  priority: string;
  confidence: string;
  status: string;
  analysisId: number | null;
  isExecutable: boolean;
}

export interface DecisionEngineResponse {
  campaignId: number;
  canonicalCampaignType: CanonicalCampaignTypeCode;
  trust: {
    evidenceStrength: 'WEAK' | 'DIRECTIONAL' | 'STRONG' | 'UNKNOWN';
    freshnessStatus: FreshnessStatus;
    alignmentStatus: AlignmentStatus;
    readinessReasons: string[];
  };
  summary: {
    executiveSummary: string | null;
    healthTone: HealthTone;
  };
  topIssues: DecisionEngineTopIssue[];
  whyItMatters: string[];
  recommendedActions: DecisionEngineRecommendedAction[];
  supporting: {
    gaps: CampaignGapsResult | null;
    latestAnalysis: unknown | null;
    latestAnalysisId: number | null;
    actionCounts: Record<'draft' | 'approved' | 'done' | 'dismissed', number>;
  };
}

const toneFromSignals = (
  gaps: CampaignGap[],
  freshness: FreshnessStatus,
  alignment: AlignmentStatus,
  evidence: 'WEAK' | 'DIRECTIONAL' | 'STRONG' | 'UNKNOWN'
): HealthTone => {
  const high = gaps.filter((g) => g.severity === 'high').length;
  const medium = gaps.filter((g) => g.severity === 'medium').length;
  const badData =
    freshness === 'STALE' &&
    (alignment === 'MISALIGNED' || alignment === 'PARTIAL');

  if (high >= 2 || (high >= 1 && badData)) return 'critical';
  if (high === 1 || medium >= 2) return 'needs_work';

  if (
    (evidence === 'WEAK' || evidence === 'UNKNOWN') &&
    (freshness === 'AGING' || alignment === 'PARTIAL')
  ) {
    return 'needs_work';
  }

  if (!gaps.length && (freshness === 'FRESH' || freshness === 'AGING')) {
    return 'healthy';
  }

  return gaps.length ? 'needs_work' : 'unknown';
};

const severityOrder: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const statusOrder: Record<string, number> = {
  draft: 0,
  approved: 1,
  done: 2,
  dismissed: 3,
};

const priorityOrder: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export const getCampaignDecisionEngine = async (
  campaignId: number
): Promise<DecisionEngineResponse | null> => {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, type: true },
  });
  if (!campaign) return null;

  const canonicalType = resolveCanonicalCampaignType(campaign.type);

  const [dataWindow, gapsResult, analyses, actions] = await Promise.all([
    getDataWindow(campaignId),
    // Gaps are a best-effort signal; never fail the whole decision engine.
    getCampaignGaps(campaignId).catch(() => null),
    listAnalyses(campaignId),
    listActions(campaignId),
  ]);

  const gaps = gapsResult?.gaps ?? [];

  const latestAnalysis =
    analyses.length > 0
      ? [...analyses].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0]
      : null;

  const diagnosis: CampaignDiagnosis | null =
    latestAnalysis && typeof latestAnalysis.outputJson === 'object'
      ? (latestAnalysis.outputJson as CampaignDiagnosis)
      : null;

  let readiness: AnalysisReadiness | null = null;
  try {
    readiness = await getCampaignAnalysisReadiness(campaignId, campaign.type);
  } catch {
    readiness = null;
  }

  const evidenceStrength =
    (diagnosis?.evidenceStrength?.toUpperCase() as
      | 'WEAK'
      | 'DIRECTIONAL'
      | 'STRONG') ?? 'UNKNOWN';

  const readinessReasons = [
    ...(readiness?.reasons ?? []),
    ...(diagnosis?.missingData ?? []),
  ];

  const trust = {
    evidenceStrength,
    freshnessStatus: dataWindow.freshnessStatus,
    alignmentStatus: dataWindow.alignmentStatus,
    readinessReasons,
  };

  const healthTone = toneFromSignals(
    gaps,
    dataWindow.freshnessStatus,
    dataWindow.alignmentStatus,
    evidenceStrength
  );

  // Top issues: gaps first, then AI risks/missingData, then data problems
  const topIssues: DecisionEngineTopIssue[] = [];
  const seen = new Set<string>();

  const addIssue = (issue: DecisionEngineTopIssue) => {
    const key = issue.title.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    topIssues.push(issue);
  };

  for (const gap of gaps.filter(
    (g) => g.severity === 'high' || g.severity === 'medium'
  )) {
    addIssue({
      id: gap.id,
      source: 'gap',
      severity: gap.severity,
      title: gap.title,
      description: gap.description,
      recommendation: gap.recommendation,
    });
  }

  if (diagnosis) {
    for (const risk of diagnosis.risks.slice(0, 5)) {
      addIssue({
        id: `ai-risk-${risk.slice(0, 40)}`,
        source: 'ai',
        severity: 'medium',
        title: risk,
        description: risk,
        recommendation:
          'Address this risk using the recommended actions and structural changes suggested in the analysis.',
      });
    }
    for (const missing of diagnosis.missingData.slice(0, 5)) {
      addIssue({
        id: `ai-missing-${missing.slice(0, 40)}`,
        source: 'ai',
        severity: 'low',
        title: missing,
        description: missing,
        recommendation:
          'Improve data coverage so this gap is resolved and the analysis can be more confident.',
      });
    }
  }

  if (dataWindow.freshnessStatus === 'STALE') {
    addIssue({
      id: 'data-freshness-stale',
      source: 'data',
      severity: 'high',
      title: 'Data is stale',
      description:
        'The most recent active reports are stale. Analyses may no longer reflect current performance.',
      recommendation:
        'Upload fresh reports for key report types so the decision engine can reason about current performance.',
    });
  } else if (dataWindow.freshnessStatus === 'AGING') {
    addIssue({
      id: 'data-freshness-aging',
      source: 'data',
      severity: 'medium',
      title: 'Data is aging',
      description:
        'The most recent data is aging. Recommendations will be directionally useful but less precise.',
      recommendation:
        'Upload more recent reports after material account changes to restore fresh status.',
    });
  }

  if (dataWindow.alignmentStatus === 'MISALIGNED') {
    addIssue({
      id: 'data-alignment-misaligned',
      source: 'data',
      severity: 'high',
      title: 'Reports are misaligned',
      description:
        'Active reports do not overlap in date ranges, making cross-report comparisons unreliable.',
      recommendation:
        'Re-run exports for a common analysis window (e.g. last 30 days) so reports align.',
    });
  } else if (dataWindow.alignmentStatus === 'PARTIAL') {
    addIssue({
      id: 'data-alignment-partial',
      source: 'data',
      severity: 'medium',
      title: 'Reports are only partially aligned',
      description:
        'Reports partially overlap in time, so some comparisons will be only directional.',
      recommendation:
        'Standardize date ranges for core reports where possible to improve alignment.',
    });
  }

  topIssues.sort(
    (a, b) =>
      (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3),
  );

  const whyItMatters: string[] = [];
  if (diagnosis) {
    whyItMatters.push(...diagnosis.whyItIsHappening.slice(0, 3));
    if (!whyItMatters.length && diagnosis.whatIsHappening.length) {
      whyItMatters.push(diagnosis.whatIsHappening[0]!);
    }
    if (whyItMatters.length < 3 && diagnosis.opportunities.length) {
      whyItMatters.push(diagnosis.opportunities[0]!);
    }
  }
  if (
    gaps.some((g) => g.category === 'reports') &&
    whyItMatters.length < 3
  ) {
    whyItMatters.push(
      'Missing or weak report coverage is blocking query/placement-level optimization.',
    );
  }
  if (
    gaps.some((g) => g.category === 'data') &&
    whyItMatters.length < 3
  ) {
    whyItMatters.push(
      'Data freshness or alignment issues reduce confidence in fine-grained decisions.',
    );
  }

  const sortedActions = [...actions].sort((a, b) => {
    const sa = statusOrder[a.status] ?? 4;
    const sb = statusOrder[b.status] ?? 4;
    if (sa !== sb) return sa - sb;
    const pa = priorityOrder[a.priority] ?? 3;
    const pb = priorityOrder[b.priority] ?? 3;
    if (pa !== pb) return pa - pb;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const recommendedActions: DecisionEngineRecommendedAction[] =
    sortedActions.map((a) => ({
      id: a.id,
      actionType: a.actionType,
      title: a.title,
      rationale: a.rationale,
      priority: a.priority,
      confidence: a.confidence,
      status: a.status,
      analysisId: a.analysisId,
      isExecutable:
        a.actionType === 'exclude' ||
        a.actionType === 'pause' ||
        a.actionType === 'scale',
    }));

  const actionCounts: Record<
    'draft' | 'approved' | 'done' | 'dismissed',
    number
  > = {
    draft: 0,
    approved: 0,
    done: 0,
    dismissed: 0,
  };
  for (const a of actions) {
    if (a.status === 'draft' || a.status === 'approved' || a.status === 'done' || a.status === 'dismissed') {
      actionCounts[a.status] += 1;
    }
  }

  const executiveSummary =
    diagnosis?.executiveSummary ?? null;

  return {
    campaignId,
    canonicalCampaignType: canonicalType,
    trust,
    summary: {
      executiveSummary,
      healthTone,
    },
    topIssues,
    whyItMatters: whyItMatters.slice(0, 3),
    recommendedActions,
    supporting: {
      gaps: gapsResult ?? null,
      latestAnalysis,
      latestAnalysisId: latestAnalysis?.id ?? null,
      actionCounts,
    },
  };
};

