import { useCallback, useEffect, useState } from 'react';
import {
  apiClient,
  type AnalysisReadiness,
  type CampaignDecisionSummary,
  type CampaignReportStatus,
} from '../lib/apiClient';
import {
  reportTypeTitle,
  reportTypeWhy,
  sortReportTypesForDisplay,
} from '../lib/reportFriendlyNames';

function scrollToReports() {
  document.getElementById('section-reports')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

function truncateReason(s: string, max = 140): string {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

interface CampaignGuidanceCardProps {
  campaignId: number;
  refreshTrigger?: number;
  onOpenClientImport?: () => void;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      reportStatus: CampaignReportStatus;
      readiness: AnalysisReadiness;
      decision: CampaignDecisionSummary | null;
    };

export const CampaignGuidanceCard = ({
  campaignId,
  refreshTrigger = 0,
  onOpenClientImport,
}: CampaignGuidanceCardProps) => {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  const load = useCallback(() => {
    setState({ status: 'loading' });
    Promise.all([
      apiClient.getCampaignReportStatus(campaignId),
      apiClient.getAnalysisReadiness(campaignId),
      apiClient.getDecisionSummary(campaignId).catch(() => null),
    ])
      .then(([reportStatus, readiness, decision]) => {
        setState({
          status: 'ready',
          reportStatus,
          readiness,
          decision,
        });
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Could not load campaign status.';
        setState({ status: 'error', message });
      });
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load, refreshTrigger]);

  const handleUpload = () => {
    scrollToReports();
    onOpenClientImport?.();
  };

  if (state.status === 'loading') {
    return (
      <section className="guidance-card guidance-card--loading" aria-busy>
        <div className="guidance-card__skeleton" />
      </section>
    );
  }

  if (state.status === 'error') {
    return (
      <section className="guidance-card guidance-card--error">
        <p className="guidance-card__line">{state.message}</p>
      </section>
    );
  }

  const { reportStatus, readiness, decision } = state;
  const missing = sortReportTypesForDisplay(
    reportStatus.missingReportTypes ?? []
  );
  const needsMoreData =
    missing.length > 0 || readiness.sufficiencyLabel === 'WEAK';

  if (needsMoreData) {
    const steps = missing.slice(0, 5);
    return (
      <section className="guidance-card guidance-card--needs-data" aria-label="Campaign setup">
        <h2 className="guidance-card__title">Campaign not ready</h2>
        <p className="guidance-card__lead">
          We don&apos;t have enough data to optimize this campaign yet.
        </p>
        {steps.length > 0 ? (
          <ol className="guidance-steps">
            {steps.map((code) => (
              <li key={code} className="guidance-step">
                <div className="guidance-step__text">
                  <span className="guidance-step__name">
                    Upload {reportTypeTitle(code)}
                  </span>
                  <span className="guidance-step__why">{reportTypeWhy(code)}</span>
                </div>
                <button
                  type="button"
                  className="button button-primary button-xs guidance-step__btn"
                  onClick={handleUpload}
                >
                  Upload
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="guidance-card__hint">
            Upload a recent export from Google Ads using Reports below.
          </p>
        )}
      </section>
    );
  }

  const readyLabel =
    readiness.sufficiencyLabel === 'STRONG'
      ? 'Ready'
      : readiness.sufficiencyLabel === 'DIRECTIONAL'
        ? 'Good to go'
        : 'Ready';
  const reason =
    decision?.topReason?.trim() ||
    readiness.reasons[0] ||
    'Your data looks good to move forward.';
  const next =
    decision?.nextBestActionTitle?.trim() ||
    'Review your plan and run the next action.';

  return (
    <section className="guidance-card guidance-card--ready" aria-label="Campaign status">
      <div className="guidance-simple">
        <div className="guidance-simple__row">
          <span className="guidance-simple__k">Status</span>
          <span className="guidance-simple__v guidance-simple__v--ok">{readyLabel}</span>
        </div>
        <div className="guidance-simple__row">
          <span className="guidance-simple__k">Reason</span>
          <span className="guidance-simple__v">{truncateReason(reason)}</span>
        </div>
        <div className="guidance-simple__row">
          <span className="guidance-simple__k">Next step</span>
          <span className="guidance-simple__v">{truncateReason(next, 120)}</span>
        </div>
      </div>
    </section>
  );
};
