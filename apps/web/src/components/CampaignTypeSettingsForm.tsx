import type { ReactNode } from 'react';
import type { CampaignCanonicalTypeCode } from '../lib/apiClient';

/** Align with backend aliases so free-text campaign.type still maps to form fields. */
export const resolveTypeCodeForSettingsForm = (raw: string): string => {
  const t = raw.trim().toUpperCase().replace(/\s+/g, '_');
  if (t === 'PMAX' || t === 'PERFORMANCEMAX') return 'PERFORMANCE_MAX';
  if (t === 'YOUTUBE' || t === 'VIDEO_ACTION') return 'VIDEO';
  if (t === 'DISCOVERY' || t === 'DEMANDGEN') return 'DEMAND_GEN';
  if (t === 'UNIVERSAL_APP' || t === 'APP_CAMPAIGN') return 'APP';
  if (t === 'SHOPPING_ADS') return 'SHOPPING';
  if (t === 'UNKNOWN') return 'OTHER';
  return t;
};

const isCanonical = (t: string): t is CampaignCanonicalTypeCode =>
  [
    'SEARCH',
    'DISPLAY',
    'PERFORMANCE_MAX',
    'VIDEO',
    'SHOPPING',
    'APP',
    'DEMAND_GEN',
    'OTHER',
  ].includes(t);

// --- Option sets (values stored as strings in API) ---

export const SEARCH_BIDDING = [
  { value: '', label: 'Select…' },
  { value: 'Target CPA', label: 'Target CPA' },
  { value: 'Maximize Conversions', label: 'Maximize Conversions' },
  { value: 'Target ROAS', label: 'Target ROAS' },
  { value: 'Maximize Clicks', label: 'Maximize Clicks' },
  { value: 'Manual CPC', label: 'Manual CPC' },
] as const;

export const SEARCH_BRAND = [
  { value: '', label: 'Select…' },
  { value: 'Brand', label: 'Brand' },
  { value: 'Non-brand', label: 'Non-brand' },
  { value: 'Mixed', label: 'Mixed' },
] as const;

export const SEARCH_NETWORK = [
  { value: '', label: 'Select…' },
  { value: 'Google Search only', label: 'Google Search only' },
  { value: 'Search + partners', label: 'Search + partners' },
] as const;

export const DISPLAY_AUDIENCE_MODE = [
  { value: '', label: 'Select…' },
  { value: 'Broad / none', label: 'Broad / none' },
  { value: 'Observation', label: 'Observation' },
  { value: 'Targeting', label: 'Targeting' },
] as const;

export const DISPLAY_AUDIENCE_SOURCE = [
  { value: '', label: 'Select…' },
  { value: 'Data segments', label: 'Data segments' },
  { value: 'In-market', label: 'In-market' },
  { value: 'Custom segments', label: 'Custom segments' },
  { value: 'None', label: 'None' },
] as const;

export const DISPLAY_PLACEMENT_POLICY = [
  { value: '', label: 'Select…' },
  { value: 'Open', label: 'Open' },
  { value: 'Exclusions only', label: 'Exclusions only' },
  { value: 'Whitelist-first', label: 'Whitelist-first' },
] as const;

export const PMAX_GOAL = [
  { value: '', label: 'Select…' },
  { value: 'Leads', label: 'Leads' },
  { value: 'Sales', label: 'Sales' },
  { value: 'ROAS', label: 'ROAS' },
] as const;

export const VIDEO_OBJECTIVE = [
  { value: '', label: 'Select…' },
  { value: 'Awareness', label: 'Awareness' },
  { value: 'Consideration', label: 'Consideration' },
  { value: 'Action / conversions', label: 'Action / conversions' },
] as const;

export const SHOPPING_FEED = [
  { value: '', label: 'Select…' },
  { value: 'Healthy', label: 'Healthy' },
  { value: 'Has errors', label: 'Has errors' },
  { value: 'Unknown', label: 'Unknown' },
] as const;

export const SHOPPING_SEGMENTATION = [
  { value: '', label: 'Select…' },
  { value: 'Priority labels', label: 'Priority labels' },
  { value: 'Custom labels', label: 'Custom labels' },
  { value: 'Listing groups', label: 'Listing groups' },
  { value: 'Single group', label: 'Single group' },
] as const;

export const APP_PLATFORM = [
  { value: '', label: 'Select…' },
  { value: 'iOS', label: 'iOS' },
  { value: 'Android', label: 'Android' },
  { value: 'Both', label: 'Both' },
] as const;

export const APP_INSTALL_GOAL = [
  { value: '', label: 'Select…' },
  { value: 'Installs', label: 'Installs' },
  { value: 'In-app actions', label: 'In-app actions' },
] as const;

export const DEMAND_CREATIVE = [
  { value: '', label: 'Select…' },
  { value: 'Minimal', label: 'Minimal' },
  { value: 'Adequate', label: 'Adequate' },
  { value: 'Strong', label: 'Strong' },
] as const;

export const DEMAND_LANDING = [
  { value: '', label: 'Select…' },
  { value: 'Lead form', label: 'Lead form' },
  { value: 'Website / purchase', label: 'Website / purchase' },
  { value: 'Mixed', label: 'Mixed' },
] as const;

export const DEMAND_AUDIENCE = [
  { value: '', label: 'Select…' },
  { value: 'Customer Match', label: 'Customer Match' },
  { value: 'Custom intent / segments', label: 'Custom intent / segments' },
  { value: 'Lookalike / similar', label: 'Lookalike / similar' },
  { value: 'Broad', label: 'Broad' },
] as const;

type SelectOpt = { value: string; label: string };

const str = (v: unknown): string =>
  v === null || v === undefined ? '' : String(v);

const setDraft = (
  value: Record<string, unknown>,
  onChange: (n: Record<string, unknown>) => void,
  key: string,
  next: unknown
) => {
  onChange({ ...value, [key]: next });
};

const FieldShell = ({
  label,
  hint,
  children,
  settingKey,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  /** For autopilot playbook: scroll + highlight */
  settingKey?: string;
}) => (
  <div
    className="settings-form-field"
    data-setting-key={settingKey ?? undefined}
  >
    <div className="settings-form-field__head">
      <span className="settings-form-field__label">{label}</span>
      {hint ? <span className="settings-form-field__hint">{hint}</span> : null}
    </div>
    {children}
  </div>
);

const SelectField = ({
  id,
  label,
  hint,
  options,
  value,
  disabled,
  onChange,
  settingKey,
}: {
  id: string;
  label: string;
  hint?: string;
  options: readonly SelectOpt[];
  value: string;
  disabled?: boolean;
  onChange: (v: string) => void;
  settingKey?: string;
}) => (
  <FieldShell label={label} hint={hint} settingKey={settingKey}>
    <select
      id={id}
      className="settings-form-select"
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value || '__empty'} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </FieldShell>
);

const NumberField = ({
  id,
  label,
  hint,
  value,
  disabled,
  onChange,
  min,
  step,
  placeholder,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  disabled?: boolean;
  onChange: (v: string) => void;
  min?: number;
  step?: string;
  placeholder?: string;
}) => (
  <FieldShell label={label} hint={hint}>
    <input
      id={id}
      type="number"
      className="settings-form-input"
      disabled={disabled}
      min={min}
      step={step}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </FieldShell>
);

const ToggleField = ({
  id,
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) => (
  <label className="settings-form-toggle" htmlFor={id}>
    <input
      id={id}
      type="checkbox"
      disabled={disabled}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span className="settings-form-toggle__text">
      <span className="settings-form-field__label">{label}</span>
      {hint ? <span className="settings-form-field__hint">{hint}</span> : null}
    </span>
  </label>
);

export interface CampaignTypeSettingsFormProps {
  campaignType: string;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  disabled?: boolean;
  idPrefix?: string;
  /** When true, fields are grouped into Strategy / Audience / Placements / Tracking for control panels. */
  groupedLayout?: boolean;
}

function SearchForm({
  value,
  onChange,
  disabled,
  idPrefix,
  groupedLayout,
}: Omit<CampaignTypeSettingsFormProps, 'campaignType'>) {
  const bidding = str(value.biddingStrategy);
  const showCpa = bidding === 'Target CPA';
  const showRoas = bidding === 'Target ROAS';

  const strategyGrid = (
    <>
      <SelectField
        id={`${idPrefix}-bidding`}
        label="How should Google spend your budget?"
        options={SEARCH_BIDDING}
        value={bidding}
        disabled={disabled}
        onChange={(v) => onChange({ ...value, biddingStrategy: v })}
        settingKey="biddingStrategy"
      />
      {showCpa ? (
        <NumberField
          id={`${idPrefix}-targetCpa`}
          label="Target CPA"
          hint="Account currency. Leave empty if not set in Google Ads."
          value={str(value.targetCpa)}
          disabled={disabled}
          min={0}
          step="any"
          placeholder="e.g. 25"
          onChange={(t) => {
            if (t === '') setDraft(value, onChange, 'targetCpa', '');
            else {
              const n = Number(t);
              setDraft(value, onChange, 'targetCpa', Number.isNaN(n) ? t : n);
            }
          }}
        />
      ) : null}
      {showRoas ? (
        <NumberField
          id={`${idPrefix}-targetRoas`}
          label="Target ROAS"
          hint="e.g. 4.5 means 4.5x return"
          value={str(value.targetRoas)}
          disabled={disabled}
          min={0}
          step="any"
          placeholder="e.g. 4.5"
          onChange={(t) => {
            if (t === '') setDraft(value, onChange, 'targetRoas', '');
            else {
              const n = Number(t);
              setDraft(value, onChange, 'targetRoas', Number.isNaN(n) ? t : n);
            }
          }}
        />
      ) : null}
      <FieldShell
        label="Match types"
        hint="How you structure exact / phrase / broad"
        settingKey="matchTypeStrategy"
      >
        <select
          id={`${idPrefix}-match`}
          className="settings-form-select"
          disabled={disabled}
          value={str(value.matchTypeStrategy)}
          onChange={(e) =>
            onChange({ ...value, matchTypeStrategy: e.target.value })
          }
        >
          <option value="">Select…</option>
          <option value="Exact-heavy">Exact-heavy</option>
          <option value="Phrase + exact">Phrase + exact</option>
          <option value="Broad expansion">Broad expansion</option>
          <option value="Mixed by ad group">Mixed by ad group</option>
        </select>
      </FieldShell>
    </>
  );

  if (groupedLayout) {
    return (
      <div className="control-panel-groups">
        <fieldset className="control-panel__fieldset">
          <legend className="control-panel__legend">Bidding & budget</legend>
          <div className="settings-form-grid">{strategyGrid}</div>
        </fieldset>
        <fieldset className="control-panel__fieldset">
          <legend className="control-panel__legend">Who you reach</legend>
          <div className="settings-form-grid">
            <SelectField
              id={`${idPrefix}-brand`}
              label="Brand or generic searches?"
              options={SEARCH_BRAND}
              value={str(value.brandVsNonBrand)}
              disabled={disabled}
              onChange={(v) => onChange({ ...value, brandVsNonBrand: v })}
            />
          </div>
        </fieldset>
        <fieldset className="control-panel__fieldset">
          <legend className="control-panel__legend">Where ads show</legend>
          <div className="settings-form-grid">
            <SelectField
              id={`${idPrefix}-network`}
              label="Where on Google Search?"
              options={SEARCH_NETWORK}
              value={str(value.networkTargeting)}
              disabled={disabled}
              onChange={(v) => onChange({ ...value, networkTargeting: v })}
            />
          </div>
        </fieldset>
        <fieldset className="control-panel__fieldset">
          <legend className="control-panel__legend">Tracking</legend>
          <p className="control-panel__empty">Set in Google Ads (conversions, tags).</p>
        </fieldset>
      </div>
    );
  }

  return (
    <div className="settings-form-grid">
      {strategyGrid}
      <SelectField
        id={`${idPrefix}-brand`}
        label="Brand vs non-brand"
        options={SEARCH_BRAND}
        value={str(value.brandVsNonBrand)}
        disabled={disabled}
        onChange={(v) => onChange({ ...value, brandVsNonBrand: v })}
      />
      <SelectField
        id={`${idPrefix}-network`}
        label="Search network"
        options={SEARCH_NETWORK}
        value={str(value.networkTargeting)}
        disabled={disabled}
        onChange={(v) => onChange({ ...value, networkTargeting: v })}
      />
    </div>
  );
}

function DisplayForm({
  value,
  onChange,
  disabled,
  idPrefix,
  groupedLayout,
}: Omit<CampaignTypeSettingsFormProps, 'campaignType'>) {
  const mode = str(value.audienceMode) || str(value.audienceStrategy);
  const placement = str(value.placementPolicy) || str(value.placementStrategy);

  const audienceBlock = (
    <>
      <SelectField
        id={`${idPrefix}-audienceMode`}
        label="How do you target people?"
        options={DISPLAY_AUDIENCE_MODE}
        value={mode}
        disabled={disabled}
        onChange={(v) =>
          onChange({ ...value, audienceMode: v, audienceStrategy: v })
        }
      />
      <SelectField
        id={`${idPrefix}-audienceSource`}
        label="Primary audience source"
        options={DISPLAY_AUDIENCE_SOURCE}
        value={str(value.audienceSource)}
        disabled={disabled}
        onChange={(v) => onChange({ ...value, audienceSource: v })}
      />
    </>
  );

  const placementBlock = (
    <>
      <SelectField
        id={`${idPrefix}-placementPolicy`}
        label="Placement policy"
        options={DISPLAY_PLACEMENT_POLICY}
        value={placement}
        disabled={disabled}
        onChange={(v) =>
          onChange({ ...value, placementPolicy: v, placementStrategy: v })
        }
      />
      <ToggleField
        id={`${idPrefix}-demoEx`}
        label="Demographic exclusions"
        hint="Age/gender/household exclusions"
        checked={value.demographicExclusions === true}
        disabled={disabled}
        onChange={(v) => onChange({ ...value, demographicExclusions: v })}
      />
    </>
  );

  if (groupedLayout) {
    return (
      <div className="control-panel-groups">
        <fieldset className="control-panel__fieldset">
          <legend className="control-panel__legend">Strategy</legend>
          <p className="control-panel__empty">Display uses audience & placement controls below.</p>
        </fieldset>
        <fieldset className="control-panel__fieldset">
          <legend className="control-panel__legend">Audience</legend>
          <div className="settings-form-grid">{audienceBlock}</div>
        </fieldset>
        <fieldset className="control-panel__fieldset">
          <legend className="control-panel__legend">Placements</legend>
          <div className="settings-form-grid">{placementBlock}</div>
        </fieldset>
        <fieldset className="control-panel__fieldset">
          <legend className="control-panel__legend">Tracking</legend>
          <p className="control-panel__empty">Tag & conversion setup in Google Ads.</p>
        </fieldset>
      </div>
    );
  }

  return (
    <div className="settings-form-grid">
      {audienceBlock}
      {placementBlock}
    </div>
  );
}

function PmaxForm({
  value,
  onChange,
  disabled,
  idPrefix,
  groupedLayout,
}: Omit<CampaignTypeSettingsFormProps, 'campaignType'>) {
  const v = value.assetGroupCount;
  const countStr =
    v === undefined || v === null
      ? ''
      : typeof v === 'number'
        ? String(v)
        : String(v);

  const agCountField = (
    <NumberField
      id={`${idPrefix}-agc`}
      label="Asset group count"
      value={countStr}
      disabled={disabled}
      min={0}
      step="1"
      placeholder="e.g. 2"
      onChange={(t) => {
        if (t === '') setDraft(value, onChange, 'assetGroupCount', '');
        else {
          const n = parseInt(t, 10);
          setDraft(value, onChange, 'assetGroupCount', Number.isNaN(n) ? t : n);
        }
      }}
    />
  );

  if (groupedLayout) {
    return (
      <div className="control-panel-groups">
        <fieldset className="control-panel__fieldset">
          <legend className="control-panel__legend">Strategy</legend>
          <div className="settings-form-grid">
            <SelectField
              id={`${idPrefix}-goal`}
              label="Campaign goal"
              options={PMAX_GOAL}
              value={str(value.targetGoalType)}
              disabled={disabled}
              onChange={(x) => onChange({ ...value, targetGoalType: x })}
            />
          </div>
        </fieldset>
        <fieldset className="control-panel__fieldset">
          <legend className="control-panel__legend">Audience</legend>
          <div className="settings-form-grid">
            <ToggleField
              id={`${idPrefix}-signals`}
              label="Audience signals added"
              checked={value.audienceSignalsPresent === true}
              disabled={disabled}
              onChange={(x) => onChange({ ...value, audienceSignalsPresent: x })}
            />
          </div>
        </fieldset>
        <fieldset className="control-panel__fieldset">
          <legend className="control-panel__legend">Placements</legend>
          <div className="settings-form-grid">{agCountField}</div>
        </fieldset>
        <fieldset className="control-panel__fieldset">
          <legend className="control-panel__legend">Tracking</legend>
          <div className="settings-form-grid">
            <ToggleField
              id={`${idPrefix}-feed`}
              label="Merchant / product feed attached"
              checked={value.feedAttached === true}
              disabled={disabled}
              onChange={(x) => onChange({ ...value, feedAttached: x })}
            />
          </div>
        </fieldset>
      </div>
    );
  }

  return (
    <div className="settings-form-grid">
      <SelectField
        id={`${idPrefix}-goal`}
        label="Campaign goal"
        options={PMAX_GOAL}
        value={str(value.targetGoalType)}
        disabled={disabled}
        onChange={(x) => onChange({ ...value, targetGoalType: x })}
      />
      <ToggleField
        id={`${idPrefix}-signals`}
        label="Audience signals added"
        checked={value.audienceSignalsPresent === true}
        disabled={disabled}
        onChange={(x) => onChange({ ...value, audienceSignalsPresent: x })}
      />
      {agCountField}
      <ToggleField
        id={`${idPrefix}-feed`}
        label="Merchant / product feed attached"
        checked={value.feedAttached === true}
        disabled={disabled}
        onChange={(x) => onChange({ ...value, feedAttached: x })}
      />
    </div>
  );
}

function VideoForm({
  value,
  onChange,
  disabled,
  idPrefix,
  groupedLayout,
}: Omit<CampaignTypeSettingsFormProps, 'campaignType'>) {
  if (groupedLayout) {
    return (
      <div className="control-panel-groups">
        <fieldset className="control-panel__fieldset">
          <legend className="control-panel__legend">Strategy</legend>
          <div className="settings-form-grid">
            <SelectField
              id={`${idPrefix}-vo`}
              label="Video objective"
              options={VIDEO_OBJECTIVE}
              value={str(value.videoObjective)}
              disabled={disabled}
              onChange={(x) => onChange({ ...value, videoObjective: x })}
            />
          </div>
        </fieldset>
        <fieldset className="control-panel__fieldset">
          <legend className="control-panel__legend">Audience</legend>
          <div className="settings-form-grid">
            <SelectField
              id={`${idPrefix}-vaud`}
              label="Audience approach"
              options={DISPLAY_AUDIENCE_MODE}
              value={str(value.audienceStrategy)}
              disabled={disabled}
              onChange={(x) => onChange({ ...value, audienceStrategy: x })}
            />
          </div>
        </fieldset>
        <fieldset className="control-panel__fieldset">
          <legend className="control-panel__legend">Placements</legend>
          <div className="settings-form-grid">
            <SelectField
              id={`${idPrefix}-vpl`}
              label="Placement / format mix"
              options={[
                { value: '', label: 'Select…' },
                { value: 'In-stream heavy', label: 'In-stream heavy' },
                { value: 'In-feed + Shorts', label: 'In-feed + Shorts' },
                { value: 'Mixed', label: 'Mixed' },
              ]}
              value={str(value.placementStrategy)}
              disabled={disabled}
              onChange={(x) => onChange({ ...value, placementStrategy: x })}
            />
          </div>
        </fieldset>
        <fieldset className="control-panel__fieldset">
          <legend className="control-panel__legend">Tracking</legend>
          <p className="control-panel__empty">Set in Google Ads (YouTube, conversions).</p>
        </fieldset>
      </div>
    );
  }

  return (
    <div className="settings-form-grid">
      <SelectField
        id={`${idPrefix}-vo`}
        label="Video objective"
        options={VIDEO_OBJECTIVE}
        value={str(value.videoObjective)}
        disabled={disabled}
        onChange={(x) => onChange({ ...value, videoObjective: x })}
      />
      <SelectField
        id={`${idPrefix}-vaud`}
        label="Audience approach"
        options={DISPLAY_AUDIENCE_MODE}
        value={str(value.audienceStrategy)}
        disabled={disabled}
        onChange={(x) => onChange({ ...value, audienceStrategy: x })}
      />
      <SelectField
        id={`${idPrefix}-vpl`}
        label="Placement / format mix"
        options={[
          { value: '', label: 'Select…' },
          { value: 'In-stream heavy', label: 'In-stream heavy' },
          { value: 'In-feed + Shorts', label: 'In-feed + Shorts' },
          { value: 'Mixed', label: 'Mixed' },
        ]}
        value={str(value.placementStrategy)}
        disabled={disabled}
        onChange={(x) => onChange({ ...value, placementStrategy: x })}
      />
    </div>
  );
}

function ShoppingForm({
  value,
  onChange,
  disabled,
  idPrefix,
  groupedLayout,
}: Omit<CampaignTypeSettingsFormProps, 'campaignType'>) {
  const tr = value.targetRoas;
  const roasStr =
    tr === null || tr === undefined
      ? ''
      : typeof tr === 'number'
        ? String(tr)
        : String(tr);

  const strategyFields = (
    <>
      <SelectField
        id={`${idPrefix}-feed`}
        label="Feed status"
        options={SHOPPING_FEED}
        value={str(value.feedStatus)}
        disabled={disabled}
        onChange={(x) => onChange({ ...value, feedStatus: x })}
      />
      <SelectField
        id={`${idPrefix}-seg`}
        label="Segmentation"
        options={SHOPPING_SEGMENTATION}
        value={str(value.segmentationStrategy)}
        disabled={disabled}
        onChange={(x) => onChange({ ...value, segmentationStrategy: x })}
      />
      <NumberField
        id={`${idPrefix}-troas`}
        label="Target ROAS (optional)"
        value={roasStr}
        disabled={disabled}
        min={0}
        step="any"
        placeholder="Leave empty if not using ROAS target"
        onChange={(t) => {
          if (t === '') setDraft(value, onChange, 'targetRoas', null);
          else {
            const n = Number(t);
            setDraft(value, onChange, 'targetRoas', Number.isNaN(n) ? null : n);
          }
        }}
      />
    </>
  );

  if (groupedLayout) {
    return (
      <div className="control-panel-groups">
        <fieldset className="control-panel__fieldset">
          <legend className="control-panel__legend">Strategy</legend>
          <div className="settings-form-grid">{strategyFields}</div>
        </fieldset>
        <fieldset className="control-panel__fieldset">
          <legend className="control-panel__legend">Audience</legend>
          <p className="control-panel__empty">—</p>
        </fieldset>
        <fieldset className="control-panel__fieldset">
          <legend className="control-panel__legend">Placements</legend>
          <p className="control-panel__empty">—</p>
        </fieldset>
        <fieldset className="control-panel__fieldset">
          <legend className="control-panel__legend">Tracking</legend>
          <p className="control-panel__empty">Merchant Center & conversions.</p>
        </fieldset>
      </div>
    );
  }

  return <div className="settings-form-grid">{strategyFields}</div>;
}

function AppForm({
  value,
  onChange,
  disabled,
  idPrefix,
  groupedLayout,
}: Omit<CampaignTypeSettingsFormProps, 'campaignType'>) {
  if (groupedLayout) {
    return (
      <div className="control-panel-groups">
        <fieldset className="control-panel__fieldset">
          <legend className="control-panel__legend">Strategy</legend>
          <div className="settings-form-grid">
            <SelectField
              id={`${idPrefix}-plat`}
              label="App platform"
              options={APP_PLATFORM}
              value={str(value.appPlatform)}
              disabled={disabled}
              onChange={(x) => onChange({ ...value, appPlatform: x })}
            />
            <SelectField
              id={`${idPrefix}-goal`}
              label="Install vs in-app goal"
              options={APP_INSTALL_GOAL}
              value={str(value.installGoal)}
              disabled={disabled}
              onChange={(x) => onChange({ ...value, installGoal: x })}
            />
          </div>
        </fieldset>
        <fieldset className="control-panel__fieldset">
          <legend className="control-panel__legend">Audience</legend>
          <p className="control-panel__empty">—</p>
        </fieldset>
        <fieldset className="control-panel__fieldset">
          <legend className="control-panel__legend">Placements</legend>
          <p className="control-panel__empty">—</p>
        </fieldset>
        <fieldset className="control-panel__fieldset">
          <legend className="control-panel__legend">Tracking</legend>
          <div className="settings-form-grid">
            <ToggleField
              id={`${idPrefix}-evt`}
              label="Events verified in MMP / Firebase"
              checked={value.eventTrackingReady === true}
              disabled={disabled}
              onChange={(x) => onChange({ ...value, eventTrackingReady: x })}
            />
          </div>
        </fieldset>
      </div>
    );
  }

  return (
    <div className="settings-form-grid">
      <SelectField
        id={`${idPrefix}-plat`}
        label="App platform"
        options={APP_PLATFORM}
        value={str(value.appPlatform)}
        disabled={disabled}
        onChange={(x) => onChange({ ...value, appPlatform: x })}
      />
      <SelectField
        id={`${idPrefix}-goal`}
        label="Install vs in-app goal"
        options={APP_INSTALL_GOAL}
        value={str(value.installGoal)}
        disabled={disabled}
        onChange={(x) => onChange({ ...value, installGoal: x })}
      />
      <ToggleField
        id={`${idPrefix}-evt`}
        label="Events verified in MMP / Firebase"
        checked={value.eventTrackingReady === true}
        disabled={disabled}
        onChange={(x) => onChange({ ...value, eventTrackingReady: x })}
      />
    </div>
  );
}

function DemandGenForm({
  value,
  onChange,
  disabled,
  idPrefix,
  groupedLayout,
}: Omit<CampaignTypeSettingsFormProps, 'campaignType'>) {
  if (groupedLayout) {
    return (
      <div className="control-panel-groups">
        <fieldset className="control-panel__fieldset">
          <legend className="control-panel__legend">Strategy</legend>
          <div className="settings-form-grid">
            <SelectField
              id={`${idPrefix}-cr`}
              label="Creative coverage"
              options={DEMAND_CREATIVE}
              value={str(value.creativeCoverage)}
              disabled={disabled}
              onChange={(x) => onChange({ ...value, creativeCoverage: x })}
            />
            <SelectField
              id={`${idPrefix}-lp`}
              label="Landing / lead type"
              options={DEMAND_LANDING}
              value={str(value.landingPageType)}
              disabled={disabled}
              onChange={(x) => onChange({ ...value, landingPageType: x })}
            />
          </div>
        </fieldset>
        <fieldset className="control-panel__fieldset">
          <legend className="control-panel__legend">Audience</legend>
          <div className="settings-form-grid">
            <SelectField
              id={`${idPrefix}-aud`}
              label="Audience approach"
              options={DEMAND_AUDIENCE}
              value={str(value.audienceStrategy)}
              disabled={disabled}
              onChange={(x) => onChange({ ...value, audienceStrategy: x })}
            />
          </div>
        </fieldset>
        <fieldset className="control-panel__fieldset">
          <legend className="control-panel__legend">Placements</legend>
          <p className="control-panel__empty">—</p>
        </fieldset>
        <fieldset className="control-panel__fieldset">
          <legend className="control-panel__legend">Tracking</legend>
          <p className="control-panel__empty">Set in Google Ads.</p>
        </fieldset>
      </div>
    );
  }

  return (
    <div className="settings-form-grid">
      <SelectField
        id={`${idPrefix}-aud`}
        label="Audience approach"
        options={DEMAND_AUDIENCE}
        value={str(value.audienceStrategy)}
        disabled={disabled}
        onChange={(x) => onChange({ ...value, audienceStrategy: x })}
      />
      <SelectField
        id={`${idPrefix}-cr`}
        label="Creative coverage"
        options={DEMAND_CREATIVE}
        value={str(value.creativeCoverage)}
        disabled={disabled}
        onChange={(x) => onChange({ ...value, creativeCoverage: x })}
      />
      <SelectField
        id={`${idPrefix}-lp`}
        label="Landing / lead type"
        options={DEMAND_LANDING}
        value={str(value.landingPageType)}
        disabled={disabled}
        onChange={(x) => onChange({ ...value, landingPageType: x })}
      />
    </div>
  );
}

function OtherForm({
  value,
  onChange,
  disabled,
  idPrefix,
  groupedLayout,
}: Omit<CampaignTypeSettingsFormProps, 'campaignType'>) {
  const notesField = (
    <FieldShell label="Notes" hint="Optional context when type is generic">
      <textarea
        id={`${idPrefix}-notes`}
        className="settings-form-textarea"
        rows={groupedLayout ? 2 : 3}
        disabled={disabled}
        value={str(value.notes)}
        onChange={(e) => onChange({ ...value, notes: e.target.value })}
        placeholder="Short notes for your team…"
      />
    </FieldShell>
  );

  if (groupedLayout) {
    return (
      <div className="control-panel-groups">
        <fieldset className="control-panel__fieldset">
          <legend className="control-panel__legend">Strategy</legend>
          {notesField}
        </fieldset>
        <fieldset className="control-panel__fieldset">
          <legend className="control-panel__legend">Audience</legend>
          <p className="control-panel__empty">—</p>
        </fieldset>
        <fieldset className="control-panel__fieldset">
          <legend className="control-panel__legend">Placements</legend>
          <p className="control-panel__empty">—</p>
        </fieldset>
        <fieldset className="control-panel__fieldset">
          <legend className="control-panel__legend">Tracking</legend>
          <p className="control-panel__empty">—</p>
        </fieldset>
      </div>
    );
  }

  return notesField;
}

export const buildSettingsPayloadForType = (
  campaignType: string,
  draft: Record<string, unknown>
): Record<string, unknown> => {
  const code = resolveTypeCodeForSettingsForm(campaignType);
  if (!isCanonical(code)) return {};

  const out: Record<string, unknown> = {};
  const takeStr = (k: string) => {
    const raw = draft[k];
    if (typeof raw === 'string' && raw.trim() !== '') out[k] = raw.trim();
  };
  const takeBool = (k: string) => {
    if (draft[k] === true) out[k] = true;
    if (draft[k] === false) out[k] = false;
  };
  const takeNumOrNull = (k: string) => {
    const raw = draft[k];
    if (raw === '' || raw === undefined) {
      out[k] = null;
      return;
    }
    if (raw === null) {
      out[k] = null;
      return;
    }
    if (typeof raw === 'number' && !Number.isNaN(raw)) {
      out[k] = raw;
      return;
    }
    if (typeof raw === 'string' && raw.trim() !== '') {
      const n = Number(raw.trim());
      if (!Number.isNaN(n)) out[k] = n;
    }
  };
  const takeInt = (k: string) => {
    const raw = draft[k];
    if (raw === '' || raw === undefined || raw === null) return;
    const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
    if (!Number.isNaN(n) && Number.isInteger(n) && n >= 0) out[k] = n;
  };

  switch (code) {
    case 'SEARCH':
      takeStr('biddingStrategy');
      takeStr('brandVsNonBrand');
      takeStr('matchTypeStrategy');
      takeStr('networkTargeting');
      takeNumOrNull('targetCpa');
      takeNumOrNull('targetRoas');
      break;
    case 'DISPLAY':
      takeStr('audienceMode');
      takeStr('audienceSource');
      takeStr('placementPolicy');
      takeBool('demographicExclusions');
      takeStr('audienceStrategy');
      takeStr('placementStrategy');
      takeStr('exclusionsPolicy');
      break;
    case 'PERFORMANCE_MAX':
      takeStr('targetGoalType');
      takeBool('audienceSignalsPresent');
      takeInt('assetGroupCount');
      takeBool('feedAttached');
      break;
    case 'VIDEO':
      takeStr('videoObjective');
      takeStr('audienceStrategy');
      takeStr('placementStrategy');
      break;
    case 'SHOPPING':
      takeStr('feedStatus');
      takeStr('segmentationStrategy');
      takeNumOrNull('targetRoas');
      break;
    case 'APP':
      takeStr('appPlatform');
      takeStr('installGoal');
      takeBool('eventTrackingReady');
      break;
    case 'DEMAND_GEN':
      takeStr('audienceStrategy');
      takeStr('creativeCoverage');
      takeStr('landingPageType');
      break;
    case 'OTHER':
      takeStr('notes');
      break;
    default:
      break;
  }

  return out;
};

export const normalizeSettingsDraftFromApi = (
  campaignType: string,
  settings: Record<string, unknown>
): Record<string, unknown> => {
  const code = resolveTypeCodeForSettingsForm(campaignType);
  if (!isCanonical(code)) return {};

  const s = { ...settings };
  if (code === 'DISPLAY') {
    if (!str(s.audienceMode) && str(s.audienceStrategy)) {
      s.audienceMode = s.audienceStrategy;
    }
    if (!str(s.placementPolicy) && str(s.placementStrategy)) {
      s.placementPolicy = s.placementStrategy;
    }
  }
  if (code === 'SEARCH') {
    if (s.targetCpa === null) s.targetCpa = '';
    if (s.targetRoas === null) s.targetRoas = '';
  }
  if (code === 'SHOPPING' && s.targetRoas === null) s.targetRoas = '';

  const out: Record<string, unknown> = {};
  const copy = (k: string) => {
    if (s[k] !== undefined) out[k] = s[k];
  };

  switch (code) {
    case 'SEARCH':
      [
        'biddingStrategy',
        'targetCpa',
        'targetRoas',
        'brandVsNonBrand',
        'matchTypeStrategy',
        'networkTargeting',
      ].forEach(copy);
      break;
    case 'DISPLAY':
      [
        'audienceMode',
        'audienceSource',
        'placementPolicy',
        'demographicExclusions',
        'audienceStrategy',
        'placementStrategy',
        'exclusionsPolicy',
      ].forEach(copy);
      break;
    case 'PERFORMANCE_MAX':
      [
        'targetGoalType',
        'audienceSignalsPresent',
        'assetGroupCount',
        'feedAttached',
      ].forEach(copy);
      break;
    case 'VIDEO':
      ['videoObjective', 'audienceStrategy', 'placementStrategy'].forEach(copy);
      break;
    case 'SHOPPING':
      ['feedStatus', 'segmentationStrategy', 'targetRoas'].forEach(copy);
      break;
    case 'APP':
      ['appPlatform', 'installGoal', 'eventTrackingReady'].forEach(copy);
      break;
    case 'DEMAND_GEN':
      ['audienceStrategy', 'creativeCoverage', 'landingPageType'].forEach(copy);
      break;
    case 'OTHER':
      copy('notes');
      break;
    default:
      break;
  }

  return out;
};

export const CampaignTypeSettingsForm = ({
  campaignType,
  value,
  onChange,
  disabled = false,
  idPrefix = 'cs',
  groupedLayout = false,
}: CampaignTypeSettingsFormProps) => {
  const code = resolveTypeCodeForSettingsForm(campaignType);
  if (!isCanonical(code)) {
    return (
      <p className="status status-loading">
        Unknown campaign type for settings. Use a supported type from the
        registry.
      </p>
    );
  }

  const common = { value, onChange, disabled, idPrefix, groupedLayout };

  return (
    <div className="campaign-type-settings-form campaign-type-settings-form--compact">
      {code === 'SEARCH' ? <SearchForm {...common} /> : null}
      {code === 'DISPLAY' ? <DisplayForm {...common} /> : null}
      {code === 'PERFORMANCE_MAX' ? <PmaxForm {...common} /> : null}
      {code === 'VIDEO' ? <VideoForm {...common} /> : null}
      {code === 'SHOPPING' ? <ShoppingForm {...common} /> : null}
      {code === 'APP' ? <AppForm {...common} /> : null}
      {code === 'DEMAND_GEN' ? <DemandGenForm {...common} /> : null}
      {code === 'OTHER' ? <OtherForm {...common} /> : null}
    </div>
  );
};
