import { prisma } from '../db/prisma';
import {
  getCampaignTypeRegistryEntry,
  resolveCanonicalCampaignType,
  type CanonicalCampaignTypeCode,
  type ChecklistItem,
} from '../campaignTypes';

export type ChecklistItemStatus = 'pending' | 'done' | 'skipped';

export interface CampaignChecklistItemDto {
  id: string;
  phase: 'launch' | 'optimization' | string;
  label: string;
  detail?: string | null;
  status: ChecklistItemStatus;
}

export interface CampaignChecklistSummaryDto {
  total: number;
  done: number;
  pending: number;
  skipped: number;
  completionPercent: number;
}

export interface CampaignChecklistResponseDto {
  items: CampaignChecklistItemDto[];
  summary: CampaignChecklistSummaryDto;
}

const isValidChecklistStatus = (v: unknown): v is ChecklistItemStatus => {
  return v === 'pending' || v === 'done' || v === 'skipped';
};

const EVENT_TYPE = 'CHECKLIST_ITEM_STATUS';

function checklistItemsFromTemplate(template: {
  launch: ChecklistItem[];
  optimization: ChecklistItem[];
}): ChecklistItem[] {
  return [...(template.launch ?? []), ...(template.optimization ?? [])];
}

function computeSummary(items: CampaignChecklistItemDto[]): CampaignChecklistSummaryDto {
  const total = items.length;
  const done = items.filter((i) => i.status === 'done').length;
  const skipped = items.filter((i) => i.status === 'skipped').length;
  const pending = Math.max(0, total - done - skipped);
  // Treat skipped as "ready" because user explicitly decided to skip.
  const completionPercent = total === 0 ? 0 : Math.round(((done + skipped) / total) * 100);
  return { total, done, pending, skipped, completionPercent };
}

export async function getCampaignChecklist(
  campaignId: number
): Promise<CampaignChecklistResponseDto | null> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, type: true },
  });
  if (!campaign) return null;

  const canonicalType: CanonicalCampaignTypeCode =
    resolveCanonicalCampaignType(campaign.type);
  const registryEntry = getCampaignTypeRegistryEntry(canonicalType);

  const baseItems = checklistItemsFromTemplate(registryEntry.defaultChecklistTemplate);
  const itemById = new Map<string, ChecklistItem>();
  for (const it of baseItems) itemById.set(it.id, it);

  // Apply persisted statuses from latest events (no schema migrations needed).
  const events = await prisma.campaignEvent.findMany({
    where: { campaignId, type: EVENT_TYPE },
    orderBy: { occurredAt: 'desc' },
    select: { metadataJson: true },
  });

  const statusByItemId = new Map<string, ChecklistItemStatus>();
  for (const e of events) {
    if (!e.metadataJson) continue;
    try {
      const parsed = JSON.parse(e.metadataJson) as {
        itemId?: string;
        status?: unknown;
      };
      if (!parsed.itemId || !isValidChecklistStatus(parsed.status)) continue;
      if (statusByItemId.has(parsed.itemId)) continue; // already got latest
      statusByItemId.set(parsed.itemId, parsed.status);
    } catch {
      // ignore malformed metadata
    }
  }

  const items: CampaignChecklistItemDto[] = baseItems.map((it) => ({
    id: it.id,
    phase: it.phase,
    label: it.label,
    detail: it.detail ?? null,
    status: statusByItemId.get(it.id) ?? 'pending',
  }));

  return {
    items,
    summary: computeSummary(items),
  };
}

export async function patchCampaignChecklistItem(
  campaignId: number,
  itemId: string,
  status: ChecklistItemStatus
): Promise<CampaignChecklistItemDto | null> {
  const checklist = await getCampaignChecklist(campaignId);
  if (!checklist) return null;

  const item = checklist.items.find((i) => i.id === itemId);
  if (!item) return null;

  await prisma.campaignEvent.create({
    data: {
      campaignId,
      type: EVENT_TYPE,
      title: 'Checklist item status updated',
      description: undefined,
      metadataJson: JSON.stringify({ itemId, status }),
    },
  });

  const updated = await getCampaignChecklist(campaignId);
  return updated?.items.find((i) => i.id === itemId) ?? null;
}

