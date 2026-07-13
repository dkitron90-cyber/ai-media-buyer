import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import {
  listSearchTermRowsByReportId,
  parseSearchTermsReport,
  listKeywordRowsByReportId,
  parseKeywordsReport,
  listDeviceRowsByReportId,
  parseDeviceReport,
  listPlacementRowsByReportId,
  parsePlacementReport,
  listGeographicRowsByReportId,
  parseGeographicReport,
  listDemographicsRowsByReportId,
  parseDemographicsReport,
  listAudienceRowsByReportId,
  parseAudienceReport,
  listAdScheduleRowsByReportId,
  parseAdScheduleReport,
  listCampaignRowsByReportId,
  parseCampaignReport,
} from '../services/reportParsingService';
import { refreshCampaignState } from '../services/campaignRefreshService';

const parseReportId = (value: string): number | null => {
  const reportId = Number(value);
  if (!Number.isInteger(reportId) || reportId <= 0) {
    return null;
  }
  return reportId;
};

export const parseReportHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const reportId = parseReportId(req.params.id);
    if (!reportId) {
      return res.status(400).json({
        error: 'Invalid "id" parameter. It must be a positive integer.',
      });
    }

    const report = await prisma.uploadedReport.findUnique({
      where: { id: reportId },
    });
    if (!report) {
      return res.status(404).json({ error: 'Uploaded report not found.' });
    }

    try {
      let result:
        | Awaited<ReturnType<typeof parseSearchTermsReport>>
        | Awaited<ReturnType<typeof parseKeywordsReport>>
        | Awaited<ReturnType<typeof parseDeviceReport>>
        | Awaited<ReturnType<typeof parsePlacementReport>>
        | Awaited<ReturnType<typeof parseGeographicReport>>
        | Awaited<ReturnType<typeof parseDemographicsReport>>
        | Awaited<ReturnType<typeof parseAudienceReport>>
        | Awaited<ReturnType<typeof parseAdScheduleReport>>
        | Awaited<ReturnType<typeof parseCampaignReport>>;

      switch (report.reportType) {
        case 'SEARCH_TERMS':
          result = await parseSearchTermsReport(reportId);
          break;
        case 'KEYWORDS':
          result = await parseKeywordsReport(reportId);
          break;
        case 'DEVICE':
          result = await parseDeviceReport(reportId);
          break;
        case 'PLACEMENT':
          result = await parsePlacementReport(reportId);
          break;
        case 'GEOGRAPHIC':
          result = await parseGeographicReport(reportId);
          break;
        case 'DEMOGRAPHICS':
          result = await parseDemographicsReport(reportId);
          break;
        case 'AUDIENCE':
          result = await parseAudienceReport(reportId);
          break;
        case 'AD_SCHEDULE':
          result = await parseAdScheduleReport(reportId);
          break;
        case 'CAMPAIGN':
          result = await parseCampaignReport(reportId);
          break;
        default:
          return res.status(400).json({
            error: `Parsing for report type "${report.reportType}" is not supported.`,
          });
      }

      // Non-blocking auto refresh: keep user flow responsive.
      const campaignId = report.campaignId;
      void refreshCampaignState(campaignId).catch(() => {});
      return res.status(200).json(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to parse uploaded report.';
      return res.status(400).json({ error: message });
    }
  } catch (err) {
    return next(err);
  }
};

export const reparseReportHandler = parseReportHandler;

export const listReportRowsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const reportId = parseReportId(req.params.id);
    if (!reportId) {
      return res.status(400).json({
        error: 'Invalid "id" parameter. It must be a positive integer.',
      });
    }

    const report = await prisma.uploadedReport.findUnique({
      where: { id: reportId },
    });
    if (!report) {
      return res.status(404).json({ error: 'Uploaded report not found.' });
    }

    let rows:
      | Awaited<ReturnType<typeof listSearchTermRowsByReportId>>
      | Awaited<ReturnType<typeof listKeywordRowsByReportId>>
      | Awaited<ReturnType<typeof listDeviceRowsByReportId>>
      | Awaited<ReturnType<typeof listPlacementRowsByReportId>>
      | Awaited<ReturnType<typeof listGeographicRowsByReportId>>
      | Awaited<ReturnType<typeof listDemographicsRowsByReportId>>
      | Awaited<ReturnType<typeof listAudienceRowsByReportId>>
      | Awaited<ReturnType<typeof listAdScheduleRowsByReportId>>
      | Awaited<ReturnType<typeof listCampaignRowsByReportId>>;

    switch (report.reportType) {
      case 'SEARCH_TERMS':
        rows = await listSearchTermRowsByReportId(reportId);
        break;
      case 'KEYWORDS':
        rows = await listKeywordRowsByReportId(reportId);
        break;
      case 'DEVICE':
        rows = await listDeviceRowsByReportId(reportId);
        break;
      case 'PLACEMENT':
        rows = await listPlacementRowsByReportId(reportId);
        break;
      case 'GEOGRAPHIC':
        rows = await listGeographicRowsByReportId(reportId);
        break;
      case 'DEMOGRAPHICS':
        rows = await listDemographicsRowsByReportId(reportId);
        break;
      case 'AUDIENCE':
        rows = await listAudienceRowsByReportId(reportId);
        break;
      case 'AD_SCHEDULE':
        rows = await listAdScheduleRowsByReportId(reportId);
        break;
      case 'CAMPAIGN':
        rows = await listCampaignRowsByReportId(reportId);
        break;
      default:
        return res.status(400).json({
          error: `Listing rows for report type "${report.reportType}" is not supported.`,
        });
    }

    return res.status(200).json(rows);
  } catch (err) {
    return next(err);
  }
};
