import { prisma } from '../db/prisma';
import type { CampaignSummary, AnalysisReadiness } from './analysisService';
import { getCampaignAnalysisReadiness, getCampaignSummary } from './analysisService';
import { getDataWindow } from './dataWindowService';
import type { CampaignAnalysisContext } from '../ai/openaiProvider';
import { getCampaignTypeRules } from './campaignTypeRulesService';

export const buildCampaignAnalysisContext = async (
  campaignId: number
): Promise<CampaignAnalysisContext | null> => {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) return null;

  const [goals, notes, events, readiness, summary, dataWindow, uploadedReports] =
    await Promise.all([
      prisma.campaignGoal.findMany({
        where: { campaignId },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.campaignNote.findMany({
        where: { campaignId },
        orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.campaignEvent.findMany({
        where: { campaignId },
        orderBy: { occurredAt: 'desc' },
      }),
      getCampaignAnalysisReadiness(campaignId, campaign.type),
      getCampaignSummary(campaignId, campaign.type),
      getDataWindow(campaignId),
      prisma.uploadedReport.findMany({
        where: { campaignId },
        orderBy: { uploadedAt: 'desc' },
      }),
    ]);

  const rules = getCampaignTypeRules(campaign.type);

  const context: CampaignAnalysisContext = {
    campaign: {
      id: campaign.id,
      clientId: campaign.clientId,
      name: campaign.name,
      type: campaign.type,
      status: campaign.status,
      monthlyBudget: (campaign.monthlyBudget ?? null)?.toString() ?? null,
      targetCpa: (campaign.targetCpa ?? null)?.toString() ?? null,
      product: campaign.product ?? null,
      productUrl: campaign.productUrl ?? null,
    },
    goals: goals.map((g) => ({
      id: g.id,
      name: g.name,
      metric: g.metric,
      targetValue: (g.targetValue ?? null)?.toString() ?? null,
      isActive: g.isActive,
    })),
    notes: notes.map((n) => ({
      id: n.id,
      author: n.author ?? null,
      content: n.content,
      pinned: n.pinned,
      createdAt: n.createdAt.toISOString(),
    })),
    events: events.map((e) => ({
      id: e.id,
      type: e.type,
      title: e.title,
      description: e.description ?? null,
      occurredAt: e.occurredAt.toISOString(),
    })),
    readiness,
    summary,
    dataWindow,
    campaignTypeIntelligence: {
      label: rules.label,
      importantReportTypes: rules.importantReportTypes,
      optimizationPriorities: rules.optimizationPriorities,
      aiInstructions: rules.aiInstructions,
      specialWarnings: rules.specialWarnings,
    },
    uploadedReports: uploadedReports.map((r) => ({
      id: r.id,
      reportType: r.reportType,
      uploadStatus: r.uploadStatus,
    })),
  };

  return context;
};

