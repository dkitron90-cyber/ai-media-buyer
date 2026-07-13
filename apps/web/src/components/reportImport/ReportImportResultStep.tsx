import type { SmartImportResultItem } from '../../lib/apiClient';

interface ReportImportResultStepProps {
  clientName: string | null;
  clientId: number;
  results: SmartImportResultItem[];
  error: string | null;
  onDone: () => void;
}

const formatOutcome = (o: string) => o.split('_').join(' ');

export const ReportImportResultStep = ({
  clientName,
  clientId,
  results,
  error,
  onDone,
}: ReportImportResultStepProps) => (
  <div className="modal modal-wide">
    <h3 className="modal-title">Import results</h3>
    <p className="insight-secondary smart-upload-client-line">
      Client: <strong>{clientName ?? `Client #${clientId}`}</strong>
    </p>

    <div className="stack gap-md">
      {error && <p className="status status-error">{error}</p>}
      {results.length === 0 ? (
        <p className="status status-loading">
          No import results returned. Try the wizard again.
        </p>
      ) : (
        <ul className="list">
          {results.map((r) => (
            <li
              key={`${r.detectedCampaignName}-${r.campaignId ?? 'none'}-${
                r.uploadedReportId ?? 'none'
              }`}
              className="list-item"
            >
              <div className="list-item-row">
                <div className="list-item">
                  <span className="list-item-title">
                    {r.detectedCampaignName}
                    {r.campaignId ? ` → Campaign #${r.campaignId}` : ''}
                  </span>
                  <span className="list-item-meta">
                    {formatOutcome(r.outcome)}
                    {r.uploadedReportId
                      ? ` · Report #${r.uploadedReportId}`
                      : ' · No rows matched'}
                  </span>
                  {r.createdCampaignType && (
                    <span className="list-item-meta">
                      Type: {r.createdCampaignType}
                    </span>
                  )}
                  {r.autoParse && (
                    <span className="list-item-meta">
                      Parse:{' '}
                      {r.autoParse.attempted
                        ? r.autoParse.success
                          ? `${r.autoParse.parsedRowCount ?? 0} row(s)`
                          : `Failed — ${r.autoParse.error ?? 'unknown'}`
                        : 'Not attempted'}
                    </span>
                  )}
                  {r.warnings.length > 0 && (
                    <span className="list-item-meta">{r.warnings.join(' ')}</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="modal-actions">
        <button
          type="button"
          className="button button-primary button-xs"
          onClick={onDone}
        >
          Done
        </button>
      </div>
    </div>
  </div>
);
