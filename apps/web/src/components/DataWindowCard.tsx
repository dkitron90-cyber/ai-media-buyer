import { useEffect, useState } from 'react';
import {
  apiClient,
  type DataWindow,
  type AlignmentStatus,
  type FreshnessStatus,
} from '../lib/apiClient';
import { DataWindowReportRanges } from './DataWindowReportRanges';

interface DataWindowCardProps {
  campaignId: number;
}

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: DataWindow };

const ALIGNMENT_BADGE: Record<AlignmentStatus, { text: string; className: string }> = {
  ALIGNED: { text: 'Aligned', className: 'pill pill-ok' },
  PARTIAL: { text: 'Partial', className: 'pill pill-warning' },
  MISALIGNED: { text: 'Misaligned', className: 'pill pill-error' },
  UNKNOWN: { text: 'Unknown', className: 'pill pill-muted' },
};

const FRESHNESS_BADGE: Record<FreshnessStatus, { text: string; className: string }> = {
  FRESH: { text: 'Fresh', className: 'pill pill-active' },
  AGING: { text: 'Aging', className: 'pill pill-warning' },
  STALE: { text: 'Stale', className: 'pill pill-error' },
  UNKNOWN: { text: 'Unknown', className: 'pill pill-muted' },
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return iso.split('T')[0];
}

export const DataWindowCard = ({ campaignId }: DataWindowCardProps) => {
  const [state, setState] = useState<LoadState>({ status: 'idle' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    apiClient
      .getCampaignDataWindow(campaignId)
      .then((data) => {
        if (!cancelled) setState({ status: 'success', data });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'Failed to load data window.';
          setState({ status: 'error', error: message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  return (
    <section className="card">
      <h2>Report dates &amp; freshness</h2>

      {state.status === 'loading' && (
        <p className="status status-loading">Loading data window…</p>
      )}

      {state.status === 'error' && (
        <p className="status status-error">{state.error}</p>
      )}

      {state.status === 'success' && (
        <div className="dw-panel">
          <div className="dw-header">
            <div className="dw-badges">
              <div className="dw-badge-group">
                <span className="dw-badge-label">Alignment</span>
                <span className={ALIGNMENT_BADGE[state.data.alignmentStatus].className}>
                  {ALIGNMENT_BADGE[state.data.alignmentStatus].text}
                </span>
              </div>
              <div className="dw-badge-group">
                <span className="dw-badge-label">Freshness</span>
                <span className={FRESHNESS_BADGE[state.data.freshnessStatus].className}>
                  {FRESHNESS_BADGE[state.data.freshnessStatus].text}
                </span>
              </div>
            </div>

            {(state.data.recommendedAnalysisWindow.start ||
              state.data.recommendedAnalysisWindow.end) && (
              <div className="dw-window">
                <span className="dw-badge-label">Recommended Analysis Window</span>
                <span className="dw-window-range">
                  {formatDate(state.data.recommendedAnalysisWindow.start)}
                  {' → '}
                  {formatDate(state.data.recommendedAnalysisWindow.end)}
                </span>
              </div>
            )}
          </div>

          <DataWindowReportRanges ranges={state.data.activeReportRanges} />

          {state.data.notes.length > 0 && (
            <div
              className={
                state.data.freshnessStatus === 'STALE' ||
                state.data.alignmentStatus === 'MISALIGNED'
                  ? 'dw-notes dw-notes-warning'
                  : 'dw-notes'
              }
            >
              <span className="dw-section-label">Notes</span>
              <ul className="dw-notes-list">
                {state.data.notes.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
