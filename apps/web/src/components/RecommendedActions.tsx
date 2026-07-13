import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  apiClient,
  type ActionPlanItem,
  type PatchActionInput,
  type ExecuteActionResult,
} from '../lib/apiClient';
import { ActionList } from './ActionList';

interface RecommendedActionsProps {
  campaignId: number;
}

type ActionsState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: ActionPlanItem[] };

const PRIORITY_ORDER: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const MAX_RECOMMENDED = 5;

export const RecommendedActions = ({ campaignId }: RecommendedActionsProps) => {
  const [state, setState] = useState<ActionsState>({ status: 'loading' });

  const loadActions = useCallback(() => {
    setState({ status: 'loading' });
    apiClient
      .listCampaignActions(campaignId)
      .then((data) => setState({ status: 'success', data }))
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Failed to load recommended actions.';
        setState({ status: 'error', error: message });
      });
  }, [campaignId]);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  const handleUpdate = async (actionId: number, payload: PatchActionInput) => {
    const updated = await apiClient.updateCampaignAction(campaignId, actionId, payload);
    setState((prev) => {
      if (prev.status !== 'success') return prev;
      return {
        status: 'success',
        data: prev.data.map((a) => (a.id === updated.id ? updated : a)),
      };
    });
  };

  const handleDelete = async (actionId: number) => {
    await apiClient.deleteAction(campaignId, actionId);
    setState((prev) => {
      if (prev.status !== 'success') return prev;
      return {
        status: 'success',
        data: prev.data.filter((a) => a.id !== actionId),
      };
    });
  };

  const handleExecute = async (actionId: number): Promise<ExecuteActionResult> => {
    const result = await apiClient.executeCampaignAction(campaignId, actionId);
    // mark as done locally; backend will also persist
    setState((prev) => {
      if (prev.status !== 'success') return prev;
      return {
        status: 'success',
        data: prev.data.map((a) =>
          a.id === actionId ? { ...a, status: 'done' } : a
        ),
      };
    });
    return result;
  };

  const recommended = useMemo(() => {
    if (state.status !== 'success') return [];
    return state.data
      .filter((a) => a.status !== 'dismissed')
      .sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority] ?? 3;
        const pb = PRIORITY_ORDER[b.priority] ?? 3;
        if (pa !== pb) return pa - pb;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, MAX_RECOMMENDED);
  }, [state]);

  return (
    <section className="card card-recommended">
      <div className="card-header-row">
        <h2>Recommended actions</h2>
      </div>

      {state.status === 'loading' && (
        <p className="status status-loading">Loading recommended actions…</p>
      )}

      {state.status === 'error' && (
        <div className="actions-error-row">
          <p className="status status-error">{state.error}</p>
          <button
            type="button"
            className="button button-ghost button-xs"
            onClick={loadActions}
          >
            Retry
          </button>
        </div>
      )}

      {state.status === 'success' && recommended.length === 0 && (
        <div className="actions-empty">
          <p>
            Run an AI analysis to generate prioritized recommendations for this
            campaign.
          </p>
        </div>
      )}

      {state.status === 'success' && recommended.length > 0 && (
        <ActionList
          actions={recommended}
          onUpdate={handleUpdate}
          onExecute={handleExecute}
          onDelete={handleDelete}
        />
      )}
    </section>
  );
};

