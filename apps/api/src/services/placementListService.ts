import { prisma } from '../db/prisma';

const VALID_LIST_TYPES = ['blacklist', 'whitelist'] as const;
type ListType = (typeof VALID_LIST_TYPES)[number];

const VALID_SOURCES = ['manual', 'ai', 'imported'] as const;
type Source = (typeof VALID_SOURCES)[number];

const VALID_STATUSES = ['active', 'archived'] as const;
type PlacementStatus = (typeof VALID_STATUSES)[number];

export function isValidListType(value: string): value is ListType {
  return (VALID_LIST_TYPES as readonly string[]).includes(value);
}

export function isValidSource(value: string): value is Source {
  return (VALID_SOURCES as readonly string[]).includes(value);
}

export function isValidPlacementStatus(value: string): value is PlacementStatus {
  return (VALID_STATUSES as readonly string[]).includes(value);
}

export interface PlacementListEntryDto {
  id: number;
  campaignId: number;
  listType: string;
  placement: string;
  displayName: string | null;
  source: string;
  reason: string | null;
  status: string;
  analysisId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePlacementInput {
  listType: string;
  placement: string;
  displayName?: string;
  source?: string;
  reason?: string;
  analysisId?: number;
}

export interface PatchPlacementInput {
  displayName?: string;
  reason?: string;
  status?: string;
}

export async function listPlacements(
  campaignId: number,
  listType?: string
): Promise<PlacementListEntryDto[]> {
  const where: Record<string, unknown> = { campaignId };
  if (listType) {
    where.listType = listType;
  }
  return prisma.placementListEntry.findMany({
    where,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function createPlacement(
  campaignId: number,
  input: CreatePlacementInput
): Promise<PlacementListEntryDto> {
  return prisma.placementListEntry.create({
    data: {
      campaignId,
      listType: input.listType,
      placement: input.placement,
      displayName: input.displayName ?? null,
      source: input.source ?? 'manual',
      reason: input.reason ?? null,
      analysisId: input.analysisId ?? null,
    },
  });
}

export async function findActivePlacement(
  campaignId: number,
  listType: string,
  placement: string
): Promise<PlacementListEntryDto | null> {
  return prisma.placementListEntry.findFirst({
    where: { campaignId, listType, placement, status: 'active' },
  });
}

export async function createPlacementIfNotExists(
  campaignId: number,
  input: CreatePlacementInput
): Promise<{ entry: PlacementListEntryDto; created: boolean }> {
  const existing = await findActivePlacement(
    campaignId,
    input.listType,
    input.placement
  );
  if (existing) {
    return { entry: existing, created: false };
  }
  const entry = await createPlacement(campaignId, input);
  return { entry, created: true };
}

export async function patchPlacement(
  campaignId: number,
  placementId: number,
  input: PatchPlacementInput
): Promise<PlacementListEntryDto | null> {
  const existing = await prisma.placementListEntry.findFirst({
    where: { id: placementId, campaignId },
  });
  if (!existing) return null;

  const data: Record<string, unknown> = {};
  if (input.displayName !== undefined) data.displayName = input.displayName;
  if (input.reason !== undefined) data.reason = input.reason;
  if (input.status !== undefined) data.status = input.status;

  return prisma.placementListEntry.update({
    where: { id: placementId },
    data,
  });
}

export async function deletePlacement(
  campaignId: number,
  placementId: number
): Promise<boolean> {
  const existing = await prisma.placementListEntry.findFirst({
    where: { id: placementId, campaignId },
  });
  if (!existing) return false;

  await prisma.placementListEntry.delete({ where: { id: placementId } });
  return true;
}
