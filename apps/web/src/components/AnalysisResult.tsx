import { useState } from 'react';
import { apiClient, type CampaignDiagnosis, type FromAnalysisResult } from '../lib/apiClient';
import { PrioritizedActions } from './PrioritizedActions';
import { CollapsibleSection } from './CollapsibleSection';
import type { ExperienceMode } from '../lib/experienceMode';
import { evidenceStrengthGuide, isJuniorMode } from '../lib/experienceMode';

interface AnalysisResultProps {
  diagnosis: CampaignDiagnosis;
  campaignId?: number;
  analysisId?: number;
  experienceMode?: ExperienceMode;
  analysisSource?: 'openai' | 'deterministic-fallback';
}

const EVIDENCE_CONFIG: Record<
  CampaignDiagnosis['evidenceStrength'],
  { label: string; pillClass: string }
> = {
  strong: { label: 'Strong Evidence', pillClass: 'pill pill-ok' },
  directional: { label: 'Directional Evidence', pillClass: 'pill pill-warning' },
  weak: { label: 'Weak Evidence', pillClass: 'pill pill-error' },
};

const Section = ({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: string[];
  emptyText?: string;
}) => {
  if (items.length === 0 && !emptyText) return null;

  return (
    <div className="analysis-section">
      <h4 className="analysis-section-title">{title}</h4>
      {items.length > 0 ? (
        <ul className="analysis-section-list">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="status status-loading">{emptyText}</p>
      )}
    </div>
  );
};

type ExecState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; result: FromAnalysisResult }
  | { status: 'error'; error: string };

const ExecutionButton = ({
  campaignId,
  analysisId,
  listType,
  label,
  hasTargets,
}: {
  campaignId: number;
  analysisId: number;
  listType: 'blacklist' | 'whitelist';
  label: string;
  hasTargets: boolean;
}) => {
  const [state, setState] = useState<ExecState>({ status: 'idle' });

  const handleClick = async () => {
    setState({ status: 'loading' });
    try {
      const result = await apiClient.createPlacementsFromAnalysis(campaignId, {
        analysisId,
        type: listType,
      });
      setState({ status: 'success', result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Execution failed.';
      setState({ status: 'error', error: message });
    }
  };

  if (!hasTargets) return null;

  return (
    <div className="exec-button-group">
      <button
        className="button button-primary"
        disabled={state.status === 'loading' || state.status === 'success'}
        onClick={handleClick}
      >
        {state.status === 'loading' ? 'Adding…' : label}
      </button>
      {state.status === 'success' && (
        <span className="exec-feedback exec-feedback-ok">
          {state.result.total} added
          {state.result.skippedDuplicates.length > 0 &&
            ` · ${state.result.skippedDuplicates.length} already existed`}
        </span>
      )}
      {state.status === 'error' && (
        <span className="exec-feedback exec-feedback-error">{state.error}</span>
      )}
    </div>
  );
};

export const AnalysisResult = ({
  diagnosis,
  campaignId,
  analysisId,
  experienceMode = 'senior',
  analysisSource,
}: AnalysisResultProps) => {
  const evidenceCfg = EVIDENCE_CONFIG[diagnosis.evidenceStrength];
  const junior = isJuniorMode(experienceMode);
  const canExecute = campaignId != null && analysisId != null;

  return (
    <div className="analysis-result">
      <div className="analysis-executive">
        <div className="analysis-executive-header">
          <h3 className="analysis-executive-title">Executive Summary</h3>
          <span className={evidenceCfg.pillClass}>{evidenceCfg.label}</span>
        </div>
        <p className="analysis-executive-body">{diagnosis.executiveSummary}</p>
        {junior && evidenceStrengthGuide[diagnosis.evidenceStrength] && (
          <p className="experience-junior-hint">
            {evidenceStrengthGuide[diagnosis.evidenceStrength]}
          </p>
        )}
        {junior && analysisSource === 'deterministic-fallback' && (
          <p className="experience-junior-hint">
            This diagnosis used the server fallback (OpenAI unavailable or
            returned invalid output). Upload more reports or retry when the API
            key is configured.
          </p>
        )}
      </div>

      <CollapsibleSection
        title="Full analysis breakdown"
        subtitle="Details, opportunities, risks, and execution lists"
        defaultCollapsed
      >
        <div className="analysis-grid">
          <Section title="What Is Happening" items={diagnosis.whatIsHappening} />
          <Section title="Why It Is Happening" items={diagnosis.whyItIsHappening} />
        </div>

        <div className="analysis-grid">
          <Section title="Opportunities" items={diagnosis.opportunities} />
          <Section title="Risks" items={diagnosis.risks} />
        </div>

        <div className="analysis-section">
          <h4 className="analysis-section-title">Prioritized Actions</h4>
          <PrioritizedActions actions={diagnosis.prioritizedActions} />
        </div>

        <div className="analysis-grid">
          <div className="analysis-section">
            <h4 className="analysis-section-title">Scale Targets</h4>
            {diagnosis.scaleTargets.length > 0 ? (
              <ul className="analysis-section-list">
                {diagnosis.scaleTargets.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="status status-loading">No scale targets identified.</p>
            )}
            {canExecute && (
              <ExecutionButton
                campaignId={campaignId}
                analysisId={analysisId}
                listType="whitelist"
                label="Add scale targets to whitelist"
                hasTargets={diagnosis.scaleTargets.length > 0}
              />
            )}
          </div>
          <div className="analysis-section">
            <h4 className="analysis-section-title">Recommended Exclusions</h4>
            {diagnosis.exclusions.length > 0 ? (
              <ul className="analysis-section-list">
                {diagnosis.exclusions.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="status status-loading">No exclusions recommended.</p>
            )}
            {canExecute && (
              <ExecutionButton
                campaignId={campaignId}
                analysisId={analysisId}
                listType="blacklist"
                label="Add exclusions to blacklist"
                hasTargets={diagnosis.exclusions.length > 0}
              />
            )}
          </div>
        </div>

        {diagnosis.missingData.length > 0 && (
          <div className="analysis-missing-data">
            <Section title="Missing Data" items={diagnosis.missingData} />
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
};
