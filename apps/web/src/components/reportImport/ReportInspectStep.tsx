import type { ReportInspectionResult } from '../../lib/apiClient';
import type { ExperienceMode } from '../../lib/experienceMode';
import { campaignTypeGuide, isJuniorMode } from '../../lib/experienceMode';

interface ReportInspectStepProps {
  clientName: string | null;
  clientId: number;
  inspectResult: ReportInspectionResult;
  experienceMode?: ExperienceMode;
  onBack: () => void;
  onContinue: () => void;
}

export const ReportInspectStep = ({
  clientName,
  clientId,
  inspectResult,
  experienceMode = 'senior',
  onBack,
  onContinue,
}: ReportInspectStepProps) => {
  const hasCampaignMatches = inspectResult.campaignMatches.length > 0;
  const junior = isJuniorMode(experienceMode);
  const typeGuide = campaignTypeGuide[inspectResult.inferredCampaignType];

  return (
    <div className="modal modal-wide">
      <h3 className="modal-title">Inspection preview</h3>
      <p className="insight-secondary smart-upload-client-line">
        Import to client:{' '}
        <strong>{clientName ?? `Client #${clientId}`}</strong>
      </p>

      <div className="stack gap-md">
        <div className="detail-grid">
          <div>
            <span className="detail-label">File</span>
            <span className="detail-value">{inspectResult.fileName}</span>
          </div>
          <div>
            <span className="detail-label">Report type</span>
            <span className="detail-value">
              {inspectResult.reportType ?? 'Unknown'}
            </span>
          </div>
          <div>
            <span className="detail-label">Encoding</span>
            <span className="detail-value">{inspectResult.detectedEncoding}</span>
          </div>
          <div>
            <span className="detail-label">Delimiter</span>
            <span className="detail-value">
              {inspectResult.detectedDelimiter === '\t'
                ? 'Tab'
                : inspectResult.detectedDelimiter}
            </span>
          </div>
          <div>
            <span className="detail-label">Header row index</span>
            <span className="detail-value">
              {inspectResult.detectedHeaderRowIndex.toString()}
            </span>
          </div>
          <div>
            <span className="detail-label">Preview rows</span>
            <span className="detail-value">
              {inspectResult.previewRowCount.toString()}
            </span>
          </div>
          <div>
            <span className="detail-label">Date range</span>
            <span className="detail-value">
              {inspectResult.dateRangeStart && inspectResult.dateRangeEnd
                ? `${inspectResult.dateRangeStart.split('T')[0]} → ${
                    inspectResult.dateRangeEnd.split('T')[0]
                  }`
                : 'Unknown'}
            </span>
          </div>
        </div>

        <div className="detail-grid">
          <div>
            <span className="detail-label">Inferred campaign type</span>
            <span className="detail-value">
              {inspectResult.inferredCampaignType}
              <span className="pill pill-muted">
                {inspectResult.inferredCampaignTypeConfidence}
              </span>
            </span>
          </div>
        </div>

        {junior && typeGuide && (
          <p className="insight-secondary experience-junior-hint">{typeGuide}</p>
        )}

        {!hasCampaignMatches && (
          <p className="status status-error">
            No campaign names were detected in this file. Use a multi-campaign
            Google Ads export or try a different report.
          </p>
        )}

        {inspectResult.warnings.length > 0 && (
          <div className="status status-loading">
            {inspectResult.warnings.map((w, i) => (
              <div key={i}>{w}</div>
            ))}
          </div>
        )}

        {inspectResult.originalHeaders.length > 0 && (
          <details>
            <summary className="insight-secondary">
              Advanced: header / debug mapping
            </summary>
            <div className="detail-grid">
              <div>
                <span className="detail-label">Original headers</span>
                <p className="list-item-meta">
                  {inspectResult.originalHeaders.join(', ')}
                </p>
              </div>
              <div>
                <span className="detail-label">Normalized headers</span>
                <p className="list-item-meta">
                  {inspectResult.normalizedHeaders.join(', ')}
                </p>
              </div>
            </div>
          </details>
        )}

        <div className="modal-actions">
          <button
            type="button"
            className="button button-ghost button-xs"
            onClick={onBack}
          >
            &larr; Back
          </button>
          <button
            type="button"
            className="button button-primary button-xs"
            onClick={onContinue}
            disabled={!hasCampaignMatches}
          >
            Map campaigns
          </button>
        </div>
      </div>
    </div>
  );
};
