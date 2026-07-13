import type { PrioritizedAction } from '../lib/apiClient';

interface PrioritizedActionsProps {
  actions: PrioritizedAction[];
}

const TYPE_LABELS: Record<PrioritizedAction['type'], string> = {
  scale: 'Scale',
  hold: 'Hold',
  pause: 'Pause',
  exclude: 'Exclude',
  test: 'Test',
  restructure: 'Restructure',
};

const PRIORITY_CLASS: Record<PrioritizedAction['priority'], string> = {
  high: 'action-priority-high',
  medium: 'action-priority-medium',
  low: 'action-priority-low',
};

const CONFIDENCE_CLASS: Record<PrioritizedAction['confidence'], string> = {
  high: 'pill pill-ok',
  medium: 'pill pill-warning',
  low: 'pill pill-error',
};

export const PrioritizedActions = ({ actions }: PrioritizedActionsProps) => {
  if (actions.length === 0) {
    return <p className="status status-loading">No actions recommended yet.</p>;
  }

  return (
    <div className="actions-list">
      {actions.map((action, i) => (
        <div key={i} className={`action-card ${PRIORITY_CLASS[action.priority]}`}>
          <div className="action-card-header">
            <span className="action-card-type">{TYPE_LABELS[action.type] ?? action.type}</span>
            <div className="action-card-badges">
              <span className={CONFIDENCE_CLASS[action.confidence]}>
                {action.confidence} confidence
              </span>
              <span className="pill pill-muted">{action.priority} priority</span>
            </div>
          </div>
          <h4 className="action-card-title">{action.title}</h4>
          <p className="action-card-rationale">{action.rationale}</p>
        </div>
      ))}
    </div>
  );
};
