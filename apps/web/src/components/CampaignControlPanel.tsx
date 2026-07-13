import { CampaignSettingsPanel } from './CampaignSettingsPanel';

export interface CampaignControlPanelProps {
  campaignId: number;
  campaignTypeHint: string;
  onSaved?: () => void;
  focusSettingKey?: string | null;
  onFocusSettingConsumed?: () => void;
  /** Hide outer “Control” title (nested under Data & Analysis) */
  compact?: boolean;
}

/**
 * Primary control surface: type-specific settings grouped as Strategy / Audience / Placements / Tracking.
 */
export const CampaignControlPanel = ({
  campaignId,
  campaignTypeHint,
  onSaved,
  focusSettingKey,
  onFocusSettingConsumed,
  compact = false,
}: CampaignControlPanelProps) => {
  return (
    <section
      id="section-settings"
      className={`panel-saas panel-saas--control${compact ? ' panel-saas--control-nested' : ''}`}
      aria-label={compact ? 'Campaign control' : undefined}
      aria-labelledby={compact ? undefined : 'campaign-control-heading'}
    >
      {!compact ? (
        <header className="panel-saas__head">
          <h2 id="campaign-control-heading" className="panel-saas__title">
            Control
          </h2>
        </header>
      ) : null}
      <div className="panel-saas__body panel-saas__body--flush">
        <CampaignSettingsPanel
          campaignId={campaignId}
          campaignTypeHint={campaignTypeHint}
          onSaved={onSaved}
          groupedLayout
          showCanonicalBadge
          focusSettingKey={focusSettingKey}
          onFocusSettingConsumed={onFocusSettingConsumed}
        />
      </div>
    </section>
  );
};
