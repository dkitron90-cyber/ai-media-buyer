import { prisma } from '../db/prisma';
import type { ReportType } from '../lib/reportTypes';

export interface ActiveReport {
  id: number;
  campaignId: number;
  reportType: string;
  fileName: string;
  uploadStatus: string;
  uploadedAt: Date;
  processedAt: Date | null;
}

export interface ActiveReportSummary {
  campaignId: number;
  activeReports: ActiveReport[];
  supersededReports: ActiveReport[];
  coverageByType: Record<string, { activeReportId: number; supersededCount: number }>;
}

/**
 * For each reportType in a campaign, the latest PARSED report wins.
 * All other PARSED reports of the same type are superseded.
 * Non-PARSED reports (UPLOADED, FAILED, PARSING) are never active.
 */
export const getActiveReportMap = async (
  campaignId: number
): Promise<Map<string, number>> => {
  const parsedReports = await prisma.uploadedReport.findMany({
    where: { campaignId, uploadStatus: 'PARSED' },
    orderBy: { uploadedAt: 'desc' },
  });

  const activeByType = new Map<string, number>();
  for (const report of parsedReports) {
    if (!activeByType.has(report.reportType)) {
      activeByType.set(report.reportType, report.id);
    }
  }

  return activeByType;
};

/**
 * Returns the set of active report IDs (one per type, latest PARSED).
 */
export const getActiveReportIds = async (
  campaignId: number
): Promise<Set<number>> => {
  const map = await getActiveReportMap(campaignId);
  return new Set(map.values());
};

export const getActiveReportsSummary = async (
  campaignId: number
): Promise<ActiveReportSummary> => {
  const allReports = await prisma.uploadedReport.findMany({
    where: { campaignId },
    orderBy: { uploadedAt: 'desc' },
  });

  const activeByType = await getActiveReportMap(campaignId);
  const activeIds = new Set(activeByType.values());

  const activeReports: ActiveReport[] = [];
  const supersededReports: ActiveReport[] = [];

  for (const r of allReports) {
    const dto: ActiveReport = {
      id: r.id,
      campaignId: r.campaignId,
      reportType: r.reportType,
      fileName: r.fileName,
      uploadStatus: r.uploadStatus,
      uploadedAt: r.uploadedAt,
      processedAt: r.processedAt,
    };

    if (activeIds.has(r.id)) {
      activeReports.push(dto);
    } else if (r.uploadStatus === 'PARSED') {
      supersededReports.push(dto);
    }
  }

  const coverageByType: Record<string, { activeReportId: number; supersededCount: number }> = {};
  for (const [type, activeId] of activeByType) {
    const supersededCount = allReports.filter(
      (r) => r.reportType === type && r.uploadStatus === 'PARSED' && r.id !== activeId
    ).length;
    coverageByType[type] = { activeReportId: activeId, supersededCount };
  }

  return {
    campaignId,
    activeReports,
    supersededReports,
    coverageByType,
  };
};
