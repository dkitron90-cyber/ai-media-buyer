import { useEffect, useState } from 'react';
import {
  apiClient,
  type AnalysisReadiness,
  type Campaign,
} from '../lib/apiClient';

export interface PortfolioViewProps {
  clientCount: number;
  totalCampaigns: number;
  activeCampaigns: number;
  needsAttention: number | null;
  performingWell: number | null;
  blendedCpa: string | null;
  statsLoading: boolean;
  campaigns: Campaign[];
  campaignsLoading: boolean;
  getClientName: (clientId: number) => string | undefined;
  onOpenCampaign: (campaignId: number) => void;
}

type CampaignRow = {
  campaign: Campaign;
  readiness: AnalysisReadiness | null;
  gapCount: number;
};

const readinessPill = (label: AnalysisReadiness['sufficiencyLabel'] | null) => {
  if (!label) return <span className="pill pill-muted">—</span>;
  const map = {
    STRONG: 'pill pill-ok',
    DIRECTIONAL: 'pill pill-warning',
    WEAK: 'pill pill-error',
  } as const;
  return <span className={map[label]}>{label}</span>;
};

export const PortfolioView = ({
  clientCount,
  totalCampaigns,
  activeCampaigns,
  needsAttention,
  performingWell,
  blendedCpa,
  statsLoading,
  campaigns,
  campaignsLoading,
  getClientName,
  onOpenCampaign,
}: PortfolioViewProps) => {
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);

  useEffect(() => {
    if (campaigns.length === 0) {
      setRows([]);
      return;
    }

    let cancelled = false;
    setRowsLoading(true);

    const load = async () => {
      const chunkSize = 5;
      const next: CampaignRow[] = [];

      for (let i = 0; i < campaigns.length; i += chunkSize) {
        const chunk = campaigns.slice(i, i + chunkSize);
        const chunkRows = await Promise.all(
          chunk.map(async (campaign) => {
            const [readiness, gapsRes] = await Promise.all([
              apiClient.getAnalysisReadiness(campaign.id).catch(() => null),
              apiClient.getCampaignGaps(campaign.id).catch(() => ({ gaps: [] })),
            ]);
            const gapCount = gapsRes.gaps.filter(
              (g) => g.severity === 'high' || g.severity === 'medium'
            ).length;
            return { campaign, readiness, gapCount };
          })
        );
        next.push(...chunkRows);
      }

      if (!cancelled) {
        setRows(next);
        setRowsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [campaigns]);

  return (
    <div className="portfolio-page">
      <section className="dashboard-section" aria-labelledby="portfolio-metrics-heading">
        <h2 id="portfolio-metrics-heading" className="dashboard-section__title">
          Portfolio snapshot
        </h2>
        <div className="dashboard-stats" aria-label="Portfolio overview">
          <div className="dashboard-stat-card">
            <span className="dashboard-stat-label">Clients</span>
            <span className="dashboard-stat-value">{clientCount}</span>
          </div>
          <div className="dashboard-stat-card">
            <span className="dashboard-stat-label">Campaigns</span>
            <span className="dashboard-stat-value">{totalCampaigns}</span>
          </div>
          <div className="dashboard-stat-card">
            <span className="dashboard-stat-label">Active</span>
            <span className="dashboard-stat-value">{activeCampaigns}</span>
          </div>
          <div className="dashboard-stat-card dashboard-stat-card--attention">
            <span className="dashboard-stat-label">Needs attention</span>
            <span className="dashboard-stat-value">
              {statsLoading ? '…' : (needsAttention ?? '—')}
            </span>
          </div>
          <div className="dashboard-stat-card dashboard-stat-card--success">
            <span className="dashboard-stat-label">Performing well</span>
            <span className="dashboard-stat-value">
              {statsLoading ? '…' : (performingWell ?? '—')}
            </span>
          </div>
          <div className="dashboard-stat-card">
            <span className="dashboard-stat-label">Blended CPA</span>
            <span className="dashboard-stat-value">
              {statsLoading ? '…' : (blendedCpa ?? '—')}
            </span>
          </div>
        </div>
      </section>

      <section className="card page-section" aria-labelledby="portfolio-roster-heading">
        <div className="page-section__head card-header-row">
          <h2 id="portfolio-roster-heading" className="page-section__title">
            Campaign health
          </h2>
          <span className="pill pill-muted">{campaigns.length}</span>
        </div>
        <p className="page-section__lede">
          Readiness and gaps across your full book. Open any row to work that campaign.
        </p>

        {campaignsLoading && (
          <p className="status status-loading">Loading campaigns…</p>
        )}
        {!campaignsLoading && campaigns.length === 0 && (
          <p className="status status-loading">No campaigns yet. Import a report or create one.</p>
        )}
        {!campaignsLoading && campaigns.length > 0 && (
          <>
            {rowsLoading && (
              <p className="status status-loading">Loading health signals…</p>
            )}
            <div className="report-table-wrap">
              <table className="table report-table portfolio-roster-table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Client</th>
                    <th>Type</th>
                    <th>Readiness</th>
                    <th>Gaps</th>
                    <th>Spend</th>
                    <th>Conv.</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ campaign, readiness, gapCount }) => (
                    <tr key={campaign.id}>
                      <td className="portfolio-roster-table__name">{campaign.name}</td>
                      <td>{getClientName(campaign.clientId) ?? `Client #${campaign.clientId}`}</td>
                      <td>
                        <span className="pill pill-muted">
                          {campaign.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        {readinessPill(readiness?.sufficiencyLabel ?? null)}
                      </td>
                      <td>
                        {gapCount > 0 ? (
                          <span className="pill pill-warning">{gapCount}</span>
                        ) : (
                          <span className="pill pill-ok">0</span>
                        )}
                      </td>
                      <td>
                        {readiness
                          ? `$${readiness.totals.cost.toFixed(0)}`
                          : '—'}
                      </td>
                      <td>
                        {readiness
                          ? readiness.totals.conversions.toFixed(0)
                          : '—'}
                      </td>
                      <td className="table-actions table-actions--compact">
                        <button
                          type="button"
                          className="button button-primary button-xs"
                          onClick={() => onOpenCampaign(campaign.id)}
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
};
