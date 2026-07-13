import type { Campaign } from '../lib/apiClient';

interface CampaignListProps {
  campaigns: Campaign[];
  selectedCampaignId: number | null;
  onSelectCampaign: (campaignId: number) => void;
  getClientName: (clientId: number) => string | undefined;
  onEditCampaign: (campaign: Campaign) => void;
  onDeleteCampaign: (campaign: Campaign) => void;
  /** Shown when there are zero campaigns */
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
        const createdAtLabel = new Date(
          campaign.createdAt
        ).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });

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
                ? `Budget: ${campaign.monthlyBudget}`
                : null,
              campaign.targetCpa ? `Target CPA: ${campaign.targetCpa}` : null,
            ]
              .filter(Boolean)
              .join(' • ')
          : 'No explicit targets set yet.';

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
              <span className="campaign-tag">{campaign.type}</span>
              {campaign.product && (
                <span className="campaign-tag campaign-tag-muted">
                  {campaign.product}
                </span>
              )}
            </div>

            <p className="campaign-card-targets">{targetSummary}</p>

            <p className="campaign-card-insight">
              <span className="campaign-card-insight-label">AI insight</span>
              <span className="campaign-card-insight-text">
                No AI analysis yet.
              </span>
            </p>

            <div className="campaign-card-footer">
              <span className="campaign-card-date">Created {createdAtLabel}</span>
              <button
                type="button"
                className="button button-ghost campaign-card-open"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectCampaign(campaign.id);
                }}
              >
                Open
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

