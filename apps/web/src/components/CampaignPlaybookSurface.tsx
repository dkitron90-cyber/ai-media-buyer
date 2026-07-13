import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../lib/apiClient';
import type { CampaignPlaybook, PlaybookItem } from '../lib/apiClient';
import { StartHereCard } from './StartHereCard';
import { TodayPlaybook } from './TodayPlaybook';
import { CollapsibleSection } from './CollapsibleSection';

function scrollToId(id: string, onNavigateSection?: (sectionId: string) => void) {
  if (onNavigateSection) {
    onNavigateSection(id);
    return;
  }
  document.getElementById(id)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

import type { ExperienceMode } from '../lib/experienceMode';
import { isJuniorMode } from '../lib/experienceMode';

interface CampaignPlaybookSurfaceProps {
  campaignId: number;
  refreshTrigger?: number;
  onPlanMutate?: () => void;
  onRunAnalysis?: () => Promise<unknown>;
  onOpenClientImport?: () => void;
  onNavigateSettings?: (settingKey: string | null) => void;
  onNavigateSection?: (sectionId: string) => void;
  experienceMode?: ExperienceMode;
  /** Narrow layout: hide “today” list behind a collapsed section */
  compact?: boolean;
}

export const CampaignPlaybookSurface = ({
  campaignId,
  refreshTrigger = 0,
  onPlanMutate,
  onRunAnalysis,
  onOpenClientImport,
  onNavigateSettings,
  onNavigateSection,
  experienceMode = 'senior',
  compact = false,
}: CampaignPlaybookSurfaceProps) => {
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; data: CampaignPlaybook }
  >({ status: 'loading' });
  const [executingId, setExecutingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setState({ status: 'loading' });
    apiClient
      .getCampaignPlaybook(campaignId)
      .then((data) => setState({ status: 'ready', data }))
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Failed to load playbook.';
        setState({ status: 'error', message });
      });
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load, refreshTrigger]);

  const handlePrimary = async (item: PlaybookItem) => {
    if (
      item.type === 'execute_action' &&
      item.isExecutable &&
      item.actionId != null
    ) {
      setExecutingId(item.id);
      try {
        await apiClient.executeCampaignAction(campaignId, item.actionId);
        onPlanMutate?.();
        load();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to execute action.';
        setState({ status: 'error', message });
      } finally {
        setExecutingId(null);
      }
      return;
    }

    if (item.type === 'upload_report') {
      scrollToId('section-reports', onNavigateSection);
      onOpenClientImport?.();
      return;
    }

    if (item.type === 'fix_setting') {
      scrollToId('section-settings', onNavigateSection);
      onNavigateSettings?.(item.settingKey);
      return;
    }

    const focus = item.reviewFocus ?? 'impact';
    switch (focus) {
      case 'execution':
        scrollToId('section-execution', onNavigateSection);
        break;
      case 'reports':
        scrollToId('section-reports', onNavigateSection);
        onOpenClientImport?.();
        break;
      case 'checklist':
        scrollToId('section-checklist', onNavigateSection);
        break;
      case 'impact':
        scrollToId('section-ai-decision', onNavigateSection);
        break;
      case 'analysis':
        await onRunAnalysis?.();
        scrollToId('section-execution', onNavigateSection);
        break;
      case 'settings':
        scrollToId('section-settings', onNavigateSection);
        onNavigateSettings?.(item.settingKey);
        break;
      default:
        scrollToId('section-ai-decision', onNavigateSection);
    }
  };

  const loading = state.status === 'loading';
  const error =
    state.status === 'error' ? state.message : null;
  const data = state.status === 'ready' ? state.data : null;

  const hasMoreSteps = data != null && data.today.length > 0;

  const playbookToday =
    data != null ? (
      <TodayPlaybook
        items={data.today}
        executingId={executingId}
        onPrimary={handlePrimary}
      />
    ) : null;

  return (
    <div
      className={`campaign-playbook-surface${compact ? ' campaign-playbook-surface--compact' : ''}`}
    >
      <StartHereCard
        item={data?.startHere ?? null}
        loading={loading}
        error={error}
        executingId={executingId}
        onPrimary={handlePrimary}
        onRetry={load}
        experienceMode={experienceMode}
      />
      {compact
        ? hasMoreSteps && (
            <CollapsibleSection
              title="More steps"
              subtitle="Extra playbook items"
              defaultCollapsed
            >
              {playbookToday}
            </CollapsibleSection>
          )
        : playbookToday}
    </div>
  );
};
