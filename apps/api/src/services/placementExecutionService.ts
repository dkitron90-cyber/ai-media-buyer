import { getAnalysisById } from './campaignAnalysisHistoryService';
import {
  createPlacementIfNotExists,
  type PlacementListEntryDto,
} from './placementListService';
import { getActionById, patchAction } from './actionPlanService';
import { captureActionImpactSnapshot } from './actionImpactService';

export interface FromAnalysisResult {
  analysisId: number;
  listType: string;
  created: PlacementListEntryDto[];
  skippedDuplicates: string[];
  total: number;
}

export interface ExecuteActionResult {
  actionId: number;
  actionType: string;
  status: string;
  placementsCreated: PlacementListEntryDto[];
  skippedDuplicates: string[];
}

const EXECUTABLE_ACTION_TYPES: Record<string, 'blacklist' | 'whitelist'> = {
  exclude: 'blacklist',
  pause: 'blacklist',
  scale: 'whitelist',
};

export async function createPlacementsFromAnalysis(
  campaignId: number,
  analysisId: number,
  listType: 'blacklist' | 'whitelist'
): Promise<FromAnalysisResult> {
  const analysis = await getAnalysisById(campaignId, analysisId);
  if (!analysis) {
    throw new ValidationError('Analysis not found.');
  }

  const diagnosis = analysis.outputJson;
  const targets =
    listType === 'blacklist'
      ? diagnosis.exclusions ?? []
      : diagnosis.scaleTargets ?? [];

  if (targets.length === 0) {
    throw new ValidationError(
      `Analysis has no ${listType === 'blacklist' ? 'exclusions' : 'scale targets'} to convert.`
    );
  }

  const created: PlacementListEntryDto[] = [];
  const skippedDuplicates: string[] = [];

  for (const target of targets) {
    const trimmed = target.trim();
    if (!trimmed) continue;

    const result = await createPlacementIfNotExists(campaignId, {
      listType,
      placement: trimmed,
      source: 'ai',
      reason: `From AI analysis #${analysisId}`,
      analysisId,
    });

    if (result.created) {
      created.push(result.entry);
    } else {
      skippedDuplicates.push(trimmed);
    }
  }

  return {
    analysisId,
    listType,
    created,
    skippedDuplicates,
    total: created.length,
  };
}

export async function executeAction(
  campaignId: number,
  actionId: number
): Promise<ExecuteActionResult> {
  const action = await getActionById(campaignId, actionId);
  if (!action) {
    throw new ValidationError('Action not found.');
  }

  if (action.status === 'done') {
    throw new ValidationError('Action is already marked as done.');
  }

  const targetListType = EXECUTABLE_ACTION_TYPES[action.actionType];

  const placementsCreated: PlacementListEntryDto[] = [];
  const skippedDuplicates: string[] = [];

  // Capture a "before" snapshot for executable actions.
  if (targetListType) {
    await captureActionImpactSnapshot(campaignId, actionId, 'before');
  }

  if (targetListType) {
    const placementValue = action.title.trim();
    if (placementValue) {
      const result = await createPlacementIfNotExists(campaignId, {
        listType: targetListType,
        placement: placementValue,
        source: 'ai',
        reason: action.rationale || `Executed from action #${actionId}`,
        analysisId: action.analysisId ?? undefined,
      });

      if (result.created) {
        placementsCreated.push(result.entry);
      } else {
        skippedDuplicates.push(placementValue);
      }
    }
  }

  await patchAction(campaignId, actionId, { status: 'done' });

  return {
    actionId,
    actionType: action.actionType,
    status: 'done',
    placementsCreated,
    skippedDuplicates,
  };
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
