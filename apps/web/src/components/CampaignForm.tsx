import { FormEvent, useEffect, useState } from 'react';
import {
  apiClient,
  CAMPAIGN_SETTINGS_SCHEMA_VERSION,
  type CampaignTypeSummary,
} from '../lib/apiClient';
import {
  CampaignTypeSettingsForm,
  buildSettingsPayloadForType,
} from './CampaignTypeSettingsForm';

interface CampaignFormProps {
  clientId: number;
  onCreated: () => Promise<void> | void;
}

export const CampaignForm = ({ clientId, onCreated }: CampaignFormProps) => {
  const [name, setName] = useState('');
  const [typeCode, setTypeCode] = useState('SEARCH');
  const [status, setStatus] = useState('DRAFT');
  const [types, setTypes] = useState<CampaignTypeSummary[]>([]);
  const [typesError, setTypesError] = useState<string | null>(null);
  const [draftSettings, setDraftSettings] = useState<Record<string, unknown>>(
    {}
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .listCampaignTypes()
      .then((res) => {
        if (cancelled) return;
        setTypes(res.types);
        setTypesError(null);
        if (res.types.length) {
          setTypeCode((prev) =>
            res.types.some((t) => t.code === prev) ? prev : res.types[0]!.code
          );
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'Failed to load campaign types.';
        setTypesError(message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setDraftSettings({});
  }, [typeCode]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !typeCode.trim()) return;

    try {
      setSubmitting(true);
      setError(null);
      const created = await apiClient.createCampaign({
        clientId,
        name: name.trim(),
        type: typeCode.trim(),
        status: status.trim(),
      });
      const payload = buildSettingsPayloadForType(typeCode, draftSettings);
      await apiClient.patchCampaignSettings(created.id, {
        settings: payload,
        settingsSchemaVersion: CAMPAIGN_SETTINGS_SCHEMA_VERSION,
      });
      setName('');
      setTypeCode(types[0]?.code ?? 'SEARCH');
      setStatus('DRAFT');
      setDraftSettings({});
      await onCreated();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create campaign.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form id="campaign-form" className="stack gap-sm" onSubmit={handleSubmit}>
      {typesError && (
        <p className="status status-error">
          {typesError} — type selector may be limited.
        </p>
      )}
      <div className="field-row">
        <label className="field">
          <span className="field-label">Campaign name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Campaign name"
            disabled={submitting}
          />
        </label>
      </div>
      <div className="field-row">
        <label className="field">
          <span className="field-label">Campaign type</span>
          {types.length > 0 ? (
            <select
              value={typeCode}
              onChange={(e) => setTypeCode(e.target.value)}
              disabled={submitting}
            >
              {types.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label} ({t.code})
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={typeCode}
              onChange={(e) => setTypeCode(e.target.value)}
              placeholder="e.g. SEARCH"
              disabled={submitting}
            />
          )}
        </label>
        <label className="field">
          <span className="field-label">Status</span>
          <input
            type="text"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            placeholder="e.g. DRAFT, ACTIVE"
            disabled={submitting}
          />
        </label>
      </div>

      <div className="stack gap-sm">
        <span className="field-label">Type-specific settings (optional)</span>
        <p className="insight-secondary">
          Saved after the campaign is created. Change type above to see different
          fields.
        </p>
        <CampaignTypeSettingsForm
          campaignType={typeCode}
          value={draftSettings}
          onChange={setDraftSettings}
          disabled={submitting}
          idPrefix="new-campaign"
        />
      </div>

      <button
        type="submit"
        className="button button-primary button-xs"
        disabled={submitting || !name.trim() || !typeCode.trim()}
      >
        {submitting ? 'Creating…' : 'Create campaign'}
      </button>
      {error && <p className="status status-error">{error}</p>}
    </form>
  );
};
