import { useCallback, useEffect, useState } from 'react';
import {
  apiClient,
  type AdvisoryProfile,
  type LandingPageAnalysisResult,
} from '../lib/apiClient';

const VERTICALS = [
  '',
  'Ecommerce',
  'SaaS/Software',
  'Finance/Insurance',
  'Healthcare',
  'Education',
  'Real Estate',
  'Travel',
  'Legal',
  'App Install',
  'Other',
] as const;

const CONVERSION_TYPES = [
  '',
  'Lead / form',
  'Purchase / ecommerce',
  'Phone call',
  'App install',
  'Sign-up / trial',
  'Booking / appointment',
  'Other',
] as const;

const MATURITY = ['', 'New', 'Growth', 'Scale', 'Enterprise / complex'] as const;

interface AdvisoryContextPanelProps {
  clientId: number;
  onSaved?: () => void;
}

export const AdvisoryContextPanel = ({
  clientId,
  onSaved,
}: AdvisoryContextPanelProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<AdvisoryProfile>>({});
  const [analyzeUrl, setAnalyzeUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<LandingPageAnalysisResult | null>(
    null
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const p = await apiClient.getAdvisoryProfile(clientId);
      setDraft({
        websiteUrl: p.websiteUrl ?? '',
        industryVertical: p.industryVertical ?? '',
        conversionType: p.conversionType ?? '',
        accountMaturity: p.accountMaturity ?? '',
        approximateMonthlySpend: p.approximateMonthlySpend ?? '',
      });
      setLastAnalysis(p.landingPageAnalysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const spendRaw = String(draft.approximateMonthlySpend ?? '').trim();
      let approximateMonthlySpend: number | null | undefined = undefined;
      if (spendRaw === '') {
        approximateMonthlySpend = null;
      } else {
        const n = parseFloat(spendRaw.replace(/[,$\s]/g, ''));
        if (!Number.isFinite(n) || n < 0) {
          setError('Invalid monthly spend.');
          setSaving(false);
          return;
        }
        approximateMonthlySpend = n;
      }
      await apiClient.patchAdvisoryProfile(clientId, {
        websiteUrl: (draft.websiteUrl as string)?.trim() || null,
        industryVertical: (draft.industryVertical as string)?.trim() || null,
        conversionType: (draft.conversionType as string)?.trim() || null,
        accountMaturity: (draft.accountMaturity as string)?.trim() || null,
        approximateMonthlySpend,
      });
      await load();
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = async () => {
    const url = analyzeUrl.trim() || String(draft.websiteUrl ?? '').trim();
    if (!url) {
      setError('Enter a URL to analyze (or save a website URL first).');
      return;
    }
    try {
      setAnalyzing(true);
      setError(null);
      const result = await apiClient.analyzeLandingPage(url);
      setLastAnalysis(result);
      await apiClient.patchAdvisoryProfile(clientId, {
        landingPageAnalysis: result,
      });
      await load();
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return <p className="status status-loading">Loading advisor context…</p>;
  }

  const analysis = lastAnalysis;

  return (
    <div className="advisory-panel stack gap-sm">
      {error && <p className="status status-error">{error}</p>}

      <div className="settings-form-grid advisory-panel__grid">
        <label className="settings-form-field">
          <span className="settings-form-field__label">Website URL</span>
          <input
            className="settings-form-input"
            type="url"
            value={String(draft.websiteUrl ?? '')}
            onChange={(e) =>
              setDraft((d) => ({ ...d, websiteUrl: e.target.value }))
            }
            placeholder="https://"
          />
        </label>
        <label className="settings-form-field">
          <span className="settings-form-field__label">Industry vertical</span>
          <select
            className="settings-form-select"
            value={String(draft.industryVertical ?? '')}
            onChange={(e) =>
              setDraft((d) => ({ ...d, industryVertical: e.target.value }))
            }
          >
            {VERTICALS.map((v) => (
              <option key={v || 'empty'} value={v}>
                {v || 'Select…'}
              </option>
            ))}
          </select>
        </label>
        <label className="settings-form-field">
          <span className="settings-form-field__label">Conversion type</span>
          <select
            className="settings-form-select"
            value={String(draft.conversionType ?? '')}
            onChange={(e) =>
              setDraft((d) => ({ ...d, conversionType: e.target.value }))
            }
          >
            {CONVERSION_TYPES.map((v) => (
              <option key={v || 'empty'} value={v}>
                {v || 'Select…'}
              </option>
            ))}
          </select>
        </label>
        <label className="settings-form-field">
          <span className="settings-form-field__label">Account maturity</span>
          <select
            className="settings-form-select"
            value={String(draft.accountMaturity ?? '')}
            onChange={(e) =>
              setDraft((d) => ({ ...d, accountMaturity: e.target.value }))
            }
          >
            {MATURITY.map((v) => (
              <option key={v || 'empty'} value={v}>
                {v || 'Select…'}
              </option>
            ))}
          </select>
        </label>
        <label className="settings-form-field">
          <span className="settings-form-field__label">Approx. monthly spend</span>
          <input
            className="settings-form-input"
            type="text"
            inputMode="decimal"
            value={String(draft.approximateMonthlySpend ?? '')}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                approximateMonthlySpend: e.target.value,
              }))
            }
            placeholder="e.g. 15000"
          />
        </label>
      </div>

      <div className="modal-actions">
        <button
          type="button"
          className="button button-primary button-xs"
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </div>

      <div className="advisory-panel__analyze">
        <span className="settings-form-field__label">Landing page</span>
        <div className="advisory-panel__analyze-row">
          <input
            className="settings-form-input"
            type="url"
            value={analyzeUrl}
            onChange={(e) => setAnalyzeUrl(e.target.value)}
            placeholder="URL to analyze (defaults to website URL)"
          />
          <button
            type="button"
            className="button button-ghost button-xs"
            disabled={analyzing}
            onClick={() => void handleAnalyze()}
          >
            {analyzing ? 'Analyzing…' : 'Analyze'}
          </button>
        </div>
      </div>

      {analysis && (
        <div className="advisory-panel__lp-card">
          <div className="advisory-panel__lp-row">
            <span>HTTPS</span>
            <strong>{analysis.isHTTPS ? 'Yes' : 'No'}</strong>
          </div>
          <div className="advisory-panel__lp-row">
            <span>Load</span>
            <strong>{analysis.loadTimeMs} ms</strong>
          </div>
          <div className="advisory-panel__lp-row">
            <span>CTA / viewport / form</span>
            <strong>
              {analysis.hasCTA ? 'CTA ' : ''}
              {analysis.hasMobileViewport ? '· mobile ' : ''}
              {analysis.hasForm ? '· form' : ''}
            </strong>
          </div>
          <div className="advisory-panel__lp-row">
            <span>Social proof</span>
            <strong>{analysis.hasSocialProof ? 'Yes' : '—'}</strong>
          </div>
          <div className="advisory-panel__lp-meta">
            <div>
              <span className="advisory-panel__lp-k">Title</span>
              <p>{analysis.title ?? '—'}</p>
            </div>
            <div>
              <span className="advisory-panel__lp-k">Meta</span>
              <p>{analysis.metaDescription ?? '—'}</p>
            </div>
            <div>
              <span className="advisory-panel__lp-k">H1</span>
              <p>{analysis.h1 ?? '—'}</p>
            </div>
          </div>
          {analysis.warnings.length > 0 && (
            <ul className="advisory-panel__warnings">
              {analysis.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
