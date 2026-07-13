import { prisma } from '../db/prisma';
import { getReportStatus } from './reportService';
import { getDataWindow } from './dataWindowService';
import { getCampaignSettingsView } from './campaignSettingsService';
import {
  resolveCanonicalCampaignType,
  getCampaignTypeRegistryEntry,
  type CanonicalCampaignTypeCode,
  type CampaignSettingsByType,
} from '../campaignTypes';

export type GapCategory = 'reports' | 'settings' | 'checklist' | 'data';
export type GapSeverity = 'high' | 'medium' | 'low';

export interface CampaignGap {
  id: string;
  category: GapCategory;
  severity: GapSeverity;
  title: string;
  description: string;
  recommendation: string;
  relatedReportType?: string;
  relatedSetting?: string;
  relatedChecklistItemId?: string;
}

export interface CampaignGapsResult {
  campaignId: number;
  canonicalCampaignType: CanonicalCampaignTypeCode;
  gaps: CampaignGap[];
}

const addGap = (gaps: CampaignGap[], gap: CampaignGap | null | undefined) => {
  if (gap) gaps.push(gap);
};

const buildReportGaps = async (
  campaignId: number,
  canonicalType: CanonicalCampaignTypeCode
): Promise<CampaignGap[]> => {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { type: true },
  });
  if (!campaign) return [];

  const status = await getReportStatus(campaignId, campaign.type);
  const registry = getCampaignTypeRegistryEntry(canonicalType);
  const gaps: CampaignGap[] = [];

  for (const missing of status.missingReportTypes) {
    let severity: GapSeverity = 'medium';
    if (canonicalType === 'SEARCH') {
      if (missing === 'SEARCH_TERMS' || missing === 'KEYWORDS') severity = 'high';
      else if (missing === 'DEVICE') severity = 'medium';
    } else if (canonicalType === 'DISPLAY') {
      if (missing === 'PLACEMENT') severity = 'high';
    } else if (canonicalType === 'PERFORMANCE_MAX') {
      if (missing === 'CAMPAIGN') severity = 'high';
      else if (missing === 'SEARCH_TERMS') severity = 'low';
    }

    const guidance =
      registry.missingReportGuidance[missing] ??
      `Missing ${missing} report: insights that rely on this view will be limited.`;

    addGap(gaps, {
      id: `reports-${missing}`,
      category: 'reports',
      severity,
      title: `Missing ${missing} report`,
      description: guidance,
      recommendation:
        'Upload a recent ' +
        `${missing} export for this campaign so the AI can analyze performance at this level.`,
      relatedReportType: missing,
    });
  }

  return gaps;
};

const buildSettingsGaps = (
  campaignId: number,
  canonicalType: CanonicalCampaignTypeCode,
  settingsByType: CampaignSettingsByType
): CampaignGap[] => {
  const gaps: CampaignGap[] = [];

  if (canonicalType === 'SEARCH') {
    const s = settingsByType.SEARCH;
    if (!s.biddingStrategy) {
      addGap(gaps, {
        id: 'settings-search-biddingStrategy',
        category: 'settings',
        severity: 'high',
        title: 'Bidding strategy not configured',
        description:
          'Search campaigns should have a clear automated or manual bidding strategy aligned to CPA/ROAS goals.',
        recommendation:
          'Set a bidding strategy (e.g. Maximize Conversions, Target CPA, Target ROAS) in the campaign settings so optimization can be evaluated against it.',
        relatedSetting: 'biddingStrategy',
      });
    }
    if (!s.matchTypeStrategy) {
      addGap(gaps, {
        id: 'settings-search-matchTypeStrategy',
        category: 'settings',
        severity: 'medium',
        title: 'Match type strategy not documented',
        description:
          'Without a defined match type strategy, it is harder to judge whether queries and keywords are structured intentionally.',
        recommendation:
          'Document and configure a match type strategy (e.g. exact for core, phrase for expansion) in the campaign settings.',
        relatedSetting: 'matchTypeStrategy',
      });
    }
  } else if (canonicalType === 'DISPLAY') {
    const s = settingsByType.DISPLAY;
    const hasAudience =
      Boolean(s.audienceMode?.trim()) || Boolean(s.audienceStrategy?.trim());
    if (!hasAudience) {
      addGap(gaps, {
        id: 'settings-display-audienceStrategy',
        category: 'settings',
        severity: 'high',
        title: 'Document audience targeting mode and segments',
        description:
          'Clarify whether audiences use Targeting (restrict delivery) or Observation, and which lists (Customer Match, in-market, custom segments) are active.',
        recommendation:
          'In Google Ads → Audiences, set Targeting vs Observation per list and note which segments you use. Summarize that in campaign settings here.',
        relatedSetting: 'audienceMode',
      });
    }
    const hasPlacement =
      Boolean(s.placementPolicy?.trim()) || Boolean(s.placementStrategy?.trim());
    if (!hasPlacement) {
      addGap(gaps, {
        id: 'settings-display-placementStrategy',
        category: 'settings',
        severity: 'high',
        title: 'Document placement exclusion and allowlist rules',
        description:
          'Without written rules, it is unclear which apps/sites to exclude or allow (managed placements, category exclusions, sensitive content).',
        recommendation:
          'Document how you handle placements: open inventory vs managed placements, category exclusions, and URL/app blocklists. Add that to campaign settings.',
        relatedSetting: 'placementStrategy',
      });
    }
  } else if (canonicalType === 'PERFORMANCE_MAX') {
    const s = settingsByType.PERFORMANCE_MAX;
    if (s.audienceSignalsPresent === false) {
      addGap(gaps, {
        id: 'settings-pmax-audienceSignals',
        category: 'settings',
        severity: 'high',
        title: 'No audience signals configured',
        description:
          'Performance Max performs best when strong audience signals guide exploration instead of relying purely on broad automation.',
        recommendation:
          'Attach audience signals (customer lists, search themes, interests) and mark them as present in the settings.',
        relatedSetting: 'audienceSignalsPresent',
      });
    }
    if (!s.assetGroupCount || s.assetGroupCount <= 0) {
      addGap(gaps, {
        id: 'settings-pmax-assetGroups',
        category: 'settings',
        severity: 'high',
        title: 'No asset groups configured',
        description:
          'Without at least one asset group, Performance Max cannot meaningfully serve across surfaces.',
        recommendation:
          'Create at least one well-structured asset group and reflect the count in the settings so health can be assessed.',
        relatedSetting: 'assetGroupCount',
      });
    }
  }

  return gaps;
};

const buildChecklistGaps = (
  completionPercent: number | null,
  importantLaunchPending: number
): CampaignGap[] => {
  const gaps: CampaignGap[] = [];
  const pct = completionPercent ?? 0;

  if (pct < 30) {
    addGap(gaps, {
      id: 'checklist-completion-high',
      category: 'checklist',
      severity: 'high',
      title: 'Checklist largely incomplete',
      description:
        'Less than 30% of the execution checklist is complete. Many foundational items may still be outstanding.',
      recommendation:
        'Work through the launch and optimization checklists, prioritizing high-impact items, before relying heavily on AI-driven recommendations.',
    });
  } else if (pct < 60) {
    addGap(gaps, {
      id: 'checklist-completion-medium',
      category: 'checklist',
      severity: 'medium',
      title: 'Checklist partially complete',
      description:
        'Between 30% and 60% of checklist items are complete. Setup is directional but not fully hardened.',
      recommendation:
        'Continue progressing checklist items, especially those tied to measurement, structure, and exclusions.',
    });
  }

  if (importantLaunchPending > 0) {
    addGap(gaps, {
      id: 'checklist-launch-pending',
      category: 'checklist',
      severity: 'high',
      title: 'Important launch checklist items pending',
      description:
        'Some high-importance launch checklist items are still pending. These usually cover tracking, structure, and safety controls.',
      recommendation:
        'Resolve the remaining launch checklist items before scaling budgets aggressively.',
    });
  }

  return gaps;
};

const buildDataGaps = (campaignId: number, canonicalType: CanonicalCampaignTypeCode) =>
  getDataWindow(campaignId).then((dw) => {
    const gaps: CampaignGap[] = [];

    if (dw.freshnessStatus === 'STALE') {
      addGap(gaps, {
        id: 'data-freshness-stale',
        category: 'data',
        severity: 'high',
        title: 'Data is stale',
        description:
          'The most recent active reports for this campaign are stale. Analyses may not reflect current performance.',
        recommendation:
          'Upload fresh reports for the key report types for this campaign type so analysis reflects current performance.',
      });
    } else if (dw.freshnessStatus === 'AGING') {
      addGap(gaps, {
        id: 'data-freshness-aging',
        category: 'data',
        severity: 'medium',
        title: 'Data is aging',
        description:
          'The most recent data is aging. Analyses will be directionally useful but less reliable for fine-grained decisions.',
        recommendation:
          'Plan to upload more recent reports, especially after major changes, so data freshness returns to “fresh”.',
      });
    }

    if (dw.alignmentStatus === 'MISALIGNED') {
      addGap(gaps, {
        id: 'data-alignment-misaligned',
        category: 'data',
        severity: 'high',
        title: 'Reports are misaligned',
        description:
          'Active reports do not share a common date range, making cross-report comparisons unreliable.',
        recommendation:
          'Re-upload reports that cover a common analysis window so the system can compare metrics across dimensions consistently.',
      });
    } else if (dw.alignmentStatus === 'PARTIAL') {
      addGap(gaps, {
        id: 'data-alignment-partial',
        category: 'data',
        severity: 'medium',
        title: 'Reports are only partially aligned',
        description:
          'Active reports partially overlap in time. Some comparisons will only be directional.',
        recommendation:
          'Where possible, standardize report date ranges (e.g. last 30 days) across key reports for this campaign.',
      });
    }

    return gaps;
  });

export const getCampaignGaps = async (
  campaignId: number
): Promise<CampaignGapsResult | null> => {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, type: true },
  });
  if (!campaign) return null;

  const canonicalType = resolveCanonicalCampaignType(campaign.type);

  const settingsView = await getCampaignSettingsView(campaignId);
  // `settingsView.settings` is canonical-type specific (e.g. SEARCH settings),
  // but `buildSettingsGaps` expects a `CampaignSettingsByType` container.
  // We build an empty container and hydrate only the canonical branch.
  const settingsByType: CampaignSettingsByType = {
    SEARCH: {} as CampaignSettingsByType['SEARCH'],
    DISPLAY: {} as CampaignSettingsByType['DISPLAY'],
    PERFORMANCE_MAX: {} as CampaignSettingsByType['PERFORMANCE_MAX'],
    VIDEO: {} as CampaignSettingsByType['VIDEO'],
    SHOPPING: {} as CampaignSettingsByType['SHOPPING'],
    APP: {} as CampaignSettingsByType['APP'],
    DEMAND_GEN: {} as CampaignSettingsByType['DEMAND_GEN'],
    OTHER: {} as CampaignSettingsByType['OTHER'],
  };
  if (settingsView?.settings) {
    settingsByType[canonicalType] = settingsView.settings as CampaignSettingsByType[typeof canonicalType];
  }

  let reportGaps: CampaignGap[] = [];
  let dataGaps: CampaignGap[] = [];
  try {
    [reportGaps, dataGaps] = await Promise.all([
      buildReportGaps(campaignId, canonicalType),
      buildDataGaps(campaignId, canonicalType),
    ]);
  } catch (err) {
    // Hard-degrade: gaps are a secondary signal; never crash the endpoint.
    console.error('[getCampaignGaps] Failed to build gaps:', err);
    reportGaps = [];
    dataGaps = [];
  }

  // Checklist-based gaps require a checklist service; if present in the future,
  // we can plug it in here. For now, we conservatively skip checklist gaps
  // rather than fabricating progress.
  const checklistGaps: CampaignGap[] = [];

  const settingsGaps = buildSettingsGaps(campaignId, canonicalType, settingsByType);

  const gaps: CampaignGap[] = [
    ...reportGaps,
    ...settingsGaps,
    ...checklistGaps,
    ...dataGaps,
  ];

  return {
    campaignId,
    canonicalCampaignType: canonicalType,
    gaps,
  };
};

