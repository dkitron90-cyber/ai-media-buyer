import { prisma } from '../db/prisma';
import { buildCampaignAiContext } from './aiContextService';
import { OpenAICampaignAnalyzer, type AiDecisionOutput, type CampaignDiagnosis, type PrioritizedAction } from '../ai/openaiProvider';
import { getCampaignAnalysisReadiness } from './analysisService';
import { persistAnalysis } from './campaignAnalysisHistoryService';
import { generateActionsFromAiOutput } from './aiActionGeneratorService';
import { createCampaignEvent } from './campaignEventService';

export const CAMPAIGN_REFRESH_STARTED_TYPE = 'CAMPAIGN_REFRESH_STARTED';
export const CAMPAIGN_REFRESH_DONE_TYPE = 'CAMPAIGN_REFRESH_DONE';

type LastAnalysisStatus =
  | 'success'
  | 'failed'
  | 'skipped'
  | 'deduped'
  | 'never';

const REFRESH_DEDUP_WINDOW_MS = 10_000;

const parseErrorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : 'Unknown refresh failure.';

const convertAiDecisionToDiagnosis = (
  ai: AiDecisionOutput
): CampaignDiagnosis => {
  const prioritizedActions: PrioritizedAction[] = ai.prioritizedActions.map((a) => ({
    type: a.type,
    title: a.title,
    rationale: a.rationale,
    priority: a.priority,
    confidence: a.confidence,
  }));

  const exclusions = Array.from(
    new Set(
      ai.prioritizedActions
        .filter((a) => a.type === 'exclude' && typeof a.targetValue === 'string')
        .map((a) => a.targetValue as string)
    )
  );

  const scaleTargets = Array.from(
    new Set(
      ai.prioritizedActions
        .filter((a) => a.type === 'scale' && typeof a.targetValue === 'string')
        .map((a) => a.targetValue as string)
    )
  );

  return {
    executiveSummary: ai.executiveSummary,
    evidenceStrength: ai.evidenceStrength,
    primaryIssue: ai.primaryIssue,
    focusArea: ai.focusArea,
    estimatedWastedSpend: ai.estimatedWastedSpend,
    estimatedUpside: ai.estimatedUpside,
    decisionConfidence: ai.confidence,
    whatIsHappening: ai.findings,
    whyItIsHappening: [],
    risks: ai.risks,
    opportunities: ai.opportunities,
    prioritizedActions,
    missingData: ai.missingData,
    exclusions,
    scaleTargets,
  };
};

export interface RefreshCampaignStateResult {
  campaignId: number;
  lastRefreshAt: Date;
  lastAnalysisId: number | null;
  lastAnalysisStatus: LastAnalysisStatus;
  lastAnalysisEvidenceStrength: string | null;
}

export async function refreshCampaignState(
  campaignId: number
): Promise<RefreshCampaignStateResult> {
  const now = new Date();

  const lastDone = await prisma.campaignEvent.findFirst({
    where: { campaignId, type: CAMPAIGN_REFRESH_DONE_TYPE },
    orderBy: { occurredAt: 'desc' },
  });

  const lastStarted = await prisma.campaignEvent.findFirst({
    where: { campaignId, type: CAMPAIGN_REFRESH_STARTED_TYPE },
    orderBy: { occurredAt: 'desc' },
  });

  // Deduplicate rapid-fire triggers (e.g. action execute + impact snapshot).
  if (
    (lastDone && now.getTime() - lastDone.occurredAt.getTime() < REFRESH_DEDUP_WINDOW_MS) ||
    (lastStarted && now.getTime() - lastStarted.occurredAt.getTime() < REFRESH_DEDUP_WINDOW_MS)
  ) {
    const meta = {
      trigger: 'deduped',
      analysisAttempted: false,
      analysisStatus: 'deduped' as const,
      analysisId: null,
      evidenceStrength: null,
      error: null,
    };

    await createCampaignEvent({
      campaignId,
      type: CAMPAIGN_REFRESH_DONE_TYPE,
      title: 'Auto refresh deduped',
      metadataJson: JSON.stringify(meta),
      occurredAt: new Date(),
    });

    return {
      campaignId,
      lastRefreshAt: new Date(),
      lastAnalysisId: null,
      lastAnalysisStatus: 'deduped',
      lastAnalysisEvidenceStrength: null,
    };
  }

  // Mark a start event (best-effort).
  await createCampaignEvent({
    campaignId,
    type: CAMPAIGN_REFRESH_STARTED_TYPE,
    title: 'Auto refresh started',
    metadataJson: JSON.stringify({ trigger: 'auto' }),
    occurredAt: new Date(),
  }).catch(() => {
    // Don't fail refresh due to event logging.
  });

  let analysisStatus: LastAnalysisStatus = 'skipped';
  let analysisId: number | null = null;
  let evidenceStrength: string | null = null;
  let error: string | null = null;

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, type: true },
    });
    if (!campaign) {
      analysisStatus = 'failed';
      error = 'Campaign not found.';
    } else {
      // 1) Recalculate readiness/trust signals.
      const readiness = await getCampaignAnalysisReadiness(
        campaignId,
        campaign.type
      );

      // 2) Recalculate gaps + analysis context inputs (used by the AI prompt).
      const context = await buildCampaignAiContext(campaignId);
      if (!context) {
        analysisStatus = 'failed';
        error = 'AI context could not be built.';
      } else {
        // Run analysis when we have *at least* some parsed coverage.
        // Totals (impressions/cost) can legitimately be zero for some report samples,
        // and the AI provider is designed to stay cautious and avoid fabricating facts.
        const enoughData = readiness.parsedReportTypes.length > 0;

        if (!enoughData) {
          analysisStatus = 'skipped';
        } else {
          // 3) Run AI analysis.
          const analyzer = new OpenAICampaignAnalyzer();
          const analysisResult = await analyzer.analyzeCampaign(context);
          const aiDecision = analysisResult.decision;
          const diagnosis = convertAiDecisionToDiagnosis(aiDecision);
          const modelName =
            analysisResult.source === 'openai'
              ? 'gpt-4.1-mini'
              : 'deterministic-fallback';

          // 4) Persist analysis so decision engine + next-best-action stays fresh.
          const saved = await persistAnalysis({
            campaignId,
            diagnosis,
            modelName,
          });
          analysisId = saved.id;
          evidenceStrength = saved.evidenceStrength;

          // 5) Generate/update action plan (deduped) from the AI output.
          try {
            await generateActionsFromAiOutput(campaignId, saved.id, aiDecision);
          } catch (genErr) {
            // Don't fail the refresh when action generation fails.
            console.error('[refreshCampaignState] action generation failed', genErr);
          }

          analysisStatus = 'success';
        }
      }
    }
  } catch (err) {
    analysisStatus = 'failed';
    error = parseErrorMessage(err);
  }

  // Mark a refresh done event (always best-effort).
  const meta = {
    analysisAttempted: analysisStatus !== 'skipped',
    analysisStatus,
    analysisId,
    evidenceStrength,
    error,
  };
  await createCampaignEvent({
    campaignId,
    type: CAMPAIGN_REFRESH_DONE_TYPE,
    title: 'Auto refresh completed',
    metadataJson: JSON.stringify(meta),
    occurredAt: new Date(),
  }).catch(() => {
    // ignore
  });

  return {
    campaignId,
    lastRefreshAt: new Date(),
    lastAnalysisId: analysisId,
    lastAnalysisStatus: analysisStatus,
    lastAnalysisEvidenceStrength: evidenceStrength,
  };
}

