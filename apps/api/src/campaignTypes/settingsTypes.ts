import type { CanonicalCampaignTypeCode } from './types';

/** Typed payloads stored in CampaignSettings.settingsJson (versioned). */

export interface SearchCampaignSettings {
  biddingStrategy?: string;
  /** When bidding uses Target CPA (same currency as account). */
  targetCpa?: number | null;
  /** When bidding uses Target ROAS (ratio, e.g. 4.5). */
  targetRoas?: number | null;
  brandVsNonBrand?: string;
  matchTypeStrategy?: string;
  networkTargeting?: string;
}

export interface DisplayCampaignSettings {
  audienceMode?: string;
  audienceSource?: string;
  placementPolicy?: string;
  demographicExclusions?: boolean;
  /** Legacy keys — still accepted for older saved settings */
  audienceStrategy?: string;
  placementStrategy?: string;
  exclusionsPolicy?: string;
}

export interface PerformanceMaxCampaignSettings {
  targetGoalType?: string;
  audienceSignalsPresent?: boolean;
  assetGroupCount?: number;
  feedAttached?: boolean;
}

export interface VideoCampaignSettings {
  videoObjective?: string;
  audienceStrategy?: string;
  placementStrategy?: string;
}

export interface ShoppingCampaignSettings {
  feedStatus?: string;
  segmentationStrategy?: string;
  targetRoas?: number | null;
}

export interface AppCampaignSettings {
  appPlatform?: string;
  installGoal?: string;
  eventTrackingReady?: boolean;
}

export interface DemandGenCampaignSettings {
  audienceStrategy?: string;
  creativeCoverage?: string;
  landingPageType?: string;
}

export interface OtherCampaignSettings {
  /** Free-form notes when type is OTHER */
  notes?: string;
}

export type CampaignSettingsByType = {
  SEARCH: SearchCampaignSettings;
  DISPLAY: DisplayCampaignSettings;
  PERFORMANCE_MAX: PerformanceMaxCampaignSettings;
  VIDEO: VideoCampaignSettings;
  SHOPPING: ShoppingCampaignSettings;
  APP: AppCampaignSettings;
  DEMAND_GEN: DemandGenCampaignSettings;
  OTHER: OtherCampaignSettings;
};

export type CampaignSettingsPayload = CampaignSettingsByType[CanonicalCampaignTypeCode];
