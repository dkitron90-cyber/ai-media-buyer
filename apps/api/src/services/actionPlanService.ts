import { prisma } from '../db/prisma';
import type { PrioritizedAction } from '../ai/openaiProvider';

const VALID_STATUSES = ['draft', 'approved', 'done', 'dismissed'] as const;
type ActionStatus = (typeof VALID_STATUSES)[number];

export function isValidStatus(value: string): value is ActionStatus {
  return (VALID_STATUSES as readonly string[]).includes(value);
}

export interface ActionPlanItemDto {
  id: number;
  campaignId: number;
  analysisId: number | null;
  actionType: string;
  title: string;
  rationale: string;
  priority: string;
  confidence: string;
  status: string;
  notes: string | null;
  expectedImpact: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateActionInput {
  actionType: string;
  title: string;
  rationale?: string;
  priority?: string;
  confidence?: string;
  status?: string;
  notes?: string;
  expectedImpact?: string;
  analysisId?: number;
}

export interface PatchActionInput {
  status?: string;
  notes?: string;
  expectedImpact?: string;
  priority?: string;
}

export async function listActions(campaignId: number): Promise<ActionPlanItemDto[]> {
  return prisma.actionPlanItem.findMany({
    where: { campaignId },
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function getActionById(
  campaignId: number,
  actionId: number
): Promise<ActionPlanItemDto | null> {
  return prisma.actionPlanItem.findFirst({
    where: { id: actionId, campaignId },
  });
}

export async function createAction(
  campaignId: number,
  input: CreateActionInput
): Promise<ActionPlanItemDto> {
  return prisma.actionPlanItem.create({
    data: {
      campaignId,
      analysisId: input.analysisId ?? null,
      actionType: input.actionType,
      title: input.title,
      rationale: input.rationale ?? '',
      priority: input.priority ?? 'medium',
      confidence: input.confidence ?? 'medium',
      status: input.status ?? 'draft',
      notes: input.notes ?? null,
      expectedImpact: input.expectedImpact ?? null,
    },
  });
}

export async function patchAction(
  campaignId: number,
  actionId: number,
  input: PatchActionInput
): Promise<ActionPlanItemDto | null> {
  const existing = await prisma.actionPlanItem.findFirst({
    where: { id: actionId, campaignId },
  });
  if (!existing) return null;

  const data: Record<string, unknown> = {};
  if (input.status !== undefined) {
    data.status = input.status;
    if (input.status === 'done') {
      data.completedAt = new Date();
    } else if (existing.status === 'done' && input.status !== 'done') {
      data.completedAt = null;
    }
  }
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.expectedImpact !== undefined) data.expectedImpact = input.expectedImpact;
  if (input.priority !== undefined) data.priority = input.priority;

  return prisma.actionPlanItem.update({
    where: { id: actionId },
    data,
  });
}

export async function deleteAction(
  campaignId: number,
  actionId: number
): Promise<boolean> {
  const existing = await prisma.actionPlanItem.findFirst({
    where: { id: actionId, campaignId },
  });
  if (!existing) return false;

  await prisma.$transaction(async (tx) => {
    await tx.actionImpactSnapshot.deleteMany({ where: { actionId } });
    await tx.actionPlanItem.delete({ where: { id: actionId } });
  });

  return true;
}

export async function createActionsFromAnalysis(
  campaignId: number,
  analysisId: number,
  actions: PrioritizedAction[]
): Promise<ActionPlanItemDto[]> {
  if (actions.length === 0) return [];

  const rows = actions.map((a) => ({
    campaignId,
    analysisId,
    actionType: a.type,
    title: a.title,
    rationale: a.rationale,
    priority: a.priority,
    confidence: a.confidence,
    status: 'draft' as const,
  }));

  await prisma.actionPlanItem.createMany({ data: rows });

  return prisma.actionPlanItem.findMany({
    where: { campaignId, analysisId },
    orderBy: { id: 'asc' },
  });
}
