import { useEffect, useMemo, useState } from 'react';
import { apiClient, type NextBestActionResult } from '../lib/apiClient';

interface NextBestActionCardProps {
  campaignId: number;
  /** When this number changes, the card refetches next-best-action. */
  refreshTrigger?: number;
  /** Called after a successful `Execute` so the page can refresh derived UI. */
  onAfterExecute?: () => void;
}

type CardState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: NextBestActionResult['nextBestAction'] };

const scrollToId = (id: string) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const priorityPillClass = (priority: string) => {
  const p = (priority ?? '').toLowerCase();
  if (p === 'high') return 'pill-ok';
  if (p === 'low') return 'pill-muted';
  return 'pill-warning';
};

const confidencePillClass = (confidence: string) => {
  const c = (confidence ?? '').toLowerCase();
  if (c === 'high') return 'pill-ok';
  if (c === 'low') return 'pill-error';
  return 'pill-warning';
};

export const NextBestActionCard = ({
  campaignId,
  refreshTrigger = 0,
  onAfterExecute,
}: NextBestActionCardProps) => {
  const [state, setState] = useState<CardState>({ status: 'loading' });
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    apiClient
      .getNextBestAction(campaignId)
      .then((res) => {
        if (cancelled) return;
        // Backend always returns a structured object; we treat empty signals as "no critical next step".
        setState({ status: 'success', data: res.nextBestAction });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load next best action.';
        setState({ status: 'error', error: message });
      });

    return () => {
      cancelled = true;
    };
  }, [campaignId, refreshTrigger]);

  const noMeaningfulNextStep = useMemo(() => {
    if (state.status !== 'success') return false;
    const a = state.data;
    return (
      !a.isExecutable &&
      a.actionId == null &&
      (a.relatedGapIds?.length ?? 0) === 0 &&
      a.blockingReason != null
    );
  }, [state]);

  const renderCta = () => {
    if (state.status !== 'success') return null;
    const a = state.data;

    const handleExecute = async () => {
      if (!a.actionId) return;
      setExecuting(true);
      try {
        await apiClient.executeCampaignAction(campaignId, a.actionId);
        onAfterExecute?.();
      } catch (err: unknown) {
        // keep safe behavior: surface error without faking next states
        const message = err instanceof Error ? err.message : 'Execution failed.';
        setState({ status: 'error', error: message });
      } finally {
        setExecuting(false);
      }
    };

    if (a.isExecutable && a.actionId != null) {
      return (
        <button
          type="button"
          className="button button-primary button-xs"
          disabled={executing}
          onClick={handleExecute}
        >
          {executing ? 'Executing…' : 'Execute'}
        </button>
      );
    }

    const openByType: Record<string, { label: string; targetId: string }> = {
      data_request: { label: 'Upload report', targetId: 'section-reports' },
      settings_fix: { label: 'Open settings', targetId: 'section-settings' },
      checklist_item: {
        label: 'Review checklist',
        targetId: 'section-checklist',
      },
      gap: { label: 'Open decision engine', targetId: 'section-decision-engine' },
    };

    const target = openByType[a.type] ?? null;
    if (!target) return null;

    return (
      <button
        type="button"
        className="button button-ghost button-xs"
        disabled={executing}
        onClick={() => scrollToId(target.targetId)}
      >
        {target.label}
      </button>
    );
  };

  return (
    <section className="card card-next-best-action">
      <div className="card-header-row">
        <h2 style={{ marginBottom: 0 }}>Next best step</h2>
        {state.status === 'success' && (
          <div className="pill-row">
            <span className={`pill ${priorityPillClass(state.data.priority)}`}>
              {state.data.priority} priority
            </span>
            <span className={`pill ${confidencePillClass(state.data.confidence)}`}>
              {state.data.confidence} confidence
            </span>
            <span className={`pill ${state.data.isExecutable ? 'pill-ok' : 'pill-muted'}`}>
              {state.data.isExecutable ? 'Executable now' : 'Not executable'}
            </span>
          </div>
        )}
      </div>

      {state.status === 'loading' && (
        <p className="status status-loading">Determining next best step…</p>
      )}

      {state.status === 'error' && (
        <p className="status status-error">{state.error}</p>
      )}

      {state.status === 'success' && noMeaningfulNextStep && (
        <div className="next-best-action-empty">
          <p className="status status-loading">
            No critical next step detected right now.
          </p>
        </div>
      )}

      {state.status === 'success' && !noMeaningfulNextStep && (
        <>
          <div className="next-best-action-body">
            <h3 className="next-best-action-title">{state.data.title}</h3>
            <p className="next-best-action-desc">{state.data.description}</p>
            <p className="next-best-action-why">
              <span className="next-best-action-why-label">Why now:</span>{' '}
              {state.data.whyNow}
            </p>
          </div>
          <div className="next-best-action-cta">{renderCta()}</div>
          {state.data.blockingReason && (
            <p className="next-best-action-blocking">
              {state.data.blockingReason}
            </p>
          )}
        </>
      )}
    </section>
  );
};

