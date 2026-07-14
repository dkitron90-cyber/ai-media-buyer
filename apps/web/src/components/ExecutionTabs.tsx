import { useEffect, useState } from 'react';
import type { AnalyzeCampaignResponse } from '../lib/apiClient';
import { CampaignActions } from './CampaignActions';
import { PlacementManager } from './PlacementManager';

export type ExecutionTabId = 'actions' | 'placements';

export interface ExecutionTabsProps {
  campaignId: number;
  campaignType?: string;
  refreshTrigger: number;
  highlightActionIds?: number[];
  onRunAnalysis: () => Promise<AnalyzeCampaignResponse | undefined>;
  runningAnalysis?: boolean;
  /** Bump decision summary / related panels when actions change. */
  onPlanMutate?: () => void;
  /** Tighter layout for action-first campaign detail */
  compact?: boolean;
  /** Hide verbose empty state in Actions tab */
  compactEmpty?: boolean;
}

export const ExecutionTabs = ({
  campaignId,
  campaignType,
  refreshTrigger,
  highlightActionIds,
  onRunAnalysis,
  runningAnalysis = false,
  onPlanMutate,
  compact = false,
  compactEmpty = false,
}: ExecutionTabsProps) => {
  const preferredTab: ExecutionTabId =
    campaignType === 'DISPLAY' ? 'placements' : 'actions';
  const [tab, setTab] = useState<ExecutionTabId>(preferredTab);

  useEffect(() => {
    setTab(campaignType === 'DISPLAY' ? 'placements' : 'actions');
  }, [campaignId, campaignType]);

  return (
    <section
      id="section-execution"
      className={`panel-saas panel-saas--execution${compact ? ' panel-saas--execution-compact' : ''}`}
      aria-labelledby="execution-heading"
    >
      <div className="execution-tabs__head">
        <h2 id="execution-heading" className="panel-saas__title">
          Execution
        </h2>
        <button
          type="button"
          className="button button-primary button-xs execution-tabs__analyze"
          onClick={() => void onRunAnalysis()}
          disabled={runningAnalysis}
        >
          {runningAnalysis ? 'Running…' : 'Run analysis'}
        </button>
      </div>
      <div className="execution-tabs__bar" role="tablist" aria-label="Execution areas">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'actions'}
          className={`execution-tabs__tab${tab === 'actions' ? ' execution-tabs__tab--active' : ''}`}
          onClick={() => setTab('actions')}
        >
          Actions
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'placements'}
          className={`execution-tabs__tab${tab === 'placements' ? ' execution-tabs__tab--active' : ''}`}
          onClick={() => setTab('placements')}
        >
          Placements
        </button>
      </div>
      <div
        className="execution-tabs__panel"
        role="tabpanel"
        id={`execution-panel-${tab}`}
      >
        {tab === 'actions' ? (
          <CampaignActions
            campaignId={campaignId}
            refreshTrigger={refreshTrigger}
            highlightActionIds={highlightActionIds}
            embedded
            onPlanMutate={onPlanMutate}
            compactEmpty={compactEmpty}
          />
        ) : (
          <div className="execution-tabs__placements">
            <PlacementManager campaignId={campaignId} />
          </div>
        )}
      </div>
    </section>
  );
};
