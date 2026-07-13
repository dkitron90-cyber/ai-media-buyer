import { getCampaignDecisionEngine } from './decisionEngineService';
import type { DecisionEngineResponse, DecisionEngineRecommendedAction } from './decisionEngineService';
import type { CampaignGap } from './gapDetectionService';

export type NextBestActionType =
  | 'action'
  | 'gap'
  | 'data_request'
  | 'settings_fix'
  | 'checklist_item';

export type PriorityLevel = 'high' | 'medium' | 'low';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface NextBestActionResult {
  campaignId: number;
  nextBestAction: {
    type: NextBestActionType;
    title: string;
    description: string;
    whyNow: string;
    priority: PriorityLevel;
    confidence: ConfidenceLevel;
    isExecutable: boolean;
    actionId: number | null;
    relatedGapIds: string[];
    blockingReason: string | null;
  };
}

type Candidate = Omit<NextBestActionResult['nextBestAction'], 'relatedGapIds'> & {
  relatedGapIds: string[];
  score: number;
};

const ACTION_EXECUTABLE_TYPES = new Set(['exclude', 'pause', 'scale']);

function toPriorityLevel(value: string | null | undefined): PriorityLevel {
  const v = (value ?? '').toLowerCase();
  if (v === 'high') return 'high';
  if (v === 'low') return 'low';
  return 'medium';
}

function toConfidenceLevel(value: string | null | undefined): ConfidenceLevel {
  const v = (value ?? '').toLowerCase();
  if (v === 'high') return 'high';
  if (v === 'low') return 'low';
  return 'medium';
}

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ');
}

function tokenize(s: string): string[] {
  const n = normalizeText(s);
  const parts = n.split(' ').map((p) => p.trim()).filter(Boolean);
  // Ignore ultra-short tokens; they cause noisy matches.
  return parts.filter((p) => p.length >= 4);
}

function isSimilarAction(
  a: DecisionEngineRecommendedAction,
  b: DecisionEngineRecommendedAction
): boolean {
  if (a.actionType !== b.actionType) return false;
  const ta = normalizeText(a.title);
  const tb = normalizeText(b.title);
  if (!ta || !tb) return false;
  if (ta === tb) return true;
  if (ta.includes(tb) || tb.includes(ta)) return true;

  const aTokens = new Set(tokenize(a.title));
  const bTokens = new Set(tokenize(b.title));
  if (!aTokens.size || !bTokens.size) return false;
  let overlap = 0;
  for (const t of aTokens) if (bTokens.has(t)) overlap += 1;

  const needed = Math.ceil(Math.min(aTokens.size, bTokens.size) * 0.5);
  return overlap >= Math.max(2, needed);
}

function parsePriorityScore(priority: PriorityLevel): number {
  if (priority === 'high') return 30;
  if (priority === 'low') return 10;
  return 20;
}

function parseConfidenceScore(confidence: ConfidenceLevel): number {
  if (confidence === 'high') return 20;
  if (confidence === 'low') return 6;
  return 12;
}

function parseSeverityScore(severity: 'high' | 'medium' | 'low'): number {
  if (severity === 'high') return 40;
  if (severity === 'low') return 10;
  return 25;
}

function actionRelatedToGapText(
  action: DecisionEngineRecommendedAction,
  gap: CampaignGap
): boolean {
  const txt = normalizeText(`${action.title} ${action.rationale ?? ''}`);
  const maybeSetting = gap.relatedSetting ? normalizeText(gap.relatedSetting) : '';
  const maybeReport = gap.relatedReportType ? normalizeText(gap.relatedReportType) : '';
  const gapKeywords: string[] = [];

  if (maybeSetting) gapKeywords.push(...maybeSetting.split(' '));
  if (maybeReport) gapKeywords.push(...maybeReport.split(' '));

  if (!gapKeywords.length) {
    // Fall back to gap title/recommendation keywords if nothing is explicitly related.
    gapKeywords.push(...tokenize(gap.title).slice(0, 3));
  }

  return gapKeywords.some((k) => k.length >= 4 && txt.includes(k));
}

function getTypeFromGap(gap: CampaignGap): NextBestActionType {
  if (gap.category === 'reports') return 'data_request';
  if (gap.category === 'settings') return 'settings_fix';
  if (gap.category === 'checklist') return 'checklist_item';
  return 'data_request';
}

function extractMissingReportType(gap: CampaignGap): string | null {
  // ids are like: reports-SEARCH_TERMS
  if (gap.id.startsWith('reports-')) {
    const rest = gap.id.replace(/^reports-/, '').trim();
    if (rest) return rest;
  }
  // title is like: Missing SEARCH_TERMS report
  const match = gap.title.match(/Missing\s+([A-Z0-9_]+)\s+report/i);
  if (match?.[1]) return match[1].toUpperCase();
  return null;
}

export async function getNextBestAction(
  campaignId: number
): Promise<NextBestActionResult> {
  let decision: DecisionEngineResponse | null = null;
  try {
    decision = await getCampaignDecisionEngine(campaignId);
  } catch {
    decision = null;
  }

  if (!decision) {
    return {
      campaignId,
      nextBestAction: {
        type: 'gap',
        title: 'No next step found (campaign missing)',
        description: 'Campaign state could not be loaded.',
        whyNow: 'This request requires an existing campaign.',
        priority: 'low',
        confidence: 'low',
        isExecutable: false,
        actionId: null,
        relatedGapIds: [],
        blockingReason: 'Campaign not found.',
      },
    };
  }

  const trust = decision.trust;
  const gaps: CampaignGap[] = decision.supporting.gaps?.gaps ?? [];
  const actions: DecisionEngineRecommendedAction[] = decision.recommendedActions ?? [];

  const openActions = actions.filter(
    (a) => a.status !== 'done' && a.status !== 'dismissed'
  );

  const doneOrDismissed = actions.filter(
    (a) => a.status === 'done' || a.status === 'dismissed'
  );

  const highSeverityGaps = gaps.filter((g) => g.severity === 'high');
  const hasDataQualityProblems =
    trust.freshnessStatus === 'STALE' ||
    trust.freshnessStatus === 'AGING' ||
    trust.alignmentStatus === 'MISALIGNED' ||
    trust.alignmentStatus === 'PARTIAL';
  const trustIsWeak = trust.evidenceStrength === 'WEAK' || trust.evidenceStrength === 'UNKNOWN';

  const scoreCandidates: Candidate[] = [];

  // 1) Data/settings gap candidates
  for (const gap of gaps) {
    // If trust is strong and gap is very low severity, don't dominate the ranking.
    if (gap.severity === 'low' && !trustIsWeak && !hasDataQualityProblems) continue;

    const type = getTypeFromGap(gap);
    const missingReportType = type === 'data_request' ? extractMissingReportType(gap) : null;

    const relatedGapIds = [gap.id];

    const isExecutable = false;
    const actionId = null;

    const priority =
      type === 'data_request'
        ? (gap.severity === 'high' ? 'high' : gap.severity === 'medium' ? 'medium' : 'low')
        : type === 'settings_fix'
          ? (gap.severity === 'high' ? 'high' : gap.severity === 'medium' ? 'medium' : 'low')
          : (gap.severity === 'high' ? 'high' : gap.severity === 'medium' ? 'medium' : 'low');

    const confidence: ConfidenceLevel = gap.severity === 'high' ? 'high' : gap.severity === 'medium' ? 'medium' : 'low';

    const trustReasonSnippet = trust.readinessReasons[0] ?? 'Campaign trust suggests the next step should reduce uncertainty.';
    const whyNow = `${gap.severity.toUpperCase()} priority blocker: ${gap.title}. ${trustReasonSnippet}`;

    const description =
      gap.recommendation ||
      gap.description ||
      'Address this gap so the next analysis/action can be grounded in better data.';

    const title =
      type === 'data_request'
        ? missingReportType
          ? `Upload missing ${missingReportType} report`
          : gap.title
        : type === 'settings_fix'
          ? gap.title
          : gap.title;

    let score = 0;
    score += parseSeverityScore(gap.severity);

    if (trustIsWeak) score += 20;
    if (hasDataQualityProblems) score += 12;

    // Prefer gaps that are explicitly high severity.
    if (gap.severity === 'high') score += 12;

    // If evidence is weak, strongly prefer data_request candidates over optimization actions.
    if (trustIsWeak && type === 'data_request') score += 10;
    if (trustIsWeak && type !== 'data_request') score -= 5;

    scoreCandidates.push({
      type,
      title,
      description,
      whyNow,
      priority: toPriorityLevel(priority),
      confidence,
      isExecutable,
      actionId,
      relatedGapIds,
      blockingReason: null,
      score,
    });
  }

  // 2) Executable action candidates
  for (const action of openActions) {
    const isExecutableNow = ACTION_EXECUTABLE_TYPES.has(action.actionType) && action.status !== 'done' && action.status !== 'dismissed';
    const priority = toPriorityLevel(action.priority);
    const confidence = toConfidenceLevel(action.confidence);

    const relatedGapIds = highSeverityGaps
      .filter((g) => actionRelatedToGapText(action, g))
      .map((g) => g.id)
      .slice(0, 3);

    const relatedGapBoost = relatedGapIds.length * 10;

    const duplicateMatch = doneOrDismissed.find((d) => isSimilarAction(action, d));
    const duplicatePenalty = duplicateMatch ? -70 : 0;

    let score =
      parsePriorityScore(priority) +
      parseConfidenceScore(confidence) +
      (isExecutableNow ? 30 : -5) +
      relatedGapBoost;

    if (trustIsWeak) score -= 18;
    if (hasDataQualityProblems) score -= 10;

    score += duplicatePenalty;

    const blockingReason = duplicateMatch
      ? 'A similar action is already marked done/dismissed; this may be redundant.'
      : null;

    const trustReasonSnippet = trust.readinessReasons[0] ?? 'Campaign trust influences which step should happen next.';
    const whyNow = isExecutableNow
      ? `This is an executable ${priority} recommendation. ${relatedGapIds.length ? `It aligns with key gaps (${relatedGapIds.join(', ')}). ` : ''}${trustReasonSnippet}`
      : `This action is not currently executable. ${trustReasonSnippet}`;

    scoreCandidates.push({
      type: 'action',
      title: action.title,
      description: action.rationale || 'Apply this recommendation to improve performance.',
      whyNow,
      priority,
      confidence,
      isExecutable: isExecutableNow,
      actionId: action.id,
      relatedGapIds,
      blockingReason,
      score,
    });
  }

  // 3) If we have no gaps and no executable actions, return a null-state response.
  // Also handle case where only duplicates exist and have negative scores: we still return the best candidate.
  if (!scoreCandidates.length) {
    return {
      campaignId,
      nextBestAction: {
        type: 'gap',
        title: 'No meaningful next step available',
        description: 'No open actions or campaign gaps were detected.',
        whyNow: 'The system currently has nothing actionable to recommend.',
        priority: 'low',
        confidence: 'low',
        isExecutable: false,
        actionId: null,
        relatedGapIds: [],
        blockingReason: 'No actionable gaps or open action items found.',
      },
    };
  }

  // 4) Choose best scoring candidate; in trust-weak states, prefer data_request/settings fixes.
  scoreCandidates.sort((a, b) => {
    const typePrecedence = (t: NextBestActionType): number => {
      if (trustIsWeak) {
        if (t === 'data_request') return 0;
        if (t === 'settings_fix') return 1;
        return 2;
      }
      if (t === 'action') return 0;
      if (t === 'data_request') return 1;
      return 2;
    };

    const ta = typePrecedence(a.type);
    const tb = typePrecedence(b.type);
    if (ta !== tb) return ta - tb;
    if (a.score !== b.score) return b.score - a.score;
    // Deterministic tie-breaker
    return a.title.localeCompare(b.title);
  });

  const best = scoreCandidates[0]!;

  return {
    campaignId,
    nextBestAction: {
      ...best,
      // Ensure relatedGapIds always present and blockingReason uses null when absent.
      relatedGapIds: best.relatedGapIds,
      blockingReason: best.blockingReason ?? null,
    },
  };
}

