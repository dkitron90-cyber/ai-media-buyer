import { useCallback, useEffect, useState } from 'react';
import { apiClient, type ActionImpactSummary } from '../lib/apiClient';
import { ActionImpactMetrics } from './ActionImpactMetrics';

interface ActionImpactPanelProps {
  campaignId: number;
  actionId: number;
  visible: boolean;
  eligibleToCapture: boolean;
}

type ImpactState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: ActionImpactSummary };

export const ActionImpactPanel = ({
  campaignId,
  actionId,
  visible,
  eligibleToCapture,
}: ActionImpactPanelProps) => {
  const [state, setState] = useState<ImpactState>({ status: 'idle' });
  const [capturing, setCapturing] = useState(false);
  const [captureMessage, setCaptureMessage] = useState<string | null>(null);

  const loadImpact = useCallback(() => {
    setState({ status: 'loading' });
    apiClient
      .getActionImpact(campaignId, actionId)
      .then((data) => setState({ status: 'success', data }))
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Failed to load impact.';
        setState({ status: 'error', error: message });
      });
  }, [campaignId, actionId]);

  useEffect(() => {
    if (!visible) return;
    loadImpact();
  }, [visible, loadImpact]);

  const handleCapture = async () => {
    setCapturing(true);
    setCaptureMessage(null);
    try {
      const data = await apiClient.captureActionImpact(campaignId, actionId);
      setState({ status: 'success', data });
      setCaptureMessage('After snapshot captured.');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to capture impact.';
      setCaptureMessage(message);
    } finally {
      setCapturing(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="impact-panel">
      <div className="impact-panel-header">
        <span className="impact-panel-title">Impact</span>
        <div className="impact-panel-actions">
          <button
            className="button button-ghost button-xs"
            onClick={loadImpact}
            disabled={state.status === 'loading' || capturing}
          >
            Refresh
          </button>
          {eligibleToCapture && (
            <button
              className="button button-secondary button-xs"
              onClick={handleCapture}
              disabled={capturing}
            >
              {capturing ? 'Capturing…' : 'Capture Impact'}
            </button>
          )}
        </div>
      </div>

      {captureMessage && (
        <div
          className={`impact-capture-message ${
            captureMessage === 'After snapshot captured.'
              ? 'impact-capture-ok'
              : 'impact-capture-error'
          }`}
        >
          {captureMessage}
        </div>
      )}

      {state.status === 'loading' && (
        <p className="status status-loading">Loading impact…</p>
      )}

      {state.status === 'error' && (
        <div className="actions-error-row">
          <p className="status status-error">{state.error}</p>
          <button className="button button-ghost" onClick={loadImpact}>
            Retry
          </button>
        </div>
      )}

      {state.status === 'success' && (
        <>
          <div className="impact-assessment">
            <span className="pill pill-muted">{state.data.assessment.status}</span>
            <span className="impact-assessment-message">
              {state.data.assessment.message}
            </span>
          </div>

          {state.data.assessment.highlights &&
            state.data.assessment.highlights.length > 0 && (
              <ul className="impact-highlights">
                {state.data.assessment.highlights.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            )}

          {state.data.before && state.data.after && state.data.delta ? (
            <ActionImpactMetrics
              before={state.data.before.metrics}
              after={state.data.after.metrics}
              delta={state.data.delta}
            />
          ) : (
            <div className="impact-empty">
              <p className="status status-loading">
                {state.data.assessment.message}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

