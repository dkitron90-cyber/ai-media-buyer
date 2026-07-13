import { prisma } from '../db/prisma';

export interface CreateCampaignNoteInput {
  campaignId: number;
  content: string;
  author?: string | null;
  pinned?: boolean | null;
}

export const createCampaignNote = async (data: CreateCampaignNoteInput) => {
  const { campaignId, content, author, pinned } = data;

  return prisma.campaignNote.create({
    data: {
      campaignId,
      content: content.trim(),
      author: author?.trim() ?? undefined,
      pinned: pinned ?? undefined,
    },
  });
};

export const listCampaignNotes = async (campaignId: number) => {
  return prisma.campaignNote.findMany({
    where: { campaignId },
    orderBy: { createdAt: 'desc' },
  });
};

export const getCampaignNoteById = async (campaignId: number, noteId: number) => {
  return prisma.campaignNote.findFirst({
    where: { id: noteId, campaignId },
  });
};

export interface UpdateCampaignNoteInput {
  content?: string;
  author?: string | null;
  pinned?: boolean | null;
}

export const updateCampaignNoteById = async (
  campaignId: number,
  noteId: number,
  data: UpdateCampaignNoteInput
) => {
  const existing = await getCampaignNoteById(campaignId, noteId);
  if (!existing) return null;

  const updateData: Record<string, unknown> = {};
  if (data.content !== undefined) updateData.content = data.content.trim();
  if (data.author !== undefined)
    updateData.author =
      data.author === null ? null : data.author.trim() || null;
  if (data.pinned !== undefined) updateData.pinned = data.pinned;

  return prisma.campaignNote.update({
    where: { id: noteId },
    data: updateData,
  });
};

export const deleteCampaignNoteById = async (
  campaignId: number,
  noteId: number
) => {
  const existing = await getCampaignNoteById(campaignId, noteId);
  if (!existing) return false;
  await prisma.campaignNote.delete({ where: { id: noteId } });
  return true;
};

