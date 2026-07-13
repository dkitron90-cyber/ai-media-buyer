import { useCallback, useEffect, useState } from 'react';
import { apiClient, type CampaignTypeFull } from '../lib/apiClient';
import { CollapsibleSection } from './CollapsibleSection';

interface CampaignTypeTemplatePanelProps {
  campaignId: number;
  summaryOnly?: boolean;
}

export const CampaignTypeTemplatePanel = ({
  campaignId,
  summaryOnly = false,
}: CampaignTypeTemplatePanelProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canonicalType, setCanonicalType] = useState<string | null>(null);
  const [detail, setDetail] = useState<CampaignTypeFull | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const settings = await apiClient.getCampaignSettings(campaignId);
      const code = settings.canonicalCampaignType;
      setCanonicalType(code);
      const { type } = await apiClient.getCampaignType(code);
      setDetail(type);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to load campaign type templates.';
      setError(message);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="status status-loading">Loading templates & playbook…</p>;
  }

  if (error || !detail) {
    return (
      <div className="stack gap-sm">
        {error && <p className="status status-error">{error}</p>}
        <button
          type="button"
          className="button button-ghost button-xs"
          onClick={() => void load()}
        >
          Retry
        </button>
      </div>
    );
  }

  const fullDetail = (
    <div className="stack gap-md campaign-type-template-panel">
      <section>
        <h4 className="template-subheading">Description</h4>
        <p className="modal-body">{detail.description}</p>
      </section>

      <section>
        <h4 className="template-subheading">Important report types</h4>
        <div className="template-tag-list" role="list">
          {detail.importantReportTypes.map((t) => (
            <span key={t} className="pill pill-muted" role="listitem">
              {t}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h4 className="template-subheading">Optimization priorities</h4>
        <ol className="list ordered-template-list">
          {detail.optimizationPriorities.map((p, i) => (
            <li key={i} className="list-item">
              {p}
            </li>
          ))}
        </ol>
      </section>

      {detail.specialWarnings.length > 0 && (
        <section>
          <h4 className="template-subheading">Warnings</h4>
          <ul className="list">
            {detail.specialWarnings.map((w, i) => (
              <li key={i} className="list-item">
                {w}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );

  if (summaryOnly) {
    return (
      <div className="stack gap-sm">
        <p className="insight-secondary">
          <strong>{canonicalType}</strong> — {detail.label}.{' '}
          {detail.importantReportTypes.length} important report types.
        </p>
        <CollapsibleSection
          title="Full type guide"
          subtitle="Reports, priorities, warnings"
          defaultCollapsed
        >
          {fullDetail}
        </CollapsibleSection>
      </div>
    );
  }

  return (
    <div className="stack gap-sm">
      <p className="insight-secondary">
        Registry type: <strong>{canonicalType}</strong> — {detail.label}
      </p>
      {fullDetail}
      <button
        type="button"
        className="button button-ghost button-xs"
        onClick={() => void load()}
      >
        Refresh from API
      </button>
    </div>
  );
};
