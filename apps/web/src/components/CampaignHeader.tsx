import type { Campaign } from '../lib/apiClient';

export interface CampaignHeaderProps {
  campaign: Campaign;
  clientName: string | null;
  onEdit: (campaign: Campaign) => void;
  onDelete: (campaign: Campaign) => void;
}

export const CampaignHeader = ({
  campaign,
  clientName,
  onEdit,
  onDelete,
}: CampaignHeaderProps) => {
  const statusUpper = campaign.status.toUpperCase();
  const isActive =
    statusUpper === 'ACTIVE' ||
    statusUpper === 'ENABLED' ||
    statusUpper === 'RUNNING';

  const goalSummary =
    [
      campaign.monthlyBudget ? `Budget ${campaign.monthlyBudget}` : null,
      campaign.targetCpa ? `CPA ${campaign.targetCpa}` : null,
    ]
      .filter(Boolean)
      .join(' · ') || '—';

  return (
    <header className="campaign-header-saas">
      <div className="campaign-header-saas__main">
        <h1 className="campaign-header-saas__title">{campaign.name}</h1>
        <p className="campaign-header-saas__meta">
          {clientName ?? `Client #${campaign.clientId}`}
          {' · '}
          {campaign.type}
          {campaign.product ? ` · ${campaign.product}` : ''}
        </p>
      </div>
      <div className="campaign-header-saas__goal">{goalSummary}</div>
      <div className="campaign-header-saas__badges">
        <span
          className={
            isActive
              ? 'status-pill status-pill-running'
              : 'status-pill status-pill-default'
          }
        >
          {campaign.status}
        </span>
      </div>
      <div className="campaign-header-saas__actions">
        <button
          type="button"
          className="button button-ghost button-xs"
          onClick={() => onEdit(campaign)}
        >
          Edit
        </button>
        <button
          type="button"
          className="button button-danger button-xs"
          onClick={() => onDelete(campaign)}
        >
          Delete
        </button>
      </div>
    </header>
  );
};
