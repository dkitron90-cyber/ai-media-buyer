import { prisma } from '../db/prisma';

export interface CreateClientInput {
  name: string;
}

export const createClient = async (data: CreateClientInput) => {
  return prisma.client.create({
    data: {
      name: data.name.trim(),
    },
  });
};

export const listClients = async () => {
  return prisma.client.findMany({
    orderBy: { createdAt: 'desc' },
  });
};

export const getClientById = async (id: number) => {
  return prisma.client.findUnique({
    where: { id },
  });
};

export const updateClientById = async (id: number, name: string) => {
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) return null;

  return prisma.client.update({
    where: { id },
    data: { name: name.trim() },
  });
};

export const deleteClientWithRelations = async (id: number) => {
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) return false;

  await prisma.$transaction(async (tx) => {
    const campaigns = await tx.campaign.findMany({
      where: { clientId: id },
      select: { id: true },
    });
    for (const { id: campaignId } of campaigns) {
      // Reuse campaign deletion logic via nested operations
      await tx.actionImpactSnapshot.deleteMany({ where: { campaignId } });
      await tx.actionPlanItem.deleteMany({ where: { campaignId } });
      await tx.placementListEntry.deleteMany({ where: { campaignId } });
      await tx.campaignGoal.deleteMany({ where: { campaignId } });
      await tx.campaignEvent.deleteMany({ where: { campaignId } });
      await tx.campaignNote.deleteMany({ where: { campaignId } });

      await tx.searchTermReportRow.deleteMany({ where: { campaignId } });
      await tx.keywordReportRow.deleteMany({ where: { campaignId } });
      await tx.deviceReportRow.deleteMany({ where: { campaignId } });
      await tx.placementReportRow.deleteMany({ where: { campaignId } });
      await tx.geographicReportRow.deleteMany({ where: { campaignId } });
      await tx.demographicsReportRow.deleteMany({ where: { campaignId } });
      await tx.audienceReportRow.deleteMany({ where: { campaignId } });
      await tx.adScheduleReportRow.deleteMany({ where: { campaignId } });
      await tx.campaignReportRow.deleteMany({ where: { campaignId } });

      await tx.uploadedReport.deleteMany({ where: { campaignId } });
      await tx.campaignAnalysis.deleteMany({ where: { campaignId } });
      await tx.campaign.delete({ where: { id: campaignId } });
    }

    await tx.client.delete({ where: { id } });
  });

  return true;
};

