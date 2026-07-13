import { prisma } from '../db/prisma';
import type { CampaignDiagnosis } from '../ai/openaiProvider';

export interface SavedAnalysis {
  id: number;
  campaignId: number;
  analysisType: string;
  evidenceStrength: string;
  executiveSummary: string | null;
  modelName: string | null;
  outputJson: CampaignDiagnosis;
  createdAt: Date;
  updatedAt: Date;
}

interface AnalysisRow {
  id: number;
  campaignId: number;
  analysisType: string;
  evidenceStrength: string;
  executiveSummary: string | null;
  modelName: string | null;
  outputJson: string;
  createdAt: Date;
  updatedAt: Date;
}

function toSavedAnalysis(row: AnalysisRow): SavedAnalysis {
  return {
    ...row,
    outputJson: JSON.parse(row.outputJson) as CampaignDiagnosis,
  };
}

export interface PersistAnalysisOptions {
  campaignId: number;
  diagnosis: CampaignDiagnosis;
  modelName?: string;
}

export async function persistAnalysis(
  opts: PersistAnalysisOptions
): Promise<SavedAnalysis> {
  const { campaignId, diagnosis, modelName } = opts;
  const row = await prisma.campaignAnalysis.create({
    data: {
      campaignId,
      analysisType: 'full_diagnosis',
      evidenceStrength: diagnosis.evidenceStrength,
      executiveSummary: diagnosis.executiveSummary,
      modelName: modelName ?? null,
      outputJson: JSON.stringify(diagnosis),
    },
  });
  return toSavedAnalysis(row);
}

export async function listAnalyses(
  campaignId: number
): Promise<SavedAnalysis[]> {
  const rows = await prisma.campaignAnalysis.findMany({
    where: { campaignId },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toSavedAnalysis);
}

export async function getAnalysisById(
  campaignId: number,
  analysisId: number
): Promise<SavedAnalysis | null> {
  const row = await prisma.campaignAnalysis.findFirst({
    where: { id: analysisId, campaignId },
  });
  return row ? toSavedAnalysis(row) : null;
}

export async function deleteAnalysisById(
  campaignId: number,
  analysisId: number
): Promise<boolean> {
  const existing = await prisma.campaignAnalysis.findFirst({
    where: { id: analysisId, campaignId },
  });
  if (!existing) return false;

  await prisma.$transaction(async (tx) => {
    await tx.actionPlanItem.updateMany({
      where: { analysisId },
      data: { analysisId: null },
    });
    await tx.campaignAnalysis.delete({ where: { id: analysisId } });
  });

  return true;
}
