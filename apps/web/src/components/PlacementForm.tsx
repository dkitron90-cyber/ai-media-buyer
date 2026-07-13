import { useState, type FormEvent } from 'react';
import type { CreatePlacementInput } from '../lib/apiClient';

interface PlacementFormProps {
  onSubmit: (payload: CreatePlacementInput) => Promise<void>;
}

const LIST_TYPES = ['blacklist', 'whitelist'] as const;
const SOURCES = ['manual', 'imported'] as const;

export const PlacementForm = ({ onSubmit }: PlacementFormProps) => {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [listType, setListType] = useState<string>('blacklist');
  const [placement, setPlacement] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [reason, setReason] = useState('');
  const [source, setSource] = useState<string>('manual');

  const reset = () => {
    setListType('blacklist');
    setPlacement('');
    setDisplayName('');
    setReason('');
    setSource('manual');
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!placement.trim()) {
      setError('Placement is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        listType,
        placement: placement.trim(),
        displayName: displayName.trim() || undefined,
        reason: reason.trim() || undefined,
        source,
      });
      reset();
      setOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create placement.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button className="btn action-form-toggle" onClick={() => setOpen(true)}>
        + Add Placement
      </button>
    );
  }

  return (
    <form className="action-form" onSubmit={handleSubmit}>
      <h4 className="action-form-title">New Placement Entry</h4>

      <div className="field-row">
        <div className="field" style={{ flex: 1 }}>
          <label className="field-label" htmlFor="pf-list-type">List Type</label>
          <select
            id="pf-list-type"
            value={listType}
            onChange={(e) => setListType(e.target.value)}
          >
            {LIST_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="field" style={{ flex: 1 }}>
          <label className="field-label" htmlFor="pf-source">Source</label>
          <select
            id="pf-source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            {SOURCES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="pf-placement">Placement</label>
        <input
          id="pf-placement"
          value={placement}
          onChange={(e) => setPlacement(e.target.value)}
          placeholder="URL, app ID, channel, etc."
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="pf-display-name">Display Name (optional)</label>
        <input
          id="pf-display-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Friendly name for this placement"
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="pf-reason">Reason (optional)</label>
        <input
          id="pf-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why add this placement?"
        />
      </div>

      {error && <p className="status status-error">{error}</p>}

      <div className="action-form-buttons">
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Adding…' : 'Add Placement'}
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
