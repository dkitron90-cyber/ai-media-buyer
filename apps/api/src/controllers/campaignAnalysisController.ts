import type { NextFunction, Request, Response } from 'express';
import {
  buildCampaignAiContext,
  buildCampaignAiContextDebug,
} from '../services/aiContextService';
import {
  OpenAICampaignAnalyzer,
  type AiDecisionOutput,
  type CampaignDiagnosis,
  type PrioritizedAction,
} from '../ai/openaiProvider';
import {
  persistAnalysis,
  listAnalyses,
  getAnalysisById,
  deleteAnalysisById,
} from '../services/campaignAnalysisHistoryService';
import { generateActionsFromAiOutput } from '../services/aiActionGeneratorService';

const parseCampaignId = (value: string): number | null => {
  const campaignId = Number(value);
  if (!Number.isInteger(campaignId) || campaignId <= 0) {
    return null;
  }
  return campaignId;
};

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

export const analyzeCampaignHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = parseCampaignId(req.params.id);
    if (!campaignId) {
      return res.status(400).json({
        error: 'Invalid "id" parameter. It must be a positive integer.',
      });
    }

    const context = await buildCampaignAiContext(campaignId);
    if (!context) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    const analyzer = new OpenAICampaignAnalyzer();

    try {
      const analysisResult = await analyzer.analyzeCampaign(context);
      const aiDecision = analysisResult.decision;
      const diagnosis = convertAiDecisionToDiagnosis(aiDecision);
      const modelName =
        analysisResult.source === 'openai'
          ? 'gpt-4.1-mini'
          : 'deterministic-fallback';

      const emptyGeneration = {
        createdActions: 0,
        skippedActions: 0,
        createdPlacements: 0,
        skippedPlacements: 0,
        createdActionIds: [] as number[],
      };

      let analysisId: number | null = null;
      let actionGeneration = emptyGeneration;

      try {
        const saved = await persistAnalysis({
          campaignId,
          diagnosis,
          modelName,
        });
        analysisId = saved.id;

        // Auto-generate actions (deduped) from the structured AI output.
        // We intentionally use the AI output (not the converted diagnosis) so
        // placement auto-creation can use targetType/targetValue safely.
        actionGeneration = await generateActionsFromAiOutput(
          campaignId,
          saved.id,
          aiDecision
        );
      } catch (err) {
        console.error(
          '[CampaignAnalysis] Failed to persist analysis/actions:',
          err
        );
      }

      return res.status(200).json({
        diagnosis,
        analysisId,
        actionGeneration,
        analysisSource: analysisResult.source,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to generate AI diagnosis.';
      return res.status(502).json({ error: message });
    }
  } catch (err) {
    return next(err);
  }
};

export const aiAnalyzeCampaignHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = parseCampaignId(req.params.id);
    if (!campaignId) {
      return res.status(400).json({
        error: 'Invalid "id" parameter. It must be a positive integer.',
      });
    }

    const context = await buildCampaignAiContext(campaignId);
    if (!context) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    const analyzer = new OpenAICampaignAnalyzer();

    try {
      const analysisResult = await analyzer.analyzeCampaign(context);
      const aiDecision = analysisResult.decision;
      const diagnosis = convertAiDecisionToDiagnosis(aiDecision);
      const modelName =
        analysisResult.source === 'openai'
          ? 'gpt-4.1-mini'
          : 'deterministic-fallback';

      try {
        const saved = await persistAnalysis({
          campaignId,
          diagnosis,
          modelName,
        });

        const actionGeneration = await generateActionsFromAiOutput(
          campaignId,
          saved.id,
          aiDecision
        );

        return res.status(200).json({
          analysis: aiDecision,
          analysisId: saved.id,
          actionGeneration,
          analysisSource: analysisResult.source,
        });
      } catch (err) {
        console.error('[CampaignAnalysis] Failed to persist analysis/actions:', err);
      }
      // If persistence/action generation fails unexpectedly, still return the AI analysis.
      return res.status(200).json({
        analysis: aiDecision,
        analysisId: null,
        actionGeneration: {
          createdActions: 0,
          skippedActions: 0,
          createdPlacements: 0,
          skippedPlacements: 0,
          createdActionIds: [],
        },
        analysisSource: analysisResult.source,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to generate AI analysis output.';
      // Never crash the API: still return a 502 here only if OpenAI provider unexpectedly throws.
      return res.status(502).json({ error: message });
    }
  } catch (err) {
    return next(err);
  }
};

export const listCampaignAnalysesHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = parseCampaignId(req.params.id);
    if (!campaignId) {
      return res.status(400).json({
        error: 'Invalid "id" parameter. It must be a positive integer.',
      });
    }

    const analyses = await listAnalyses(campaignId);
    return res.status(200).json(analyses);
  } catch (err) {
    return next(err);
  }
};

export const getCampaignAnalysisByIdHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = parseCampaignId(req.params.id);
    if (!campaignId) {
      return res.status(400).json({
        error: 'Invalid "id" parameter. It must be a positive integer.',
      });
    }

    const analysisId = Number(req.params.analysisId);
    if (!Number.isInteger(analysisId) || analysisId <= 0) {
      return res.status(400).json({
        error: 'Invalid "analysisId" parameter. It must be a positive integer.',
      });
    }

    const analysis = await getAnalysisById(campaignId, analysisId);
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found.' });
    }

    return res.status(200).json(analysis);
  } catch (err) {
    return next(err);
  }
};

export const getCampaignAiContextDebugHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = parseCampaignId(req.params.id);
    if (!campaignId) {
      return res.status(400).json({
        error: 'Invalid "id" parameter. It must be a positive integer.',
      });
    }

    const payload = await buildCampaignAiContextDebug(campaignId);
    if (!payload) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    return res.status(200).json(payload);
  } catch (err) {
    return next(err);
  }
};

export const deleteCampaignAnalysisHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = parseCampaignId(req.params.id);
    if (!campaignId) {
      return res.status(400).json({
        error: 'Invalid \"id\" parameter. It must be a positive integer.',
      });
    }

    const analysisId = Number(req.params.analysisId);
    if (!Number.isInteger(analysisId) || analysisId <= 0) {
      return res.status(400).json({
        error: 'Invalid \"analysisId\" parameter. It must be a positive integer.',
      });
    }

    const deleted = await deleteAnalysisById(campaignId, analysisId);
    if (!deleted) {
      return res.status(404).json({ error: 'Analysis not found.' });
    }

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
};

