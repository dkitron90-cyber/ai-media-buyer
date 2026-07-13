import type { PlacementListEntry, PatchPlacementInput } from '../lib/apiClient';
import { PlacementEntryCard } from './PlacementEntryCard';

interface PlacementListProps {
  entries: PlacementListEntry[];
  onUpdate: (placementId: number, payload: PatchPlacementInput) => Promise<void>;
  selected: Set<number>;
  onToggleSelected: (placementId: number) => void;
  onMove: (entry: PlacementListEntry, targetListType: 'blacklist' | 'whitelist') => Promise<void>;
  onDelete: (placementId: number) => Promise<void>;
}

export const PlacementList = ({
  entries,
  onUpdate,
  selected,
  onToggleSelected,
  onMove,
  onDelete,
}: PlacementListProps) => {
  if (entries.length === 0) {
    return (
      <div className="actions-empty">
        <p>No placement entries match the current filter.</p>
      </div>
    );
  }

  return (
    <div className="placement-list">
      {entries.map((entry) => (
        <PlacementEntryCard
          key={entry.id}
          entry={entry}
          onUpdate={onUpdate}
          isSelected={selected.has(entry.id)}
          onToggleSelected={() => onToggleSelected(entry.id)}
          onMove={onMove}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};
