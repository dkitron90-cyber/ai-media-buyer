import { useCallback, useEffect, useState } from 'react';
import {
  apiClient,
  CAMPAIGN_SETTINGS_SCHEMA_VERSION,
} from '../lib/apiClient';
import {
  CampaignTypeSettingsForm,
  buildSettingsPayloadForType,
  normalizeSettingsDraftFromApi,
} from './CampaignTypeSettingsForm';

interface CampaignSettingsPanelProps {
  campaignId: number;
  /** Stored campaign.type (used until settings load resolves canonical). */
  campaignTypeHint: string;
  onSaved?: () => void;
  /** Group fields for control panel (Strategy / Audience / Placements / Tracking). */
  groupedLayout?: boolean;
  /** Show resolved type badge above the form (off when parent shows type). */
  showCanonicalBadge?: boolean;
  /** Autopilot: scroll to field with this `data-setting-key` */
  focusSettingKey?: string | null;
  onFocusSettingConsumed?: () => void;
}

export const CampaignSettingsPanel = ({
  campaignId,
  campaignTypeHint,
  onSaved,
  groupedLayout = false,
  showCanonicalBadge = true,
  focusSettingKey,
  onFocusSettingConsumed,
}: CampaignSettingsPanelProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canonicalType, setCanonicalType] = useState<string>(
    campaignTypeHint.toUpperCase()
  );
  const [draft, setDraft] = useState<Record<string, unknown>>({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.getCampaignSettings(campaignId);
      setCanonicalType(res.canonicalCampaignType);
      setDraft(
        normalizeSettingsDraftFromApi(
          res.canonicalCampaignType,
          res.settings ?? {}
        )
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load campaign settings.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!focusSettingKey) return;
    const esc =
      typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
        ? CSS.escape(focusSettingKey)
        : focusSettingKey.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const el = document.querySelector(`[data-setting-key="${esc}"]`);
    if (!(el instanceof HTMLElement)) {
      onFocusSettingConsumed?.();
      return;
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('settings-form-field--autopilot-focus');
    const t = window.setTimeout(() => {
      el.classList.remove('settings-form-field--autopilot-focus');
      onFocusSettingConsumed?.();
    }, 2200);
    return () => clearTimeout(t);
  }, [focusSettingKey, onFocusSettingConsumed]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const payload = buildSettingsPayloadForType(canonicalType, draft);
      await apiClient.patchCampaignSettings(campaignId, {
        settings: payload,
        settingsSchemaVersion: CAMPAIGN_SETTINGS_SCHEMA_VERSION,
      });
      await load();
      onSaved?.();
    } catch (err) {
      let message =
        err instanceof Error ? err.message : 'Failed to save campaign settings.';
      if (err instanceof Error) {
        const jsonStart = err.message.indexOf('{');
        if (jsonStart >= 0) {
          try {
            const body = JSON.parse(err.message.slice(jsonStart)) as {
              details?: string[];
              error?: string;
            };
            if (body.details?.length) {
              message = body.details.join(' ');
            } else if (body.error) {
              message = body.error;
            }
          } catch {
            /* keep message */
          }
        }
      }
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="status status-loading">Loading campaign settings…</p>;
  }

  return (
    <div className="stack gap-sm campaign-settings-panel">
      {showCanonicalBadge ? (
        <div className="campaign-settings-panel__toolbar">
          <span
            className="settings-type-badge"
            title="Resolved campaign type for this form"
          >
            {canonicalType}
          </span>
        </div>
      ) : null}
      <CampaignTypeSettingsForm
        campaignType={canonicalType}
        value={draft}
        onChange={setDraft}
        disabled={saving}
        idPrefix={`csp-${campaignId}`}
        groupedLayout={groupedLayout}
      />
      {error && <p className="status status-error">{error}</p>}
      <div className="modal-actions" style={{ marginTop: '0.5rem' }}>
        <button
          type="button"
          className="button button-ghost button-xs"
          onClick={() => void load()}
          disabled={saving}
        >
          Reload
        </button>
        <button
          type="button"
          className="button button-primary button-xs"
          onClick={() => void handleSave()}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  );
};
