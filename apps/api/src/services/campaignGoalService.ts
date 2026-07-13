import { prisma } from '../db/prisma';

export interface CreateCampaignGoalInput {
  campaignId: number;
  name: string;
  metric: string;
  description?: string | null;
  targetValue?: number | null;
  startDate?: Date | null;
  endDate?: Date | null;
}

export const createCampaignGoal = async (data: CreateCampaignGoalInput) => {
  const { campaignId, name, metric, description, targetValue, startDate, endDate } =
    data;

  return prisma.campaignGoal.create({
    data: {
      campaignId,
      name: name.trim(),
      metric: metric.trim(),
      description: description?.trim() ?? undefined,
      targetValue: targetValue ?? undefined,
      startDate: startDate ?? undefined,
      endDate: endDate ?? undefined,
    },
  });
};

export const listCampaignGoals = async (campaignId: number) => {
  return prisma.campaignGoal.findMany({
    where: { campaignId },
    orderBy: { createdAt: 'desc' },
  });
};

export const getCampaignGoalById = async (campaignId: number, goalId: number) => {
  return prisma.campaignGoal.findFirst({
    where: { id: goalId, campaignId },
  });
};

export interface UpdateCampaignGoalInput {
  name?: string;
  metric?: string;
  description?: string | null;
  targetValue?: number | null;
  startDate?: Date | null;
  endDate?: Date | null;
}

export const updateCampaignGoalById = async (
  campaignId: number,
  goalId: number,
  data: UpdateCampaignGoalInput
) => {
  const existing = await getCampaignGoalById(campaignId, goalId);
  if (!existing) return null;

  return prisma.campaignGoal.update({
    where: { id: goalId },
    data,
  });
};

export const deleteCampaignGoalById = async (
  campaignId: number,
  goalId: number
) => {
  const existing = await getCampaignGoalById(campaignId, goalId);
  if (!existing) return false;
  await prisma.campaignGoal.delete({ where: { id: goalId } });
  return true;
};

