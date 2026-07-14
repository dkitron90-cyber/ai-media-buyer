import type { HealthResponse } from '../lib/apiClient';

interface DemoBannerProps {
  health: HealthResponse | null;
  onOpenHeroCampaign?: () => void;
  onOpenPortfolio?: () => void;
}

export const DemoBanner = ({
  health,
  onOpenHeroCampaign,
  onOpenPortfolio,
}: DemoBannerProps) => {
  const isDemo =
    health?.mode === 'demo' ||
    import.meta.env.VITE_DEMO_MODE === 'true';

  if (!isDemo) return null;

  return (
    <div className="demo-banner" role="status">
      <div className="demo-banner__copy">
        <strong>Agency demo — Demo Brand Co.</strong>
        <span>
          3 live campaigns with seeded AI diagnoses, action plans, placement
          memory, and impact history. Explore Search waste, Display blacklists,
          and PMax readiness without waiting on a model call.
        </span>
      </div>
      <div className="demo-banner__actions">
        {onOpenHeroCampaign && (
          <button
            type="button"
            className="button button-primary button-xs"
            onClick={onOpenHeroCampaign}
          >
            Open Brand Search US
          </button>
        )}
        {onOpenPortfolio && (
          <button
            type="button"
            className="button button-ghost button-xs"
            onClick={onOpenPortfolio}
          >
            Portfolio health
          </button>
        )}
      </div>
    </div>
  );
};
