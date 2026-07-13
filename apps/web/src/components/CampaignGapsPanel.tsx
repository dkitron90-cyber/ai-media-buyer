import { useEffect, useState } from 'react';
import { apiClient, type CampaignGap, type CampaignGapsResponse } from '../lib/apiClient';

interface CampaignGapsPanelProps {
  campaignId: number;
  /** If provided, skips fetching and renders these gaps directly. */
  gapsOverride?: CampaignGap[] | null;
}

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: CampaignGapsResponse };

const groupBySeverity = (gaps: CampaignGap[]) => {
  const high = gaps.filter((g) => g.severity === 'high');
  const medium = gaps.filter((g) => g.severity === 'medium');
  const low = gaps.filter((g) => g.severity === 'low');
  return { high, medium, low };
};

const categoryLabel = (c: CampaignGap['category']) => {
  if (c === 'reports') return 'Reports';
  if (c === 'settings') return 'Settings';
  if (c === 'checklist') return 'Checklist';
  if (c === 'data') return 'Data';
  return c;
};

export const CampaignGapsPanel = ({
  campaignId,
  gapsOverride,
}: CampaignGapsPanelProps) => {
  if (gapsOverride !== undefined) {
    const { gaps } = { gaps: gapsOverride ?? [] };
    if (!gaps.length) {
      return (
        <p className="status status-loading">
          No major issues detected. Campaign looks healthy.
        </p>
      );
    }

    const { high, medium, low } = groupBySeverity(gaps);

    const renderGroup = (
      items: CampaignGap[],
      severity: 'high' | 'medium' | 'low'
    ) => {
      if (items.length === 0) return null;
      const title =
        severity === 'high'
          ? 'High priority'
          : severity === 'medium'
            ? 'Medium priority'
            : 'Low priority';
      const severityClass =
        severity === 'high'
          ? 'gap-card-high'
          : severity === 'medium'
            ? 'gap-card-medium'
            : 'gap-card-low';

      return (
        <section key={severity} className="gap-group">
          <h4 className="gap-group-title">{title}</h4>
          <ul className="list">
            {items.map((gap) => (
              <li
                key={gap.id}
                className={`list-item gap-card ${severityClass}`}
              >
                <div className="list-item-row">
                  <div className="list-item">
                    <div className="gap-card-header">
                      <span className="list-item-title">{gap.title}</span>
                      <span
                        className={`gap-badge gap-badge-${gap.category}`}
                      >
                        {categoryLabel(gap.category)}
                      </span>
                    </div>
                    <span className="list-item-meta">
                      {gap.description}
                    </span>
                    <span className="list-item-meta gap-recommendation">
                      {gap.recommendation}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      );
    };

    return (
      <div className="stack gap-md gap-panel">
        {renderGroup(high, 'high')}
        {renderGroup(medium, 'medium')}
        {renderGroup(low, 'low')}
      </div>
    );
  }

  const [state, setState] = useState<LoadState>({ status: 'idle' });

  const load = async () => {
    try {
      setState({ status: 'loading' });
      const data = await apiClient.getCampaignGaps(campaignId);
      setState({ status: 'success', data });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load gaps.';
      setState({ status: 'error', error: message });
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  if (state.status === 'loading' || state.status === 'idle') {
    return <p className="status status-loading">Detecting gaps…</p>;
  }

  if (state.status === 'error') {
    return (
      <div className="stack gap-sm">
        <p className="status status-error">{state.error}</p>
        <button
          type="button"
          className="button button-ghost button-xs"
          onClick={() => void load()}
        >
          Retry
        </button>
      </div>
    );
  }

  const { gaps } = state.data;
  if (!gaps.length) {
    return (
      <p className="status status-loading">
        No major issues detected. Campaign looks healthy.
      </p>
    );
  }

  const { high, medium, low } = groupBySeverity(gaps);

  const renderGroup = (items: CampaignGap[], severity: 'high' | 'medium' | 'low') => {
    if (items.length === 0) return null;
    const title =
      severity === 'high'
        ? 'High priority'
        : severity === 'medium'
          ? 'Medium priority'
          : 'Low priority';
    const severityClass =
      severity === 'high'
        ? 'gap-card-high'
        : severity === 'medium'
          ? 'gap-card-medium'
          : 'gap-card-low';

    return (
      <section key={severity} className="gap-group">
        <h4 className="gap-group-title">{title}</h4>
        <ul className="list">
          {items.map((gap) => (
            <li key={gap.id} className={`list-item gap-card ${severityClass}`}>
              <div className="list-item-row">
                <div className="list-item">
                  <div className="gap-card-header">
                    <span className="list-item-title">{gap.title}</span>
                    <span className={`gap-badge gap-badge-${gap.category}`}>
                      {categoryLabel(gap.category)}
                    </span>
                  </div>
                  <span className="list-item-meta">{gap.description}</span>
                  <span className="list-item-meta gap-recommendation">
                    {gap.recommendation}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    );
  };

  return (
    <div className="stack gap-md gap-panel">
      {renderGroup(high, 'high')}
      {renderGroup(medium, 'medium')}
      {renderGroup(low, 'low')}
    </div>
  );
};

