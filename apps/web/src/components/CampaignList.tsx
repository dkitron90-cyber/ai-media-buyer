import { useEffect, useState } from 'react';
import { apiClient, type Campaign } from '../lib/apiClient';

export interface CampaignInsightSnippet {
  summary: string;
  evidenceStrength: string | null;
  openActions: number;
}

interface CampaignListProps {
  campaigns: Campaign[];
  selectedCampaignId: number | null;
  onSelectCampaign: (campaignId: number) => void;
  getClientName: (clientId: number) => string | undefined;
  onEditCampaign: (campaign: Campaign) => void;
  onDeleteCampaign: (campaign: Campaign) => void;
  emptyHint?: string;
}

export const CampaignList = ({
  campaigns,
  selectedCampaignId,
  onSelectCampaign,
  getClientName,
  onEditCampaign,
  onDeleteCampaign,
  emptyHint,
}: CampaignListProps) => {
  const [insights, setInsights] = useState<
    Record<number, CampaignInsightSnippet>
  >({});

  useEffect(() => {
    if (campaigns.length === 0) {
      setInsights({});
      return;
    }

    let cancelled = false;

    const load = async () => {
      const entries = await Promise.all(
        campaigns.map(async (campaign) => {
          try {
            const [analyses, actions] = await Promise.all([
              apiClient.listCampaignAnalyses(campaign.id),
              apiClient.listCampaignActions(campaign.id),
            ]);
            const latest = analyses[0];
            const openActions = actions.filter(
              (a) => a.status === 'draft' || a.status === 'approved'
            ).length;
            if (!latest?.executiveSummary) {
              return [
                campaign.id,
                {
                  summary: 'No AI diagnosis yet — run analysis after uploading reports.',
                  evidenceStrength: null,
                  openActions,
                },
              ] as const;
            }
            const summary =
              latest.executiveSummary.length > 140
                ? `${latest.executiveSummary.slice(0, 140).trim()}…`
                : latest.executiveSummary;
            return [
              campaign.id,
              {
                summary,
                evidenceStrength: latest.evidenceStrength,
                openActions,
              },
            ] as const;
          } catch {
            return [
              campaign.id,
              {
                summary: 'Unable to load insight.',
                evidenceStrength: null,
                openActions: 0,
              },
            ] as const;
          }
        })
      );

      if (!cancelled) {
        const next: Record<number, CampaignInsightSnippet> = {};
        for (const [id, snippet] of entries) next[id] = snippet;
        setInsights(next);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [campaigns]);

  if (!campaigns.length) {
    return (
      <p className="campaign-list-empty">
        {emptyHint ??
          'No campaigns yet. Add one above or import a Google Ads report.'}
      </p>
    );
  }

  return (
    <div className="campaign-grid">
      {campaigns.map((campaign) => {
        const clientName =
          getClientName(campaign.clientId) ?? `Client #${campaign.clientId}`;
        const status = campaign.status?.toUpperCase() ?? '';
        const isActive =
          status === 'ACTIVE' || status === 'ENABLED' || status === 'RUNNING';
        const statusClass = isActive
          ? 'status-pill status-pill-running'
          : 'status-pill status-pill-default';

        const hasTargets = campaign.monthlyBudget || campaign.targetCpa;
        const targetSummary = hasTargets
          ? [
              campaign.monthlyBudget
                ? `Budget ${campaign.monthlyBudget}`
                : null,
              campaign.targetCpa ? `CPA ${campaign.targetCpa}` : null,
            ]
              .filter(Boolean)
              .join(' · ')
          : 'No targets set';

        const insight = insights[campaign.id];
        const evidence = insight?.evidenceStrength?.toLowerCase();
        const evidencePill =
          evidence === 'strong'
            ? 'pill pill-ok'
            : evidence === 'directional'
              ? 'pill pill-warning'
              : evidence === 'weak'
                ? 'pill pill-error'
                : 'pill pill-muted';

        return (
          <div
            key={campaign.id}
            role="button"
            tabIndex={0}
            className={
              campaign.id === selectedCampaignId
                ? 'campaign-card campaign-card-active'
                : 'campaign-card'
            }
            onClick={() => onSelectCampaign(campaign.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelectCampaign(campaign.id);
              }
            }}
          >
            <div className="campaign-card-header">
              <div>
                <h3 className="campaign-card-title">{campaign.name}</h3>
                <p className="campaign-card-subtitle">{clientName}</p>
              </div>
              <div className="campaign-card-header-right">
                <span className={statusClass}>{campaign.status}</span>
                <div className="campaign-card-controls">
                  <button
                    type="button"
                    className="button button-ghost button-xs"
                    onClick={(event) => {
                      event.stopPropagation();
                      onEditCampaign(campaign);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="button button-danger button-xs"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteCampaign(campaign);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>

            <div className="campaign-card-meta">
              <span className="campaign-tag">{campaign.type.replace(/_/g, ' ')}</span>
              {campaign.product && (
                <span className="campaign-tag campaign-tag-muted">
                  {campaign.product}
                </span>
              )}
              {insight?.evidenceStrength && (
                <span className={evidencePill}>
                  {insight.evidenceStrength}
                </span>
              )}
            </div>

            <p className="campaign-card-targets">{targetSummary}</p>

            <div className="campaign-card-insight">
              <span className="campaign-card-insight-label">AI insight</span>
              <span className="campaign-card-insight-text">
                {insight?.summary ?? 'Loading insight…'}
              </span>
              {insight && insight.openActions > 0 && (
                <span className="campaign-card-insight-meta">
                  {insight.openActions} open action
                  {insight.openActions === 1 ? '' : 's'}
                </span>
              )}
            </div>

            <div className="campaign-card-footer">
              <button
                type="button"
                className="button button-primary button-xs campaign-card-open"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectCampaign(campaign.id);
                }}
              >
                Open workspace
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
