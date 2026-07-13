import type { ActionGenerationSummary } from '../lib/apiClient';

interface AiGenerationFeedbackProps {
  actionGeneration: ActionGenerationSummary;
  analysisId: number | null;
  className?: string;
}

/**
 * Real counts from POST /analyze — no fabricated state.
 */
export const AiGenerationFeedback = ({
  actionGeneration,
  analysisId,
  className = '',
}: AiGenerationFeedbackProps) => {
  const { createdActions, createdPlacements } = actionGeneration;

  return (
    <div className={`ai-generation-feedback ${className}`.trim()}>
      {analysisId != null && (
        <p className="ai-generation-feedback-meta">Analysis #{analysisId}</p>
      )}
      <ul className="ai-generation-feedback-list">
        <li>
          AI generated {createdActions} action{createdActions === 1 ? '' : 's'}
          {createdActions === 0 && (
            <span className="ai-generation-feedback-hint">
              {' '}
              (none new — likely already in your action plan)
            </span>
          )}
        </li>
        {createdPlacements > 0 && (
          <li className="ai-generation-feedback-placements">
            {createdPlacements} placement{createdPlacements === 1 ? '' : 's'} added to
            blacklist
          </li>
        )}
      </ul>
    </div>
  );
};
