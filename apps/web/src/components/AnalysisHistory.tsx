import { useEffect, useState, useCallback } from 'react';
import { apiClient, type SavedAnalysis } from '../lib/apiClient';
import { AnalysisHistoryList } from './AnalysisHistoryList';
import { AnalysisResult } from './AnalysisResult';
import { CollapsibleSection } from './CollapsibleSection';
import { ConfirmButton } from './ConfirmButton';

interface AnalysisHistoryProps {
  campaignId: number;
  refreshTrigger: number;
}

type HistoryState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: SavedAnalysis[] };

export const AnalysisHistory = ({
  campaignId,
  refreshTrigger,
}: AnalysisHistoryProps) => {
  const [state, setState] = useState<HistoryState>({ status: 'loading' });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadHistory = useCallback(() => {
    setState({ status: 'loading' });
    setSelectedId(null);
    apiClient
      .listCampaignAnalyses(campaignId)
      .then((data) => setState({ status: 'success', data }))
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Failed to load analysis history.';
        setState({ status: 'error', error: message });
      });
  }, [campaignId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, refreshTrigger]);

  const selected =
    state.status === 'success'
      ? state.data.find((a) => a.id === selectedId) ?? null
      : null;

  const handleDelete = async (analysisId: number) => {
    setDeletingId(analysisId);
    try {
      await apiClient.deleteAnalysis(campaignId, analysisId);
      setState((prev) => {
        if (prev.status !== 'success') return prev;
        const data = prev.data.filter((a) => a.id !== analysisId);
        return { status: 'success', data };
      });
      if (selectedId === analysisId) {
        setSelectedId(null);
      }
    } finally {
      setDeletingId((current) => (current === analysisId ? null : current));
    }
  };

  return (
    <section className="card">
      <h2>Analysis History</h2>

      <CollapsibleSection
        title="Previous runs & timelines"
        subtitle="Review and reuse earlier diagnoses"
        defaultCollapsed
      >
        {state.status === 'loading' && (
          <p className="status status-loading">Loading saved analyses…</p>
        )}

        {state.status === 'error' && (
          <div className="actions-error-row">
            <p className="status status-error">{state.error}</p>
            <button className="button button-ghost" onClick={loadHistory}>
              Retry
            </button>
          </div>
        )}

        {state.status === 'success' && !selected && (
          <AnalysisHistoryList
            analyses={state.data}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onDelete={handleDelete}
            deletingId={deletingId}
          />
        )}

        {state.status === 'success' && selected && (
          <div className="history-detail">
            <div className="history-detail-toolbar">
              <button
                className="button button-ghost"
                onClick={() => setSelectedId(null)}
              >
                &larr; Back to history
              </button>
              <span className="history-detail-date">
                {new Date(selected.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {selected.modelName && (
                <span className="pill pill-muted">{selected.modelName}</span>
              )}
              <ConfirmButton
                label="Delete"
                confirmLabel="Confirm delete"
                className="button button-danger button-xs"
                onConfirm={() => handleDelete(selected.id)}
                disabled={deletingId === selected.id}
              />
            </div>
            <AnalysisResult
              diagnosis={selected.outputJson}
              campaignId={campaignId}
              analysisId={selected.id}
            />
          </div>
        )}
      </CollapsibleSection>
    </section>
  );
};
