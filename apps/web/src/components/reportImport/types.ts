import type { ReportIntakeMatchStatus } from '../../lib/apiClient';

export type ImportMappingMode = 'existing' | 'create' | 'skip';

/** One row from the file + user mapping decision for client import. */
export interface SmartUploadMappingEntry {
  /** Campaign label exactly as detected in the file (sent as detectedCampaignName). */
  fileCampaignName: string;
  matchedCampaignId: number | null;
  matchedCampaignName: string | null;
  matchStatus: ReportIntakeMatchStatus;
  inferredCampaignType: string;
  /** Selected type when creating a new campaign (defaults to inferred). */
  campaignType: string;
  mode: ImportMappingMode;
  existingCampaignId: number | null;
}

export const buildMappingsFromInspect = (
  campaignMatches: Array<{
    campaignName: string;
    matchedCampaignId: number | null;
    matchedCampaignName: string | null;
    matchStatus: ReportIntakeMatchStatus;
    inferredCampaignType: string;
  }>
): SmartUploadMappingEntry[] =>
  campaignMatches.map((m) => ({
    fileCampaignName: m.campaignName,
    matchedCampaignId: m.matchedCampaignId,
    matchedCampaignName: m.matchedCampaignName,
    matchStatus: m.matchStatus,
    inferredCampaignType: m.inferredCampaignType,
    campaignType: m.inferredCampaignType,
    mode: m.matchedCampaignId != null ? 'existing' : 'create',
    existingCampaignId: m.matchedCampaignId,
  }));
