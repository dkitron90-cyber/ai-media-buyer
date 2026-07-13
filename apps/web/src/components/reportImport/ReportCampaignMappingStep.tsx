import { useEffect, useState } from 'react';
import { apiClient, type CampaignTypeSummary } from '../../lib/apiClient';
import type { ReportInspectionResult } from '../../lib/apiClient';
import type { ImportMappingMode, SmartUploadMappingEntry } from './types';

interface ReportCampaignMappingStepProps {
  clientName: string | null;
  clientId: number;
  inspectResult: ReportInspectionResult;
  mappings: SmartUploadMappingEntry[];
  campaignsForClient: { id: number; name: string }[];
  onMappingsChange: (next: SmartUploadMappingEntry[]) => void;
  onBack: () => void;
  onContinue: () => void;
  loading: boolean;
  error: string | null;
}

export const ReportCampaignMappingStep = ({
  clientName,
  clientId,
  inspectResult,
  mappings,
  campaignsForClient,
  onMappingsChange,
  onBack,
  onContinue,
  loading,
  error,
}: ReportCampaignMappingStepProps) => {
  const [campaignTypes, setCampaignTypes] = useState<CampaignTypeSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .listCampaignTypes()
      .then((res) => {
        if (!cancelled) setCampaignTypes(res.types);
      })
      .catch(() => {
        if (!cancelled) setCampaignTypes([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = (index: number, mode: ImportMappingMode) => {
    onMappingsChange(
      mappings.map((entry, i) =>
        i === index
          ? {
              ...entry,
              mode,
              existingCampaignId:
                mode === 'existing'
                  ? entry.existingCampaignId ?? entry.matchedCampaignId
                  : null,
            }
          : entry
      )
    );
  };

  const setExistingId = (index: number, campaignId: number | null) => {
    onMappingsChange(
      mappings.map((entry, i) =>
        i === index
          ? {
              ...entry,
              existingCampaignId: campaignId,
              mode: campaignId != null ? 'existing' : entry.mode,
            }
          : entry
      )
    );
  };

  const setCampaignType = (index: number, campaignType: string) => {
    onMappingsChange(
      mappings.map((entry, i) =>
        i === index ? { ...entry, campaignType } : entry
      )
    );
  };

  const bulkUseExactMatches = () => {
    onMappingsChange(
      mappings.map((e) =>
        e.matchedCampaignId != null
          ? {
              ...e,
              mode: 'existing' as const,
              existingCampaignId: e.matchedCampaignId,
            }
          : e
      )
    );
  };

  const bulkCreateUnmatched = () => {
    onMappingsChange(
      mappings.map((e) =>
        e.matchedCampaignId == null
          ? { ...e, mode: 'create' as const, existingCampaignId: null }
          : e
      )
    );
  };

  const bulkSkipUnmatched = () => {
    onMappingsChange(
      mappings.map((e) =>
        e.matchedCampaignId == null
          ? { ...e, mode: 'skip' as const, existingCampaignId: null }
          : e
      )
    );
  };

  return (
    <div className="modal modal-wide">
      <h3 className="modal-title">Map campaigns</h3>
      <p className="insight-secondary smart-upload-client-line">
        Create missing campaigns or map to existing ones under{' '}
        <strong>{clientName ?? `Client #${clientId}`}</strong>
      </p>

      <div className="stack gap-md">
        <div className="smart-upload-bulk-actions">
          <span className="detail-label">Quick actions</span>
          <div className="smart-upload-bulk-buttons">
            <button
              type="button"
              className="button button-ghost button-xs"
              onClick={bulkUseExactMatches}
              disabled={loading}
            >
              Use exact matches
            </button>
            <button
              type="button"
              className="button button-ghost button-xs"
              onClick={bulkCreateUnmatched}
              disabled={loading}
            >
              Create all unmatched
            </button>
            <button
              type="button"
              className="button button-ghost button-xs"
              onClick={bulkSkipUnmatched}
              disabled={loading}
            >
              Skip all unmatched
            </button>
          </div>
        </div>

        <div>
          <span className="detail-label">Campaigns found in file</span>
          {mappings.length === 0 ? (
            <p className="status status-loading">
              No campaign names were detected in the file.
            </p>
          ) : (
            <div className="table-scroll">
              <table className="table table-compact">
                <thead>
                  <tr>
                    <th>Campaign in file</th>
                    <th>Match under client</th>
                    <th>Action</th>
                    <th>Existing campaign</th>
                    <th>New campaign type</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((entry, index) => {
                    const match = inspectResult.campaignMatches.find(
                      (m) => m.campaignName === entry.fileCampaignName
                    );
                    const status = match?.matchStatus ?? 'no_match';
                    const matched =
                      (status === 'exact' || status === 'normalized') &&
                      match?.matchedCampaignName;
                    return (
                      <tr key={entry.fileCampaignName}>
                        <td>{entry.fileCampaignName}</td>
                        <td>
                          {matched ? (
                            <span
                              className="pill pill-ok"
                              title={
                                status === 'normalized'
                                  ? 'Matched after normalizing spaces and commas'
                                  : undefined
                              }
                            >
                              {match!.matchedCampaignName}
                              {status === 'normalized' ? (
                                <span className="insight-secondary"> (spacing)</span>
                              ) : null}
                            </span>
                          ) : (
                            <span className="pill pill-muted">No match</span>
                          )}
                        </td>
                        <td>
                          <select
                            value={entry.mode}
                            onChange={(e) =>
                              setMode(index, e.target.value as ImportMappingMode)
                            }
                            disabled={loading}
                          >
                            <option value="existing">Use existing</option>
                            <option value="create">Create new</option>
                            <option value="skip">Skip</option>
                          </select>
                        </td>
                        <td>
                          <select
                            value={entry.existingCampaignId ?? ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              setExistingId(index, v ? Number(v) : null);
                            }}
                            disabled={loading || entry.mode !== 'existing'}
                          >
                            <option value="">Select campaign…</option>
                            {campaignsForClient.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} (#{c.id})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          {entry.mode === 'create' ? (
                            <div className="stack gap-sm">
                              <select
                                value={entry.campaignType || entry.inferredCampaignType}
                                onChange={(e) =>
                                  setCampaignType(index, e.target.value)
                                }
                                disabled={loading}
                                title="Override inferred campaign type for the new campaign."
                              >
                                {campaignTypes.length > 0 ? (
                                  campaignTypes.map((t) => (
                                    <option key={t.code} value={t.code}>
                                      {t.label ?? t.code}
                                    </option>
                                  ))
                                ) : (
                                  <option value={entry.inferredCampaignType}>
                                    {entry.inferredCampaignType}
                                  </option>
                                )}
                              </select>
                              <span className="list-item-meta">
                                Inferred: <strong>{entry.inferredCampaignType}</strong>
                                {match?.inferredCampaignTypeSource === 'campaign_name'
                                  ? ' (from name)'
                                  : match?.inferredCampaignTypeSource === 'report_type'
                                    ? ' (from report)'
                                    : ' (default)'}
                              </span>
                            </div>
                          ) : (
                            <span className="list-item-meta">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

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
            onClick={onContinue}
            disabled={loading}
          >
            Review import plan
          </button>
        </div>
      </div>
    </div>
  );
};
