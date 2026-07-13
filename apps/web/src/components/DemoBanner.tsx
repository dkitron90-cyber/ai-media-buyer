import type { HealthResponse } from '../lib/apiClient';

interface DemoBannerProps {
  health: HealthResponse | null;
}

export const DemoBanner = ({ health }: DemoBannerProps) => {
  const isDemo =
    health?.mode === 'demo' ||
    import.meta.env.VITE_DEMO_MODE === 'true';

  if (!isDemo) return null;

  return (
    <div className="demo-banner" role="status">
      <strong>Live demo</strong>
      <span>
        Pre-loaded with <em>Demo Brand Co.</em> — search, display, and PMax campaigns
        with sample reports. Uploads work for this session; data resets on cold starts
        in serverless hosting.
      </span>
    </div>
  );
};
