import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  apiClient,
  type AnalysisReadiness,
  type Campaign,
} from '../lib/apiClient';

export interface CampaignCompareViewProps {
  campaigns: Campaign[];
  campaignsLoading: boolean;
  getClientName: (clientId: number) => string | undefined;
  onOpenCampaign: (campaignId: number) => void;
}

type SlotState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      readiness: AnalysisReadiness | null;
      gapCount: number;
    };

const formatMoney = (n: number) =>
  n.toLocaleString(undefined, { maximumFractionDigits: 0 });

const formatCpa = (cost: number, conv: number) =>
  conv > 0 ? `$${(cost / conv).toFixed(2)}` : '—';

const readinessLabel = (r: AnalysisReadiness | null) =>
  r?.sufficiencyLabel?.replace(/_/g, ' ') ?? '—';

export const CampaignCompareView = ({
  campaigns,
  campaignsLoading,
  getClientName,
  onOpenCampaign,
}: CampaignCompareViewProps) => {
  const [leftId, setLeftId] = useState<number | ''>('');
  const [rightId, setRightId] = useState<number | ''>('');
  const [leftState, setLeftState] = useState<SlotState>({ status: 'idle' });
  const [rightState, setRightState] = useState<SlotState>({ status: 'idle' });

  const leftCampaign = useMemo(
    () => campaigns.find((c) => c.id === leftId) ?? null,
    [campaigns, leftId]
  );
  const rightCampaign = useMemo(
    () => campaigns.find((c) => c.id === rightId) ?? null,
    [campaigns, rightId]
  );

  useEffect(() => {
    if (campaigns.length >= 2 && leftId === '' && rightId === '') {
      setLeftId(campaigns[0]!.id);
      setRightId(campaigns[1]!.id);
    }
  }, [campaigns, leftId, rightId]);

  useEffect(() => {
    if (leftId === '' || leftId === rightId) {
      setLeftState({ status: 'idle' });
      return;
    }
    let cancelled = false;
    setLeftState({ status: 'loading' });
    Promise.all([
      apiClient.getAnalysisReadiness(leftId).catch(() => null),
      apiClient.getCampaignGaps(leftId).catch(() => ({ gaps: [] })),
    ])
      .then(([readiness, gapsRes]) => {
        if (cancelled) return;
        const gapCount = gapsRes.gaps.filter(
          (g) => g.severity === 'high' || g.severity === 'medium'
        ).length;
        setLeftState({ status: 'ready', readiness, gapCount });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLeftState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Failed to load',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [leftId, rightId]);

  useEffect(() => {
    if (rightId === '' || rightId === leftId) {
      setRightState({ status: 'idle' });
      return;
    }
    let cancelled = false;
    setRightState({ status: 'loading' });
    Promise.all([
      apiClient.getAnalysisReadiness(rightId).catch(() => null),
      apiClient.getCampaignGaps(rightId).catch(() => ({ gaps: [] })),
    ])
      .then(([readiness, gapsRes]) => {
        if (cancelled) return;
        const gapCount = gapsRes.gaps.filter(
          (g) => g.severity === 'high' || g.severity === 'medium'
        ).length;
        setRightState({ status: 'ready', readiness, gapCount });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setRightState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Failed to load',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [rightId, leftId]);

  const renderSlotSummary = (
    campaign: Campaign | null,
    state: SlotState
  ): ReactNode => {
    if (!campaign) return <p className="status status-loading">Pick a campaign</p>;
    if (state.status === 'loading') {
      return <p className="status status-loading">Loading metrics…</p>;
    }
    if (state.status === 'error') {
      return <p className="status status-error">{state.message}</p>;
    }
    if (state.status !== 'ready') {
      return <p className="status status-loading">Select a different campaign</p>;
    }

    const r = state.readiness;
    return (
      <div className="compare-slot-summary">
        <p className="compare-slot-summary__client">
          {getClientName(campaign.clientId) ?? `Client #${campaign.clientId}`}
        </p>
        <p className="compare-slot-summary__meta">
          {campaign.type.replace(/_/g, ' ')} · {campaign.status}
        </p>
        <dl className="compare-slot-metrics">
          <div>
            <dt>Readiness</dt>
            <dd>{readinessLabel(r)}</dd>
          </div>
          <div>
            <dt>Gaps</dt>
            <dd>{state.gapCount}</dd>
          </div>
          <div>
            <dt>Spend</dt>
            <dd>{r ? `$${formatMoney(r.totals.cost)}` : '—'}</dd>
          </div>
          <div>
            <dt>Conv.</dt>
            <dd>{r ? r.totals.conversions.toFixed(0) : '—'}</dd>
          </div>
          <div>
            <dt>CPA</dt>
            <dd>
              {r ? formatCpa(r.totals.cost, r.totals.conversions) : '—'}
            </dd>
          </div>
          <div>
            <dt>Budget</dt>
            <dd>{campaign.monthlyBudget ?? '—'}</dd>
          </div>
          <div>
            <dt>Target CPA</dt>
            <dd>{campaign.targetCpa ?? '—'}</dd>
          </div>
        </dl>
        <button
          type="button"
          className="button button-ghost button-xs"
          onClick={() => onOpenCampaign(campaign.id)}
        >
          Open campaign
        </button>
      </div>
    );
  };

  const bothReady =
    leftState.status === 'ready' &&
    rightState.status === 'ready' &&
    leftCampaign &&
    rightCampaign;

  return (
    <div className="compare-page">
      <section className="card page-section">
        <h2 className="page-section__title">Compare campaigns</h2>
        <p className="page-section__lede">
          Pick two campaigns to compare readiness, spend, and gaps side by side.
        </p>

        {campaignsLoading && (
          <p className="status status-loading">Loading campaigns…</p>
        )}
        {!campaignsLoading && campaigns.length < 2 && (
          <p className="status status-loading">
            Add at least two campaigns to compare.
          </p>
        )}

        {!campaignsLoading && campaigns.length >= 2 && (
          <>
            <div className="compare-pickers">
              <label className="compare-picker">
                <span className="detail-label">Campaign A</span>
                <select
                  className="settings-form-select"
                  value={leftId}
                  onChange={(e) =>
                    setLeftId(e.target.value ? Number(e.target.value) : '')
                  }
                >
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id} disabled={c.id === rightId}>
                      {c.name} ({getClientName(c.clientId) ?? 'Client'})
                    </option>
                  ))}
                </select>
              </label>
              <label className="compare-picker">
                <span className="detail-label">Campaign B</span>
                <select
                  className="settings-form-select"
                  value={rightId}
                  onChange={(e) =>
                    setRightId(e.target.value ? Number(e.target.value) : '')
                  }
                >
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id} disabled={c.id === leftId}>
                      {c.name} ({getClientName(c.clientId) ?? 'Client'})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="compare-columns">
              <div className="compare-column">
                <h3 className="compare-column__title">
                  {leftCampaign?.name ?? 'Campaign A'}
                </h3>
                {renderSlotSummary(leftCampaign, leftState)}
              </div>
              <div className="compare-column">
                <h3 className="compare-column__title">
                  {rightCampaign?.name ?? 'Campaign B'}
                </h3>
                {renderSlotSummary(rightCampaign, rightState)}
              </div>
            </div>

            {bothReady && (
              <div className="compare-diff card card-compact">
                <h3 className="template-subheading">Quick contrast</h3>
                <ul className="list">
                  <li className="list-item">
                    Readiness:{' '}
                    <strong>{readinessLabel(leftState.readiness)}</strong> vs{' '}
                    <strong>{readinessLabel(rightState.readiness)}</strong>
                  </li>
                  <li className="list-item">
                    Gaps: <strong>{leftState.gapCount}</strong> vs{' '}
                    <strong>{rightState.gapCount}</strong>
                  </li>
                  {leftState.readiness && rightState.readiness && (
                    <li className="list-item">
                      CPA:{' '}
                      <strong>
                        {formatCpa(
                          leftState.readiness.totals.cost,
                          leftState.readiness.totals.conversions
                        )}
                      </strong>{' '}
                      vs{' '}
                      <strong>
                        {formatCpa(
                          rightState.readiness.totals.cost,
                          rightState.readiness.totals.conversions
                        )}
                      </strong>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};
