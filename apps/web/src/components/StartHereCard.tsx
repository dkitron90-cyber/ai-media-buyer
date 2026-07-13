import type { PlaybookItem } from '../lib/apiClient';
import { playbookCtaLabel } from '../lib/playbookCta';
import type { ExperienceMode } from '../lib/experienceMode';
import { isJuniorMode } from '../lib/experienceMode';

interface StartHereCardProps {
  item: PlaybookItem | null;
  loading: boolean;
  error: string | null;
  executingId: string | null;
  onPrimary: (item: PlaybookItem) => void;
  onRetry: () => void;
  experienceMode?: ExperienceMode;
}

export const StartHereCard = ({
  item,
  loading,
  error,
  executingId,
  onPrimary,
  onRetry,
  experienceMode = 'senior',
}: StartHereCardProps) => {
  const junior = isJuniorMode(experienceMode);
  if (loading) {
    return (
      <section className="start-here-card start-here-card--loading" aria-busy>
        <div className="start-here-card__skeleton" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="start-here-card" aria-label="Start here">
        <p className="start-here-card__error">{error}</p>
        <button type="button" className="button button-ghost button-xs" onClick={onRetry}>
          Retry
        </button>
      </section>
    );
  }

  if (!item) {
    return (
      <section className="start-here-card start-here-card--empty" aria-label="Start here">
        <p className="start-here-card__empty">Run analysis to get your top action.</p>
      </section>
    );
  }

  return (
    <section className="start-here-card" aria-label="Start here">
      <p className="start-here-card__kicker">Start here</p>
      <h2 className="start-here-card__title">{item.title}</h2>
      <p className="start-here-card__reason">{item.reason}</p>
      <p className="start-here-card__impact">{item.estimatedImpact}</p>
      {junior && item.blockingReason && (
        <p className="start-here-card__junior-hint experience-junior-hint">
          Why blocked: {item.blockingReason}
        </p>
      )}
      {junior && item.reviewFocus && (
        <p className="start-here-card__junior-hint experience-junior-hint">
          This step opens: {item.reviewFocus.replace(/_/g, ' ')}
        </p>
      )}
      <div className="start-here-card__actions">
        <button
          type="button"
          className="button button-primary start-here-card__cta"
          disabled={executingId === item.id}
          onClick={() => void onPrimary(item)}
        >
          {executingId === item.id ? 'Working…' : playbookCtaLabel(item)}
        </button>
      </div>
    </section>
  );
};
