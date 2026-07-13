import { useEffect, useMemo, useState } from 'react';
import {
  apiClient,
  type ActionPlanItem,
  type CampaignDiagnosis,
  type SavedAnalysis,
} from '../lib/apiClient';

interface AiInsightCardProps {
  campaignId: number;
  /** Increment to refetch latest analysis (e.g. after run) */
  insightRefresh?: number;
  /** Called when user clicks Run analysis; should run analysis and refresh */
  onRunAnalysis?: () => Promise<void>;
}

type AnalysisState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: SavedAnalysis | null };

type ActionsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: ActionPlanItem[] };

const EVIDENCE_LABEL: Record<
  CampaignDiagnosis['evidenceStrength'],
  { label: string; pillClass: string }
> = {
  strong: { label: 'Strong Evidence', pillClass: 'pill pill-ok' },
  directional: { label: 'Directional Evidence', pillClass: 'pill pill-warning' },
  weak: { label: 'Weak Evidence', pillClass: 'pill pill-error' },
};

export const AiInsightCard = ({
  campaignId,
  insightRefresh = 0,
  onRunAnalysis,
}: AiInsightCardProps) => {
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    status: 'idle',
  });
  const [actionsState, setActionsState] = useState<ActionsState>({
    status: 'idle',
  });
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setAnalysisState({ status: 'loading' });

    apiClient
      .listCampaignAnalyses(campaignId)
      .then((all) => {
        if (cancelled) return;
        const latest =
          all.length === 0
            ? null
            : [...all].sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
              )[0]!;
        setAnalysisState({ status: 'success', data: latest });
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        const message =
          err instanceof Error ? err.message : 'Failed to load latest analysis.';
        setAnalysisState({ status: 'error', error: message });
      });

    return () => {
      cancelled = true;
    };
  }, [campaignId, insightRefresh]);

  useEffect(() => {
    let cancelled = false;
    setActionsState({ status: 'loading' });

    apiClient
      .listCampaignActions(campaignId)
      .then((data) => {
        if (!cancelled) {
          setActionsState({ status: 'success', data });
        }
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        const message =
          err instanceof Error ? err.message : 'Failed to load actions.';
        setActionsState({ status: 'error', error: message });
      });

    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  const diagnosis: CampaignDiagnosis | null =
    analysisState.status === 'success' && analysisState.data
      ? analysisState.data.outputJson
      : null;

  const evidence = diagnosis
    ? EVIDENCE_LABEL[diagnosis.evidenceStrength]
    : null;

  const keyInsights: string[] = useMemo(() => {
    if (!diagnosis) return [];
    const items: string[] = [];
    if (diagnosis.whatIsHappening.length > 0) {
      items.push(diagnosis.whatIsHappening[0]!);
    }
    if (diagnosis.opportunities.length > 0) {
      items.push(diagnosis.opportunities[0]!);
    }
    if (diagnosis.risks.length > 0) {
      items.push(diagnosis.risks[0]!);
    }
    return items.slice(0, 4);
  }, [diagnosis]);

  const topActions: ActionPlanItem[] = useMemo(() => {
    if (actionsState.status !== 'success') return [];
    const eligible = actionsState.data.filter(
      (a) => a.status !== 'done' && a.status !== 'dismissed',
    );
    return [...eligible].sort((a, b) => {
      if (a.priority === b.priority) {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      const order = ['high', 'medium', 'low'];
      return order.indexOf(a.priority) - order.indexOf(b.priority);
    }).slice(0, 2);
  }, [actionsState]);

  const loading =
    analysisState.status === 'loading' || actionsState.status === 'loading';

  const handleRunAnalysis = async () => {
    if (!onRunAnalysis || running) return;
    setRunning(true);
    try {
      await onRunAnalysis();
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="card insight-card insight-card-hero">
      <div className="insight-header">
        <h2>AI Insight</h2>
        <div className="insight-header-right">
          {evidence && <span className={evidence.pillClass}>{evidence.label}</span>}
          {onRunAnalysis && (
            <button
              type="button"
              className="button button-primary button-xs"
              onClick={handleRunAnalysis}
              disabled={running}
            >
              {running ? 'Running…' : 'Run analysis'}
            </button>
          )}
        </div>
      </div>

      {loading && (
        <p className="status status-loading">Summarizing latest analysis…</p>
      )}

      {!loading && analysisState.status === 'error' && (
        <p className="status status-error">{analysisState.error}</p>
      )}

      {!loading && analysisState.status === 'success' && !diagnosis && (
        <div className="insight-empty">
          <p className="status status-loading">
            No AI analysis yet. Run an analysis to generate insights and actions.
          </p>
          {onRunAnalysis && (
            <button
              type="button"
              className="button button-primary"
              onClick={handleRunAnalysis}
              disabled={running}
            >
              {running ? 'Running…' : 'Run analysis'}
            </button>
          )}
        </div>
      )}

      {!loading && diagnosis && (
        <div className="insight-body">
          {/* Top findings strip */}
          {keyInsights.length > 0 && (
            <div className="insight-top-strip">
              {keyInsights.map((item, index) => (
                <div key={index} className="insight-top-pill">
                  {item}
                </div>
              ))}
            </div>
          )}

          {/* Concise executive summary */}
          <p className="insight-executive">
            {diagnosis.executiveSummary}
          </p>

          {/* Signal groups */}
          <div className="insight-signal-grid">
            <div className="insight-signal-block insight-signal-opportunities">
              <div className="insight-section-label">Opportunities</div>
              {diagnosis.opportunities.length > 0 ? (
                <ul className="insight-chip-list">
                  {diagnosis.opportunities.slice(0, 4).map((item, index) => (
                    <li key={index} className="insight-chip insight-chip-opportunity">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="insight-secondary">No major upside opportunities identified.</p>
              )}
            </div>

            <div className="insight-signal-block insight-signal-risks">
              <div className="insight-section-label">Risks</div>
              {diagnosis.risks.length > 0 ? (
                <ul className="insight-chip-list">
                  {diagnosis.risks.slice(0, 4).map((item, index) => (
                    <li key={index} className="insight-chip insight-chip-risk">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="insight-secondary">No critical risks flagged.</p>
              )}
            </div>

            <div className="insight-signal-block insight-signal-missing">
              <div className="insight-section-label">Missing data</div>
              {diagnosis.missingData.length > 0 ? (
                <ul className="insight-chip-list">
                  {diagnosis.missingData.slice(0, 4).map((item, index) => (
                    <li key={index} className="insight-chip insight-chip-missing">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="insight-secondary">
                  No major gaps — data coverage is sufficient for this diagnosis.
                </p>
              )}
            </div>

            <div className="insight-signal-block insight-signal-why">
              <div className="insight-section-label">Why it&apos;s happening</div>
              {diagnosis.whyItIsHappening.length > 0 ? (
                <ul className="insight-chip-list">
                  {diagnosis.whyItIsHappening.slice(0, 4).map((item, index) => (
                    <li key={index} className="insight-chip insight-chip-why">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="insight-secondary">
                  The model did not surface specific root causes beyond the summary.
                </p>
              )}
            </div>
          </div>

          {/* Linkage to actions */}
          <div className="insight-section">
            <span className="insight-section-label">Next actions</span>
            {actionsState.status === 'error' && (
              <p className="status status-error">{actionsState.error}</p>
            )}
            {actionsState.status === 'success' && topActions.length === 0 && (
              <p className="insight-secondary">
                No open actions yet. Use the Action Plan and Recommended Actions sections
                below to create or approve the next steps.
              </p>
            )}
            {topActions.length > 0 && (
              <ul className="insight-actions">
                {topActions.map((action) => (
                  <li key={action.id} className="insight-action-item">
                    <div className="insight-action-main">
                      <span className="insight-action-type">
                        {action.actionType}
                      </span>
                      <span className="insight-action-title">{action.title}</span>
                      {action.rationale && (
                        <span className="insight-secondary">{action.rationale}</span>
                      )}
                    </div>
                    <span className="pill pill-muted">
                      {action.priority} · {action.confidence} confidence
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="insight-secondary">
            See &ldquo;Recommended actions&rdquo; and &ldquo;All actions&rdquo; below to
            execute and track these recommendations inside your operating workflow.
          </p>
        </div>
      )}
    </section>
  );
};

