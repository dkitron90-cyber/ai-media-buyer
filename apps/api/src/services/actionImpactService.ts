import { prisma } from '../db/prisma';
import { getCampaignById } from './campaignService';
import { getCampaignSummary } from './analysisService';
import { getActionById } from './actionPlanService';

export type SnapshotType = 'before' | 'after';

export interface ImpactMetrics {
  clicks?: number;
  impressions?: number;
  cost?: number;
  conversions?: number;
  conversionValue?: number;
  roas?: number | null;
  ctr?: number | null;
  cpc?: number | null;
  cpa?: number | null;
}

export interface ActionImpactSnapshotDto {
  id: number;
  actionId: number;
  campaignId: number;
  snapshotType: string;
  capturedAt: Date;
  metrics: ImpactMetrics;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActionImpactSummary {
  actionId: number;
  before: ActionImpactSnapshotDto | null;
  after: ActionImpactSnapshotDto | null;
  delta: ImpactMetrics | null;
  assessment: {
    status: 'insufficient_data' | 'measured';
    message: string;
    highlights?: string[];
  };
}

export class ImpactValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImpactValidationError';
  }
}

function safeNumber(value: unknown): number | undefined {
  if (typeof value !== 'number') return undefined;
  if (!Number.isFinite(value)) return undefined;
  return value;
}

function computeDerived(metrics: ImpactMetrics): ImpactMetrics {
  const clicks = metrics.clicks ?? 0;
  const impressions = metrics.impressions ?? 0;
  const cost = metrics.cost ?? 0;
  const conversions = metrics.conversions ?? 0;

  const ctr = impressions > 0 ? (clicks / impressions) * 100 : null;
  const cpc = clicks > 0 ? cost / clicks : null;
  const cpa = conversions > 0 ? cost / conversions : null;

  return { ...metrics, ctr, cpc, cpa };
}

async function getCurrentCampaignTotals(campaignId: number): Promise<ImpactMetrics> {
  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    throw new ImpactValidationError('Campaign not found.');
  }

  const summary = await getCampaignSummary(campaignId, campaign.type);
  const totals = summary.totals;

  return computeDerived({
    clicks: safeNumber(totals.clicks),
    impressions: safeNumber(totals.impressions),
    cost: safeNumber(totals.cost),
    conversions: safeNumber(totals.conversions),
    conversionValue: safeNumber(totals.conversionValue),
    roas: totals.roas ?? null,
  });
}

function parseMetricsJson(metricsJson: string): ImpactMetrics {
  try {
    return JSON.parse(metricsJson) as ImpactMetrics;
  } catch {
    return {};
  }
}

function toSnapshotDto(row: {
  id: number;
  actionId: number;
  campaignId: number;
  snapshotType: string;
  capturedAt: Date;
  metricsJson: string;
  createdAt: Date;
  updatedAt: Date;
}): ActionImpactSnapshotDto {
  return {
    id: row.id,
    actionId: row.actionId,
    campaignId: row.campaignId,
    snapshotType: row.snapshotType,
    capturedAt: row.capturedAt,
    metrics: parseMetricsJson(row.metricsJson),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function captureActionImpactSnapshot(
  campaignId: number,
  actionId: number,
  snapshotType: SnapshotType
): Promise<ActionImpactSnapshotDto> {
  const action = await getActionById(campaignId, actionId);
  if (!action) {
    throw new ImpactValidationError('Action not found.');
  }

  const metrics = await getCurrentCampaignTotals(campaignId);

  const row = await prisma.actionImpactSnapshot.create({
    data: {
      actionId,
      campaignId,
      snapshotType,
      capturedAt: new Date(),
      metricsJson: JSON.stringify(metrics),
    },
  });

  return toSnapshotDto(row);
}

export async function getLatestSnapshot(
  campaignId: number,
  actionId: number,
  snapshotType: SnapshotType
): Promise<ActionImpactSnapshotDto | null> {
  const row = await prisma.actionImpactSnapshot.findFirst({
    where: { campaignId, actionId, snapshotType },
    orderBy: { capturedAt: 'desc' },
  });
  return row ? toSnapshotDto(row) : null;
}

function deltaMetrics(before: ImpactMetrics, after: ImpactMetrics): ImpactMetrics {
  const result: ImpactMetrics = {};

  const keys: (keyof ImpactMetrics)[] = [
    'clicks',
    'impressions',
    'cost',
    'conversions',
    'conversionValue',
    'roas',
    'ctr',
    'cpc',
    'cpa',
  ];

  for (const key of keys) {
    const b = before[key];
    const a = after[key];
    if (typeof b === 'number' && typeof a === 'number') {
      result[key] = a - b;
    } else if (key === 'roas' && (a !== undefined || b !== undefined)) {
      // roas can be null; only compute delta when both numeric
      result[key] = undefined;
    }
  }

  return result;
}

function assessImpact(before: ImpactMetrics, after: ImpactMetrics, delta: ImpactMetrics) {
  const highlights: string[] = [];

  const cpaDelta = delta.cpa;
  if (typeof cpaDelta === 'number') {
    if (cpaDelta < 0) highlights.push('CPA decreased (improved efficiency).');
    if (cpaDelta > 0) highlights.push('CPA increased (worse efficiency).');
  }

  const roasDelta = delta.roas;
  if (typeof roasDelta === 'number') {
    if (roasDelta > 0) highlights.push('ROAS increased.');
    if (roasDelta < 0) highlights.push('ROAS decreased.');
  }

  const convDelta = delta.conversions;
  if (typeof convDelta === 'number') {
    if (convDelta > 0) highlights.push('Conversions increased.');
    if (convDelta < 0) highlights.push('Conversions decreased.');
  }

  const spendDelta = delta.cost;
  if (typeof spendDelta === 'number') {
    if (spendDelta > 0) highlights.push('Spend increased.');
    if (spendDelta < 0) highlights.push('Spend decreased.');
  }

  if (highlights.length === 0) {
    return {
      status: 'measured' as const,
      message: 'Snapshots captured. No clear directional change detected in key metrics.',
    };
  }

  return {
    status: 'measured' as const,
    message: 'Snapshots captured. Review highlights for directional impact.',
    highlights,
  };
}

export async function getActionImpactSummary(
  campaignId: number,
  actionId: number
): Promise<ActionImpactSummary> {
  const before = await getLatestSnapshot(campaignId, actionId, 'before');
  const after = await getLatestSnapshot(campaignId, actionId, 'after');

  if (!before && !after) {
    return {
      actionId,
      before: null,
      after: null,
      delta: null,
      assessment: {
        status: 'insufficient_data',
        message: 'No impact snapshots captured for this action yet.',
      },
    };
  }

  if (!before || !after) {
    return {
      actionId,
      before,
      after,
      delta: null,
      assessment: {
        status: 'insufficient_data',
        message:
          !before
            ? 'Missing a before snapshot. Re-execute the action or capture a before snapshot first.'
            : 'Missing an after snapshot. Capture an after snapshot to measure impact.',
      },
    };
  }

  const delta = deltaMetrics(before.metrics, after.metrics);

  return {
    actionId,
    before,
    after,
    delta,
    assessment: assessImpact(before.metrics, after.metrics, delta),
  };
}

