import { useState } from 'react';
import type { PlacementListEntry, PatchPlacementInput } from '../lib/apiClient';

interface PlacementEntryCardProps {
  entry: PlacementListEntry;
  onUpdate: (placementId: number, payload: PatchPlacementInput) => Promise<void>;
  isSelected: boolean;
  onToggleSelected: () => void;
  onMove: (entry: PlacementListEntry, targetListType: 'blacklist' | 'whitelist') => Promise<void>;
  onDelete: (placementId: number) => Promise<void>;
}

const LIST_TYPE_PILL: Record<string, string> = {
  blacklist: 'pill pill-error',
  whitelist: 'pill pill-ok',
};

const STATUS_PILL: Record<string, string> = {
  active: 'pill pill-active',
  archived: 'pill pill-muted',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export const PlacementEntryCard = ({
  entry,
  onUpdate,
  isSelected,
  onToggleSelected,
  onMove,
  onDelete,
}: PlacementEntryCardProps) => {
  const [updating, setUpdating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(entry.displayName ?? '');
  const [editReason, setEditReason] = useState(entry.reason ?? '');
  const [moving, setMoving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isArchived = entry.status === 'archived';
  const isAiSource = entry.source === 'ai' || entry.analysisId != null;

  const handleToggleArchive = async () => {
    setUpdating(true);
    try {
      await onUpdate(entry.id, { status: isArchived ? 'active' : 'archived' });
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveEdit = async () => {
    setUpdating(true);
    try {
      await onUpdate(entry.id, {
        displayName: editDisplayName.trim() || undefined,
        reason: editReason.trim() || undefined,
      });
      setEditing(false);
    } finally {
      setUpdating(false);
    }
  };

  const handleMove = async () => {
    const target = entry.listType === 'blacklist' ? 'whitelist' : 'blacklist';
    setMoving(true);
    try {
      await onMove(entry, target);
    } finally {
      setMoving(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    // simple two-step confirmation: first click toggles deleting state, second confirms
    if (!deleting) {
      setDeleting(true);
      return;
    }
  };

  const cardClass = `placement-card${isArchived ? ' placement-card-archived' : ''}`;

  return (
    <div className={cardClass}>
      <div className="placement-card-header">
        <div className="placement-card-title-row">
          <label className="placement-select">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelected}
            />
          </label>
          <span className="placement-card-url" title={entry.placement}>
            {entry.placement}
          </span>
        </div>
        <div className="placement-card-badges">
          {isAiSource && (
            <span className="pill pill-ai-source">From AI</span>
          )}
          <span className="pill pill-muted">{entry.source}</span>
          {entry.analysisId != null && (
            <span className="pill pill-muted">analysis #{entry.analysisId}</span>
          )}
          <span className={LIST_TYPE_PILL[entry.listType] ?? 'pill pill-muted'}>
            {entry.listType}
          </span>
          <span className={STATUS_PILL[entry.status] ?? 'pill pill-muted'}>
            {entry.status}
          </span>
        </div>
      </div>

      {entry.displayName && !editing && (
        <p className="placement-card-display-name">{entry.displayName}</p>
      )}

      {entry.reason && !editing && (
        <p className="placement-card-reason">{entry.reason}</p>
      )}

      {editing && (
        <div className="placement-edit-fields">
          <div className="field">
            <label className="field-label">Display Name</label>
            <input
              value={editDisplayName}
              onChange={(e) => setEditDisplayName(e.target.value)}
              placeholder="Optional display name"
            />
          </div>
          <div className="field">
            <label className="field-label">Reason</label>
            <input
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder="Optional reason"
            />
          </div>
        </div>
      )}

      <div className="placement-card-footer">
        <span className="placement-card-meta">
          <span>Added {formatDate(entry.createdAt)}</span>
        </span>
        <div className="placement-card-actions">
          {editing ? (
            <>
              <button
                className="button button-primary button-xs"
                disabled={updating}
                onClick={handleSaveEdit}
              >
                {updating ? 'Saving…' : 'Save'}
              </button>
              <button
                className="button button-ghost button-xs"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                className="button button-ghost button-xs"
                disabled={moving || updating}
                onClick={handleMove}
                title="Move by archiving and creating in the other list"
              >
                {moving ? 'Moving…' : `Move to ${entry.listType === 'blacklist' ? 'whitelist' : 'blacklist'}`}
              </button>
              <button
                className="button button-ghost button-xs"
                onClick={() => {
                  setEditDisplayName(entry.displayName ?? '');
                  setEditReason(entry.reason ?? '');
                  setEditing(true);
                }}
              >
                Edit
              </button>
              <button
                className={`button button-xs ${isArchived ? 'button-secondary' : 'button-ghost'}`}
                disabled={updating || moving}
                onClick={handleToggleArchive}
              >
                {updating ? '…' : isArchived ? 'Unarchive' : 'Archive'}
              </button>
              {!deleting && (
                <button
                  className="button button-danger button-xs"
                  disabled={updating || moving}
                  onClick={() => setDeleting(true)}
                >
                  Delete
                </button>
              )}
              {deleting && (
                <>
                  <button
                    className="button button-danger button-xs"
                    disabled={updating || moving}
                    onClick={async () => {
                      setUpdating(true);
                      try {
                        await onDelete(entry.id);
                      } finally {
                        setUpdating(false);
                        setDeleting(false);
                      }
                    }}
                  >
                    Confirm delete
                  </button>
                  <button
                    className="button button-ghost button-xs"
                    disabled={updating || moving}
                    onClick={() => setDeleting(false)}
                  >
                    Cancel
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
