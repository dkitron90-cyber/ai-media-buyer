import { useCallback, useEffect, useState } from 'react';
import { apiClient, type CampaignTypeFull } from '../lib/apiClient';

interface CampaignTypeTemplatePanelProps {
  campaignId: number;
}

export const CampaignTypeTemplatePanel = ({
  campaignId,
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

  return (
    <div className="stack gap-md campaign-type-template-panel">
      <p className="insight-secondary">
        Registry type: <strong>{canonicalType}</strong> — {detail.label}
      </p>
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
        <h4 className="template-subheading">Recommended report types</h4>
        <div className="template-tag-list" role="list">
          {detail.recommendedReportTypes.map((t) => (
            <span key={t} className="pill pill-ok" role="listitem">
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

      <section>
        <h4 className="template-subheading">Special warnings</h4>
        <ul className="list">
          {detail.specialWarnings.map((w, i) => (
            <li key={i} className="list-item status status-loading">
              {w}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h4 className="template-subheading">Launch checklist</h4>
        <ul className="list">
          {detail.defaultChecklistTemplate.launch.map((item) => (
            <li key={item.id} className="list-item">
              <span className="list-item-title">{item.label}</span>
              {item.detail ? (
                <span className="list-item-meta">{item.detail}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h4 className="template-subheading">Optimization checklist</h4>
        <ul className="list">
          {detail.defaultChecklistTemplate.optimization.map((item) => (
            <li key={item.id} className="list-item">
              <span className="list-item-title">{item.label}</span>
              {item.detail ? (
                <span className="list-item-meta">{item.detail}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h4 className="template-subheading">Expected reports (summary)</h4>
        <p className="modal-body">
          {detail.defaultPlaybookTemplate.expectedReportsSummary}
        </p>
      </section>

      <section>
        <h4 className="template-subheading">Missing report — strong warnings</h4>
        <ul className="list">
          {detail.defaultPlaybookTemplate.missingReportSeverity.strongWarnings.map(
            (w, i) => (
              <li key={i} className="list-item status status-error">
                {w}
              </li>
            )
          )}
        </ul>
      </section>

      <section>
        <h4 className="template-subheading">Missing report — moderate warnings</h4>
        <ul className="list">
          {detail.defaultPlaybookTemplate.missingReportSeverity.moderateWarnings.map(
            (w, i) => (
              <li key={i} className="list-item status status-loading">
                {w}
              </li>
            )
          )}
        </ul>
      </section>

      <section>
        <h4 className="template-subheading">AI / playbook guidance</h4>
        <ul className="list">
          {detail.defaultPlaybookTemplate.aiPlaybookGuidance.map((g, i) => (
            <li key={i} className="list-item">
              {g}
            </li>
          ))}
        </ul>
      </section>

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
