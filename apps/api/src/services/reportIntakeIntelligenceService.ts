import { prisma } from '../db/prisma';
import { inspectUploadedReportFile, resolveStagedReportPath } from './reportIntakeService';
import type { ReportType } from '../lib/reportTypeCodes';
import {
  getCampaignTypeRegistryEntry,
  resolveCanonicalCampaignType,
  type CanonicalCampaignTypeCode,
} from '../campaignTypes';
import { getCampaignSettingsView } from './campaignSettingsService';
import {
  inferCampaignTypeForImport,
  inferCampaignTypeFromReportType,
} from '../lib/inferCampaignType';

type StrategyInference =
  | 'target CPA'
  | 'target ROAS'
  | 'maximize conversions'
  | 'maximize clicks'
  | 'manual CPC';

type MissingPriority = 'high' | 'medium' | 'low';
type IntelligenceConfidence = 'low' | 'medium' | 'high';

export interface ReportIntakeIntelligenceInput {
  stagingId: string;
  fileName?: string;
  clientId?: number;
  selectedCampaignId?: number;
}

export interface MissingReportGuidance {
  reportType: ReportType;
  priority: MissingPriority;
  reason: string;
}

export interface ReportIntakeIntelligenceResult {
  reportType: string | null;
  campaignsFound: string[];
  detectedCampaignType: CanonicalCampaignTypeCode | null;
  detectedStrategy: StrategyInference | null;
  confidence: IntelligenceConfidence;
  knownReports: ReportType[];
  missingReports: MissingReportGuidance[];
  gaps: string[];
  nextGuidance: string;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const inferStrategyFromText = (
  value: string | null | undefined
): StrategyInference | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.includes('target cpa') || normalized.includes('t cpa')) {
    return 'target CPA';
  }
  if (normalized.includes('target roas') || normalized.includes('t roas')) {
    return 'target ROAS';
  }
  if (normalized.includes('maximize conversions') || normalized.includes('max conversions')) {
    return 'maximize conversions';
  }
  if (normalized.includes('maximize clicks') || normalized.includes('max clicks')) {
    return 'maximize clicks';
  }
  if (
    normalized.includes('manual cpc') ||
    normalized.includes('manual') ||
    normalized.includes('enhanced cpc')
  ) {
    return 'manual CPC';
  }
  return null;
};

const inferStrategy = async (
  campaignId: number | null
): Promise<StrategyInference | null> => {
  if (!campaignId) return null;
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, targetCpa: true, settings: true },
  });
  if (!campaign) return null;

  if (campaign.targetCpa !== null) return 'target CPA';

  const settingsView = await getCampaignSettingsView(campaign.id);
  if (!settingsView) return null;
  const settings = settingsView.settings as Record<string, unknown>;

  const targetRoas = settings.targetRoas;
  if (typeof targetRoas === 'number' && Number.isFinite(targetRoas)) {
    return 'target ROAS';
  }

  const strategyKeys = [
    settings.biddingStrategy,
    settings.targetGoalType,
    settings.installGoal,
    settings.videoObjective,
  ];

  for (const key of strategyKeys) {
    const inferred = inferStrategyFromText(
      typeof key === 'string' ? key : null
    );
    if (inferred) return inferred;
  }

  return null;
};

const missingPriorityFor = (
  campaignType: CanonicalCampaignTypeCode,
  reportType: ReportType
): MissingPriority => {
  if (campaignType === 'SEARCH') {
    if (reportType === 'SEARCH_TERMS' || reportType === 'KEYWORDS') return 'high';
    if (reportType === 'DEVICE') return 'medium';
  }
  if (campaignType === 'DISPLAY') {
    if (reportType === 'PLACEMENT' || reportType === 'AUDIENCE') return 'high';
    if (reportType === 'DEVICE' || reportType === 'DEMOGRAPHICS') return 'medium';
  }
  if (campaignType === 'PERFORMANCE_MAX') {
    if (reportType === 'CAMPAIGN') return 'high';
    if (reportType === 'DEVICE' || reportType === 'AUDIENCE') return 'medium';
  }
  return 'low';
};

const fallbackNextGuidance = (
  gaps: string[],
  missingReports: MissingReportGuidance[],
  detectedCampaignType: CanonicalCampaignTypeCode | null
): string => {
  const guidance: string[] = [];
  if (missingReports.length > 0) {
    const high = missingReports
      .filter((m) => m.priority === 'high')
      .map((m) => m.reportType);
    if (high.length > 0) {
      guidance.push(
        `Upload high-priority reports next: ${high.join(', ')}.`
      );
    } else {
      guidance.push(
        `Upload missing report types next: ${missingReports
          .slice(0, 3)
          .map((m) => m.reportType)
          .join(', ')}.`
      );
    }
  }
  if (!detectedCampaignType) {
    guidance.push(
      'Confirm campaign type mapping so relevance and priorities can be more precise.'
    );
  }
  if (gaps.length > 0) {
    guidance.push(gaps[0]!);
  }
  if (guidance.length === 0) {
    guidance.push(
      'Intake is sufficient for next-step parsing and mapping; run full analysis only after required reports are uploaded.'
    );
  }
  return guidance.slice(0, 2).join(' ');
};

const generateAiNextGuidance = async (input: {
  reportType: string | null;
  detectedCampaignType: CanonicalCampaignTypeCode | null;
  missingReports: MissingReportGuidance[];
  knownReports: ReportType[];
  gaps: string[];
  confidence: number;
}): Promise<string[] | null> => {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const systemPrompt =
    'You are an intake assistant for Google Ads report onboarding. ' +
    'Generate concise operational next steps using only the provided structured JSON. ' +
    'Do not invent facts, metrics, or entities.';
  const userPrompt = {
    role: 'user',
    content:
      'Return strict JSON with shape {"nextGuidance": string}. ' +
      'Provide one concise actionable guidance sentence. ' +
      'If data is insufficient, explicitly ask for missing reports or mapping.\n\n' +
      JSON.stringify(input),
  };

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: systemPrompt }, userPrompt],
      }),
    });

    if (!response.ok) return null;
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { nextGuidance?: unknown };
    if (typeof parsed.nextGuidance !== 'string') return null;
    const cleaned = parsed.nextGuidance.trim();
    return cleaned.length > 0 ? [cleaned] : null;
  } catch {
    return null;
  }
};

export const buildReportIntakeIntelligence = async (
  input: ReportIntakeIntelligenceInput
): Promise<ReportIntakeIntelligenceResult> => {
  const stagedPath = resolveStagedReportPath(input.stagingId);
  const inspected = await inspectUploadedReportFile(
    stagedPath,
    input.fileName ?? input.stagingId,
    input.clientId
  );

  const reportType = inspected.reportType as ReportType | null;
  const campaignsFound = inspected.campaignNames;

  const matchedCampaignIds = inspected.campaignMatches
    .map((m) => m.matchedCampaignId)
    .filter((id): id is number => typeof id === 'number');

  const selectedCampaignId =
    typeof input.selectedCampaignId === 'number' && input.selectedCampaignId > 0
      ? input.selectedCampaignId
      : matchedCampaignIds[0] ?? null;

  const knownCampaigns = matchedCampaignIds.length
    ? await prisma.campaign.findMany({
        where: { id: { in: matchedCampaignIds } },
        select: { id: true, type: true },
      })
    : [];

  let detectedCampaignType: CanonicalCampaignTypeCode | null = null;
  if (selectedCampaignId) {
    const selected = await prisma.campaign.findUnique({
      where: { id: selectedCampaignId },
      select: { type: true },
    });
    if (selected) {
      detectedCampaignType = resolveCanonicalCampaignType(selected.type);
    }
  }

  if (!detectedCampaignType && knownCampaigns.length > 0) {
    const counts = new Map<CanonicalCampaignTypeCode, number>();
    for (const c of knownCampaigns) {
      const code = resolveCanonicalCampaignType(c.type);
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
    const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
    detectedCampaignType = top?.[0] ?? null;
  }

  if (!detectedCampaignType) {
    const fromReport = inferCampaignTypeFromReportType(reportType);
    detectedCampaignType = fromReport;
  }

  const detectedStrategy = await inferStrategy(selectedCampaignId);

  const knownReportsRows = await prisma.uploadedReport.findMany({
    where: selectedCampaignId
      ? { campaignId: selectedCampaignId }
      : input.clientId
      ? { campaign: { clientId: input.clientId } }
      : undefined,
    select: { reportType: true },
  });
  const knownReports = Array.from(
    new Set(
      [...knownReportsRows.map((r) => r.reportType), reportType]
        .filter((t): t is ReportType => typeof t === 'string')
        .filter((t): t is ReportType =>
          ['PLACEMENT', 'DEVICE', 'GEOGRAPHIC', 'AUDIENCE', 'DEMOGRAPHICS', 'AD_SCHEDULE', 'SEARCH_TERMS', 'KEYWORDS', 'CAMPAIGN'].includes(
            t
          )
        )
    )
  );

  const gaps: string[] = [];
  if (!reportType) {
    gaps.push('Report type could not be confidently detected from header/filename signatures.');
  }
  if (!detectedCampaignType) {
    gaps.push('Campaign type is not confidently identified; provide campaign mapping or a known campaign context.');
  }
  if (!input.clientId) {
    gaps.push('Client context is missing; known/missing report coverage is less precise.');
  }
  if (!selectedCampaignId) {
    gaps.push('No selected campaign mapping found; strategy inference is limited.');
  }

  const missingReports: MissingReportGuidance[] = [];
  if (detectedCampaignType) {
    const registry = getCampaignTypeRegistryEntry(detectedCampaignType);
    for (const requiredType of registry.importantReportTypes) {
      if (!knownReports.includes(requiredType)) {
        missingReports.push({
          reportType: requiredType,
          priority: missingPriorityFor(detectedCampaignType, requiredType),
          reason:
            registry.missingReportGuidance[requiredType] ??
            `Missing ${requiredType} report for ${registry.label} intake readiness.`,
        });
      }
    }
  }

  let confidenceScore = 0.5;
  if (reportType) confidenceScore += 0.2;
  if (detectedCampaignType) confidenceScore += 0.15;
  if (detectedStrategy) confidenceScore += 0.1;
  if (input.clientId) confidenceScore += 0.05;
  if (!selectedCampaignId) confidenceScore -= 0.1;
  if (gaps.length >= 2) confidenceScore -= 0.15;
  if (!reportType || !detectedCampaignType) confidenceScore -= 0.1;
  confidenceScore = Number(clamp(confidenceScore, 0.05, 0.95).toFixed(2));
  const confidence: IntelligenceConfidence =
    confidenceScore >= 0.75 ? 'high' : confidenceScore >= 0.45 ? 'medium' : 'low';

  const aiGuidance =
    (await generateAiNextGuidance({
      reportType,
      detectedCampaignType,
      missingReports,
      knownReports,
      gaps,
      confidence: confidenceScore,
    })) ?? [];
  const nextGuidance =
    aiGuidance.length > 0
      ? aiGuidance[0]!
      : fallbackNextGuidance(gaps, missingReports, detectedCampaignType);

  return {
    reportType,
    campaignsFound,
    detectedCampaignType,
    detectedStrategy,
    confidence,
    knownReports,
    missingReports,
    gaps,
    nextGuidance,
  };
};
