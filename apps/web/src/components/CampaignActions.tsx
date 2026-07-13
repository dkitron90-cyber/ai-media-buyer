import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  apiClient,
  type ActionPlanItem,
  type CreateActionInput,
  type PatchActionInput,
} from '../lib/apiClient';
import { sortActionsNewestFirst, sortActionsWithHighlightFirst } from '../lib/actionPlanDisplay';
import { ActionList } from './ActionList';
import { ActionForm } from './ActionForm';

interface CampaignActionsProps {
  campaignId: number;
  /** Bump when an AI analysis completes so the full list reloads. */
  refreshTrigger?: number;
  highlightActionIds?: number[];
  /** Flat layout inside Execution tabs (no outer card chrome). */
  embedded?: boolean;
  /** Called after create / update / execute / delete so parent can refresh summaries. */
  onPlanMutate?: () => void;
  /** Hide empty-state copy (action-first UI) */
  compactEmpty?: boolean;
}

type ActionsState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: ActionPlanItem[] };

export const CampaignActions = ({
  campaignId,
  refreshTrigger = 0,
  highlightActionIds,
  embedded = false,
  onPlanMutate,
  compactEmpty = false,
}: CampaignActionsProps) => {
  const [state, setState] = useState<ActionsState>({ status: 'loading' });

  const loadActions = useCallback(() => {
    setState({ status: 'loading' });
    apiClient
      .listCampaignActions(campaignId)
      .then((data) => setState({ status: 'success', data }))
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Failed to load actions.';
        setState({ status: 'error', error: message });
      });
  }, [campaignId]);

  useEffect(() => {
    loadActions();
  }, [loadActions, refreshTrigger]);

  const orderedActions = useMemo(() => {
    if (state.status !== 'success') return [];
    const hi = highlightActionIds ?? [];
    if (hi.length > 0) {
      return sortActionsWithHighlightFirst(state.data, hi);
    }
    return sortActionsNewestFirst(state.data);
  }, [state, highlightActionIds]);

  const handleCreate = async (payload: CreateActionInput) => {
    await apiClient.createCampaignAction(campaignId, payload);
    loadActions();
    onPlanMutate?.();
  };

  const handleUpdate = async (actionId: number, payload: PatchActionInput) => {
    const updated = await apiClient.updateCampaignAction(
      campaignId,
      actionId,
      payload
    );
    setState((prev) => {
      if (prev.status !== 'success') return prev;
      return {
        status: 'success',
        data: prev.data.map((a) => (a.id === updated.id ? updated : a)),
      };
    });
    onPlanMutate?.();
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
    onPlanMutate?.();
  };

  const handleExecute = async (actionId: number) => {
    setState((prev) => {
      if (prev.status !== 'success') return prev;
      return {
        status: 'success',
        data: prev.data.map((a) =>
          a.id === actionId ? { ...a, status: 'done' } : a,
        ),
      };
    });
    try {
      const result = await apiClient.executeCampaignAction(campaignId, actionId);
      loadActions();
      onPlanMutate?.();
      return result;
    } catch (e) {
      loadActions();
      throw e;
    }
  };

  const inner = (
    <>
      {state.status === 'loading' && (
        <div className="actions-skeleton" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="actions-skeleton__card" />
          ))}
        </div>
      )}

      {state.status === 'error' && (
        <div className="actions-error-row">
          <p className="status status-error">{state.error}</p>
          <button className="button button-ghost" onClick={loadActions}>
            Retry
          </button>
        </div>
      )}

      {state.status === 'success' && (
        <>
          <ActionList
            actions={orderedActions}
            highlightActionIds={highlightActionIds}
            onUpdate={handleUpdate}
            onExecute={handleExecute}
            onDelete={handleDelete}
            compactEmpty={compactEmpty}
          />
          <div className="action-form-wrapper">
            <ActionForm onSubmit={handleCreate} />
          </div>
        </>
      )}
    </>
  );

  if (embedded) {
    return (
      <div className="campaign-actions-embedded">{inner}</div>
    );
  }

  return (
    <section className="card">
      <h2>Action Plan</h2>
      {inner}
    </section>
  );
};
