import { useEffect, useState } from 'react';
import {
  apiClient,
  type AnalysisReadiness as ReadinessData,
  type AnalyzeCampaignResponse,
  type CampaignDiagnosis,
} from '../lib/apiClient';
import { AnalysisReadiness } from './AnalysisReadiness';
import { AnalysisResult } from './AnalysisResult';
import { AiGenerationFeedback } from './AiGenerationFeedback';
import type { ExperienceMode } from '../lib/experienceMode';
import { isJuniorMode } from '../lib/experienceMode';

interface CampaignAnalysisProps {
  campaignId: number;
  onAnalysisComplete?: () => void;
  /** When set (e.g. from campaign detail), shares the same analyze call as the decision engine. */
  runCampaignAnalysis?: () => Promise<AnalyzeCampaignResponse | undefined>;
  experienceMode?: ExperienceMode;
}

type ReadinessState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: ReadinessData };

type AnalysisState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: CampaignDiagnosis };

export const CampaignAnalysis = ({
  campaignId,
  onAnalysisComplete,
  runCampaignAnalysis,
  experienceMode = 'senior',
}: CampaignAnalysisProps) => {
  const junior = isJuniorMode(experienceMode);
  const [readiness, setReadiness] = useState<ReadinessState>({ status: 'idle' });
  const [analysis, setAnalysis] = useState<AnalysisState>({ status: 'idle' });
  const [lastGeneration, setLastGeneration] = useState<AnalyzeCampaignResponse | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    setReadiness({ status: 'loading' });
    setAnalysis({ status: 'idle' });

    apiClient
      .getAnalysisReadiness(campaignId)
      .then((data) => {
        if (!cancelled) setReadiness({ status: 'success', data });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'Failed to load readiness.';
          setReadiness({ status: 'error', error: message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  useEffect(() => {
    setLastGeneration(null);
  }, [campaignId]);

  const handleRunAnalysis = async () => {
    setAnalysis({ status: 'loading' });
    setLastGeneration(null);
    try {
      const res = runCampaignAnalysis
        ? await runCampaignAnalysis()
        : await apiClient.analyzeCampaign(campaignId);
      if (!res) {
        setAnalysis({
          status: 'error',
          error: 'No campaign selected for analysis.',
        });
        return;
      }
      setAnalysis({ status: 'success', data: res.diagnosis });
      setLastGeneration(res);
      // Parent `runCampaignAnalysis` already triggers refresh (e.g. history + decision engine).
      if (!runCampaignAnalysis) {
        onAnalysisComplete?.();
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to run analysis.';
      setAnalysis({ status: 'error', error: message });
    }
  };

  return (
    <section className="card">
      <h2>AI Analysis</h2>

      {readiness.status === 'loading' && (
        <p className="status status-loading">Loading analysis readiness…</p>
      )}

      {readiness.status === 'error' && (
        <p className="status status-error">{readiness.error}</p>
      )}

      {readiness.status === 'success' && (
        <>
          <AnalysisReadiness readiness={readiness.data} experienceMode={experienceMode} />

          <div className="analysis-trigger">
            <button
              className="btn analysis-btn"
              disabled={analysis.status === 'loading'}
              onClick={handleRunAnalysis}
            >
              {analysis.status === 'loading'
                ? 'Analyzing…'
                : 'Run AI Analysis'}
            </button>

            {(junior || readiness.data.sufficiencyLabel === 'WEAK') &&
              readiness.data.sufficiencyLabel === 'WEAK' && (
              <p className="analysis-weak-warning">
                Data readiness is weak. The analysis will focus on identifying
                data gaps and next steps rather than optimization actions.
              </p>
            )}
          </div>
        </>
      )}

      {analysis.status === 'loading' && (
        <div className="analysis-loading">
          <div className="analysis-spinner" />
          <p>Running AI analysis — this may take a moment…</p>
        </div>
      )}

      {analysis.status === 'error' && (
        <div className="status status-error">{analysis.error}</div>
      )}

      {analysis.status === 'success' && lastGeneration && (
        <AiGenerationFeedback
          actionGeneration={lastGeneration.actionGeneration}
          analysisId={lastGeneration.analysisId}
          className="ai-generation-feedback-compact"
        />
      )}

      {analysis.status === 'success' && (
        <AnalysisResult
          diagnosis={analysis.data}
          experienceMode={experienceMode}
          analysisSource={lastGeneration?.analysisSource}
        />
      )}

      {analysis.status === 'idle' && readiness.status === 'success' && (
        <div className="analysis-empty">
          <p>Click "Run AI Analysis" to generate a campaign diagnosis.</p>
        </div>
      )}
    </section>
  );
};
