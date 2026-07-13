import { useEffect, useState, useCallback } from 'react';
import { apiClient, type CampaignGoal } from '../lib/apiClient';
import { ConfirmButton } from './ConfirmButton';

interface CampaignGoalsProps {
  campaignId: number;
}

type GoalsState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: CampaignGoal[] };

export const CampaignGoals = ({ campaignId }: CampaignGoalsProps) => {
  const [state, setState] = useState<GoalsState>({ status: 'loading' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: '',
    metric: '',
    description: '',
    targetValue: '',
  });

  const loadGoals = useCallback(() => {
    setState({ status: 'loading' });
    apiClient
      .listCampaignGoals(campaignId)
      .then((data) => setState({ status: 'success', data }))
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Failed to load goals.';
        setState({ status: 'error', error: message });
      });
  }, [campaignId]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const startEdit = (goal: CampaignGoal) => {
    setEditingId(goal.id);
    setForm({
      name: goal.name,
      metric: goal.metric,
      description: goal.description ?? '',
      targetValue: goal.targetValue != null ? String(goal.targetValue) : '',
    });
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (editingId == null) return;
    const payload: {
      name?: string;
      metric?: string;
      description?: string | null;
      targetValue?: number | null;
    } = {};
    if (form.name.trim()) payload.name = form.name.trim();
    if (form.metric.trim()) payload.metric = form.metric.trim();
    payload.description = form.description.trim() || null;
    payload.targetValue =
      form.targetValue.trim() === ''
        ? null
        : Number.isNaN(Number(form.targetValue))
          ? null
          : Number(form.targetValue);

    await apiClient.patchGoal(campaignId, editingId, payload);
    setEditingId(null);
    loadGoals();
  };

  const handleDelete = async (goalId: number) => {
    await apiClient.deleteGoal(campaignId, goalId);
    loadGoals();
  };

  return (
    <section className="card">
      <h2>Goals</h2>
      {state.status === 'loading' && (
        <p className="status status-loading">Loading goals…</p>
      )}
      {state.status === 'error' && (
        <p className="status status-error">{state.error}</p>
      )}
      {state.status === 'success' && state.data.length === 0 && (
        <p className="status status-loading">
          No explicit campaign goals have been added yet.
        </p>
      )}
      {state.status === 'success' && state.data.length > 0 && (
        <ul className="list">
          {state.data.map((goal) => {
            const isEditing = editingId === goal.id;
            return (
              <li key={goal.id}>
                <div className="list-item-row">
                  <div className="list-item">
                    <div className="list-item-title">
                      {goal.name} · {goal.metric}
                    </div>
                    {isEditing ? (
                      <div className="detail-grid">
                        <div className="field">
                          <label className="field-label">Name</label>
                          <input
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="field">
                          <label className="field-label">Metric</label>
                          <input
                            name="metric"
                            value={form.metric}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="field">
                          <label className="field-label">Target value</label>
                          <input
                            name="targetValue"
                            value={form.targetValue}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="field">
                          <label className="field-label">Description</label>
                          <textarea
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        {goal.description && (
                          <p className="list-item-meta">{goal.description}</p>
                        )}
                      </>
                    )}
                  </div>
                  <div className="list-item-controls">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          className="button button-primary button-xs"
                          onClick={handleSave}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="button button-ghost button-xs"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="button button-ghost button-xs"
                          onClick={() => startEdit(goal)}
                        >
                          Edit
                        </button>
                        <ConfirmButton
                          label="Delete"
                          confirmLabel="Confirm delete"
                          className="button button-danger button-xs"
                          onConfirm={() => handleDelete(goal.id)}
                        />
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

