import { prisma } from '../db/prisma';
import { getActiveReportMap } from './activeReportService';

export type AlignmentStatus = 'ALIGNED' | 'PARTIAL' | 'MISALIGNED' | 'UNKNOWN';
export type FreshnessStatus = 'FRESH' | 'AGING' | 'STALE' | 'UNKNOWN';

export interface ReportDateRange {
  reportId: number;
  reportType: string;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  rowCount: number | null;
  processedAt: string | null;
}

export interface DataWindow {
  campaignId: number;
  activeReportRanges: ReportDateRange[];
  recommendedAnalysisWindow: {
    start: string | null;
    end: string | null;
  };
  alignmentStatus: AlignmentStatus;
  freshnessStatus: FreshnessStatus;
  notes: string[];
}

const FRESH_THRESHOLD_DAYS = 14;
const AGING_THRESHOLD_DAYS = 30;

function daysBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

function daysAgo(d: Date): number {
  return daysBetween(d, new Date());
}

export const getDataWindow = async (
  campaignId: number
): Promise<DataWindow> => {
  const activeMap = await getActiveReportMap(campaignId);
  const activeIds = Array.from(activeMap.values());

  if (activeIds.length === 0) {
    return {
      campaignId,
      activeReportRanges: [],
      recommendedAnalysisWindow: { start: null, end: null },
      alignmentStatus: 'UNKNOWN',
      freshnessStatus: 'UNKNOWN',
      notes: ['No active parsed reports available for this campaign.'],
    };
  }

  const reports = await prisma.uploadedReport.findMany({
    where: { id: { in: activeIds } },
    orderBy: { uploadedAt: 'desc' },
  });

  const ranges: ReportDateRange[] = reports.map((r) => ({
    reportId: r.id,
    reportType: r.reportType,
    dateRangeStart: r.dateRangeStart?.toISOString() ?? null,
    dateRangeEnd: r.dateRangeEnd?.toISOString() ?? null,
    rowCount: r.rowCount,
    processedAt: r.processedAt?.toISOString() ?? null,
  }));

  const notes: string[] = [];

  const withDates = reports.filter((r) => r.dateRangeStart && r.dateRangeEnd);
  const withoutDates = reports.filter(
    (r) => !r.dateRangeStart || !r.dateRangeEnd
  );

  if (withoutDates.length > 0) {
    const types = withoutDates.map((r) => r.reportType).join(', ');
    notes.push(
      `Date range unavailable for ${withoutDates.length} report(s): ${types}. ` +
        'These reports had no detectable date column.'
    );
  }

  // --- Alignment ---
  let alignmentStatus: AlignmentStatus = 'UNKNOWN';
  let overlapStart: Date | null = null;
  let overlapEnd: Date | null = null;

  if (withDates.length >= 2) {
    const starts = withDates.map((r) => r.dateRangeStart!);
    const ends = withDates.map((r) => r.dateRangeEnd!);

    const latestStart = new Date(
      Math.max(...starts.map((d) => d.getTime()))
    );
    const earliestEnd = new Date(
      Math.min(...ends.map((d) => d.getTime()))
    );

    const earliestStart = new Date(
      Math.min(...starts.map((d) => d.getTime()))
    );
    const latestEnd = new Date(
      Math.max(...ends.map((d) => d.getTime()))
    );

    const totalSpan = daysBetween(earliestStart, latestEnd);

    if (latestStart <= earliestEnd) {
      const overlapDays = daysBetween(latestStart, earliestEnd);
      overlapStart = latestStart;
      overlapEnd = earliestEnd;

      const allSameRange = starts.every(
        (s) => daysBetween(s, earliestStart) < 2
      ) && ends.every((e) => daysBetween(e, latestEnd) < 2);

      if (allSameRange) {
        alignmentStatus = 'ALIGNED';
        notes.push(
          'All active reports cover the same date range — data is well-aligned.'
        );
      } else if (totalSpan > 0 && overlapDays / totalSpan >= 0.5) {
        alignmentStatus = 'PARTIAL';
        notes.push(
          `Reports overlap for ${Math.round(overlapDays)} days out of a ${Math.round(totalSpan)}-day span. ` +
            'Comparisons are directional within the overlap window.'
        );
      } else {
        alignmentStatus = 'MISALIGNED';
        notes.push(
          'Reports have minimal date overlap. Cross-report comparisons may be unreliable.'
        );
      }
    } else {
      alignmentStatus = 'MISALIGNED';
      notes.push(
        'Active report date ranges do not overlap. Cross-report comparisons are unreliable.'
      );
    }
  } else if (withDates.length === 1) {
    alignmentStatus = 'ALIGNED';
    overlapStart = withDates[0].dateRangeStart!;
    overlapEnd = withDates[0].dateRangeEnd!;
    notes.push(
      'Only one report has date information — alignment is trivially met.'
    );
  } else {
    alignmentStatus = 'UNKNOWN';
    notes.push(
      'No active reports have date range information. Alignment cannot be determined.'
    );
  }

  // --- Freshness ---
  let freshnessStatus: FreshnessStatus = 'UNKNOWN';

  const allEnds = withDates.map((r) => r.dateRangeEnd!);
  const processedDates = reports
    .filter((r) => r.processedAt)
    .map((r) => r.processedAt!);

  const referenceDate =
    allEnds.length > 0
      ? new Date(Math.max(...allEnds.map((d) => d.getTime())))
      : processedDates.length > 0
        ? new Date(Math.max(...processedDates.map((d) => d.getTime())))
        : null;

  if (referenceDate) {
    const age = daysAgo(referenceDate);
    if (age <= FRESH_THRESHOLD_DAYS) {
      freshnessStatus = 'FRESH';
      notes.push(
        `Most recent data is ${Math.round(age)} day(s) old — data is fresh.`
      );
    } else if (age <= AGING_THRESHOLD_DAYS) {
      freshnessStatus = 'AGING';
      notes.push(
        `Most recent data is ${Math.round(age)} day(s) old — data is aging. Consider uploading newer reports.`
      );
    } else {
      freshnessStatus = 'STALE';
      notes.push(
        `Most recent data is ${Math.round(age)} day(s) old — data is stale. Analysis quality will be limited.`
      );
    }
  } else {
    freshnessStatus = 'UNKNOWN';
    notes.push(
      'Cannot determine data freshness — no date ranges or processed timestamps available.'
    );
  }

  // --- Recommended window ---
  const recommendedStart = overlapStart?.toISOString() ?? null;
  const recommendedEnd = overlapEnd?.toISOString() ?? null;

  if (recommendedStart && recommendedEnd) {
    const windowDays = Math.round(
      daysBetween(new Date(recommendedStart), new Date(recommendedEnd))
    );
    notes.push(
      `Recommended analysis window: ${windowDays} day(s) (${recommendedStart.split('T')[0]} to ${recommendedEnd.split('T')[0]}).`
    );
  }

  return {
    campaignId,
    activeReportRanges: ranges,
    recommendedAnalysisWindow: {
      start: recommendedStart,
      end: recommendedEnd,
    },
    alignmentStatus,
    freshnessStatus,
    notes,
  };
};
