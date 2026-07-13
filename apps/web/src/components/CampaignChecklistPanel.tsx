import { useEffect, useState } from 'react';
import { apiClient, type CampaignChecklistItem, type CampaignChecklistResponse } from '../lib/apiClient';
import { CollapsibleSection } from './CollapsibleSection';

interface CampaignChecklistPanelProps {
  campaignId: number;
  compact?: boolean;
}

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: CampaignChecklistResponse };

const toPercent = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

const groupItems = (items: CampaignChecklistItem[]) => {
  const launch = items.filter((i) => i.phase === 'launch');
  const optimization = items.filter((i) => i.phase === 'optimization');
  return { launch, optimization };
};

const statusLabel = (status: string) => {
  if (status === 'done') return 'Done';
  if (status === 'skipped') return 'Skipped';
  return 'Pending';
};

export const CampaignChecklistPanel = ({
  campaignId,
  compact = false,
}: CampaignChecklistPanelProps) => {
  const [state, setState] = useState<LoadState>({ status: 'idle' });
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    try {
      setState({ status: 'loading' });
      const data = await apiClient.getCampaignChecklist(campaignId);
      setState({ status: 'success', data });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load checklist.';
      setState({ status: 'error', error: message });
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const handleChangeStatus = async (item: CampaignChecklistItem, status: 'pending' | 'done' | 'skipped') => {
    try {
      setSavingId(item.id);
      await apiClient.patchCampaignChecklistItem(campaignId, item.id, { status });
      await load();
    } catch (err) {
      // Surface via reload error
      const message =
        err instanceof Error ? err.message : 'Failed to update checklist item.';
      setState({ status: 'error', error: message });
    } finally {
      setSavingId(null);
    }
  };

  if (state.status === 'loading' || state.status === 'idle') {
    return <p className="status status-loading">Loading checklist…</p>;
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

  const { summary, items } = state.data;
  const { launch, optimization } = groupItems(items);
  const completion = toPercent(summary.completionPercent);

  const progressHeader = (
    <div className="checklist-progress-header">
      <div className="checklist-progress-main">
        <span className="detail-label">Checklist</span>
        <div className="checklist-progress-bar">
          <div
            className="checklist-progress-bar-fill"
            style={{ width: `${completion}%` }}
          />
        </div>
        <p className="list-item-meta">
          {summary.done} of {summary.total} done
        </p>
      </div>
    </div>
  );

  const checklistItems = (
    <div className="checklist-groups">
      <div className="card card-compact">
        <h4 className="template-subheading">Launch</h4>
        {launch.length === 0 ? (
          <p className="list-item-meta">No launch items for this campaign type.</p>
        ) : (
          <ul className="list">
            {launch.map((item) => (
              <li key={item.id} className="list-item checklist-item-row">
                <div className="checklist-item-main">
                  <span className="list-item-title">{item.label}</span>
                  {!compact && item.detail && (
                    <span className="list-item-meta">{item.detail}</span>
                  )}
                </div>
                <div className="checklist-item-controls">
                  <span className="checklist-item-status-label">
                    {statusLabel(item.status)}
                  </span>
                  <div className="checklist-item-buttons">
                    <button
                      type="button"
                      className={`button button-ghost button-xs${
                        item.status === 'pending' ? ' button-pill-active' : ''
                      }`}
                      onClick={() => void handleChangeStatus(item, 'pending')}
                      disabled={savingId === item.id}
                    >
                      Pending
                    </button>
                    <button
                      type="button"
                      className={`button button-ghost button-xs${
                        item.status === 'done' ? ' button-pill-active' : ''
                      }`}
                      onClick={() => void handleChangeStatus(item, 'done')}
                      disabled={savingId === item.id}
                    >
                      Done
                    </button>
                    <button
                      type="button"
                      className={`button button-ghost button-xs${
                        item.status === 'skipped' ? ' button-pill-active' : ''
                      }`}
                      onClick={() => void handleChangeStatus(item, 'skipped')}
                      disabled={savingId === item.id}
                    >
                      Skip
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card card-compact">
        <h4 className="template-subheading">Optimization</h4>
        {optimization.length === 0 ? (
          <p className="list-item-meta">
            No optimization items for this campaign type.
          </p>
        ) : (
          <ul className="list">
            {optimization.map((item) => (
              <li key={item.id} className="list-item checklist-item-row">
                <div className="checklist-item-main">
                  <span className="list-item-title">{item.label}</span>
                  {!compact && item.detail && (
                    <span className="list-item-meta">{item.detail}</span>
                  )}
                </div>
                <div className="checklist-item-controls">
                  <span className="checklist-item-status-label">
                    {statusLabel(item.status)}
                  </span>
                  <div className="checklist-item-buttons">
                    <button
                      type="button"
                      className={`button button-ghost button-xs${
                        item.status === 'pending' ? ' button-pill-active' : ''
                      }`}
                      onClick={() => void handleChangeStatus(item, 'pending')}
                      disabled={savingId === item.id}
                    >
                      Pending
                    </button>
                    <button
                      type="button"
                      className={`button button-ghost button-xs${
                        item.status === 'done' ? ' button-pill-active' : ''
                      }`}
                      onClick={() => void handleChangeStatus(item, 'done')}
                      disabled={savingId === item.id}
                    >
                      Done
                    </button>
                    <button
                      type="button"
                      className={`button button-ghost button-xs${
                        item.status === 'skipped' ? ' button-pill-active' : ''
                      }`}
                      onClick={() => void handleChangeStatus(item, 'skipped')}
                      disabled={savingId === item.id}
                    >
                      Skip
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className="stack gap-sm">
        {progressHeader}
        <CollapsibleSection
          title="Checklist items"
          subtitle={`${summary.pending} pending`}
          defaultCollapsed
        >
          {checklistItems}
        </CollapsibleSection>
      </div>
    );
  }

  return (
    <div className="stack gap-md">
      {progressHeader}
      {checklistItems}
    </div>
  );
};

