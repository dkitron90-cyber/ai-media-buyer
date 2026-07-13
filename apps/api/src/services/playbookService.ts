import { prisma } from '../db/prisma';
import type { CampaignDiagnosis } from '../ai/openaiProvider';
import { getCampaignDecisionEngine } from './decisionEngineService';
import type {
  DecisionEngineRecommendedAction,
  DecisionEngineTopIssue,
} from './decisionEngineService';
import { getCampaignDecisionSummary } from './decisionSummaryService';
import { getNextBestAction } from './nextBestActionService';
import { listAnalyses } from './campaignAnalysisHistoryService';
import { getCampaignTypeRegistryEntry } from '../campaignTypes';
import type { CampaignGap } from './gapDetectionService';
import { getCampaignChecklist } from './campaignChecklistService';

export type PlaybookBucketPriority = 'P0' | 'P1' | 'P2';

export type PlaybookItemType =
  | 'execute_action'
  | 'upload_report'
  | 'fix_setting'
  | 'review_item';

export type PlaybookReviewFocus =
  | 'execution'
  | 'reports'
  | 'checklist'
  | 'impact'
  | 'analysis'
  | 'settings';

export interface PlaybookItemDto {
  id: string;
  title: string;
  reason: string;
  estimatedImpact: string;
  type: PlaybookItemType;
  actionId: number | null;
  reportType: string | null;
  settingKey: string | null;
  checklistItemId: string | null;
  reviewFocus: PlaybookReviewFocus | null;
  priority: PlaybookBucketPriority;
  isExecutable: boolean;
  blockingReason: string | null;
}

export interface CampaignPlaybookResponse {
  campaignId: number;
  generatedAt: string;
  /** Single highest-priority “do this first” item (same as first P0 task). */
  startHere: PlaybookItemDto | null;
  today: PlaybookItemDto[];
  thisWeek: PlaybookItemDto[];
  thisMonth: PlaybookItemDto[];
}

const MAX_TODAY = 8;
const MAX_WEEK = 10;
const MAX_MONTH = 6;

function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .slice(0, 96);
}

function money(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '';
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

function impactFromWaste(waste: number | null | undefined): string {
  if (waste == null || waste <= 0) {
    return 'High — addresses wasted spend in your data window';
  }
  const weekly = waste / 4;
  return `💰 Save ~${money(weekly)}/week (est. from segment waste)`;
}

function impactFromUpside(up: number | null | undefined): string {
  if (up == null || up <= 0) {
    return 'Medium — unlocks scalable volume';
  }
  return `📈 ~${money(up)} upside potential in window (directional)`;
}

function gapImpact(g: CampaignGap): string {
  if (g.severity === 'high') {
    if (g.category === 'reports' || g.category === 'data') {
      return 'High — fixes tracking / coverage gaps';
    }
    if (g.category === 'settings') {
      return 'High — bidding & structure clarity';
    }
    return 'High — blocks reliable optimization';
  }
  if (g.severity === 'medium') {
    return 'Medium — improves decisions';
  }
  return 'Low — refinement';
}

function issueImpact(issue: DecisionEngineTopIssue): string {
  if (issue.severity === 'high') {
    if (issue.id.startsWith('data-')) return 'High — data trust & tracking';
    return 'High — address before scaling spend';
  }
  if (issue.severity === 'medium') return 'Medium — optimization leverage';
  return 'Low — test & learn';
}

function actionImpact(a: DecisionEngineRecommendedAction): string {
  const t = (a.actionType ?? '').toLowerCase();
  if (t === 'exclude' || t === 'pause') {
    return 'High — cuts bleed fast';
  }
  if (t === 'scale') {
    return 'Medium — grows efficient volume';
  }
  if (t === 'test' || t === 'restructure') {
    return 'Medium — structural improvement';
  }
  return 'Medium — follow-through on plan';
}

function findMatchingRecommendedAction(
  title: string,
  actions: DecisionEngineRecommendedAction[]
): DecisionEngineRecommendedAction | null {
  const n = normalizeKey(title);
  if (!n) return null;
  for (const a of actions) {
    const an = normalizeKey(a.title);
    if (!an) continue;
    if (an === n || an.includes(n) || n.includes(an)) return a;
  }
  return null;
}

/** Map internal routing to API playbook item types. */
function finalizeItem(input: {
  tempId: string;
  title: string;
  reason: string;
  estimatedImpact: string;
  priority: PlaybookBucketPriority;
  actionId: number | null;
  executable: boolean;
  blockingReason: string | null;
  reportType: string | null;
  settingKey: string | null;
  checklistItemId: string | null;
  reviewFocus: PlaybookReviewFocus | null;
  /** When not executable: what kind of fix */
  route:
    | 'execute'
    | 'upload'
    | 'settings'
    | 'review'
    | 'review_analysis'
    | 'review_execution';
}): PlaybookItemDto {
  const isExecutable = input.actionId != null && input.executable;

  let type: PlaybookItemType;
  let reviewFocus = input.reviewFocus;

  if (isExecutable) {
    type = 'execute_action';
    reviewFocus = null;
  } else if (input.route === 'upload') {
    type = 'upload_report';
  } else if (input.route === 'settings') {
    type = 'fix_setting';
  } else {
    type = 'review_item';
    if (input.route === 'review_analysis' && !reviewFocus) {
      reviewFocus = 'analysis';
    }
    if (input.route === 'review_execution' && !reviewFocus) {
      reviewFocus = 'execution';
    }
    if (!reviewFocus) {
      reviewFocus = 'impact';
    }
  }

  return {
    id: input.tempId,
    title: input.title,
    reason: input.reason,
    estimatedImpact: input.estimatedImpact,
    type,
    actionId: input.actionId,
    reportType: input.reportType,
    settingKey: input.settingKey,
    checklistItemId: input.checklistItemId,
    reviewFocus,
    priority: input.priority,
    isExecutable,
    blockingReason: input.blockingReason,
  };
}

function gapToItem(
  gap: CampaignGap,
  priority: PlaybookBucketPriority,
  tempId: string
): PlaybookItemDto {
  if (gap.category === 'reports' || gap.category === 'data') {
    return finalizeItem({
      tempId,
      title: gap.title,
      reason: gap.recommendation || gap.description,
      estimatedImpact: gapImpact(gap),
      priority,
      actionId: null,
      executable: false,
      blockingReason: null,
      reportType: gap.relatedReportType ?? null,
      settingKey: null,
      checklistItemId: null,
      reviewFocus: 'reports',
      route: 'upload',
    });
  }
  if (gap.category === 'settings') {
    return finalizeItem({
      tempId,
      title: gap.title,
      reason: gap.recommendation || gap.description,
      estimatedImpact: gapImpact(gap),
      priority,
      actionId: null,
      executable: false,
      blockingReason: null,
      reportType: null,
      settingKey: gap.relatedSetting ?? null,
      checklistItemId: null,
      reviewFocus: 'settings',
      route: 'settings',
    });
  }
  if (gap.category === 'checklist') {
    return finalizeItem({
      tempId,
      title: gap.title,
      reason: gap.recommendation || gap.description,
      estimatedImpact: gapImpact(gap),
      priority,
      actionId: null,
      executable: false,
      blockingReason: null,
      reportType: null,
      settingKey: null,
      checklistItemId: gap.relatedChecklistItemId ?? null,
      reviewFocus: 'checklist',
      route: 'review',
    });
  }
  return finalizeItem({
    tempId,
    title: gap.title,
    reason: gap.recommendation || gap.description,
    estimatedImpact: gapImpact(gap),
    priority,
    actionId: null,
    executable: false,
    blockingReason: null,
    reportType: null,
    settingKey: null,
    checklistItemId: null,
    reviewFocus: 'impact',
    route: 'review',
  });
}

function issueToItem(
  issue: DecisionEngineTopIssue,
  priority: PlaybookBucketPriority,
  tempId: string
): PlaybookItemDto {
  const dataIssue =
    issue.source === 'data' || issue.id.startsWith('data-');
  return finalizeItem({
    tempId,
    title: issue.title,
    reason: issue.recommendation || issue.description,
    estimatedImpact: issueImpact(issue),
    priority,
    actionId: null,
    executable: false,
    blockingReason: null,
    reportType: null,
    settingKey: null,
    checklistItemId: null,
    reviewFocus: dataIssue ? 'reports' : 'impact',
    route: dataIssue ? 'upload' : 'review',
  });
}

function recommendedActionToItem(
  a: DecisionEngineRecommendedAction,
  priority: PlaybookBucketPriority,
  tempId: string
): PlaybookItemDto {
  const isExecutable = a.isExecutable && a.id != null;
  return finalizeItem({
    tempId,
    title: a.title,
    reason: a.rationale,
    estimatedImpact: actionImpact(a),
    priority,
    actionId: a.id,
    executable: a.isExecutable,
    blockingReason: null,
    reportType: null,
    settingKey: null,
    checklistItemId: null,
    reviewFocus: isExecutable ? null : 'execution',
    route: isExecutable ? 'execute' : 'review_execution',
  });
}

function diagnosisActionToItem(
  pa: CampaignDiagnosis['prioritizedActions'][number],
  priority: PlaybookBucketPriority,
  tempId: string,
  match: DecisionEngineRecommendedAction | null
): PlaybookItemDto {
  const isExecutable = !!(match?.isExecutable && match?.id);
  return finalizeItem({
    tempId,
    title: pa.title,
    reason: pa.rationale,
    estimatedImpact:
      pa.type === 'exclude' || pa.type === 'pause'
        ? 'High — reduces waste'
        : pa.type === 'scale'
          ? impactFromUpside(null)
          : pa.priority === 'high'
            ? 'High — priority from latest analysis'
            : 'Medium — from latest analysis',
    priority,
    actionId: match?.id ?? null,
    executable: match?.isExecutable ?? false,
    blockingReason: match
      ? null
      : 'Create or approve a matching action in Execution',
    reportType: null,
    settingKey: null,
    checklistItemId: null,
    reviewFocus: isExecutable ? null : 'analysis',
    route: isExecutable ? 'execute' : 'review_analysis',
  });
}

function nbaToItem(
  nba: Awaited<ReturnType<typeof getNextBestAction>>['nextBestAction'],
  priority: PlaybookBucketPriority,
  tempId: string
): PlaybookItemDto {
  const isExecutable = nba.isExecutable && nba.actionId != null;

  if (isExecutable) {
    return finalizeItem({
      tempId,
      title: nba.title,
      reason: `${nba.description}\n\nWhy now: ${nba.whyNow}`,
      estimatedImpact:
        nba.priority === 'high'
          ? 'High — system-ranked next step'
          : 'Medium — next best move',
      priority,
      actionId: nba.actionId,
      executable: true,
      blockingReason: nba.blockingReason,
      reportType: null,
      settingKey: null,
      checklistItemId: null,
      reviewFocus: null,
      route: 'execute',
    });
  }

  if (nba.type === 'data_request') {
    return finalizeItem({
      tempId,
      title: nba.title,
      reason: `${nba.description}\n\nWhy now: ${nba.whyNow}`,
      estimatedImpact: 'High — data coverage',
      priority,
      actionId: null,
      executable: false,
      blockingReason: nba.blockingReason,
      reportType: null,
      settingKey: null,
      checklistItemId: null,
      reviewFocus: 'reports',
      route: 'upload',
    });
  }

  if (nba.type === 'settings_fix') {
    return finalizeItem({
      tempId,
      title: nba.title,
      reason: `${nba.description}\n\nWhy now: ${nba.whyNow}`,
      estimatedImpact: 'High — setup quality',
      priority,
      actionId: null,
      executable: false,
      blockingReason: nba.blockingReason,
      reportType: null,
      settingKey: null,
      checklistItemId: null,
      reviewFocus: 'settings',
      route: 'settings',
    });
  }

  if (nba.type === 'checklist_item') {
    return finalizeItem({
      tempId,
      title: nba.title,
      reason: `${nba.description}\n\nWhy now: ${nba.whyNow}`,
      estimatedImpact: 'Medium — checklist progress',
      priority,
      actionId: null,
      executable: false,
      blockingReason: nba.blockingReason,
      reportType: null,
      settingKey: null,
      checklistItemId: null,
      reviewFocus: 'checklist',
      route: 'review',
    });
  }

  return finalizeItem({
    tempId,
    title: nba.title,
    reason: `${nba.description}\n\nWhy now: ${nba.whyNow}`,
    estimatedImpact:
      nba.priority === 'high'
        ? 'High — system-ranked next step'
        : 'Medium — next best move',
    priority,
    actionId: nba.actionId,
    executable: false,
    blockingReason: nba.blockingReason,
    reportType: null,
    settingKey: null,
    checklistItemId: null,
    reviewFocus: 'execution',
    route: 'review_execution',
  });
}

function wasteHeadlineItem(
  summary: Awaited<ReturnType<typeof getCampaignDecisionSummary>>,
  tempId: string
): PlaybookItemDto | null {
  if (!summary) return null;
  const waste = summary.estimatedWastedSpend;
  if (waste == null || waste <= 0) return null;
  return finalizeItem({
    tempId,
    title: `Fix top waste: ${summary.primaryIssue.slice(0, 120)}`,
    reason: summary.topReason.slice(0, 500),
    estimatedImpact: impactFromWaste(waste),
    priority: 'P0',
    actionId: null,
    executable: false,
    blockingReason: null,
    reportType: null,
    settingKey: null,
    checklistItemId: null,
    reviewFocus: 'analysis',
    route: 'review_analysis',
  });
}

function registryLineToItem(
  title: string,
  reason: string,
  impact: string,
  tempId: string
): PlaybookItemDto {
  return finalizeItem({
    tempId,
    title,
    reason,
    estimatedImpact: impact,
    priority: 'P2',
    actionId: null,
    executable: false,
    blockingReason: null,
    reportType: null,
    settingKey: null,
    checklistItemId: null,
    reviewFocus: 'impact',
    route: 'review',
  });
}

function addUnique(
  list: PlaybookItemDto[],
  item: PlaybookItemDto,
  seen: Set<string>
): boolean {
  const k = normalizeKey(item.title);
  if (!k || seen.has(k)) return false;
  seen.add(k);
  list.push(item);
  return true;
}

function renumber(
  items: PlaybookItemDto[],
  prefix: 'p0' | 'p1' | 'p2',
  start: number
): PlaybookItemDto[] {
  return items.map((it, i) => ({
    ...it,
    id: `${prefix}-${start + i}`,
  }));
}

export async function buildCampaignPlaybook(
  campaignId: number
): Promise<CampaignPlaybookResponse | null> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true },
  });
  if (!campaign) return null;

  const [engine, summary, nbaResult, analyses, checklist] = await Promise.all([
    getCampaignDecisionEngine(campaignId),
    getCampaignDecisionSummary(campaignId),
    getNextBestAction(campaignId).catch(() => null),
    listAnalyses(campaignId),
    getCampaignChecklist(campaignId).catch(() => null),
  ]);

  const registry = engine
    ? getCampaignTypeRegistryEntry(engine.canonicalCampaignType)
    : null;

  const diagnosis: CampaignDiagnosis | null =
    analyses[0]?.outputJson && typeof analyses[0].outputJson === 'object'
      ? (analyses[0].outputJson as CampaignDiagnosis)
      : null;

  const gaps = engine?.supporting.gaps?.gaps ?? [];
  const topIssues = engine?.topIssues ?? [];
  const recommended = engine?.recommendedActions ?? [];
  const openRecommended = recommended.filter(
    (a) => a.status !== 'done' && a.status !== 'dismissed'
  );

  const seen = new Set<string>();
  const todayRaw: PlaybookItemDto[] = [];
  const weekRaw: PlaybookItemDto[] = [];
  const monthRaw: PlaybookItemDto[] = [];

  let temp = 0;
  const tid = () => `tmp-${++temp}`;

  // --- P0 ---
  for (const issue of topIssues.filter(
    (i) => i.severity === 'high' && (i.source === 'data' || i.id.startsWith('data-'))
  )) {
    if (todayRaw.length >= MAX_TODAY) break;
    addUnique(todayRaw, issueToItem(issue, 'P0', tid()), seen);
  }

  for (const gap of gaps.filter((g) => g.severity === 'high')) {
    if (todayRaw.length >= MAX_TODAY) break;
    addUnique(todayRaw, gapToItem(gap, 'P0', tid()), seen);
  }

  const wasteItem = wasteHeadlineItem(summary, tid());
  if (wasteItem && todayRaw.length < MAX_TODAY) {
    addUnique(todayRaw, wasteItem, seen);
  }

  const highExec = [...openRecommended]
    .filter((a) => a.priority === 'high' && a.isExecutable)
    .slice(0, 3);
  for (const a of highExec) {
    if (todayRaw.length >= MAX_TODAY) break;
    addUnique(todayRaw, recommendedActionToItem(a, 'P0', tid()), seen);
  }

  const highAiActions = (diagnosis?.prioritizedActions ?? []).filter(
    (p) =>
      p.priority === 'high' &&
      (p.type === 'exclude' ||
        p.type === 'pause' ||
        p.type === 'restructure')
  );
  for (const pa of highAiActions.slice(0, 3)) {
    if (todayRaw.length >= MAX_TODAY) break;
    const match = findMatchingRecommendedAction(pa.title, openRecommended);
    addUnique(
      todayRaw,
      diagnosisActionToItem(pa, 'P0', tid(), match),
      seen
    );
  }

  if (nbaResult && todayRaw.length < MAX_TODAY) {
    const nba = nbaResult.nextBestAction;
    if (
      nba.priority === 'high' &&
      (nba.type !== 'gap' || nba.isExecutable)
    ) {
      addUnique(todayRaw, nbaToItem(nba, 'P0', tid()), seen);
    }
  }

  // --- P1 week ---
  for (const issue of topIssues.filter(
    (i) => i.severity === 'medium' && !seen.has(normalizeKey(i.title))
  )) {
    if (weekRaw.length >= MAX_WEEK) break;
    addUnique(weekRaw, issueToItem(issue, 'P1', tid()), seen);
  }

  for (const gap of gaps.filter((g) => g.severity === 'medium')) {
    if (weekRaw.length >= MAX_WEEK) break;
    addUnique(weekRaw, gapToItem(gap, 'P1', tid()), seen);
  }

  for (const a of openRecommended.filter(
    (x) => x.priority === 'medium' || (x.priority === 'high' && !x.isExecutable)
  )) {
    if (weekRaw.length >= MAX_WEEK) break;
    addUnique(weekRaw, recommendedActionToItem(a, 'P1', tid()), seen);
  }

  for (const pa of (diagnosis?.prioritizedActions ?? []).filter(
    (p) => p.priority === 'medium' || (p.priority === 'high' && p.type === 'scale')
  )) {
    if (weekRaw.length >= MAX_WEEK) break;
    const match = findMatchingRecommendedAction(pa.title, openRecommended);
    addUnique(
      weekRaw,
      diagnosisActionToItem(pa, 'P1', tid(), match),
      seen
    );
  }

  if (nbaResult && weekRaw.length < MAX_WEEK) {
    const nba = nbaResult.nextBestAction;
    if (nba.priority !== 'high' || !nba.isExecutable) {
      addUnique(weekRaw, nbaToItem(nba, 'P1', tid()), seen);
    } else if (!seen.has(normalizeKey(nba.title))) {
      addUnique(weekRaw, nbaToItem(nba, 'P1', tid()), seen);
    }
  }

  // Checklist: surface next pending item as week work (real persisted state)
  if (checklist && checklist.summary.pending > 0 && weekRaw.length < MAX_WEEK) {
    const nextPending = checklist.items.find((i) => i.status === 'pending');
    if (nextPending) {
      addUnique(
        weekRaw,
        finalizeItem({
          tempId: tid(),
          title: `Checklist: ${nextPending.label}`,
          reason:
            nextPending.detail ??
            'Complete this checklist item to harden launch/optimization readiness.',
          estimatedImpact: `Medium — ${checklist.summary.completionPercent}% checklist complete`,
          priority: 'P1',
          actionId: null,
          executable: false,
          blockingReason: null,
          reportType: null,
          settingKey: null,
          checklistItemId: nextPending.id,
          reviewFocus: 'checklist',
          route: 'review',
        }),
        seen
      );
    }
  }

  // --- P2 month ---
  for (const gap of gaps.filter((g) => g.severity === 'low')) {
    if (monthRaw.length >= MAX_MONTH) break;
    addUnique(monthRaw, gapToItem(gap, 'P2', tid()), seen);
  }

  for (const pa of (diagnosis?.prioritizedActions ?? []).filter(
    (p) =>
      p.priority === 'low' ||
      p.type === 'test' ||
      p.type === 'scale' ||
      p.type === 'hold'
  )) {
    if (monthRaw.length >= MAX_MONTH) break;
    const match = findMatchingRecommendedAction(pa.title, openRecommended);
    addUnique(
      monthRaw,
      diagnosisActionToItem(pa, 'P2', tid(), match),
      seen
    );
  }

  if (registry) {
    for (const line of registry.optimizationPriorities.slice(0, 2)) {
      if (monthRaw.length >= MAX_MONTH) break;
      addUnique(
        monthRaw,
        registryLineToItem(
          line,
          `Aligned to ${registry.label} campaign-type playbook.`,
          'Medium — strategic theme for the month',
          tid()
        ),
        seen
      );
    }

    for (const g of registry.defaultPlaybookTemplate.aiPlaybookGuidance.slice(
      0,
      2
    )) {
      if (monthRaw.length >= MAX_MONTH) break;
      addUnique(
        monthRaw,
        finalizeItem({
          tempId: tid(),
          title: g,
          reason: registry.defaultPlaybookTemplate.expectedReportsSummary,
          estimatedImpact: 'Low–medium — testing & learning focus',
          priority: 'P2',
          actionId: null,
          executable: false,
          blockingReason: null,
          reportType: null,
          settingKey: null,
          checklistItemId: null,
          reviewFocus: 'analysis',
          route: 'review_analysis',
        }),
        seen
      );
    }
  }

  if (!todayRaw.length && summary) {
    addUnique(
      todayRaw,
      finalizeItem({
        tempId: tid(),
        title: summary.nextBestActionTitle || 'Upload reports & run analysis',
        reason: summary.topReason,
        estimatedImpact: 'High — establishes baseline',
        priority: 'P0',
        actionId: null,
        executable: false,
        blockingReason: null,
        reportType: null,
        settingKey: null,
        checklistItemId: null,
        reviewFocus: 'reports',
        route: 'upload',
      }),
      seen
    );
  }

  const startHere =
    todayRaw.length > 0 ? { ...todayRaw[0]!, id: 'p0-1' } : null;
  const todayRest =
    todayRaw.length > 1 ? renumber(todayRaw.slice(1), 'p0', 2) : [];

  return {
    campaignId,
    generatedAt: new Date().toISOString(),
    startHere,
    today: todayRest,
    thisWeek: renumber(weekRaw, 'p1', 1),
    thisMonth: renumber(monthRaw, 'p2', 1),
  };
}
