import type { PlaybookItem } from '../lib/apiClient';
import { playbookCtaLabel } from '../lib/playbookCta';

const MAX_ITEMS = 5;

function shortTitle(s: string, max = 72): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

interface TodayPlaybookProps {
  items: PlaybookItem[];
  executingId: string | null;
  onPrimary: (item: PlaybookItem) => void;
}

export const TodayPlaybook = ({
  items,
  executingId,
  onPrimary,
}: TodayPlaybookProps) => {
  const slice = items.slice(0, MAX_ITEMS);

  if (slice.length === 0) {
    return null;
  }

  return (
    <section className="today-playbook" aria-label="Today">
      <h3 className="today-playbook__heading">Today</h3>
      <ul className="today-playbook__list">
        {slice.map((item) => (
          <li key={item.id} className="today-playbook__row">
            <span className="today-playbook__title" title={item.title}>
              {shortTitle(item.title)}
            </span>
            <button
              type="button"
              className="button button-ghost button-xs today-playbook__btn"
              disabled={executingId === item.id}
              onClick={() => void onPrimary(item)}
            >
              {executingId === item.id ? '…' : playbookCtaLabel(item)}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};
