import { createAction, listActions, type ActionPlanItemDto } from './actionPlanService';
import { createPlacementIfNotExists } from './placementListService';
import type { AiDecisionOutput } from '../ai/openaiProvider';

export type ActionGenerationResult = {
  createdActions: number;
  skippedActions: number;
  createdPlacements: number;
  skippedPlacements: number;
  /** DB ids of action plan rows created in this run (for client highlight / ordering). */
  createdActionIds: number[];
};

type AiToActionType = 'exclude' | 'scale' | 'pause' | 'hold' | 'test' | 'restructure';

const AI_TYPE_TO_ACTION_TYPE: Record<AiToActionType, AiToActionType> = {
  exclude: 'exclude',
  scale: 'scale',
  pause: 'pause',
  hold: 'hold',
  test: 'test',
  restructure: 'restructure',
};

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function isSimilarAction(existing: ActionPlanItemDto, aiAction: AiDecisionOutput['prioritizedActions'][number]) {
  if (existing.actionType !== aiAction.type) return false;

  const existingTitle = normalize(existing.title);
  const aiTitle = normalize(aiAction.title);

  if (!existingTitle || !aiTitle) return false;

  if (existingTitle === aiTitle) return true;

  if (typeof aiAction.targetValue === 'string') {
    const tv = normalize(aiAction.targetValue);
    if (!tv) return false;
    if (existingTitle === tv) return true;
    // If the placement identifier is embedded in the title, treat as similar.
    if (existingTitle.includes(tv) || tv.includes(existingTitle)) return true;
  }

  return false;
}

export async function generateActionsFromAiOutput(
  campaignId: number,
  analysisId: number,
  aiOutput: AiDecisionOutput
): Promise<ActionGenerationResult> {
  const prioritized = Array.isArray(aiOutput?.prioritizedActions)
    ? aiOutput.prioritizedActions
    : [];

  const result: ActionGenerationResult = {
    createdActions: 0,
    skippedActions: 0,
    createdPlacements: 0,
    skippedPlacements: 0,
    createdActionIds: [],
  };

  let existingActions: ActionPlanItemDto[] = [];
  try {
    existingActions = await listActions(campaignId);
  } catch (err) {
    // If we can't inspect existing actions, we cannot safely dedupe without risking duplicates.
    // Return zeros instead of attempting creates.
    console.error('[AI Action Generator] Failed to list actions for dedupe:', err);
    return result;
  }

  // Keep a working set so that actions are deduped within this request too.
  const known = [...existingActions];

  for (const aiAction of prioritized) {
    const aiType = aiAction.type as AiToActionType;
    const actionType = AI_TYPE_TO_ACTION_TYPE[aiType];
    if (!actionType) continue; // ignore invalid action types safely

    const similar = known.some((a) => isSimilarAction(a, aiAction));

    // Placement auto-creation is independent of action creation.
    if (
      aiAction.type === 'exclude' &&
      typeof aiAction.targetValue === 'string' &&
      aiAction.targetType &&
      aiAction.targetType.trim().toLowerCase() === 'placement'
    ) {
      const placementValue = aiAction.targetValue.trim();
      if (placementValue) {
        try {
          const placementRes = await createPlacementIfNotExists(campaignId, {
            listType: 'blacklist',
            placement: placementValue,
            source: 'ai',
            reason: `From AI analysis #${analysisId}`,
            analysisId,
          });
          if (placementRes.created) result.createdPlacements += 1;
          else result.skippedPlacements += 1;
        } catch (err) {
          console.error('[AI Action Generator] Failed to create placement:', err);
          // Don't crash; just treat as skipped placement.
          result.skippedPlacements += 1;
        }
      }
    }

    if (similar) {
      result.skippedActions += 1;
      continue;
    }

    try {
      const created = await createAction(campaignId, {
        actionType,
        title: aiAction.title,
        rationale: aiAction.rationale,
        priority: aiAction.priority,
        confidence: aiAction.confidence,
        status: 'draft',
        analysisId,
      });
      result.createdActions += 1;
      result.createdActionIds.push(created.id);
      known.push(created);
    } catch (err) {
      console.error('[AI Action Generator] Failed to create action:', err);
      // If create fails we treat as skipped to avoid misleading "created".
      result.skippedActions += 1;
    }
  }

  return result;
}

