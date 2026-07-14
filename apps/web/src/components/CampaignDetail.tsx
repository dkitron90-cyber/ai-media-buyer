import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../lib/apiClient';
import type { AnalyzeCampaignResponse, Campaign } from '../lib/apiClient';
import { CampaignHeader } from './CampaignHeader';
import { ExecutionTabs } from './ExecutionTabs';
import { CampaignDataSection } from './CampaignDataSection';
import { CampaignPlaybookSurface } from './CampaignPlaybookSurface';
import { CampaignImpactSurface } from './CampaignImpactSurface';
import type { ExperienceMode } from '../lib/experienceMode';

interface CampaignDetailProps {
  campaign: Campaign | null;
  clientName: string | null;
  onEditCampaign: (campaign: Campaign) => void;
  onDeleteCampaign: (campaign: Campaign) => void;
  isLoading: boolean;
  /** Refetch campaign / lists after settings or type metadata changes */
  onCampaignMetaUpdated?: () => void;
  /** Open client-scoped report import wizard (toolbar in Reports) */
  onOpenClientImport?: () => void;
  /** Bumped when imports complete so detail panels refresh */
  externalRefreshKey?: number;
  experienceMode?: ExperienceMode;
}

export const CampaignDetail = ({
  campaign,
  clientName,
  onEditCampaign,
  onDeleteCampaign,
  isLoading,
  onCampaignMetaUpdated,
  onOpenClientImport,
  externalRefreshKey = 0,
  experienceMode = 'senior',
}: CampaignDetailProps) => {
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [analyzeGenerationResult, setAnalyzeGenerationResult] =
    useState<AnalyzeCampaignResponse | null>(null);
  const [analyzeRunning, setAnalyzeRunning] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [settingsFocusKey, setSettingsFocusKey] = useState<string | null>(null);
  const [moreExpanded, setMoreExpanded] = useState(false);

  const scrollToSection = useCallback((sectionId: string) => {
    const moreSectionIds = new Set([
      'section-reports',
      'section-settings',
      'section-checklist',
      'section-ai-decision',
      'section-decision-engine',
    ]);
    if (moreSectionIds.has(sectionId)) {
      setMoreExpanded(true);
    }
    window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }, []);

  const handleAnalysisComplete = useCallback(() => {
    setHistoryRefresh((n) => n + 1);
  }, []);

  const handlePlanMutate = useCallback(() => {
    setHistoryRefresh((n) => n + 1);
  }, []);

  useEffect(() => {
    setAnalyzeGenerationResult(null);
    setAnalyzeError(null);
  }, [campaign?.id]);

  useEffect(() => {
    if (externalRefreshKey > 0) {
      setHistoryRefresh((n) => n + 1);
    }
  }, [externalRefreshKey]);

  const handleRunAnalysis = useCallback(async (): Promise<
    AnalyzeCampaignResponse | undefined
  > => {
    if (!campaign) return undefined;
    setAnalyzeRunning(true);
    setAnalyzeError(null);
    try {
      const res = await apiClient.analyzeCampaign(campaign.id);
      setAnalyzeGenerationResult(res);
      handleAnalysisComplete();
      return res;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to run campaign analysis.';
      setAnalyzeError(message);
      return undefined;
    } finally {
      setAnalyzeRunning(false);
    }
  }, [campaign, handleAnalysisComplete]);

  if (!campaign) {
    return (
      <section className="card campaign-detail-empty page-section">
        <h2 className="page-section__title">Campaign</h2>
        {isLoading ? (
          <p className="status status-loading">Loading campaign…</p>
        ) : (
          <p className="status status-loading">
            Select a campaign to view its details.
          </p>
        )}
      </section>
    );
  }

  const highlightActionIds =
    analyzeGenerationResult?.actionGeneration.createdActionIds ?? [];

  return (
    <div className="campaign-detail-layout campaign-detail-layout--saas campaign-detail-layout--action-first campaign-detail-layout--compact">
      <CampaignHeader
        campaign={campaign}
        clientName={clientName}
        onEdit={onEditCampaign}
        onDelete={onDeleteCampaign}
      />

      <CampaignImpactSurface
        campaignId={campaign.id}
        refreshTrigger={historyRefresh}
      />

      <div className="campaign-detail-cards-row">
        <CampaignPlaybookSurface
          campaignId={campaign.id}
          refreshTrigger={historyRefresh}
          onPlanMutate={handlePlanMutate}
          onRunAnalysis={handleRunAnalysis}
          onOpenClientImport={onOpenClientImport}
          onNavigateSettings={(key) => setSettingsFocusKey(key)}
          onNavigateSection={scrollToSection}
          experienceMode={experienceMode}
          compact
        />
        <div className="campaign-detail-cards-row__pane">
          {analyzeError && (
            <p className="status status-error campaign-detail-analyze-error">
              {analyzeError}
            </p>
          )}
          <ExecutionTabs
            campaignId={campaign.id}
            campaignType={campaign.type}
            refreshTrigger={historyRefresh}
            highlightActionIds={highlightActionIds}
            onRunAnalysis={handleRunAnalysis}
            runningAnalysis={analyzeRunning}
            onPlanMutate={handlePlanMutate}
            compact
          />
        </div>
      </div>

      <CampaignDataSection
        campaignId={campaign.id}
        clientId={campaign.clientId}
        campaignType={campaign.type}
        refreshTrigger={historyRefresh}
        onRunAnalysis={handleRunAnalysis}
        analyzeGenerationResult={analyzeGenerationResult}
        onOpenClientImport={onOpenClientImport}
        onCampaignMetaUpdated={onCampaignMetaUpdated}
        focusSettingKey={settingsFocusKey}
        onFocusSettingConsumed={() => setSettingsFocusKey(null)}
        moreExpanded={moreExpanded}
        onMoreExpandedChange={setMoreExpanded}
        experienceMode={experienceMode}
      />
    </div>
  );
};
