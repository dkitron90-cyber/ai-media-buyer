import { useState } from 'react';
import { ConfirmButton } from './ConfirmButton';
import type { ActionPlanItem, PatchActionInput, ExecuteActionResult } from '../lib/apiClient';
import { ActionImpactPanel } from './ActionImpactPanel';

interface ActionCardProps {
  action: ActionPlanItem;
  onUpdate: (actionId: number, payload: PatchActionInput) => Promise<void>;
  onExecute?: (actionId: number) => Promise<ExecuteActionResult>;
  onDelete: (actionId: number) => Promise<void>;
  isHighlighted?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  scale: 'Scale',
  hold: 'Hold',
  pause: 'Pause',
  exclude: 'Exclude',
  test: 'Test',
  restructure: 'Restructure',
};

const EXECUTABLE_TYPES = new Set(['exclude', 'pause', 'scale']);

const PRIORITY_CLASS: Record<string, string> = {
  high: 'action-priority-high',
  medium: 'action-priority-medium',
  low: 'action-priority-low',
};

const STATUS_OPTIONS = ['draft', 'approved', 'done', 'dismissed'] as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/** Prefer explicit target from notes (e.g. "Target: youtube.com/...") or title. */
function extractTarget(action: ActionPlanItem): string {
  const notes = action.notes?.trim() ?? '';
  const m = notes.match(/^target:\s*(.+)$/im);
  if (m?.[1]) return m[1].trim();
  return action.title.trim();
}

function clampText(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

type ExecFeedback =
  | null
  | { type: 'success'; result: ExecuteActionResult }
  | { type: 'error'; message: string };

export const ActionCard = ({
  action,
  onUpdate,
  onExecute,
  onDelete,
  isHighlighted = false,
}: ActionCardProps) => {
  const [updating, setUpdating] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [execFeedback, setExecFeedback] = useState<ExecFeedback>(null);
  const [impactOpen, setImpactOpen] = useState(false);

  const target = extractTarget(action);
  const rationaleShort =
    action.rationale && action.rationale !== action.title
      ? clampText(action.rationale, 220)
      : '';

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === action.status) return;
    setUpdating(true);
    try {
      await onUpdate(action.id, { status: newStatus });
    } finally {
      setUpdating(false);
    }
  };

  const handleExecute = async () => {
    if (!onExecute) return;
    setExecuting(true);
    setExecFeedback(null);
    try {
      const result = await onExecute(action.id);
      setExecFeedback({ type: 'success', result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Execution failed.';
      setExecFeedback({ type: 'error', message });
    } finally {
      setExecuting(false);
    }
  };

  const priorityClass = PRIORITY_CLASS[action.priority] ?? '';
  const isExecutable =
    onExecute &&
    EXECUTABLE_TYPES.has(action.actionType) &&
    action.status !== 'done' &&
    action.status !== 'dismissed';

  const canShowImpact = action.status === 'done';
  const doneOrDismissed =
    action.status === 'done' || action.status === 'dismissed';

  return (
    <div
      className={`action-card action-card--premium ${priorityClass}${
        isHighlighted ? ' action-card-new-highlight' : ''
      }`}
    >
      <div className="action-card__top">
        <span className="action-card-type">
          {TYPE_LABELS[action.actionType] ?? action.actionType}
        </span>
        <span className="action-card__meta">
          {action.priority} · {action.confidence} conf.
        </span>
      </div>

      <h4 className="action-card-target" title={target}>
        {target}
      </h4>

      {action.expectedImpact ? (
        <p className="action-card-impact">
          <span className="action-card-impact__label">Est. impact</span>
          {action.expectedImpact}
        </p>
      ) : null}

      {rationaleShort ? (
        <p className="action-card-rationale action-card-rationale--tight">{rationaleShort}</p>
      ) : null}

      {execFeedback?.type === 'success' && (
        <div className="exec-feedback exec-feedback-ok">
          Done
          {execFeedback.result.placementsCreated.length > 0 &&
            ` · ${execFeedback.result.placementsCreated.length} placement(s)`}
        </div>
      )}
      {execFeedback?.type === 'error' && (
        <div className="exec-feedback exec-feedback-error">{execFeedback.message}</div>
      )}

      <div className="action-card__execute-row">
        {isExecutable && (
          <button
            type="button"
            className="button button-primary action-card__execute"
            disabled={executing || updating}
            onClick={handleExecute}
          >
            {executing ? '…' : 'Execute'}
          </button>
        )}
        {!doneOrDismissed && (
          <label className="action-card__status-field">
            <select
              className="action-card__status-select"
              aria-label="Action status"
              value={action.status}
              disabled={updating || executing}
              onChange={(e) => void handleStatusChange(e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}
        <ConfirmButton
          label="Delete"
          confirmLabel="Delete?"
          className="button button-ghost button-xs action-card__delete"
          onConfirm={() => onDelete(action.id)}
          disabled={updating || executing}
        />
      </div>

      <div className="action-card__footer-quiet">
        {formatDate(action.createdAt)}
        {canShowImpact && (
          <button
            type="button"
            className="button button-ghost button-xs"
            onClick={() => setImpactOpen((v) => !v)}
          >
            {impactOpen ? 'Hide impact' : 'Impact'}
          </button>
        )}
      </div>

      <ActionImpactPanel
        campaignId={action.campaignId}
        actionId={action.id}
        visible={impactOpen}
        eligibleToCapture={canShowImpact}
      />
    </div>
  );
};
