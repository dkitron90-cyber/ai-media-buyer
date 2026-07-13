import { prisma } from '../db/prisma';
import type { CampaignDiagnosis } from '../ai/openaiProvider';
import { listAnalyses } from './campaignAnalysisHistoryService';
import { getCampaignAnalysisReadiness } from './analysisService';
import { getNextBestAction } from './nextBestActionService';
import { getCampaignGaps } from './gapDetectionService';
import type { CampaignGap } from './gapDetectionService';
import { getCampaignSummary } from './analysisService';

export type DecisionSummaryConfidence = 'low' | 'medium' | 'high';
export type DecisionEvidenceStrength = 'weak' | 'directional' | 'strong';

export interface CampaignDecisionSummary {
  campaignId: number;
  primaryIssue: string;
  focusArea: string;
  estimatedWastedSpend: number | null;
  estimatedUpside: number | null;
  confidence: DecisionSummaryConfidence;
  topReason: string;
  nextBestActionTitle: string;
  evidenceStrength: DecisionEvidenceStrength;
}

const sufficiencyToEvidence = (
  label: string
): DecisionEvidenceStrength => {
  const u = label.toUpperCase();
  if (u === 'STRONG') return 'strong';
  if (u === 'DIRECTIONAL') return 'directional';
  return 'weak';
};

const readinessToConfidence = (
  label: string
): DecisionSummaryConfidence => {
  const u = label.toUpperCase();
  if (u === 'STRONG') return 'high';
  if (u === 'DIRECTIONAL') return 'medium';
  return 'low';
};

const sumCosts = (rows: Array<{ cost?: number | null }> | undefined): number =>
  (rows ?? []).reduce((a, r) => a + (typeof r.cost === 'number' ? r.cost : 0), 0);

const pickTopGap = (gaps: CampaignGap[]): CampaignGap | null => {
  if (!gaps.length) return null;
  const score = (s: CampaignGap['severity']) =>
    s === 'high' ? 0 : s === 'medium' ? 1 : 2;
  return [...gaps].sort((a, b) => score(a.severity) - score(b.severity))[0] ?? null;
};

const focusFromGapCategory = (g: CampaignGap | null): string => {
  if (!g) return 'general optimization';
  if (g.category === 'reports' || g.category === 'data') return 'data collection';
  if (g.category === 'settings') return 'setup completion';
  if (g.category === 'checklist') return 'checklist completion';
  return 'optimization';
};

/**
 * One compact business-oriented decision summary per campaign.
 * Uses latest saved AI analysis when present; otherwise gaps, next-best-action, and trust.
 */
export async function getCampaignDecisionSummary(
  campaignId: number
): Promise<CampaignDecisionSummary | null> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, type: true },
  });
  if (!campaign) return null;

  try {
    return await buildDecisionSummaryCore(campaignId, campaign.type);
  } catch (err) {
    console.error('[decisionSummary] fallback after error:', err);
    return {
      campaignId,
      primaryIssue: 'Could not load the full decision summary for this campaign.',
      focusArea: 'general optimization',
      estimatedWastedSpend: null,
      estimatedUpside: null,
      confidence: 'low',
      topReason:
        'One or more data sources failed to load. Retry shortly or run a fresh AI analysis.',
      nextBestActionTitle: 'Review campaign status and uploaded reports',
      evidenceStrength: 'weak',
    };
  }
}

async function buildDecisionSummaryCore(
  campaignId: number,
  campaignType: string
): Promise<CampaignDecisionSummary> {

  let readiness = null as Awaited<
    ReturnType<typeof getCampaignAnalysisReadiness>
  > | null;
  try {
    readiness = await getCampaignAnalysisReadiness(campaignId, campaignType);
  } catch {
    readiness = null;
  }

  let latestDiagnosis: CampaignDiagnosis | null = null;
  try {
    const analyses = await listAnalyses(campaignId);
    const latest = analyses[0];
    if (latest?.outputJson) {
      latestDiagnosis = latest.outputJson as CampaignDiagnosis;
    }
  } catch {
    latestDiagnosis = null;
  }

  let gapsResult: Awaited<ReturnType<typeof getCampaignGaps>> | null = null;
  try {
    gapsResult = await getCampaignGaps(campaignId);
  } catch {
    gapsResult = null;
  }
  const gaps = gapsResult?.gaps ?? [];
  const topGap = pickTopGap(gaps);

  let nbaTitle = 'Review campaign status and uploaded reports';
  try {
    const nba = await getNextBestAction(campaignId);
    if (nba?.nextBestAction?.title) nbaTitle = nba.nextBestAction.title;
  } catch {
    // keep default
  }

  const evidenceStrength: DecisionEvidenceStrength = latestDiagnosis?.evidenceStrength
    ? (latestDiagnosis.evidenceStrength as DecisionEvidenceStrength)
    : readiness
      ? sufficiencyToEvidence(readiness.sufficiencyLabel)
      : 'weak';

  const confidenceFromReadiness =
    readiness?.sufficiencyLabel != null
      ? readinessToConfidence(readiness.sufficiencyLabel)
      : 'low';

  let primaryIssue = '';
  let focusArea = '';
  let estimatedWastedSpend: number | null = null;
  let estimatedUpside: number | null = null;
  let confidence: DecisionSummaryConfidence = confidenceFromReadiness;
  let topReason = '';
  let wasteExplicitlySet = false;
  let upsideExplicitlySet = false;

  if (latestDiagnosis) {
    primaryIssue =
      (latestDiagnosis.primaryIssue && latestDiagnosis.primaryIssue.trim()) ||
      (latestDiagnosis.executiveSummary && latestDiagnosis.executiveSummary.trim()) ||
      '';
    focusArea =
      (latestDiagnosis.focusArea && latestDiagnosis.focusArea.trim()) ||
      focusFromGapCategory(topGap);
    if (Object.prototype.hasOwnProperty.call(latestDiagnosis, 'estimatedWastedSpend')) {
      wasteExplicitlySet = true;
      estimatedWastedSpend = latestDiagnosis.estimatedWastedSpend ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(latestDiagnosis, 'estimatedUpside')) {
      upsideExplicitlySet = true;
      estimatedUpside = latestDiagnosis.estimatedUpside ?? null;
    }
    if (latestDiagnosis.decisionConfidence) {
      confidence = latestDiagnosis.decisionConfidence as DecisionSummaryConfidence;
    } else if (latestDiagnosis.evidenceStrength) {
      confidence = readinessToConfidence(
        latestDiagnosis.evidenceStrength === 'strong'
          ? 'STRONG'
          : latestDiagnosis.evidenceStrength === 'directional'
            ? 'DIRECTIONAL'
            : 'WEAK'
      );
    }
    topReason =
      (latestDiagnosis.executiveSummary && latestDiagnosis.executiveSummary.trim()) ||
      (latestDiagnosis.whatIsHappening?.[0] ?? '') ||
      topGap?.description ||
      '';
  }

  if (!primaryIssue) {
    if (topGap) {
      primaryIssue = topGap.title;
    } else {
      primaryIssue = nbaTitle;
    }
  }

  if (!focusArea) {
    focusArea = focusFromGapCategory(topGap);
  }

  if (!topReason) {
    topReason =
      topGap?.recommendation ||
      topGap?.description ||
      readiness?.reasons?.[0] ||
      'No detailed reason available; upload reports and run a fresh analysis.';
  }

  // Ground money from segment rollups only when the field was never stored (legacy analyses)
  // or there is no saved analysis — never override an explicit AI null.
  const canInferWaste = !wasteExplicitlySet;
  const canInferUpside = !upsideExplicitlySet;
  if (canInferWaste || canInferUpside) {
    try {
      const summary = await getCampaignSummary(campaignId, campaignType);
      if (canInferWaste) {
        const w = sumCosts(summary.wastedSpendCandidates);
        estimatedWastedSpend = w > 0 ? w : null;
      }
      if (canInferUpside) {
        const u = sumCosts(summary.scaleCandidates);
        estimatedUpside = u > 0 ? u : null;
      }
    } catch {
      // leave nulls
    }
  }

  return {
    campaignId,
    primaryIssue: primaryIssue.slice(0, 500),
    focusArea: focusArea.slice(0, 200),
    estimatedWastedSpend,
    estimatedUpside,
    confidence,
    topReason: topReason.slice(0, 600),
    nextBestActionTitle: nbaTitle.slice(0, 300),
    evidenceStrength,
  };
}
