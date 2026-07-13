import { CollapsibleSection } from './CollapsibleSection';
import { DataWindowCard } from './DataWindowCard';
import { ReadinessCard } from './ReadinessCard';
import { ReportManager } from './ReportManager';
import { AnalysisHistory } from './AnalysisHistory';
import { CampaignAnalysis } from './CampaignAnalysis';
import { DecisionEnginePanel } from './DecisionEnginePanel';
import { CampaignTypeTemplatePanel } from './CampaignTypeTemplatePanel';
import { CampaignChecklistPanel } from './CampaignChecklistPanel';
import { CampaignGoals } from './CampaignGoals';
import { CampaignNotes } from './CampaignNotes';
import { CampaignControlPanel } from './CampaignControlPanel';
import { CampaignImpactSurface } from './CampaignImpactSurface';
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
  onAnalysisComplete: () => void;
  onOpenClientImport?: () => void;
  onCampaignMetaUpdated?: () => void;
  focusSettingKey?: string | null;
  onFocusSettingConsumed?: () => void;
  moreExpanded?: boolean;
  onMoreExpandedChange?: (expanded: boolean) => void;
  experienceMode?: ExperienceMode;
}

/**
 * Secondary tooling behind one collapsed “Advanced” surface.
 */
export const CampaignDataSection = ({
  campaignId,
  clientId,
  campaignType,
  refreshTrigger,
  onRunAnalysis,
  analyzeGenerationResult,
  onAnalysisComplete,
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
      subtitle="Reports, settings, full diagnosis"
      defaultCollapsed
      collapsed={moreExpanded === undefined ? undefined : !moreExpanded}
      onCollapsedChange={
        onMoreExpandedChange
          ? (collapsed) => onMoreExpandedChange(!collapsed)
          : undefined
      }
      className="data-analysis-collapsible"
    >
      <div className="data-analysis-stack">
        <div className="data-analysis__block">
          <h3 className="data-analysis__h">Campaign control</h3>
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
          <h3 className="data-analysis__h">AI summary</h3>
          <CampaignImpactSurface
            campaignId={campaignId}
            refreshTrigger={refreshTrigger}
            compact
          />
        </div>

        <div className="data-analysis__block">
          <h3 className="data-analysis__h">Your business</h3>
          <AdvisoryContextPanel
            clientId={clientId}
            onSaved={onCampaignMetaUpdated}
          />
        </div>

        <div className="data-analysis__block">
          <h3 className="data-analysis__h">Data timing & coverage</h3>
          <div className="data-trust-grid">
            <DataWindowCard campaignId={campaignId} />
            <ReadinessCard campaignId={campaignId} experienceMode={experienceMode} />
          </div>
        </div>

        <div id="section-reports" className="data-analysis__block">
          <h3 className="data-analysis__h">Reports & uploads</h3>
          <ReportManager
            campaignId={campaignId}
            refreshTrigger={refreshTrigger}
            onOpenClientImport={onOpenClientImport}
          />
        </div>

        <div className="data-analysis__block">
          <h3 className="data-analysis__h">Analysis history</h3>
          <AnalysisHistory
            campaignId={campaignId}
            refreshTrigger={refreshTrigger}
          />
        </div>

        <div id="section-decision-engine" className="data-analysis__block">
          <CollapsibleSection
            title="Decision engine"
            subtitle="AI diagnosis — expand for full detail"
            defaultCollapsed
          >
            <DecisionEnginePanel
              campaignId={campaignId}
              insightRefresh={refreshTrigger}
              onRunAnalysis={onRunAnalysis}
              analyzeGenerationResult={analyzeGenerationResult}
              showTitle={false}
            />
          </CollapsibleSection>
        </div>

        <div id="section-checklist" className="data-analysis__block">
          <h3 className="data-analysis__h">Template & checklist</h3>
          <div className="reference-stack reference-stack--compact">
            <CampaignTypeTemplatePanel campaignId={campaignId} />
            <CampaignChecklistPanel campaignId={campaignId} />
          </div>
        </div>

        <div className="data-analysis__block">
          <h3 className="data-analysis__h">Goals & notes</h3>
          <div className="data-trust-grid">
            <CampaignGoals campaignId={campaignId} />
            <CampaignNotes campaignId={campaignId} />
          </div>
        </div>

        <div className="data-analysis__block">
          <h3 className="data-analysis__h">Raw analysis</h3>
          <CampaignAnalysis
            campaignId={campaignId}
            runCampaignAnalysis={onRunAnalysis}
            onAnalysisComplete={onAnalysisComplete}
            experienceMode={experienceMode}
          />
        </div>
      </div>
    </CollapsibleSection>
  );
};
