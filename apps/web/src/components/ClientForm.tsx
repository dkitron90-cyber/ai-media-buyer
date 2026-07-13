import { FormEvent, useState } from 'react';
import { apiClient } from '../lib/apiClient';

interface ClientFormProps {
  onCreated: () => Promise<void> | void;
}

export const ClientForm = ({ onCreated }: ClientFormProps) => {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      setError(null);
      await apiClient.createClient({ name: name.trim() });
      setName('');
      await onCreated();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create client.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form id="client-form" className="stack gap-sm" onSubmit={handleSubmit}>
      <label className="field">
        <span className="field-label">New client</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Client name"
          disabled={submitting}
        />
      </label>
      <button
        type="submit"
        className="btn"
        disabled={submitting || !name.trim()}
      >
        {submitting ? 'Creating…' : 'Create client'}
      </button>
      {error && <p className="status status-error">{error}</p>}
    </form>
  );
};

