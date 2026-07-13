import { useState, type FormEvent } from 'react';
import type { CreateActionInput } from '../lib/apiClient';

interface ActionFormProps {
  onSubmit: (payload: CreateActionInput) => Promise<void>;
}

const ACTION_TYPES = ['scale', 'hold', 'pause', 'exclude', 'test', 'restructure'] as const;
const PRIORITIES = ['high', 'medium', 'low'] as const;
const CONFIDENCES = ['high', 'medium', 'low'] as const;

export const ActionForm = ({ onSubmit }: ActionFormProps) => {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [actionType, setActionType] = useState<string>('test');
  const [title, setTitle] = useState('');
  const [rationale, setRationale] = useState('');
  const [priority, setPriority] = useState<string>('medium');
  const [confidence, setConfidence] = useState<string>('medium');

  const reset = () => {
    setActionType('test');
    setTitle('');
    setRationale('');
    setPriority('medium');
    setConfidence('medium');
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        actionType,
        title: title.trim(),
        rationale: rationale.trim() || undefined,
        priority,
        confidence,
      });
      reset();
      setOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create action.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="btn action-form-toggle" onClick={() => setOpen(true)}>
        + Add
      </button>
    );
  }

  return (
    <form className="action-form" onSubmit={handleSubmit}>
      <h4 className="action-form-title">New action</h4>

      <div className="field-row">
        <div className="field" style={{ flex: 1 }}>
          <label className="field-label" htmlFor="af-type">Type</label>
          <select
            id="af-type"
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
          >
            {ACTION_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="field" style={{ flex: 1 }}>
          <label className="field-label" htmlFor="af-priority">Priority</label>
          <select
            id="af-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div className="field" style={{ flex: 1 }}>
          <label className="field-label" htmlFor="af-confidence">Confidence</label>
          <select
            id="af-confidence"
            value={confidence}
            onChange={(e) => setConfidence(e.target.value)}
          >
            {CONFIDENCES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="af-title">Title</label>
        <input
          id="af-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="af-rationale">Rationale (optional)</label>
        <textarea
          id="af-rationale"
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          placeholder="Why is this action needed?"
          rows={2}
        />
      </div>

      {error && <p className="status status-error">{error}</p>}

      <div className="action-form-buttons">
        <button className="button button-primary button-xs" type="submit" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create Action'}
        </button>
        <button
          className="button button-ghost"
          type="button"
          onClick={() => { reset(); setOpen(false); }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};
