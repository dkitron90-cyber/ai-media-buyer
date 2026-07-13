import { prisma } from '../db/prisma';

export interface CreateCampaignInput {
  clientId: number;
  name: string;
  type: string;
  status?: string;
  monthlyBudget?: number | null;
  targetCpa?: number | null;
  product?: string | null;
  productUrl?: string | null;
}

export const createCampaign = async (data: CreateCampaignInput) => {
  const {
    clientId,
    name,
    type,
    status = 'DRAFT',
    monthlyBudget,
    targetCpa,
    product,
    productUrl,
  } = data;

  return prisma.campaign.create({
    data: {
      clientId,
      name: name.trim(),
      type: type.trim(),
      status: status.trim(),
      monthlyBudget: monthlyBudget ?? undefined,
      targetCpa: targetCpa ?? undefined,
      product: product?.trim() ?? undefined,
      productUrl: productUrl?.trim() ?? undefined,
    },
  });
};

export const listCampaigns = async () => {
  return prisma.campaign.findMany({
    orderBy: { createdAt: 'desc' },
  });
};

export const getCampaignById = async (id: number) => {
  return prisma.campaign.findUnique({
    where: { id },
  });
};

export const listCampaignsByClientId = async (clientId: number) => {
  return prisma.campaign.findMany({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
  });
};

export interface UpdateCampaignInput {
  name?: string;
  type?: string;
  status?: string;
  monthlyBudget?: number | null;
  targetCpa?: number | null;
  product?: string | null;
  productUrl?: string | null;
}

export const updateCampaignById = async (
  id: number,
  data: UpdateCampaignInput
) => {
  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing) return null;

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.type !== undefined) updateData.type = data.type.trim();
  if (data.status !== undefined) updateData.status = data.status.trim();
  if (data.monthlyBudget !== undefined)
    updateData.monthlyBudget = data.monthlyBudget ?? null;
  if (data.targetCpa !== undefined) updateData.targetCpa = data.targetCpa ?? null;
  if (data.product !== undefined)
    updateData.product =
      data.product === null ? null : data.product.trim() || null;
  if (data.productUrl !== undefined)
    updateData.productUrl =
      data.productUrl === null ? null : data.productUrl.trim() || null;

  return prisma.campaign.update({
    where: { id },
    data: updateData,
  });
};

export const deleteCampaignWithRelations = async (id: number) => {
  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing) return false;

  await prisma.$transaction(async (tx) => {
    // Delete rows that depend on campaign or its reports/analyses/actions.
    await tx.actionImpactSnapshot.deleteMany({ where: { campaignId: id } });
    await tx.actionPlanItem.deleteMany({ where: { campaignId: id } });
    await tx.placementListEntry.deleteMany({ where: { campaignId: id } });
    await tx.campaignGoal.deleteMany({ where: { campaignId: id } });
    await tx.campaignEvent.deleteMany({ where: { campaignId: id } });
    await tx.campaignNote.deleteMany({ where: { campaignId: id } });

    // Report rows (joined by campaignId and uploadedReportId)
    await tx.searchTermReportRow.deleteMany({ where: { campaignId: id } });
    await tx.keywordReportRow.deleteMany({ where: { campaignId: id } });
    await tx.deviceReportRow.deleteMany({ where: { campaignId: id } });
    await tx.placementReportRow.deleteMany({ where: { campaignId: id } });
    await tx.geographicReportRow.deleteMany({ where: { campaignId: id } });
    await tx.demographicsReportRow.deleteMany({ where: { campaignId: id } });
    await tx.audienceReportRow.deleteMany({ where: { campaignId: id } });
    await tx.adScheduleReportRow.deleteMany({ where: { campaignId: id } });
    await tx.campaignReportRow.deleteMany({ where: { campaignId: id } });

    await tx.uploadedReport.deleteMany({ where: { campaignId: id } });
    await tx.campaignAnalysis.deleteMany({ where: { campaignId: id } });

    await tx.campaign.delete({ where: { id } });
  });

  return true;
};

