import type { SmartUploadMappingEntry } from './types';

interface ReportImportReviewStepProps {
  clientName: string | null;
  clientId: number;
  mappings: SmartUploadMappingEntry[];
  onBack: () => void;
  onImport: () => void;
  loading: boolean;
  error: string | null;
}

export const ReportImportReviewStep = ({
  clientName,
  clientId,
  mappings,
  onBack,
  onImport,
  loading,
  error,
}: ReportImportReviewStepProps) => {
  const existing = mappings.filter((m) => m.mode === 'existing');
  const created = mappings.filter((m) => m.mode === 'create');
  const skipped = mappings.filter((m) => m.mode === 'skip');

  const existingResolved = existing.filter((m) => m.existingCampaignId != null);
  const existingIncomplete = existing.filter((m) => m.existingCampaignId == null);

  return (
    <div className="modal modal-wide">
      <h3 className="modal-title">Review import plan</h3>
      <p className="insight-secondary smart-upload-client-line">
        Import to client:{' '}
        <strong>{clientName ?? `Client #${clientId}`}</strong>
      </p>

      <div className="stack gap-md">
        <div className="smart-upload-review-grid">
          <div className="card card-compact">
            <h4 className="template-subheading">Matched to existing</h4>
            <p className="list-item-meta">
              {existingResolved.length} campaign(s)
            </p>
            <ul className="list ordered-template-list">
              {existingResolved.map((m) => (
                <li key={m.fileCampaignName} className="list-item-meta">
                  {m.fileCampaignName}
                  {m.existingCampaignId != null
                    ? ` → #${m.existingCampaignId}`
                    : ''}
                </li>
              ))}
            </ul>
            {existingIncomplete.length > 0 && (
              <p className="status status-error">
                {existingIncomplete.length} row(s) use “Use existing” but no campaign is
                selected. Go back and pick a campaign.
              </p>
            )}
          </div>

          <div className="card card-compact">
            <h4 className="template-subheading">New campaigns to create</h4>
            <p className="list-item-meta">{created.length} campaign(s)</p>
            <ul className="list ordered-template-list">
              {created.map((m) => (
                <li key={m.fileCampaignName} className="list-item-meta">
                  {m.fileCampaignName}
                  {' → '}
                  {m.campaignType || m.inferredCampaignType}
                </li>
              ))}
            </ul>
          </div>

          <div className="card card-compact">
            <h4 className="template-subheading">Skipped</h4>
            <p className="list-item-meta">{skipped.length} campaign(s)</p>
            <ul className="list ordered-template-list">
              {skipped.map((m) => (
                <li key={m.fileCampaignName} className="list-item-meta">
                  {m.fileCampaignName}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="list-item-meta">
          Summary: {existingResolved.length} import to existing, {created.length} create &amp;
          import, {skipped.length} skipped.
        </p>

        {error && <p className="status status-error">{error}</p>}

        <div className="modal-actions">
          <button
            type="button"
            className="button button-ghost button-xs"
            onClick={onBack}
            disabled={loading}
          >
            &larr; Back
          </button>
          <button
            type="button"
            className="button button-primary button-xs"
            onClick={onImport}
            disabled={loading || existingIncomplete.length > 0}
          >
            {loading ? 'Importing…' : 'Import selected campaigns'}
          </button>
        </div>
      </div>
    </div>
  );
};
