import { useEffect, useState } from 'react';
import { apiClient, type AnalysisReadiness as ReadinessData } from '../lib/apiClient';
import { AnalysisReadiness } from './AnalysisReadiness';

interface ReadinessCardProps {
  campaignId: number;
  experienceMode?: import('../lib/experienceMode').ExperienceMode;
  compact?: boolean;
}

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: ReadinessData };

export const ReadinessCard = ({
  campaignId,
  experienceMode = 'senior',
  compact = false,
}: ReadinessCardProps) => {
  const [state, setState] = useState<State>({ status: 'idle' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    apiClient
      .getAnalysisReadiness(campaignId)
      .then((data) => {
        if (!cancelled) setState({ status: 'success', data });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'Failed to load readiness.';
          setState({ status: 'error', error: message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  if (state.status === 'loading') {
    return (
      <section className="card card-compact">
        <p className="status status-loading">Loading readiness…</p>
      </section>
    );
  }

  if (state.status === 'error') {
    return (
      <section className="card card-compact">
        <p className="status status-error">{state.error}</p>
      </section>
    );
  }

  if (state.status !== 'success') {
    return (
      <section className="card card-compact">
        <p className="status status-loading">Loading readiness…</p>
      </section>
    );
  }

  return (
    <section className="card card-compact">
      <AnalysisReadiness readiness={state.data} experienceMode={experienceMode} compact={compact} />
    </section>
  );
};
