import type { ActionPlanItem } from './apiClient';

const PRIORITY_ORDER = ['high', 'medium', 'low'] as const;

/**
 * Put highlighted ids first (server order), then remaining by priority + recency.
 */
export function sortActionsWithHighlightFirst(
  actions: ActionPlanItem[],
  highlightIds: number[]
): ActionPlanItem[] {
  if (highlightIds.length === 0) {
    return [...actions].sort(comparePriorityThenNewest);
  }
  const set = new Set(highlightIds);
  const head = highlightIds
    .map((id) => actions.find((a) => a.id === id))
    .filter((a): a is ActionPlanItem => Boolean(a));
  const tail = actions.filter((a) => !set.has(a.id));
  tail.sort(comparePriorityThenNewest);
  return [...head, ...tail];
}

function comparePriorityThenNewest(a: ActionPlanItem, b: ActionPlanItem): number {
  const pa = PRIORITY_ORDER.indexOf(a.priority as (typeof PRIORITY_ORDER)[number]);
  const pb = PRIORITY_ORDER.indexOf(b.priority as (typeof PRIORITY_ORDER)[number]);
  const safeA = pa === -1 ? 99 : pa;
  const safeB = pb === -1 ? 99 : pb;
  if (safeA !== safeB) return safeA - safeB;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

/** Full list: newest first so fresh AI rows surface immediately. */
export function sortActionsNewestFirst(actions: ActionPlanItem[]): ActionPlanItem[] {
  return [...actions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
