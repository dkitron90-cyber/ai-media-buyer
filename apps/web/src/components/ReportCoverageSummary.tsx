import type { ActiveReportSummary } from '../lib/apiClient';

interface ReportCoverageSummaryProps {
  activeSummary: ActiveReportSummary;
  relevantReportTypes: string[];
}

export const ReportCoverageSummary = ({
  activeSummary,
  relevantReportTypes,
}: ReportCoverageSummaryProps) => {
  const { coverageByType } = activeSummary;

  return (
    <div className="coverage-summary">
      <span className="coverage-summary-title">Active Report Coverage</span>
      <div className="coverage-grid">
        {relevantReportTypes.map((type) => {
          const entry = coverageByType[type];
          const hasActive = !!entry;
          return (
            <div
              key={type}
              className={`coverage-item ${hasActive ? 'coverage-item-active' : 'coverage-item-missing'}`}
            >
              <span className="coverage-item-type">
                {type.replace(/_/g, ' ')}
              </span>
              <span
                className={`pill ${hasActive ? 'pill-ok' : 'pill-warning'}`}
              >
                {hasActive ? 'Active' : 'Missing'}
              </span>
              {hasActive && entry.supersededCount > 0 && (
                <span className="coverage-item-superseded">
                  +{entry.supersededCount} older
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
