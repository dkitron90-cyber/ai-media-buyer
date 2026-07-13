import type {
  ActionPlanItem,
  PatchActionInput,
  ExecuteActionResult,
} from '../lib/apiClient';
import { ActionCard } from './ActionCard';

interface ActionListProps {
  actions: ActionPlanItem[];
  onUpdate: (actionId: number, payload: PatchActionInput) => Promise<void>;
  onExecute?: (actionId: number) => Promise<ExecuteActionResult>;
  onDelete: (actionId: number) => Promise<void>;
  /** Action ids to subtly highlight (e.g. just created by last AI run). */
  highlightActionIds?: number[];
  /** Omit empty-state block (minimal UI) */
  compactEmpty?: boolean;
}

export const ActionList = ({
  actions,
  onUpdate,
  onExecute,
  onDelete,
  highlightActionIds,
  compactEmpty = false,
}: ActionListProps) => {
  if (actions.length === 0) {
    if (compactEmpty) return null;
    return (
      <div className="actions-empty">
        <p>No actions yet. Run analysis or add one.</p>
      </div>
    );
  }

  const highlightSet =
    highlightActionIds && highlightActionIds.length > 0
      ? new Set(highlightActionIds)
      : null;

  return (
    <div className="actions-list">
      {actions.map((action) => (
        <ActionCard
          key={action.id}
          action={action}
          onUpdate={onUpdate}
          onExecute={onExecute}
          onDelete={onDelete}
          isHighlighted={highlightSet?.has(action.id) ?? false}
        />
      ))}
    </div>
  );
};
