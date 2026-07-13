import type { SavedAnalysis } from '../lib/apiClient';

interface AnalysisHistoryItemProps {
  analysis: SavedAnalysis;
  isSelected: boolean;
  onSelect: (id: number) => void;
}

const EVIDENCE_PILL: Record<string, string> = {
  strong: 'pill pill-ok',
  directional: 'pill pill-warning',
  weak: 'pill pill-error',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '…';
}

export const AnalysisHistoryItem = ({
  analysis,
  isSelected,
  onSelect,
}: AnalysisHistoryItemProps) => {
  const pillClass = EVIDENCE_PILL[analysis.evidenceStrength] ?? 'pill pill-muted';

  return (
    <button
      className={`list-item history-item ${isSelected ? 'active' : ''}`}
      onClick={() => onSelect(analysis.id)}
    >
      <div className="history-item-header">
        <span className="list-item-title">{formatDate(analysis.createdAt)}</span>
        <div className="history-item-badges">
          <span className={pillClass}>{analysis.evidenceStrength}</span>
          {analysis.analysisType !== 'full_diagnosis' && (
            <span className="pill pill-muted">{analysis.analysisType}</span>
          )}
        </div>
      </div>
      {analysis.executiveSummary && (
        <span className="list-item-meta">
          {truncate(analysis.executiveSummary, 120)}
        </span>
      )}
    </button>
  );
};
