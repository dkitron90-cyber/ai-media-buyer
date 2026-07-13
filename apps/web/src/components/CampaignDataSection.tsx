import { CollapsibleSection } from './CollapsibleSection';
import { DataWindowCard } from './DataWindowCard';
import { ReadinessCard } from './ReadinessCard';
import { ReportManager } from './ReportManager';
import { AnalysisHistory } from './AnalysisHistory';
import { DecisionEnginePanel } from './DecisionEnginePanel';
import { CampaignTypeTemplatePanel } from './CampaignTypeTemplatePanel';
import { CampaignChecklistPanel } from './CampaignChecklistPanel';
import { CampaignGoals } from './CampaignGoals';
import { CampaignNotes } from './CampaignNotes';
import { CampaignControlPanel } from './CampaignControlPanel';
import { AdvisoryContextPanel } from './AdvisoryContextPanel';
import type { AnalyzeCampaignResponse } from '../lib/apiClient';
import type { ExperienceMode } from '../lib/experienceMode';

export interface CampaignDataSectionProps {
  campaignId: number;
  clientId: number;
  campaignType: string;
  refreshTrigger: number;
  onRunAnalysis: () => Promise<AnalyzeCampaignResponse | undefined>;
  analyzeGenerationResult: AnalyzeCampaignResponse | null;
  onOpenClientImport?: () => void;
  onCampaignMetaUpdated?: () => void;
  focusSettingKey?: string | null;
  onFocusSettingConsumed?: () => void;
  moreExpanded?: boolean;
  onMoreExpandedChange?: (expanded: boolean) => void;
  experienceMode?: ExperienceMode;
}

/**
 * Secondary tooling — collapsed by default. Primary workflow stays in playbook + execution.
 */
export const CampaignDataSection = ({
  campaignId,
  clientId,
  campaignType,
  refreshTrigger,
  onRunAnalysis,
  analyzeGenerationResult,
  onOpenClientImport,
  onCampaignMetaUpdated,
  focusSettingKey,
  onFocusSettingConsumed,
  moreExpanded,
  onMoreExpandedChange,
  experienceMode = 'senior',
}: CampaignDataSectionProps) => {
  return (
    <CollapsibleSection
      title="More"
      subtitle="Reports, settings, diagnostics"
      defaultCollapsed
      collapsed={moreExpanded === undefined ? undefined : !moreExpanded}
      onCollapsedChange={
        onMoreExpandedChange
          ? (collapsed) => onMoreExpandedChange(!collapsed)
          : undefined
      }
      className="data-analysis-collapsible"
    >
      <div className="data-analysis-stack data-analysis-stack--quiet">
        <div id="section-reports" className="data-analysis__block">
          <ReportManager
            campaignId={campaignId}
            refreshTrigger={refreshTrigger}
            onOpenClientImport={onOpenClientImport}
          />
        </div>

        <CollapsibleSection
          title="Setup"
          subtitle="Settings, business context, goals"
          defaultCollapsed
        >
          <div className="data-analysis__block" id="section-settings">
            <CampaignControlPanel
              campaignId={campaignId}
              campaignTypeHint={campaignType}
              onSaved={onCampaignMetaUpdated}
              focusSettingKey={focusSettingKey}
              onFocusSettingConsumed={onFocusSettingConsumed}
              compact
            />
          </div>
          <div className="data-analysis__block">
            <AdvisoryContextPanel
              clientId={clientId}
              onSaved={onCampaignMetaUpdated}
            />
          </div>
          <div className="data-trust-grid">
            <CampaignGoals campaignId={campaignId} />
            <CampaignNotes campaignId={campaignId} />
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Diagnostics"
          subtitle="Data health, AI history"
          defaultCollapsed
        >
          <div className="data-trust-grid">
            <ReadinessCard
              campaignId={campaignId}
              experienceMode={experienceMode}
              compact
            />
            <DataWindowCard campaignId={campaignId} compact />
          </div>
          <div id="section-decision-engine" className="data-analysis__block">
            <DecisionEnginePanel
              campaignId={campaignId}
              insightRefresh={refreshTrigger}
              onRunAnalysis={onRunAnalysis}
              analyzeGenerationResult={analyzeGenerationResult}
              showTitle={false}
            />
          </div>
          <div className="data-analysis__block">
            <AnalysisHistory
              campaignId={campaignId}
              refreshTrigger={refreshTrigger}
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Playbook reference"
          subtitle="Type guide and launch checklist"
          defaultCollapsed
        >
          <div id="section-checklist" className="reference-stack reference-stack--compact">
            <CampaignTypeTemplatePanel campaignId={campaignId} summaryOnly />
            <CampaignChecklistPanel campaignId={campaignId} compact />
          </div>
        </CollapsibleSection>
      </div>
    </CollapsibleSection>
  );
};
