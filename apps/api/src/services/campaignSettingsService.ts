import { prisma } from '../db/prisma';
import {
  SETTINGS_SCHEMA_VERSION,
  resolveCanonicalCampaignType,
  validateSettingsForCampaignType,
  parseSettingsJson,
  type CampaignSettingsPayload,
  type CanonicalCampaignTypeCode,
} from '../campaignTypes';

export interface CampaignSettingsView {
  campaignId: number;
  canonicalCampaignType: CanonicalCampaignTypeCode;
  settingsSchemaVersion: number;
  settings: CampaignSettingsPayload;
  createdAt: string | null;
  updatedAt: string | null;
}

const emptySettings = (): CampaignSettingsPayload => ({}) as CampaignSettingsPayload;

export const getCampaignSettingsView = async (
  campaignId: number
): Promise<CampaignSettingsView | null> => {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { settings: true },
  });
  if (!campaign) return null;

  const canonicalCampaignType = resolveCanonicalCampaignType(campaign.type);
  const row = campaign.settings;

  if (!row) {
    return {
      campaignId,
      canonicalCampaignType,
      settingsSchemaVersion: SETTINGS_SCHEMA_VERSION,
      settings: emptySettings(),
      createdAt: null,
      updatedAt: null,
    };
  }

  let parsed: unknown = {};
  try {
    parsed = parseSettingsJson(row.settingsJson);
  } catch {
    parsed = {};
  }

  const validated = validateSettingsForCampaignType(canonicalCampaignType, parsed);
  const settings = validated.ok ? validated.value : emptySettings();

  return {
    campaignId,
    canonicalCampaignType,
    settingsSchemaVersion: row.settingsSchemaVersion,
    settings,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
};

export const upsertCampaignSettings = async (
  campaignId: number,
  body: { settings: unknown; settingsSchemaVersion?: number }
): Promise<CampaignSettingsView> => {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) {
    throw new Error('CAMPAIGN_NOT_FOUND');
  }

  const canonicalCampaignType = resolveCanonicalCampaignType(campaign.type);
  const clientVersion = body.settingsSchemaVersion ?? SETTINGS_SCHEMA_VERSION;
  if (clientVersion !== SETTINGS_SCHEMA_VERSION) {
    throw new Error('SETTINGS_SCHEMA_VERSION_MISMATCH');
  }

  const outcome = validateSettingsForCampaignType(
    canonicalCampaignType,
    body.settings
  );
  if (!outcome.ok) {
    const e = new Error('SETTINGS_VALIDATION_FAILED') as Error & {
      validationErrors: string[];
    };
    e.validationErrors = outcome.errors;
    throw e;
  }

  const json = JSON.stringify(outcome.value);
  const row = await prisma.campaignSettings.upsert({
    where: { campaignId },
    create: {
      campaignId,
      settingsSchemaVersion: SETTINGS_SCHEMA_VERSION,
      settingsJson: json,
    },
    update: {
      settingsSchemaVersion: SETTINGS_SCHEMA_VERSION,
      settingsJson: json,
    },
  });

  return {
    campaignId,
    canonicalCampaignType,
    settingsSchemaVersion: row.settingsSchemaVersion,
    settings: outcome.value,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
};
