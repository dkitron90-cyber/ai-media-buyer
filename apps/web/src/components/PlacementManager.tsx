import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  apiClient,
  type PlacementListEntry,
  type CreatePlacementInput,
  type PatchPlacementInput,
} from '../lib/apiClient';
import { PlacementList } from './PlacementList';
import { PlacementForm } from './PlacementForm';

interface PlacementManagerProps {
  campaignId: number;
}

type PlacementsState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: PlacementListEntry[] };

type ListFilter = 'all' | 'blacklist' | 'whitelist';
type StatusFilter = 'all' | 'active' | 'archived';
type SourceFilter = 'all' | 'manual' | 'ai' | 'imported';

const LIST_FILTERS: { value: ListFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'blacklist', label: 'Blacklist' },
  { value: 'whitelist', label: 'Whitelist' },
];

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

const SOURCE_FILTERS: { value: SourceFilter; label: string }[] = [
  { value: 'all', label: 'All sources' },
  { value: 'manual', label: 'Manual' },
  { value: 'ai', label: 'AI' },
  { value: 'imported', label: 'Imported' },
];

export const PlacementManager = ({ campaignId }: PlacementManagerProps) => {
  const [state, setState] = useState<PlacementsState>({ status: 'loading' });
  const [listFilter, setListFilter] = useState<ListFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);

  const loadPlacements = useCallback(() => {
    setState({ status: 'loading' });
    setSelected(new Set());
    setBulkMessage(null);
    apiClient
      .listCampaignPlacements(campaignId)
      .then((data) => setState({ status: 'success', data }))
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Failed to load placements.';
        setState({ status: 'error', error: message });
      });
  }, [campaignId]);

  useEffect(() => {
    loadPlacements();
  }, [loadPlacements]);

  const handleCreate = async (payload: CreatePlacementInput) => {
    await apiClient.createCampaignPlacement(campaignId, payload);
    loadPlacements();
  };

  const handleUpdate = async (placementId: number, payload: PatchPlacementInput) => {
    const updated = await apiClient.updateCampaignPlacement(
      campaignId,
      placementId,
      payload
    );
    setState((prev) => {
      if (prev.status !== 'success') return prev;
      return {
        status: 'success',
        data: prev.data.map((p) => (p.id === updated.id ? updated : p)),
      };
    });
  };

  const moveEntry = useCallback(
    async (entry: PlacementListEntry, targetListType: 'blacklist' | 'whitelist') => {
      if (entry.listType === targetListType) return;

      // Move is implemented as: archive current entry, create a new entry in target list.
      await apiClient.updateCampaignPlacement(campaignId, entry.id, { status: 'archived' });
      await apiClient.createCampaignPlacement(campaignId, {
        listType: targetListType,
        placement: entry.placement,
        displayName: entry.displayName ?? undefined,
        reason: entry.reason ?? undefined,
        source: entry.source,
        analysisId: entry.analysisId ?? undefined,
      });
    },
    [campaignId]
  );

  const filtered = useMemo(() => {
    if (state.status !== 'success') return [];
    return state.data.filter((entry) => {
      if (listFilter !== 'all' && entry.listType !== listFilter) return false;
      if (statusFilter !== 'all' && entry.status !== statusFilter) return false;
      if (sourceFilter !== 'all' && entry.source !== sourceFilter) return false;
      return true;
    });
  }, [state, listFilter, statusFilter, sourceFilter]);

  const counts = useMemo(() => {
    if (state.status !== 'success') return { total: 0, blacklist: 0, whitelist: 0, active: 0, archived: 0 };
    const d = state.data;
    return {
      total: d.length,
      blacklist: d.filter((e) => e.listType === 'blacklist').length,
      whitelist: d.filter((e) => e.listType === 'whitelist').length,
      active: d.filter((e) => e.status === 'active').length,
      archived: d.filter((e) => e.status === 'archived').length,
    };
  }, [state]);

  const selectedCount = selected.size;

  const toggleSelected = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelected(new Set(filtered.map((e) => e.id)));
  };

  const clearSelection = () => setSelected(new Set());

  const selectedEntries = useMemo(() => {
    if (state.status !== 'success') return [];
    const byId = new Map(state.data.map((e) => [e.id, e]));
    return Array.from(selected).map((id) => byId.get(id)).filter(Boolean) as PlacementListEntry[];
  }, [state, selected]);

  const bulkSetStatus = async (status: 'active' | 'archived') => {
    if (selectedEntries.length === 0) return;
    setBulkBusy(true);
    setBulkMessage(null);
    try {
      await Promise.all(
        selectedEntries.map((e) =>
          apiClient.updateCampaignPlacement(campaignId, e.id, { status })
        )
      );
      setBulkMessage(
        `${status === 'archived' ? 'Archived' : 'Unarchived'} ${selectedEntries.length} placement(s).`
      );
      loadPlacements();
    } catch (err: unknown) {
      setBulkMessage(err instanceof Error ? err.message : 'Bulk update failed.');
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkMove = async (target: 'blacklist' | 'whitelist') => {
    if (selectedEntries.length === 0) return;
    setBulkBusy(true);
    setBulkMessage(null);
    let moved = 0;
    try {
      for (const entry of selectedEntries) {
        if (entry.listType === target) continue;
        await moveEntry(entry, target);
        moved += 1;
      }
      setBulkMessage(`Moved ${moved} placement(s) to ${target}.`);
      loadPlacements();
    } catch (err: unknown) {
      setBulkMessage(err instanceof Error ? err.message : 'Bulk move failed.');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleDelete = async (placementId: number) => {
    await apiClient.deletePlacement(campaignId, placementId);
    loadPlacements();
  };

  return (
    <section className="card">
      <h2>Placement Management</h2>

      {state.status === 'loading' && (
        <p className="status status-loading">Loading placements…</p>
      )}

      {state.status === 'error' && (
        <div className="actions-error-row">
          <p className="status status-error">{state.error}</p>
          <button className="button button-ghost" onClick={loadPlacements}>
            Retry
          </button>
        </div>
      )}

      {state.status === 'success' && (
        <>
          <div className="placement-summary">
            <span className="pill pill-muted">{counts.total} total</span>
            <span className="pill pill-error">{counts.blacklist} blacklist</span>
            <span className="pill pill-ok">{counts.whitelist} whitelist</span>
            <span className="pill pill-active">{counts.active} active</span>
            <span className="pill pill-muted">{counts.archived} archived</span>
          </div>

          <div className="placement-filters">
            <div className="placement-filter-group">
              <span className="field-label">List</span>
              <div className="placement-filter-buttons">
                {LIST_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    className={`button button-xs ${listFilter === f.value ? 'button-primary' : 'button-ghost'}`}
                    onClick={() => setListFilter(f.value)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="placement-filter-group">
              <span className="field-label">Status</span>
              <div className="placement-filter-buttons">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    className={`button button-xs ${statusFilter === f.value ? 'button-primary' : 'button-ghost'}`}
                    onClick={() => setStatusFilter(f.value)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="placement-filter-group">
              <span className="field-label">Source</span>
              <div className="placement-filter-buttons">
                {SOURCE_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    className={`button button-xs ${sourceFilter === f.value ? 'button-primary' : 'button-ghost'}`}
                    onClick={() => setSourceFilter(f.value)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="placement-bulk-toolbar">
            <div className="placement-bulk-left">
              <span className="pill pill-muted">
                {selectedCount} selected
              </span>
              <button
                className="button button-ghost button-xs"
                onClick={selectAllFiltered}
                disabled={filtered.length === 0 || bulkBusy}
              >
                Select filtered
              </button>
              <button
                className="button button-ghost button-xs"
                onClick={clearSelection}
                disabled={selectedCount === 0 || bulkBusy}
              >
                Clear
              </button>
            </div>
            <div className="placement-bulk-actions">
              <button
                className="button button-ghost button-xs"
                onClick={() => bulkSetStatus('archived')}
                disabled={selectedCount === 0 || bulkBusy}
              >
                {bulkBusy ? 'Working…' : 'Archive selected'}
              </button>
              <button
                className="button button-secondary button-xs"
                onClick={() => bulkSetStatus('active')}
                disabled={selectedCount === 0 || bulkBusy}
              >
                Unarchive selected
              </button>
              <button
                className="button button-ghost button-xs"
                onClick={() => bulkMove('blacklist')}
                disabled={selectedCount === 0 || bulkBusy}
              >
                Move to blacklist
              </button>
              <button
                className="button button-ghost button-xs"
                onClick={() => bulkMove('whitelist')}
                disabled={selectedCount === 0 || bulkBusy}
              >
                Move to whitelist
              </button>
            </div>
          </div>

          {bulkMessage && (
            <div className="placement-bulk-message">
              <p className="status status-loading">{bulkMessage}</p>
            </div>
          )}

          <PlacementList
            entries={filtered}
            onUpdate={handleUpdate}
            selected={selected}
            onToggleSelected={toggleSelected}
            onMove={moveEntry}
            onDelete={handleDelete}
          />

          <div className="action-form-wrapper">
            <PlacementForm onSubmit={handleCreate} />
          </div>
        </>
      )}
    </section>
  );
};
