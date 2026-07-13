import type { AnalysisReadiness as ReadinessData } from '../lib/apiClient';
import type { ExperienceMode } from '../lib/experienceMode';
import { isJuniorMode, readinessLabelGuide } from '../lib/experienceMode';

interface AnalysisReadinessProps {
  readiness?: ReadinessData | null;
  experienceMode?: ExperienceMode;
}

const LABEL_CONFIG: Record<
  ReadinessData['sufficiencyLabel'],
  { text: string; pillClass: string; description: string }
> = {
  STRONG: {
    text: 'Strong',
    pillClass: 'pill pill-ok',
    description: 'Sufficient data for confident analysis.',
  },
  DIRECTIONAL: {
    text: 'Directional',
    pillClass: 'pill pill-warning',
    description: 'Enough data for directional insights. Some areas may lack depth.',
  },
  WEAK: {
    text: 'Weak',
    pillClass: 'pill pill-error',
    description: 'Limited data available. Analysis will focus on gaps and next steps.',
  },
};

export const AnalysisReadiness = ({
  readiness,
  experienceMode = 'senior',
}: AnalysisReadinessProps) => {
  const junior = isJuniorMode(experienceMode);
  if (!readiness) {
    return (
      <div className="readiness-panel">
        <div className="readiness-header">
          <span className="readiness-title">Data check</span>
          <span className="pill pill-muted">Unknown</span>
        </div>
        <p className="readiness-description">
          Readiness data is not available yet. Once reports are parsed, this will update
          automatically.
        </p>
      </div>
    );
  }

  const config = LABEL_CONFIG[readiness.sufficiencyLabel];

  return (
    <div className="readiness-panel">
      <div className="readiness-header">
        <span className="readiness-title">Data check</span>
        <span className={config.pillClass}>{config.text}</span>
      </div>
      <p className="readiness-description">{config.description}</p>
      {junior && readinessLabelGuide[readiness.sufficiencyLabel] && (
        <p className="experience-junior-hint">
          {readinessLabelGuide[readiness.sufficiencyLabel]}
        </p>
      )}

      <div className="readiness-metrics">
        <div className="readiness-metric">
          <span className="readiness-metric-value">
            {readiness.totals.impressions.toLocaleString()}
          </span>
          <span className="readiness-metric-label">Impressions</span>
        </div>
        <div className="readiness-metric">
          <span className="readiness-metric-value">
            {readiness.totals.clicks.toLocaleString()}
          </span>
          <span className="readiness-metric-label">Clicks</span>
        </div>
        <div className="readiness-metric">
          <span className="readiness-metric-value">
            ${readiness.totals.cost.toFixed(2)}
          </span>
          <span className="readiness-metric-label">Cost</span>
        </div>
        <div className="readiness-metric">
          <span className="readiness-metric-value">
            {readiness.totals.conversions.toLocaleString()}
          </span>
          <span className="readiness-metric-label">Conversions</span>
        </div>
      </div>

      {readiness.reasons.length > 0 && (
        <ul className="readiness-reasons">
          {readiness.reasons.map((reason, i) => (
            <li key={i}>{reason}</li>
          ))}
        </ul>
      )}

      <div className="readiness-reports">
        <span className="readiness-metric-label">Reports</span>
        <div className="pill-row">
          {readiness.relevantReportTypes.map((type) => {
            const isParsed = readiness.parsedReportTypes.includes(type);
            const isUploaded = readiness.uploadedReportTypes.includes(type);
            const pillClass = isParsed
              ? 'pill pill-ok'
              : isUploaded
                ? 'pill pill-warning'
                : 'pill pill-muted';
            return (
              <span key={type} className={pillClass}>
                {type.replace(/_/g, ' ')}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

