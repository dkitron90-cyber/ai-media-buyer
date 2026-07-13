import { useEffect, useMemo, useState } from 'react';
import {
  apiClient,
  type CampaignDiagnosis,
  type CampaignGap,
  type CampaignGapsResponse,
  type ActionPlanItem,
  type SavedAnalysis,
  type DataWindow,
  type AnalyzeCampaignResponse,
} from '../lib/apiClient';
import { sortActionsWithHighlightFirst } from '../lib/actionPlanDisplay';
import { AnalysisResult } from './AnalysisResult';
import { ActionList } from './ActionList';
import { CollapsibleSection } from './CollapsibleSection';
import { CampaignActions } from './CampaignActions';
import { CampaignGapsPanel } from './CampaignGapsPanel';
import { AiGenerationFeedback } from './AiGenerationFeedback';

interface DecisionEnginePanelProps {
  campaignId: number;
  onRunAnalysis: () => Promise<void | AnalyzeCampaignResponse>;
  insightRefresh: number;
  /** Latest POST /analyze payload (shared with Advanced AI panel) for feedback + highlights. */
  analyzeGenerationResult: AnalyzeCampaignResponse | null;
  /** When false, hides the main "Decision engine" heading (e.g. parent section already has a title). */
  showTitle?: boolean;
}

type AnalysisState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: SavedAnalysis | null };

type GapsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: CampaignGapsResponse };

type ActionsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: ActionPlanItem[] };

const EVIDENCE_LABEL: Record<
  NonNullable<CampaignDiagnosis>['evidenceStrength'],
  { label: string; pillClass: string }
> = {
  strong: { label: 'Strong evidence', pillClass: 'pill pill-ok' },
  directional: { label: 'Directional evidence', pillClass: 'pill pill-warning' },
  weak: { label: 'Weak evidence', pillClass: 'pill pill-error' },
};

const campaignHealthFromGaps = (gaps: CampaignGap[]): 'healthy' | 'needs_work' | 'critical' => {
  const high = gaps.filter((g) => g.severity === 'high').length;
  const medium = gaps.filter((g) => g.severity === 'medium').length;
  if (high >= 2 || (high === 1 && medium >= 1)) return 'critical';
  if (high === 1 || medium >= 2) return 'needs_work';
  return 'healthy';
};

export const DecisionEnginePanel = ({
  campaignId,
  onRunAnalysis,
  insightRefresh,
  analyzeGenerationResult,
  showTitle = true,
}: DecisionEnginePanelProps) => {
  const [trustState, setTrustState] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'error'; error: string }
    | { status: 'success'; data: DataWindow }
  >({ status: 'idle' });

  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    status: 'idle',
  });
  const [gapsState, setGapsState] = useState<GapsState>({ status: 'idle' });
  const [actionsState, setActionsState] = useState<ActionsState>({
    status: 'idle',
  });
  const [running, setRunning] = useState(false);

  const highlightActionIds = analyzeGenerationResult?.actionGeneration.createdActionIds ?? [];

  // Analysis (latest diagnosis only)
  useEffect(() => {
    let cancelled = false;
    setAnalysisState({ status: 'loading' });
    apiClient
      .listCampaignAnalyses(campaignId)
      .then((all) => {
        if (cancelled) return;
        if (!all.length) {
          setAnalysisState({ status: 'success', data: null });
          return;
        }
        const latest = [...all].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )[0]!;
        setAnalysisState({ status: 'success', data: latest });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'Failed to load latest analysis.';
        setAnalysisState({ status: 'error', error: message });
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId, insightRefresh]);

  // Data trust hint (freshness/alignment) for the hero strip
  useEffect(() => {
    let cancelled = false;
    setTrustState({ status: 'loading' });
    apiClient
      .getCampaignDataWindow(campaignId)
      .then((data) => {
        if (cancelled) return;
        setTrustState({ status: 'success', data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'Failed to load data trust.';
        setTrustState({ status: 'error', error: message });
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId, insightRefresh]);

  // Gaps
  useEffect(() => {
    let cancelled = false;
    setGapsState({ status: 'loading' });
    apiClient
      .getCampaignGaps(campaignId)
      .then((data) => {
        if (!cancelled) setGapsState({ status: 'success', data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'Failed to load gaps.';
        setGapsState({ status: 'error', error: message });
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId, insightRefresh]);

  // Actions — refetch when a new analysis run completes (insightRefresh bumps).
  useEffect(() => {
    let cancelled = false;
    setActionsState({ status: 'loading' });
    apiClient
      .listCampaignActions(campaignId)
      .then((data) => {
        if (!cancelled) setActionsState({ status: 'success', data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'Failed to load actions.';
        setActionsState({ status: 'error', error: message });
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId, insightRefresh]);

  const diagnosis: CampaignDiagnosis | null =
    analysisState.status === 'success' ? analysisState.data?.outputJson ?? null : null;
  const evidence = diagnosis ? EVIDENCE_LABEL[diagnosis.evidenceStrength] : null;
  const gaps = gapsState.status === 'success' ? gapsState.data.gaps : [];

  const trustHint = useMemo(() => {
    if (trustState.status !== 'success') return null;
    const { alignmentStatus, freshnessStatus } = trustState.data;
    if (alignmentStatus === 'MISALIGNED' || freshnessStatus === 'STALE') {
      return { label: 'Low trust', pillClass: 'pill pill-error' };
    }
    if (
      alignmentStatus === 'PARTIAL' ||
      freshnessStatus === 'AGING'
    ) {
      return { label: 'Directional trust', pillClass: 'pill pill-warning' };
    }
    return { label: 'Aligned & fresh', pillClass: 'pill pill-ok' };
  }, [trustState]);

  const health = useMemo(() => {
    const base = gaps.length ? campaignHealthFromGaps(gaps) : 'healthy';

    if (trustHint?.label === 'Low trust') {
      return base === 'critical' ? 'critical' : 'needs_work';
    }

    if (
      base === 'healthy' &&
      (diagnosis?.evidenceStrength === 'weak' || trustHint?.label === 'Directional trust')
    ) {
      return 'needs_work';
    }

    return base;
  }, [gaps, diagnosis?.evidenceStrength, trustHint]);

  const healthLabel =
    health === 'critical'
      ? 'Critical issues'
      : health === 'needs_work'
        ? 'Needs work'
        : 'Healthy';

  const healthClass =
    health === 'critical'
      ? 'pill pill-error'
      : health === 'needs_work'
        ? 'pill pill-warning'
        : 'pill pill-ok';

  const tokenizeIssue = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(' ')
      .filter((w) => w.length >= 4);

  const isSameIssue = (a: string, b: string) => {
    const ta = tokenizeIssue(a);
    const tb = tokenizeIssue(b);
    if (!ta.length || !tb.length) return a.trim().toLowerCase() === b.trim().toLowerCase();
    const common = ta.filter((t) => tb.includes(t));
    const needed = Math.min(3, Math.ceil(Math.min(ta.length, tb.length) * 0.5));
    return common.length >= needed;
  };

  const topIssues: string[] = useMemo(() => {
    const items: string[] = [];
    // High severity gaps first
    const highGaps = gaps.filter((g) => g.severity === 'high').slice(0, 3);
    items.push(...highGaps.map((g) => g.title));

    // If we still have room, use AI risks (deduped against gap titles)
    const max = 4;
    if (diagnosis && items.length < max && diagnosis.risks.length > 0) {
      for (const r of diagnosis.risks) {
        if (items.some((existing) => isSameIssue(existing, r))) continue;
        items.push(r);
        if (items.length >= max) break;
      }
    }
    return items;
  }, [gaps, diagnosis]);

  const whyItMattersBullets: string[] = useMemo(() => {
    const bullets: string[] = [];
    if (diagnosis) {
      bullets.push(...diagnosis.whyItIsHappening.slice(0, 2));
      // fall back to whatIsHappening / opportunities if needed
      if (bullets.length < 2 && diagnosis.whatIsHappening.length) {
        bullets.push(diagnosis.whatIsHappening[0]!);
      }
      if (bullets.length < 3 && diagnosis.opportunities.length) {
        bullets.push(diagnosis.opportunities[0]!);
      }
    }
    // Category-based impact (grounded by detected gap categories)
    const hasDataGap = gaps.some((g) => g.category === 'data');
    const hasReportsGap = gaps.some((g) => g.category === 'reports');
    const hasSettingsGap = gaps.some((g) => g.category === 'settings');
    const hasChecklistGap = gaps.some((g) => g.category === 'checklist');

    if (bullets.length < 3 && (hasDataGap || trustHint?.label === 'Low trust')) {
      bullets.push('Weak freshness/alignment reduces confidence in optimization choices.');
    } else if (bullets.length < 3 && hasReportsGap) {
      bullets.push('Missing reporting coverage can waste spend by hiding what to fix next.');
    } else if (bullets.length < 3 && hasSettingsGap) {
      bullets.push('Structural setup gaps can block the learning signals needed to optimize.');
    } else if (bullets.length < 3 && hasChecklistGap) {
      bullets.push('Uncompleted checklist items delay launch or optimization progress.');
    }
    return bullets.slice(0, 3);
  }, [diagnosis, gaps, trustHint]);

  const topActions: ActionPlanItem[] = useMemo(() => {
    if (actionsState.status !== 'success') return [];
    const eligible = actionsState.data.filter(
      (a) => a.status !== 'done' && a.status !== 'dismissed',
    );
    return sortActionsWithHighlightFirst(eligible, highlightActionIds).slice(0, 5);
  }, [actionsState, highlightActionIds]);

  const loadingHero =
    analysisState.status === 'loading' ||
    gapsState.status === 'loading' ||
    actionsState.status === 'loading';

  const handleRunAnalysisClick = async () => {
    if (running) return;
    setRunning(true);
    try {
      await onRunAnalysis();
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="card decision-engine-card">
      {/* A. Decision summary strip */}
      <header className="decision-header">
        <div className="decision-header-main">
          {showTitle !== false && (
            <h2 className="decision-title">Decision engine</h2>
          )}
          <div className="decision-pills">
            {evidence && (
              <span className={evidence.pillClass}>{evidence.label}</span>
            )}
            {trustHint && <span className={trustHint.pillClass}>{trustHint.label}</span>}
            <span className={healthClass}>{healthLabel}</span>
          </div>
        </div>
        <div className="decision-header-actions">
          <button
            type="button"
            className="button button-primary button-xs"
            onClick={handleRunAnalysisClick}
            disabled={running}
          >
            {running ? 'Running…' : 'Run analysis'}
          </button>
        </div>
      </header>

      {analyzeGenerationResult && (
        <AiGenerationFeedback
          actionGeneration={analyzeGenerationResult.actionGeneration}
          analysisId={analyzeGenerationResult.analysisId}
        />
      )}

      {loadingHero && <p className="status status-loading">Loading…</p>}

      {!loadingHero && analysisState.status === 'error' && (
        <p className="status status-error">{analysisState.error}</p>
      )}

      {/* Summary excerpt — clamped so the panel stays scannable */}
      {diagnosis && (
        <p className="decision-summary decision-summary--clamped">
          {diagnosis.executiveSummary}
        </p>
      )}

      <CollapsibleSection
        title="Issues & next steps"
        subtitle="Top issues, impact, and recommended actions"
        defaultCollapsed
      >
        <div className="decision-section">
          <h3 className="decision-section-title">Top issues</h3>
          {topIssues.length === 0 ? (
            <p className="list-item-meta">No critical issues flagged.</p>
          ) : (
            <ul className="list">
              {topIssues.map((issue, idx) => (
                <li key={`${issue}-${idx}`} className="list-item">
                  <span className="list-item-title">{issue}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="decision-section">
          <h3 className="decision-section-title">Why this matters</h3>
          {whyItMattersBullets.length === 0 ? (
            <p className="list-item-meta">—</p>
          ) : (
            <ul className="list">
              {whyItMattersBullets.map((b, idx) => (
                <li key={idx} className="list-item">
                  {b}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="decision-section">
          <h3 className="decision-section-title">Recommended next actions</h3>
          {actionsState.status === 'error' && (
            <p className="status status-error">{actionsState.error}</p>
          )}
          {topActions.length === 0 && actionsState.status === 'success' && (
            <p className="list-item-meta">No open actions.</p>
          )}
          {actionsState.status === 'success' && topActions.length > 0 && (
            <ActionList
              actions={topActions}
              highlightActionIds={highlightActionIds}
              onUpdate={async (actionId, payload) => {
                const updated = await apiClient.updateCampaignAction(
                  campaignId,
                  actionId,
                  payload,
                );
                setActionsState((prev) => {
                  if (prev.status !== 'success') return prev;
                  return {
                    status: 'success',
                    data: prev.data.map((a) =>
                      a.id === updated.id ? updated : a,
                    ),
                  };
                });
              }}
              onExecute={async (actionId) => {
                const result = await apiClient.executeCampaignAction(
                  campaignId,
                  actionId,
                );
                setActionsState((prev) => {
                  if (prev.status !== 'success') return prev;
                  return {
                    status: 'success',
                    data: prev.data.map((a) =>
                      a.id === actionId ? { ...a, status: 'done' } : a,
                    ),
                  };
                });
                return result;
              }}
              onDelete={async (actionId) => {
                await apiClient.deleteAction(campaignId, actionId);
                setActionsState((prev) => {
                  if (prev.status !== 'success') return prev;
                  return {
                    status: 'success',
                    data: prev.data.filter((a) => a.id !== actionId),
                  };
                });
              }}
            />
          )}
        </div>
      </CollapsibleSection>

      {/* Expandable deeper detail */}
      <CollapsibleSection
        title="Full AI analysis"
        subtitle="Breakdown, prioritized actions, risks, and missing data"
        defaultCollapsed
      >
        {analysisState.status === 'loading' && (
          <p className="status status-loading">Loading AI analysis…</p>
        )}
        {analysisState.status === 'error' && (
          <p className="status status-error">{analysisState.error}</p>
        )}
        {analysisState.status === 'success' && analysisState.data && diagnosis && (
          <AnalysisResult
            diagnosis={diagnosis}
            campaignId={campaignId}
            analysisId={analysisState.data.id}
          />
        )}
        {analysisState.status === 'success' && !analysisState.data && (
          <div className="stack gap-sm">
            <p className="status status-loading">No AI analysis yet. Run an analysis to generate a full diagnosis.</p>
            <button
              type="button"
              className="button button-primary button-xs"
              disabled={running}
              onClick={handleRunAnalysisClick}
            >
              {running ? 'Running…' : 'Run analysis'}
            </button>
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="All gaps"
        subtitle="Every detected issue and missing-data signal"
        defaultCollapsed
      >
        {gapsState.status === 'loading' && (
          <p className="status status-loading">Detecting gaps…</p>
        )}
        {gapsState.status === 'error' && (
          <p className="status status-error">{gapsState.error}</p>
        )}
        {gapsState.status === 'success' && (
          <CampaignGapsPanel
            campaignId={campaignId}
            gapsOverride={gapsState.data.gaps}
          />
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="All actions"
        subtitle="Create, execute, and track the full operating action plan"
        defaultCollapsed
      >
        <CampaignActions
          campaignId={campaignId}
          refreshTrigger={insightRefresh}
          highlightActionIds={highlightActionIds}
        />
      </CollapsibleSection>
    </section>
  );
};

