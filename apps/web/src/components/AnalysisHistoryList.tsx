import type { SavedAnalysis } from '../lib/apiClient';
import { AnalysisHistoryItem } from './AnalysisHistoryItem';

interface AnalysisHistoryListProps {
  analyses: SavedAnalysis[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onDelete: (id: number) => Promise<void>;
  deletingId: number | null;
}

export const AnalysisHistoryList = ({
  analyses,
  selectedId,
  onSelect,
  onDelete,
  deletingId,
}: AnalysisHistoryListProps) => {
  if (analyses.length === 0) {
    return (
      <div className="analysis-empty">
        <p>No saved analyses yet. Run an AI analysis to build history.</p>
      </div>
    );
  }

  return (
    <ul className="list">
      {analyses.map((a) => (
        <li key={a.id}>
          <div className="list-item-row">
            <AnalysisHistoryItem
              analysis={a}
              isSelected={a.id === selectedId}
              onSelect={onSelect}
            />
            <div className="list-item-controls">
              <button
                type="button"
                className="button button-danger button-xs"
                disabled={deletingId === a.id}
                onClick={() => onDelete(a.id)}
              >
                {deletingId === a.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
};
