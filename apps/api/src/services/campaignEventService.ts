import { prisma } from '../db/prisma';

export interface CreateCampaignEventInput {
  campaignId: number;
  type: string;
  title: string;
  description?: string | null;
  metadataJson?: string | null;
  occurredAt?: Date | null;
}

export const createCampaignEvent = async (data: CreateCampaignEventInput) => {
  const { campaignId, type, title, description, metadataJson, occurredAt } =
    data;

  return prisma.campaignEvent.create({
    data: {
      campaignId,
      type: type.trim(),
      title: title.trim(),
      description: description?.trim() ?? undefined,
      metadataJson: metadataJson ?? undefined,
      occurredAt: occurredAt ?? undefined,
    },
  });
};

export const listCampaignEvents = async (campaignId: number) => {
  // Timeline-style ascending order by occurredAt.
  return prisma.campaignEvent.findMany({
    where: { campaignId },
    orderBy: { occurredAt: 'asc' },
  });
};

