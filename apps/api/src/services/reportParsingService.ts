import fs from 'fs/promises';
import { prisma } from '../db/prisma';
import { parseCsvLine } from '../lib/csv';
import type { ReportType } from '../lib/reportTypes';
import {
  normalizeAndMapHeaders,
  resolveFieldIndex,
  assertRequiredFieldsCanonical,
  type NormalizedHeaderResult,
} from '../lib/headerNormalizer';
import { computeCpa, computeCpc, computeCtr } from '../lib/reportMetrics';

const SEARCH_TERMS_TYPE = 'SEARCH_TERMS';
const KEYWORDS_TYPE = 'KEYWORDS';
const DEVICE_TYPE = 'DEVICE';
const PLACEMENT_TYPE = 'PLACEMENT';
const GEOGRAPHIC_TYPE = 'GEOGRAPHIC';
const DEMOGRAPHICS_TYPE = 'DEMOGRAPHICS';
const AUDIENCE_TYPE = 'AUDIENCE';
const AD_SCHEDULE_TYPE = 'AD_SCHEDULE';
const CAMPAIGN_TYPE = 'CAMPAIGN';

const FIELD_CANONICAL: Record<string, string[]> = {
  searchTerm: ['searchTerm'],
  keywordText: ['keywordText'],
  device: ['device'],
  placement: ['placement'],
  displayName: ['displayName'],
  location: ['location'],
  country: ['country'],
  region: ['region'],
  city: ['city'],
  demographicType: ['ageRange', 'gender', 'parentalStatus', 'householdIncome'],
  demographicValue: [],
  audienceName: ['audienceName'],
  audienceType: ['audienceType'],
  dayOfWeek: ['dayOfWeek'],
  hourOfDay: ['hourOfDay'],
  campaignName: ['campaignName'],
  clicks: ['clicks'],
  impressions: ['impressions'],
  cost: ['cost'],
  conversions: ['conversions'],
  ctr: ['ctr'],
  cpc: ['avgCpc', 'cpc'],
  cpa: ['costPerConversion'],
  conversionValue: ['conversionValue'],
  roas: ['roas'],
};

const aliasesToSpecs = (
  requiredKeys: string[],
  aliases: Record<string, string[]>
): Array<{ key: string; canonical: string[]; aliases: string[] }> =>
  requiredKeys.map((key) => ({
    key,
    canonical: FIELD_CANONICAL[key] ?? [],
    aliases: aliases[key] ?? [],
  }));

const searchTermHeaderAliases: Record<string, string[]> = {
  searchTerm: ['search term', 'search terms', 'query'],
  campaignName: ['campaign', 'campaign name'],
  clicks: ['clicks'],
  impressions: ['impr', 'impressions'],
  cost: ['cost'],
  conversions: ['conversions', 'conv'],
  ctr: ['ctr'],
  cpc: ['avg cpc', 'cpc', 'average cpc'],
};

const parseNumeric = (value: string): number | null => {
  const raw = value.trim();
  if (!raw) return null;

  const withoutPercent = raw.replace(/%/g, '');
  const cleaned = withoutPercent.replace(/[^0-9,.-]/g, '');
  if (!cleaned) return null;

  let normalized = cleaned;
  const hasComma = normalized.includes(',');
  const hasDot = normalized.includes('.');
  if (hasComma && hasDot) {
    normalized = normalized.replace(/,/g, '');
  } else if (hasComma && !hasDot) {
    normalized = normalized.replace(/,/g, '.');
  }

  const parsed = Number(normalized);
  if (Number.isNaN(parsed)) return null;
  return parsed;
};

const parseInteger = (value: string): number => {
  const parsed = parseNumeric(value);
  if (parsed === null) return 0;
  return Math.max(0, Math.round(parsed));
};

const parseFloatValue = (value: string): number => {
  const parsed = parseNumeric(value);
  if (parsed === null) return 0;
  return parsed;
};

const parseOptionalFloatValue = (value: string): number | null => {
  const parsed = parseNumeric(value);
  if (parsed === null) return null;
  return parsed;
};

const tryParseDate = (value: string): Date | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const isoMatch = /^\d{4}-\d{2}-\d{2}/.test(trimmed);
  if (isoMatch) {
    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const slashMatch = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(trimmed);
  if (slashMatch) {
    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
};

export interface DateRangeResult {
  dateRangeStart: Date | null;
  dateRangeEnd: Date | null;
}

export const detectDateRangeFromLines = (
  lines: string[],
  headerResult: NormalizedHeaderResult
): DateRangeResult => {
  const dateIndex = resolveFieldIndex(
    headerResult,
    ['day'],
    ['day', 'date', 'report date']
  );
  if (dateIndex < 0) return { dateRangeStart: null, dateRangeEnd: null };

  let min: Date | null = null;
  let max: Date | null = null;

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const dateStr = cells[dateIndex];
    if (!dateStr) continue;
    const d = tryParseDate(dateStr);
    if (!d) continue;
    if (!min || d.getTime() < min.getTime()) min = d;
    if (!max || d.getTime() > max.getTime()) max = d;
  }

  return { dateRangeStart: min, dateRangeEnd: max };
};

const resolveCampaignNameOrFallback = (
  cells: string[],
  index: number,
  fallback: string
): string => {
  if (index >= 0 && index < cells.length) {
    const fromFile = (cells[index] ?? '').trim();
    if (fromFile) return fromFile;
  }
  return fallback;
};

const searchTermRequiredHeaders: Array<keyof typeof searchTermHeaderAliases> = [
  'searchTerm',
  'clicks',
  'impressions',
  'cost',
  'conversions',
];

export const parseSearchTermsReport = async (reportId: number) => {
  const report = await prisma.uploadedReport.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new Error('Uploaded report not found.');
  }

  if (report.reportType !== SEARCH_TERMS_TYPE) {
    throw new Error('Only SEARCH_TERMS reports can be parsed in this phase.');
  }

  const campaignNameFromDb = (
    await prisma.campaign.findUnique({
      where: { id: report.campaignId },
      select: { name: true },
    })
  )?.name;

  if (!campaignNameFromDb) {
    throw new Error('Campaign not found for uploaded report.');
  }

  await prisma.uploadedReport.update({
    where: { id: reportId },
    data: {
      uploadStatus: 'PARSING',
      errorMessage: null,
    },
  });

  try {
    const raw = await fs.readFile(report.filePath, 'utf8');
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) {
      throw new Error('CSV must include a header row and at least one data row.');
    }

    const headerRow = parseCsvLine(lines[0]);
    const headerResult = normalizeAndMapHeaders(headerRow);
    const dateRange = detectDateRangeFromLines(lines, headerResult);
    assertRequiredFieldsCanonical(
      headerResult,
      aliasesToSpecs(searchTermRequiredHeaders, searchTermHeaderAliases),
      SEARCH_TERMS_TYPE
    );

    const indexByField = {
      searchTerm: resolveFieldIndex(headerResult, ['searchTerm'], searchTermHeaderAliases.searchTerm),
      campaignName: resolveFieldIndex(headerResult, ['campaignName'], searchTermHeaderAliases.campaignName),
      clicks: resolveFieldIndex(headerResult, ['clicks'], searchTermHeaderAliases.clicks),
      impressions: resolveFieldIndex(headerResult, ['impressions'], searchTermHeaderAliases.impressions),
      cost: resolveFieldIndex(headerResult, ['cost'], searchTermHeaderAliases.cost),
      conversions: resolveFieldIndex(headerResult, ['conversions'], searchTermHeaderAliases.conversions),
      ctr: resolveFieldIndex(headerResult, ['ctr'], searchTermHeaderAliases.ctr),
      cpc: resolveFieldIndex(headerResult, ['avgCpc', 'cpc'], searchTermHeaderAliases.cpc),
    };

    const parsedRows: Array<{
      uploadedReportId: number;
      campaignId: number;
      rowIndex: number;
      searchTerm: string;
      campaignName: string;
      clicks: number;
      impressions: number;
      cost: number;
      conversions: number;
      ctr: number | null;
      cpc: number | null;
      cpa: number | null;
    }> = [];

    for (let i = 1; i < lines.length; i += 1) {
      const cells = parseCsvLine(lines[i]);
      const searchTerm = (cells[indexByField.searchTerm] ?? '').trim();
      if (!searchTerm) {
        continue;
      }

      const campaignName = resolveCampaignNameOrFallback(
        cells,
        indexByField.campaignName,
        campaignNameFromDb
      );
      const clicks = parseInteger(cells[indexByField.clicks] ?? '');
      const impressions = parseInteger(cells[indexByField.impressions] ?? '');
      const cost = parseFloatValue(cells[indexByField.cost] ?? '');
      const conversions = parseFloatValue(cells[indexByField.conversions] ?? '');

      const ctrFromFile = parseOptionalFloatValue(cells[indexByField.ctr] ?? '');
      const cpcFromFile = parseOptionalFloatValue(cells[indexByField.cpc] ?? '');

      const ctr = computeCtr(clicks, impressions, ctrFromFile);
      const cpc = computeCpc(cost, clicks, cpcFromFile);
      const cpa = computeCpa(cost, conversions);

      parsedRows.push({
        uploadedReportId: report.id,
        campaignId: report.campaignId,
        rowIndex: i,
        searchTerm,
        campaignName,
        clicks,
        impressions,
        cost,
        conversions,
        ctr,
        cpc,
        cpa,
      });
    }

    if (parsedRows.length === 0) {
      throw new Error('No valid SEARCH_TERMS rows found in uploaded CSV.');
    }

    await prisma.$transaction(async (tx) => {
      await tx.searchTermReportRow.deleteMany({
        where: { uploadedReportId: report.id },
      });
      await tx.searchTermReportRow.createMany({
        data: parsedRows,
      });
      await tx.uploadedReport.update({
        where: { id: report.id },
        data: {
          uploadStatus: 'PARSED',
          processedAt: new Date(),
          dateRangeStart: dateRange.dateRangeStart,
          dateRangeEnd: dateRange.dateRangeEnd,
          rowCount: parsedRows.length,
          errorMessage: null,
        },
      });
    });

    return {
      reportId: report.id,
      parsedRowCount: parsedRows.length,
      status: 'PARSED',
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to parse SEARCH_TERMS report.';

    await prisma.uploadedReport.update({
      where: { id: report.id },
      data: {
        uploadStatus: 'FAILED',
        errorMessage,
      },
    });

    throw new Error(errorMessage);
  }
};

export const listSearchTermRowsByReportId = async (reportId: number) => {
  return prisma.searchTermReportRow.findMany({
    where: { uploadedReportId: reportId },
    orderBy: { rowIndex: 'asc' },
  });
};

const keywordHeaderAliases: Record<string, string[]> = {
  keywordText: [
    'keyword text',
    'keyword',
    'keyword text matching query',
    'criteria',
    'keyword/placement',
  ],
  campaignName: ['campaign', 'campaign name'],
  clicks: ['clicks'],
  impressions: ['impr', 'impressions', 'impr'],
  cost: ['cost'],
  conversions: ['conversions', 'conv', 'all conv'],
  ctr: ['ctr', 'conv rate', 'conv. rate'],
  cpc: ['avg cpc', 'average cpc', 'avg. cpc', 'cpc'],
  cpa: ['cpa', 'avg cpa', 'average cpa', 'cost / conv', 'cost / conv.'],
};

const metricsRequiredKeys = ['clicks', 'impressions', 'cost', 'conversions'];

export const parseKeywordsReport = async (reportId: number) => {
  const report = await prisma.uploadedReport.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new Error('Uploaded report not found.');
  }

  if (report.reportType !== KEYWORDS_TYPE) {
    throw new Error('Only KEYWORDS reports can be parsed with this parser.');
  }

  const campaignNameFromDb = (
    await prisma.campaign.findUnique({
      where: { id: report.campaignId },
      select: { name: true },
    })
  )?.name;

  if (!campaignNameFromDb) {
    throw new Error('Campaign not found for uploaded report.');
  }

  await prisma.uploadedReport.update({
    where: { id: reportId },
    data: {
      uploadStatus: 'PARSING',
      errorMessage: null,
    },
  });

  try {
    const raw = await fs.readFile(report.filePath, 'utf8');
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) {
      throw new Error('CSV must include a header row and at least one data row.');
    }

    const headerRow = parseCsvLine(lines[0]);
    const headerResult = normalizeAndMapHeaders(headerRow);
    const dateRange = detectDateRangeFromLines(lines, headerResult);
    assertRequiredFieldsCanonical(
      headerResult,
      aliasesToSpecs(['keywordText', ...metricsRequiredKeys], keywordHeaderAliases),
      KEYWORDS_TYPE
    );

    const indexByField = {
      keywordText: resolveFieldIndex(headerResult, ['keywordText'], keywordHeaderAliases.keywordText),
      campaignName: resolveFieldIndex(headerResult, ['campaignName'], keywordHeaderAliases.campaignName),
      clicks: resolveFieldIndex(headerResult, ['clicks'], keywordHeaderAliases.clicks),
      impressions: resolveFieldIndex(headerResult, ['impressions'], keywordHeaderAliases.impressions),
      cost: resolveFieldIndex(headerResult, ['cost'], keywordHeaderAliases.cost),
      conversions: resolveFieldIndex(headerResult, ['conversions'], keywordHeaderAliases.conversions),
      ctr: resolveFieldIndex(headerResult, ['ctr'], keywordHeaderAliases.ctr),
      cpc: resolveFieldIndex(headerResult, ['avgCpc', 'cpc'], keywordHeaderAliases.cpc),
      cpa: resolveFieldIndex(headerResult, ['costPerConversion'], keywordHeaderAliases.cpa),
    };

    const parsedRows: Array<{
      uploadedReportId: number;
      campaignId: number;
      rowIndex: number;
      keywordText: string;
      campaignName: string;
      clicks: number;
      impressions: number;
      cost: number;
      conversions: number;
      ctr: number | null;
      cpc: number | null;
      cpa: number | null;
    }> = [];

    for (let i = 1; i < lines.length; i += 1) {
      const cells = parseCsvLine(lines[i]);
      const keywordText = (cells[indexByField.keywordText] ?? '').trim();
      if (!keywordText) {
        continue;
      }

      const campaignName = resolveCampaignNameOrFallback(
        cells,
        indexByField.campaignName,
        campaignNameFromDb
      );
      const clicks = parseInteger(cells[indexByField.clicks] ?? '');
      const impressions = parseInteger(cells[indexByField.impressions] ?? '');
      const cost = parseFloatValue(cells[indexByField.cost] ?? '');
      const conversions = parseFloatValue(cells[indexByField.conversions] ?? '');

      const ctrFromFile = parseOptionalFloatValue(cells[indexByField.ctr] ?? '');
      const cpcFromFile = parseOptionalFloatValue(cells[indexByField.cpc] ?? '');
      const cpaFromFile = parseOptionalFloatValue(cells[indexByField.cpa] ?? '');

      const ctr =
        ctrFromFile !== null
          ? ctrFromFile
          : impressions > 0
            ? (clicks / impressions) * 100
            : null;
      const cpc = cpcFromFile !== null ? cpcFromFile : clicks > 0 ? cost / clicks : null;
      const cpa =
        cpaFromFile !== null
          ? cpaFromFile
          : conversions > 0
            ? cost / conversions
            : null;

      parsedRows.push({
        uploadedReportId: report.id,
        campaignId: report.campaignId,
        rowIndex: i,
        keywordText,
        campaignName,
        clicks,
        impressions,
        cost,
        conversions,
        ctr,
        cpc,
        cpa,
      });
    }

    if (parsedRows.length === 0) {
      throw new Error('No valid KEYWORDS rows found in uploaded CSV.');
    }

    await prisma.$transaction(async (tx) => {
      await tx.keywordReportRow.deleteMany({
        where: { uploadedReportId: report.id },
      });
      await tx.keywordReportRow.createMany({
        data: parsedRows,
      });
      await tx.uploadedReport.update({
        where: { id: report.id },
        data: {
          uploadStatus: 'PARSED',
          processedAt: new Date(),
          dateRangeStart: dateRange.dateRangeStart,
          dateRangeEnd: dateRange.dateRangeEnd,
          rowCount: parsedRows.length,
          errorMessage: null,
        },
      });
    });

    return {
      reportId: report.id,
      parsedRowCount: parsedRows.length,
      status: 'PARSED',
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to parse KEYWORDS report.';

    await prisma.uploadedReport.update({
      where: { id: report.id },
      data: {
        uploadStatus: 'FAILED',
        errorMessage,
      },
    });

    throw new Error(errorMessage);
  }
};

export const listKeywordRowsByReportId = async (reportId: number) => {
  return prisma.keywordReportRow.findMany({
    where: { uploadedReportId: reportId },
    orderBy: { rowIndex: 'asc' },
  });
};

const deviceHeaderAliases: Record<string, string[]> = {
  device: ['device'],
  campaignName: ['campaign', 'campaign name'],
  clicks: ['clicks'],
  impressions: ['impr', 'impressions'],
  cost: ['cost'],
  conversions: ['conversions', 'conv'],
  ctr: ['ctr'],
  cpc: ['avg cpc', 'cpc', 'average cpc'],
  cpa: ['cpa', 'avg cpa', 'average cpa'],
};

export const parseDeviceReport = async (reportId: number) => {
  const report = await prisma.uploadedReport.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new Error('Uploaded report not found.');
  }

  if (report.reportType !== DEVICE_TYPE) {
    throw new Error('Only DEVICE reports can be parsed with this parser.');
  }

  const campaignNameFromDb = (
    await prisma.campaign.findUnique({
      where: { id: report.campaignId },
      select: { name: true },
    })
  )?.name;

  if (!campaignNameFromDb) {
    throw new Error('Campaign not found for uploaded report.');
  }

  await prisma.uploadedReport.update({
    where: { id: reportId },
    data: {
      uploadStatus: 'PARSING',
      errorMessage: null,
    },
  });

  try {
    const raw = await fs.readFile(report.filePath, 'utf8');
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) {
      throw new Error('CSV must include a header row and at least one data row.');
    }

    const headerRow = parseCsvLine(lines[0]);
    const headerResult = normalizeAndMapHeaders(headerRow);
    const dateRange = detectDateRangeFromLines(lines, headerResult);
    assertRequiredFieldsCanonical(
      headerResult,
      aliasesToSpecs(['device', ...metricsRequiredKeys], deviceHeaderAliases),
      DEVICE_TYPE
    );

    const indexByField = {
      device: resolveFieldIndex(headerResult, ['device'], deviceHeaderAliases.device),
      campaignName: resolveFieldIndex(headerResult, ['campaignName'], deviceHeaderAliases.campaignName),
      clicks: resolveFieldIndex(headerResult, ['clicks'], deviceHeaderAliases.clicks),
      impressions: resolveFieldIndex(headerResult, ['impressions'], deviceHeaderAliases.impressions),
      cost: resolveFieldIndex(headerResult, ['cost'], deviceHeaderAliases.cost),
      conversions: resolveFieldIndex(headerResult, ['conversions'], deviceHeaderAliases.conversions),
      ctr: resolveFieldIndex(headerResult, ['ctr'], deviceHeaderAliases.ctr),
      cpc: resolveFieldIndex(headerResult, ['avgCpc', 'cpc'], deviceHeaderAliases.cpc),
      cpa: resolveFieldIndex(headerResult, ['costPerConversion'], deviceHeaderAliases.cpa),
    };

    const parsedRows: Array<{
      uploadedReportId: number;
      campaignId: number;
      rowIndex: number;
      device: string;
      campaignName: string;
      clicks: number;
      impressions: number;
      cost: number;
      conversions: number;
      ctr: number | null;
      cpc: number | null;
      cpa: number | null;
    }> = [];

    for (let i = 1; i < lines.length; i += 1) {
      const cells = parseCsvLine(lines[i]);
      const device = (cells[indexByField.device] ?? '').trim();
      if (!device) {
        continue;
      }

      const campaignName = resolveCampaignNameOrFallback(
        cells,
        indexByField.campaignName,
        campaignNameFromDb
      );
      const clicks = parseInteger(cells[indexByField.clicks] ?? '');
      const impressions = parseInteger(cells[indexByField.impressions] ?? '');
      const cost = parseFloatValue(cells[indexByField.cost] ?? '');
      const conversions = parseFloatValue(cells[indexByField.conversions] ?? '');

      const ctrFromFile = parseOptionalFloatValue(cells[indexByField.ctr] ?? '');
      const cpcFromFile = parseOptionalFloatValue(cells[indexByField.cpc] ?? '');
      const cpaFromFile = parseOptionalFloatValue(cells[indexByField.cpa] ?? '');

      const ctr =
        ctrFromFile !== null
          ? ctrFromFile
          : impressions > 0
            ? (clicks / impressions) * 100
            : null;
      const cpc = cpcFromFile !== null ? cpcFromFile : clicks > 0 ? cost / clicks : null;
      const cpa =
        cpaFromFile !== null
          ? cpaFromFile
          : conversions > 0
            ? cost / conversions
            : null;

      parsedRows.push({
        uploadedReportId: report.id,
        campaignId: report.campaignId,
        rowIndex: i,
        device,
        campaignName,
        clicks,
        impressions,
        cost,
        conversions,
        ctr,
        cpc,
        cpa,
      });
    }

    if (parsedRows.length === 0) {
      throw new Error('No valid DEVICE rows found in uploaded CSV.');
    }

    await prisma.$transaction(async (tx) => {
      await tx.deviceReportRow.deleteMany({
        where: { uploadedReportId: report.id },
      });
      await tx.deviceReportRow.createMany({
        data: parsedRows,
      });
      await tx.uploadedReport.update({
        where: { id: report.id },
        data: {
          uploadStatus: 'PARSED',
          processedAt: new Date(),
          dateRangeStart: dateRange.dateRangeStart,
          dateRangeEnd: dateRange.dateRangeEnd,
          rowCount: parsedRows.length,
          errorMessage: null,
        },
      });
    });

    return {
      reportId: report.id,
      parsedRowCount: parsedRows.length,
      status: 'PARSED',
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to parse DEVICE report.';

    await prisma.uploadedReport.update({
      where: { id: report.id },
      data: {
        uploadStatus: 'FAILED',
        errorMessage,
      },
    });

    throw new Error(errorMessage);
  }
};

export const listDeviceRowsByReportId = async (reportId: number) => {
  return prisma.deviceReportRow.findMany({
    where: { uploadedReportId: reportId },
    orderBy: { rowIndex: 'asc' },
  });
};

const placementHeaderAliases: Record<string, string[]> = {
  placement: ['placement', 'where ads showed', 'url'],
  displayName: ['display name', 'domain'],
  campaignName: ['campaign', 'campaign name'],
  clicks: ['clicks'],
  impressions: ['impr', 'impressions'],
  cost: ['cost'],
  conversions: ['conversions', 'conv'],
  ctr: ['ctr'],
  cpc: ['avg cpc', 'cpc', 'average cpc'],
  cpa: ['cpa', 'avg cpa', 'average cpa'],
};

export const parsePlacementReport = async (reportId: number) => {
  const report = await prisma.uploadedReport.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new Error('Uploaded report not found.');
  }

  if (report.reportType !== PLACEMENT_TYPE) {
    throw new Error('Only PLACEMENT reports can be parsed with this parser.');
  }

  const campaignNameFromDb = (
    await prisma.campaign.findUnique({
      where: { id: report.campaignId },
      select: { name: true },
    })
  )?.name;

  if (!campaignNameFromDb) {
    throw new Error('Campaign not found for uploaded report.');
  }

  await prisma.uploadedReport.update({
    where: { id: reportId },
    data: {
      uploadStatus: 'PARSING',
      errorMessage: null,
    },
  });

  try {
    const raw = await fs.readFile(report.filePath, 'utf8');
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) {
      throw new Error('CSV must include a header row and at least one data row.');
    }

    const headerRow = parseCsvLine(lines[0]);
    const headerResult = normalizeAndMapHeaders(headerRow);
    const dateRange = detectDateRangeFromLines(lines, headerResult);
    assertRequiredFieldsCanonical(
      headerResult,
      // Placement reports can legitimately omit some/most performance metric columns.
      // Keep only `placement` as required; everything else is optional.
      aliasesToSpecs(['placement'], placementHeaderAliases),
      PLACEMENT_TYPE
    );

    const indexByField = {
      placement: resolveFieldIndex(headerResult, ['placement'], placementHeaderAliases.placement),
      displayName: resolveFieldIndex(headerResult, ['displayName'], placementHeaderAliases.displayName),
      campaignName: resolveFieldIndex(headerResult, ['campaignName'], placementHeaderAliases.campaignName),
      clicks: resolveFieldIndex(headerResult, ['clicks'], placementHeaderAliases.clicks),
      impressions: resolveFieldIndex(headerResult, ['impressions'], placementHeaderAliases.impressions),
      cost: resolveFieldIndex(headerResult, ['cost'], placementHeaderAliases.cost),
      conversions: resolveFieldIndex(headerResult, ['conversions'], placementHeaderAliases.conversions),
      ctr: resolveFieldIndex(headerResult, ['ctr'], placementHeaderAliases.ctr),
      cpc: resolveFieldIndex(headerResult, ['avgCpc', 'cpc'], placementHeaderAliases.cpc),
      cpa: resolveFieldIndex(headerResult, ['costPerConversion'], placementHeaderAliases.cpa),
    };

    const parsedRows: Array<{
      uploadedReportId: number;
      campaignId: number;
      rowIndex: number;
      placement: string;
      displayName: string | null;
      campaignName: string;
      clicks: number;
      impressions: number;
      cost: number;
      conversions: number;
      ctr: number | null;
      cpc: number | null;
      cpa: number | null;
    }> = [];

    for (let i = 1; i < lines.length; i += 1) {
      const cells = parseCsvLine(lines[i]);
      const placement = (cells[indexByField.placement] ?? '').trim();
      if (!placement) {
        continue;
      }

      const displayNameRaw =
        indexByField.displayName >= 0
          ? (cells[indexByField.displayName] ?? '').trim()
          : '';
      const displayName = displayNameRaw || null;
      const campaignName = resolveCampaignNameOrFallback(
        cells,
        indexByField.campaignName,
        campaignNameFromDb
      );
      const clicks = parseInteger(cells[indexByField.clicks] ?? '');
      const impressions = parseInteger(cells[indexByField.impressions] ?? '');
      const cost = parseFloatValue(cells[indexByField.cost] ?? '');
      const conversions = parseFloatValue(cells[indexByField.conversions] ?? '');

      const ctrFromFile = parseOptionalFloatValue(cells[indexByField.ctr] ?? '');
      const cpcFromFile = parseOptionalFloatValue(cells[indexByField.cpc] ?? '');
      const cpaFromFile = parseOptionalFloatValue(cells[indexByField.cpa] ?? '');

      const ctr =
        ctrFromFile !== null
          ? ctrFromFile
          : impressions > 0
            ? (clicks / impressions) * 100
            : null;
      const cpc = cpcFromFile !== null ? cpcFromFile : clicks > 0 ? cost / clicks : null;
      const cpa =
        cpaFromFile !== null
          ? cpaFromFile
          : conversions > 0
            ? cost / conversions
            : null;

      parsedRows.push({
        uploadedReportId: report.id,
        campaignId: report.campaignId,
        rowIndex: i,
        placement,
        displayName,
        campaignName,
        clicks,
        impressions,
        cost,
        conversions,
        ctr,
        cpc,
        cpa,
      });
    }

    if (parsedRows.length === 0) {
      throw new Error('No valid PLACEMENT rows found in uploaded CSV.');
    }

    await prisma.$transaction(async (tx) => {
      await tx.placementReportRow.deleteMany({
        where: { uploadedReportId: report.id },
      });
      await tx.placementReportRow.createMany({
        data: parsedRows,
      });
      await tx.uploadedReport.update({
        where: { id: report.id },
        data: {
          uploadStatus: 'PARSED',
          processedAt: new Date(),
          dateRangeStart: dateRange.dateRangeStart,
          dateRangeEnd: dateRange.dateRangeEnd,
          rowCount: parsedRows.length,
          errorMessage: null,
        },
      });
    });

    return {
      reportId: report.id,
      parsedRowCount: parsedRows.length,
      status: 'PARSED',
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to parse PLACEMENT report.';

    await prisma.uploadedReport.update({
      where: { id: report.id },
      data: {
        uploadStatus: 'FAILED',
        errorMessage,
      },
    });

    throw new Error(errorMessage);
  }
};

export const listPlacementRowsByReportId = async (reportId: number) => {
  return prisma.placementReportRow.findMany({
    where: { uploadedReportId: reportId },
    orderBy: { rowIndex: 'asc' },
  });
};

const geographicHeaderAliases: Record<string, string[]> = {
  location: ['location', 'location group'],
  country: ['country', 'country/territory'],
  region: ['region', 'state', 'province'],
  city: ['city'],
  campaignName: ['campaign', 'campaign name'],
  clicks: ['clicks'],
  impressions: ['impr', 'impressions'],
  cost: ['cost'],
  conversions: ['conversions', 'conv'],
  ctr: ['ctr'],
  cpc: ['avg cpc', 'cpc', 'average cpc'],
  cpa: ['cpa', 'avg cpa', 'average cpa'],
};

export const parseGeographicReport = async (reportId: number) => {
  const report = await prisma.uploadedReport.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new Error('Uploaded report not found.');
  }

  if (report.reportType !== GEOGRAPHIC_TYPE) {
    throw new Error('Only GEOGRAPHIC reports can be parsed with this parser.');
  }

  const campaignNameFromDb = (
    await prisma.campaign.findUnique({
      where: { id: report.campaignId },
      select: { name: true },
    })
  )?.name;

  if (!campaignNameFromDb) {
    throw new Error('Campaign not found for uploaded report.');
  }

  await prisma.uploadedReport.update({
    where: { id: reportId },
    data: {
      uploadStatus: 'PARSING',
      errorMessage: null,
    },
  });

  try {
    const raw = await fs.readFile(report.filePath, 'utf8');
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) {
      throw new Error('CSV must include a header row and at least one data row.');
    }

    const headerRow = parseCsvLine(lines[0]);
    const headerResult = normalizeAndMapHeaders(headerRow);
    const dateRange = detectDateRangeFromLines(lines, headerResult);
    assertRequiredFieldsCanonical(
      headerResult,
      aliasesToSpecs(['location', ...metricsRequiredKeys], geographicHeaderAliases),
      GEOGRAPHIC_TYPE
    );

    const indexByField = {
      location: resolveFieldIndex(headerResult, ['location'], geographicHeaderAliases.location),
      country: resolveFieldIndex(headerResult, ['country'], geographicHeaderAliases.country),
      region: resolveFieldIndex(headerResult, ['region'], geographicHeaderAliases.region),
      city: resolveFieldIndex(headerResult, ['city'], geographicHeaderAliases.city),
      campaignName: resolveFieldIndex(headerResult, ['campaignName'], geographicHeaderAliases.campaignName),
      clicks: resolveFieldIndex(headerResult, ['clicks'], geographicHeaderAliases.clicks),
      impressions: resolveFieldIndex(headerResult, ['impressions'], geographicHeaderAliases.impressions),
      cost: resolveFieldIndex(headerResult, ['cost'], geographicHeaderAliases.cost),
      conversions: resolveFieldIndex(headerResult, ['conversions'], geographicHeaderAliases.conversions),
      ctr: resolveFieldIndex(headerResult, ['ctr'], geographicHeaderAliases.ctr),
      cpc: resolveFieldIndex(headerResult, ['avgCpc', 'cpc'], geographicHeaderAliases.cpc),
      cpa: resolveFieldIndex(headerResult, ['costPerConversion'], geographicHeaderAliases.cpa),
    };

    const parsedRows: Array<{
      uploadedReportId: number;
      campaignId: number;
      rowIndex: number;
      location: string;
      country: string | null;
      region: string | null;
      city: string | null;
      campaignName: string;
      clicks: number;
      impressions: number;
      cost: number;
      conversions: number;
      ctr: number | null;
      cpc: number | null;
      cpa: number | null;
    }> = [];

    for (let i = 1; i < lines.length; i += 1) {
      const cells = parseCsvLine(lines[i]);
      const location = (cells[indexByField.location] ?? '').trim();
      if (!location) {
        continue;
      }

      const countryRaw =
        indexByField.country >= 0
          ? (cells[indexByField.country] ?? '').trim()
          : '';
      const regionRaw =
        indexByField.region >= 0
          ? (cells[indexByField.region] ?? '').trim()
          : '';
      const cityRaw =
        indexByField.city >= 0 ? (cells[indexByField.city] ?? '').trim() : '';

      const campaignName = resolveCampaignNameOrFallback(
        cells,
        indexByField.campaignName,
        campaignNameFromDb
      );
      const clicks = parseInteger(cells[indexByField.clicks] ?? '');
      const impressions = parseInteger(cells[indexByField.impressions] ?? '');
      const cost = parseFloatValue(cells[indexByField.cost] ?? '');
      const conversions = parseFloatValue(cells[indexByField.conversions] ?? '');

      const ctrFromFile = parseOptionalFloatValue(cells[indexByField.ctr] ?? '');
      const cpcFromFile = parseOptionalFloatValue(cells[indexByField.cpc] ?? '');
      const cpaFromFile = parseOptionalFloatValue(cells[indexByField.cpa] ?? '');

      const ctr =
        ctrFromFile !== null
          ? ctrFromFile
          : impressions > 0
            ? (clicks / impressions) * 100
            : null;
      const cpc = cpcFromFile !== null ? cpcFromFile : clicks > 0 ? cost / clicks : null;
      const cpa =
        cpaFromFile !== null
          ? cpaFromFile
          : conversions > 0
            ? cost / conversions
            : null;

      parsedRows.push({
        uploadedReportId: report.id,
        campaignId: report.campaignId,
        rowIndex: i,
        location,
        country: countryRaw || null,
        region: regionRaw || null,
        city: cityRaw || null,
        campaignName,
        clicks,
        impressions,
        cost,
        conversions,
        ctr,
        cpc,
        cpa,
      });
    }

    if (parsedRows.length === 0) {
      throw new Error('No valid GEOGRAPHIC rows found in uploaded CSV.');
    }

    await prisma.$transaction(async (tx) => {
      await tx.geographicReportRow.deleteMany({
        where: { uploadedReportId: report.id },
      });
      await tx.geographicReportRow.createMany({
        data: parsedRows,
      });
      await tx.uploadedReport.update({
        where: { id: report.id },
        data: {
          uploadStatus: 'PARSED',
          processedAt: new Date(),
          dateRangeStart: dateRange.dateRangeStart,
          dateRangeEnd: dateRange.dateRangeEnd,
          rowCount: parsedRows.length,
          errorMessage: null,
        },
      });
    });

    return {
      reportId: report.id,
      parsedRowCount: parsedRows.length,
      status: 'PARSED',
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to parse GEOGRAPHIC report.';

    await prisma.uploadedReport.update({
      where: { id: report.id },
      data: {
        uploadStatus: 'FAILED',
        errorMessage,
      },
    });

    throw new Error(errorMessage);
  }
};

export const listGeographicRowsByReportId = async (reportId: number) => {
  return prisma.geographicReportRow.findMany({
    where: { uploadedReportId: reportId },
    orderBy: { rowIndex: 'asc' },
  });
};

const demographicsHeaderAliases: Record<string, string[]> = {
  demographicType: ['demographic', 'dimension', 'type'],
  demographicValue: ['value', 'segment', 'range'],
  campaignName: ['campaign', 'campaign name'],
  clicks: ['clicks'],
  impressions: ['impr', 'impressions'],
  cost: ['cost'],
  conversions: ['conversions', 'conv'],
  ctr: ['ctr'],
  cpc: ['avg cpc', 'cpc', 'average cpc'],
  cpa: ['cpa', 'avg cpa', 'average cpa'],
};

export const parseDemographicsReport = async (reportId: number) => {
  const report = await prisma.uploadedReport.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new Error('Uploaded report not found.');
  }

  if (report.reportType !== DEMOGRAPHICS_TYPE) {
    throw new Error('Only DEMOGRAPHICS reports can be parsed with this parser.');
  }

  const campaignNameFromDb = (
    await prisma.campaign.findUnique({
      where: { id: report.campaignId },
      select: { name: true },
    })
  )?.name;

  if (!campaignNameFromDb) {
    throw new Error('Campaign not found for uploaded report.');
  }

  await prisma.uploadedReport.update({
    where: { id: reportId },
    data: {
      uploadStatus: 'PARSING',
      errorMessage: null,
    },
  });

  try {
    const raw = await fs.readFile(report.filePath, 'utf8');
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) {
      throw new Error('CSV must include a header row and at least one data row.');
    }

    const headerRow = parseCsvLine(lines[0]);
    const headerResult = normalizeAndMapHeaders(headerRow);
    const dateRange = detectDateRangeFromLines(lines, headerResult);
    assertRequiredFieldsCanonical(
      headerResult,
      aliasesToSpecs(['demographicType', 'demographicValue', ...metricsRequiredKeys], demographicsHeaderAliases),
      DEMOGRAPHICS_TYPE
    );

    const indexByField = {
      demographicType: resolveFieldIndex(headerResult, FIELD_CANONICAL['demographicType'], demographicsHeaderAliases.demographicType),
      demographicValue: resolveFieldIndex(headerResult, FIELD_CANONICAL['demographicValue'], demographicsHeaderAliases.demographicValue),
      campaignName: resolveFieldIndex(headerResult, ['campaignName'], demographicsHeaderAliases.campaignName),
      clicks: resolveFieldIndex(headerResult, ['clicks'], demographicsHeaderAliases.clicks),
      impressions: resolveFieldIndex(headerResult, ['impressions'], demographicsHeaderAliases.impressions),
      cost: resolveFieldIndex(headerResult, ['cost'], demographicsHeaderAliases.cost),
      conversions: resolveFieldIndex(headerResult, ['conversions'], demographicsHeaderAliases.conversions),
      ctr: resolveFieldIndex(headerResult, ['ctr'], demographicsHeaderAliases.ctr),
      cpc: resolveFieldIndex(headerResult, ['avgCpc', 'cpc'], demographicsHeaderAliases.cpc),
      cpa: resolveFieldIndex(headerResult, ['costPerConversion'], demographicsHeaderAliases.cpa),
    };

    const parsedRows: Array<{
      uploadedReportId: number;
      campaignId: number;
      rowIndex: number;
      demographicType: string;
      demographicValue: string;
      campaignName: string;
      clicks: number;
      impressions: number;
      cost: number;
      conversions: number;
      ctr: number | null;
      cpc: number | null;
      cpa: number | null;
    }> = [];

    for (let i = 1; i < lines.length; i += 1) {
      const cells = parseCsvLine(lines[i]);
      const demographicType = (cells[indexByField.demographicType] ?? '').trim();
      const demographicValue = (cells[indexByField.demographicValue] ?? '').trim();
      if (!demographicType || !demographicValue) {
        continue;
      }

      const campaignName = resolveCampaignNameOrFallback(
        cells,
        indexByField.campaignName,
        campaignNameFromDb
      );
      const clicks = parseInteger(cells[indexByField.clicks] ?? '');
      const impressions = parseInteger(cells[indexByField.impressions] ?? '');
      const cost = parseFloatValue(cells[indexByField.cost] ?? '');
      const conversions = parseFloatValue(cells[indexByField.conversions] ?? '');

      const ctrFromFile = parseOptionalFloatValue(cells[indexByField.ctr] ?? '');
      const cpcFromFile = parseOptionalFloatValue(cells[indexByField.cpc] ?? '');
      const cpaFromFile = parseOptionalFloatValue(cells[indexByField.cpa] ?? '');

      const ctr =
        ctrFromFile !== null
          ? ctrFromFile
          : impressions > 0
            ? (clicks / impressions) * 100
            : null;
      const cpc = cpcFromFile !== null ? cpcFromFile : clicks > 0 ? cost / clicks : null;
      const cpa =
        cpaFromFile !== null
          ? cpaFromFile
          : conversions > 0
            ? cost / conversions
            : null;

      parsedRows.push({
        uploadedReportId: report.id,
        campaignId: report.campaignId,
        rowIndex: i,
        demographicType,
        demographicValue,
        campaignName,
        clicks,
        impressions,
        cost,
        conversions,
        ctr,
        cpc,
        cpa,
      });
    }

    if (parsedRows.length === 0) {
      throw new Error('No valid DEMOGRAPHICS rows found in uploaded CSV.');
    }

    await prisma.$transaction(async (tx) => {
      await tx.demographicsReportRow.deleteMany({
        where: { uploadedReportId: report.id },
      });
      await tx.demographicsReportRow.createMany({
        data: parsedRows,
      });
      await tx.uploadedReport.update({
        where: { id: report.id },
        data: {
          uploadStatus: 'PARSED',
          processedAt: new Date(),
          dateRangeStart: dateRange.dateRangeStart,
          dateRangeEnd: dateRange.dateRangeEnd,
          rowCount: parsedRows.length,
          errorMessage: null,
        },
      });
    });

    return {
      reportId: report.id,
      parsedRowCount: parsedRows.length,
      status: 'PARSED',
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to parse DEMOGRAPHICS report.';

    await prisma.uploadedReport.update({
      where: { id: report.id },
      data: {
        uploadStatus: 'FAILED',
        errorMessage,
      },
    });

    throw new Error(errorMessage);
  }
};

export const listDemographicsRowsByReportId = async (reportId: number) => {
  return prisma.demographicsReportRow.findMany({
    where: { uploadedReportId: reportId },
    orderBy: { rowIndex: 'asc' },
  });
};

const audienceHeaderAliases: Record<string, string[]> = {
  audienceName: ['audience', 'audience name', 'audience segment'],
  audienceType: ['audience type', 'segment type'],
  campaignName: ['campaign', 'campaign name'],
  clicks: ['clicks'],
  impressions: ['impr', 'impressions'],
  cost: ['cost'],
  conversions: ['conversions', 'conv'],
  ctr: ['ctr'],
  cpc: ['avg cpc', 'cpc', 'average cpc'],
  cpa: ['cpa', 'avg cpa', 'average cpa'],
};

export const parseAudienceReport = async (reportId: number) => {
  const report = await prisma.uploadedReport.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new Error('Uploaded report not found.');
  }

  if (report.reportType !== AUDIENCE_TYPE) {
    throw new Error('Only AUDIENCE reports can be parsed with this parser.');
  }

  const campaignNameFromDb = (
    await prisma.campaign.findUnique({
      where: { id: report.campaignId },
      select: { name: true },
    })
  )?.name;

  if (!campaignNameFromDb) {
    throw new Error('Campaign not found for uploaded report.');
  }

  await prisma.uploadedReport.update({
    where: { id: reportId },
    data: {
      uploadStatus: 'PARSING',
      errorMessage: null,
    },
  });

  try {
    const raw = await fs.readFile(report.filePath, 'utf8');
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) {
      throw new Error('CSV must include a header row and at least one data row.');
    }

    const headerRow = parseCsvLine(lines[0]);
    const headerResult = normalizeAndMapHeaders(headerRow);
    const dateRange = detectDateRangeFromLines(lines, headerResult);
    assertRequiredFieldsCanonical(
      headerResult,
      aliasesToSpecs(['audienceName', ...metricsRequiredKeys], audienceHeaderAliases),
      AUDIENCE_TYPE
    );

    const indexByField = {
      audienceName: resolveFieldIndex(headerResult, ['audienceName'], audienceHeaderAliases.audienceName),
      audienceType: resolveFieldIndex(headerResult, ['audienceType'], audienceHeaderAliases.audienceType),
      campaignName: resolveFieldIndex(headerResult, ['campaignName'], audienceHeaderAliases.campaignName),
      clicks: resolveFieldIndex(headerResult, ['clicks'], audienceHeaderAliases.clicks),
      impressions: resolveFieldIndex(headerResult, ['impressions'], audienceHeaderAliases.impressions),
      cost: resolveFieldIndex(headerResult, ['cost'], audienceHeaderAliases.cost),
      conversions: resolveFieldIndex(headerResult, ['conversions'], audienceHeaderAliases.conversions),
      ctr: resolveFieldIndex(headerResult, ['ctr'], audienceHeaderAliases.ctr),
      cpc: resolveFieldIndex(headerResult, ['avgCpc', 'cpc'], audienceHeaderAliases.cpc),
      cpa: resolveFieldIndex(headerResult, ['costPerConversion'], audienceHeaderAliases.cpa),
    };

    const parsedRows: Array<{
      uploadedReportId: number;
      campaignId: number;
      rowIndex: number;
      audienceName: string;
      audienceType: string | null;
      campaignName: string;
      clicks: number;
      impressions: number;
      cost: number;
      conversions: number;
      ctr: number | null;
      cpc: number | null;
      cpa: number | null;
    }> = [];

    for (let i = 1; i < lines.length; i += 1) {
      const cells = parseCsvLine(lines[i]);
      const audienceName = (cells[indexByField.audienceName] ?? '').trim();
      if (!audienceName) {
        continue;
      }

      const audienceTypeRaw =
        indexByField.audienceType >= 0
          ? (cells[indexByField.audienceType] ?? '').trim()
          : '';

      const campaignName = resolveCampaignNameOrFallback(
        cells,
        indexByField.campaignName,
        campaignNameFromDb
      );
      const clicks = parseInteger(cells[indexByField.clicks] ?? '');
      const impressions = parseInteger(cells[indexByField.impressions] ?? '');
      const cost = parseFloatValue(cells[indexByField.cost] ?? '');
      const conversions = parseFloatValue(cells[indexByField.conversions] ?? '');

      const ctrFromFile = parseOptionalFloatValue(cells[indexByField.ctr] ?? '');
      const cpcFromFile = parseOptionalFloatValue(cells[indexByField.cpc] ?? '');
      const cpaFromFile = parseOptionalFloatValue(cells[indexByField.cpa] ?? '');

      const ctr =
        ctrFromFile !== null
          ? ctrFromFile
          : impressions > 0
            ? (clicks / impressions) * 100
            : null;
      const cpc = cpcFromFile !== null ? cpcFromFile : clicks > 0 ? cost / clicks : null;
      const cpa =
        cpaFromFile !== null
          ? cpaFromFile
          : conversions > 0
            ? cost / conversions
            : null;

      parsedRows.push({
        uploadedReportId: report.id,
        campaignId: report.campaignId,
        rowIndex: i,
        audienceName,
        audienceType: audienceTypeRaw || null,
        campaignName,
        clicks,
        impressions,
        cost,
        conversions,
        ctr,
        cpc,
        cpa,
      });
    }

    if (parsedRows.length === 0) {
      throw new Error('No valid AUDIENCE rows found in uploaded CSV.');
    }

    await prisma.$transaction(async (tx) => {
      await tx.audienceReportRow.deleteMany({
        where: { uploadedReportId: report.id },
      });
      await tx.audienceReportRow.createMany({
        data: parsedRows,
      });
      await tx.uploadedReport.update({
        where: { id: report.id },
        data: {
          uploadStatus: 'PARSED',
          processedAt: new Date(),
          dateRangeStart: dateRange.dateRangeStart,
          dateRangeEnd: dateRange.dateRangeEnd,
          rowCount: parsedRows.length,
          errorMessage: null,
        },
      });
    });

    return {
      reportId: report.id,
      parsedRowCount: parsedRows.length,
      status: 'PARSED',
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to parse AUDIENCE report.';

    await prisma.uploadedReport.update({
      where: { id: report.id },
      data: {
        uploadStatus: 'FAILED',
        errorMessage,
      },
    });

    throw new Error(errorMessage);
  }
};

export const listAudienceRowsByReportId = async (reportId: number) => {
  return prisma.audienceReportRow.findMany({
    where: { uploadedReportId: reportId },
    orderBy: { rowIndex: 'asc' },
  });
};

const adScheduleHeaderAliases: Record<string, string[]> = {
  dayOfWeek: ['day of week', 'day'],
  hourOfDay: ['hour of day', 'hour'],
  campaignName: ['campaign', 'campaign name'],
  clicks: ['clicks'],
  impressions: ['impr', 'impressions'],
  cost: ['cost'],
  conversions: ['conversions', 'conv'],
  ctr: ['ctr'],
  cpc: ['avg cpc', 'cpc', 'average cpc'],
  cpa: ['cpa', 'avg cpa', 'average cpa'],
};

const parseHourOfDay = (raw: string): number => {
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  const numeric = parseNumeric(trimmed);
  if (numeric !== null) {
    return Math.max(0, Math.min(23, Math.round(numeric)));
  }

  const match = trimmed.match(/^(\d{1,2})/);
  if (match) {
    const hour = Number(match[1]);
    if (!Number.isNaN(hour)) {
      return Math.max(0, Math.min(23, hour));
    }
  }

  return 0;
};

export const parseAdScheduleReport = async (reportId: number) => {
  const report = await prisma.uploadedReport.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new Error('Uploaded report not found.');
  }

  if (report.reportType !== AD_SCHEDULE_TYPE) {
    throw new Error('Only AD_SCHEDULE reports can be parsed with this parser.');
  }

  const campaignNameFromDb = (
    await prisma.campaign.findUnique({
      where: { id: report.campaignId },
      select: { name: true },
    })
  )?.name;

  if (!campaignNameFromDb) {
    throw new Error('Campaign not found for uploaded report.');
  }

  await prisma.uploadedReport.update({
    where: { id: reportId },
    data: {
      uploadStatus: 'PARSING',
      errorMessage: null,
    },
  });

  try {
    const raw = await fs.readFile(report.filePath, 'utf8');
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) {
      throw new Error('CSV must include a header row and at least one data row.');
    }

    const headerRow = parseCsvLine(lines[0]);
    const headerResult = normalizeAndMapHeaders(headerRow);
    const dateRange = detectDateRangeFromLines(lines, headerResult);
    assertRequiredFieldsCanonical(
      headerResult,
      aliasesToSpecs(['dayOfWeek', 'hourOfDay', ...metricsRequiredKeys], adScheduleHeaderAliases),
      AD_SCHEDULE_TYPE
    );

    const indexByField = {
      dayOfWeek: resolveFieldIndex(headerResult, ['dayOfWeek'], adScheduleHeaderAliases.dayOfWeek),
      hourOfDay: resolveFieldIndex(headerResult, ['hourOfDay'], adScheduleHeaderAliases.hourOfDay),
      campaignName: resolveFieldIndex(headerResult, ['campaignName'], adScheduleHeaderAliases.campaignName),
      clicks: resolveFieldIndex(headerResult, ['clicks'], adScheduleHeaderAliases.clicks),
      impressions: resolveFieldIndex(headerResult, ['impressions'], adScheduleHeaderAliases.impressions),
      cost: resolveFieldIndex(headerResult, ['cost'], adScheduleHeaderAliases.cost),
      conversions: resolveFieldIndex(headerResult, ['conversions'], adScheduleHeaderAliases.conversions),
      ctr: resolveFieldIndex(headerResult, ['ctr'], adScheduleHeaderAliases.ctr),
      cpc: resolveFieldIndex(headerResult, ['avgCpc', 'cpc'], adScheduleHeaderAliases.cpc),
      cpa: resolveFieldIndex(headerResult, ['costPerConversion'], adScheduleHeaderAliases.cpa),
    };

    const parsedRows: Array<{
      uploadedReportId: number;
      campaignId: number;
      rowIndex: number;
      dayOfWeek: string;
      hourOfDay: number;
      campaignName: string;
      clicks: number;
      impressions: number;
      cost: number;
      conversions: number;
      ctr: number | null;
      cpc: number | null;
      cpa: number | null;
    }> = [];

    for (let i = 1; i < lines.length; i += 1) {
      const cells = parseCsvLine(lines[i]);
      const dayOfWeek = (cells[indexByField.dayOfWeek] ?? '').trim();
      if (!dayOfWeek) {
        continue;
      }

      const hourRaw = (cells[indexByField.hourOfDay] ?? '').trim();
      const hourOfDay = parseHourOfDay(hourRaw);
      const campaignName = resolveCampaignNameOrFallback(
        cells,
        indexByField.campaignName,
        campaignNameFromDb
      );
      const clicks = parseInteger(cells[indexByField.clicks] ?? '');
      const impressions = parseInteger(cells[indexByField.impressions] ?? '');
      const cost = parseFloatValue(cells[indexByField.cost] ?? '');
      const conversions = parseFloatValue(cells[indexByField.conversions] ?? '');

      const ctrFromFile = parseOptionalFloatValue(cells[indexByField.ctr] ?? '');
      const cpcFromFile = parseOptionalFloatValue(cells[indexByField.cpc] ?? '');
      const cpaFromFile = parseOptionalFloatValue(cells[indexByField.cpa] ?? '');

      const ctr =
        ctrFromFile !== null
          ? ctrFromFile
          : impressions > 0
            ? (clicks / impressions) * 100
            : null;
      const cpc = cpcFromFile !== null ? cpcFromFile : clicks > 0 ? cost / clicks : null;
      const cpa =
        cpaFromFile !== null
          ? cpaFromFile
          : conversions > 0
            ? cost / conversions
            : null;

      parsedRows.push({
        uploadedReportId: report.id,
        campaignId: report.campaignId,
        rowIndex: i,
        dayOfWeek,
        hourOfDay,
        campaignName,
        clicks,
        impressions,
        cost,
        conversions,
        ctr,
        cpc,
        cpa,
      });
    }

    if (parsedRows.length === 0) {
      throw new Error('No valid AD_SCHEDULE rows found in uploaded CSV.');
    }

    await prisma.$transaction(async (tx) => {
      await tx.adScheduleReportRow.deleteMany({
        where: { uploadedReportId: report.id },
      });
      await tx.adScheduleReportRow.createMany({
        data: parsedRows,
      });
      await tx.uploadedReport.update({
        where: { id: report.id },
        data: {
          uploadStatus: 'PARSED',
          processedAt: new Date(),
          dateRangeStart: dateRange.dateRangeStart,
          dateRangeEnd: dateRange.dateRangeEnd,
          rowCount: parsedRows.length,
          errorMessage: null,
        },
      });
    });

    return {
      reportId: report.id,
      parsedRowCount: parsedRows.length,
      status: 'PARSED',
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to parse AD_SCHEDULE report.';

    await prisma.uploadedReport.update({
      where: { id: report.id },
      data: {
        uploadStatus: 'FAILED',
        errorMessage,
      },
    });

    throw new Error(errorMessage);
  }
};

export const listAdScheduleRowsByReportId = async (reportId: number) => {
  return prisma.adScheduleReportRow.findMany({
    where: { uploadedReportId: reportId },
    orderBy: { rowIndex: 'asc' },
  });
};

const campaignHeaderAliases: Record<string, string[]> = {
  campaignName: ['campaign', 'campaign name'],
  clicks: ['clicks'],
  impressions: ['impr', 'impressions'],
  cost: ['cost'],
  conversions: ['conversions', 'conv'],
  conversionValue: ['conv value', 'all conv. value', 'conversion value'],
  ctr: ['ctr'],
  cpc: ['avg cpc', 'cpc', 'average cpc'],
  cpa: ['cpa', 'avg cpa', 'average cpa'],
  roas: ['roas', 'conv. value / cost'],
};

export const parseCampaignReport = async (reportId: number) => {
  const report = await prisma.uploadedReport.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new Error('Uploaded report not found.');
  }

  if (report.reportType !== CAMPAIGN_TYPE) {
    throw new Error('Only CAMPAIGN reports can be parsed with this parser.');
  }

  const campaignNameFromDb = (
    await prisma.campaign.findUnique({
      where: { id: report.campaignId },
      select: { name: true },
    })
  )?.name;

  if (!campaignNameFromDb) {
    throw new Error('Campaign not found for uploaded report.');
  }

  await prisma.uploadedReport.update({
    where: { id: reportId },
    data: {
      uploadStatus: 'PARSING',
      errorMessage: null,
    },
  });

  try {
    const raw = await fs.readFile(report.filePath, 'utf8');
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) {
      throw new Error('CSV must include a header row and at least one data row.');
    }

    const headerRow = parseCsvLine(lines[0]);
    const headerResult = normalizeAndMapHeaders(headerRow);
    const dateRange = detectDateRangeFromLines(lines, headerResult);
    assertRequiredFieldsCanonical(
      headerResult,
      aliasesToSpecs(metricsRequiredKeys, campaignHeaderAliases),
      CAMPAIGN_TYPE
    );

    const indexByField = {
      campaignName: resolveFieldIndex(headerResult, ['campaignName'], campaignHeaderAliases.campaignName),
      clicks: resolveFieldIndex(headerResult, ['clicks'], campaignHeaderAliases.clicks),
      impressions: resolveFieldIndex(headerResult, ['impressions'], campaignHeaderAliases.impressions),
      cost: resolveFieldIndex(headerResult, ['cost'], campaignHeaderAliases.cost),
      conversions: resolveFieldIndex(headerResult, ['conversions'], campaignHeaderAliases.conversions),
      conversionValue: resolveFieldIndex(headerResult, ['conversionValue'], campaignHeaderAliases.conversionValue),
      ctr: resolveFieldIndex(headerResult, ['ctr'], campaignHeaderAliases.ctr),
      cpc: resolveFieldIndex(headerResult, ['avgCpc', 'cpc'], campaignHeaderAliases.cpc),
      cpa: resolveFieldIndex(headerResult, ['costPerConversion'], campaignHeaderAliases.cpa),
      roas: resolveFieldIndex(headerResult, ['roas'], campaignHeaderAliases.roas),
    };

    const parsedRows: Array<{
      uploadedReportId: number;
      campaignId: number;
      rowIndex: number;
      campaignName: string;
      clicks: number;
      impressions: number;
      cost: number;
      conversions: number;
      conversionValue: number;
      ctr: number | null;
      cpc: number | null;
      cpa: number | null;
      roas: number | null;
    }> = [];

    for (let i = 1; i < lines.length; i += 1) {
      const cells = parseCsvLine(lines[i]);
      const campaignName = resolveCampaignNameOrFallback(
        cells,
        indexByField.campaignName,
        campaignNameFromDb
      );

      const clicks = parseInteger(cells[indexByField.clicks] ?? '');
      const impressions = parseInteger(cells[indexByField.impressions] ?? '');
      const cost = parseFloatValue(cells[indexByField.cost] ?? '');
      const conversions = parseFloatValue(cells[indexByField.conversions] ?? '');
      const conversionValue =
        indexByField.conversionValue >= 0
          ? parseFloatValue(cells[indexByField.conversionValue] ?? '')
          : 0;

      const ctrFromFile = parseOptionalFloatValue(cells[indexByField.ctr] ?? '');
      const cpcFromFile = parseOptionalFloatValue(cells[indexByField.cpc] ?? '');
      const cpaFromFile = parseOptionalFloatValue(cells[indexByField.cpa] ?? '');
      const roasFromFile = parseOptionalFloatValue(cells[indexByField.roas] ?? '');

      const ctr =
        ctrFromFile !== null
          ? ctrFromFile
          : impressions > 0
            ? (clicks / impressions) * 100
            : null;
      const cpc = cpcFromFile !== null ? cpcFromFile : clicks > 0 ? cost / clicks : null;
      const cpa =
        cpaFromFile !== null
          ? cpaFromFile
          : conversions > 0
            ? cost / conversions
            : null;
      const roas =
        roasFromFile !== null
          ? roasFromFile
          : cost > 0 && conversionValue > 0
            ? conversionValue / cost
            : null;

      parsedRows.push({
        uploadedReportId: report.id,
        campaignId: report.campaignId,
        rowIndex: i,
        campaignName,
        clicks,
        impressions,
        cost,
        conversions,
        conversionValue,
        ctr,
        cpc,
        cpa,
        roas,
      });
    }

    if (parsedRows.length === 0) {
      throw new Error('No valid CAMPAIGN rows found in uploaded CSV.');
    }

    await prisma.$transaction(async (tx) => {
      await tx.campaignReportRow.deleteMany({
        where: { uploadedReportId: report.id },
      });
      await tx.campaignReportRow.createMany({
        data: parsedRows,
      });
      await tx.uploadedReport.update({
        where: { id: report.id },
        data: {
          uploadStatus: 'PARSED',
          processedAt: new Date(),
          dateRangeStart: dateRange.dateRangeStart,
          dateRangeEnd: dateRange.dateRangeEnd,
          rowCount: parsedRows.length,
          errorMessage: null,
        },
      });
    });

    return {
      reportId: report.id,
      parsedRowCount: parsedRows.length,
      status: 'PARSED',
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to parse CAMPAIGN report.';

    await prisma.uploadedReport.update({
      where: { id: report.id },
      data: {
        uploadStatus: 'FAILED',
        errorMessage,
      },
    });

    throw new Error(errorMessage);
  }
};

export const listCampaignRowsByReportId = async (reportId: number) => {
  return prisma.campaignReportRow.findMany({
    where: { uploadedReportId: reportId },
    orderBy: { rowIndex: 'asc' },
  });
};

export const parseReportByType = async (reportId: number, type: ReportType) => {
  switch (type) {
    case SEARCH_TERMS_TYPE:
      return parseSearchTermsReport(reportId);
    case KEYWORDS_TYPE:
      return parseKeywordsReport(reportId);
    case DEVICE_TYPE:
      return parseDeviceReport(reportId);
    case PLACEMENT_TYPE:
      return parsePlacementReport(reportId);
    case GEOGRAPHIC_TYPE:
      return parseGeographicReport(reportId);
    case DEMOGRAPHICS_TYPE:
      return parseDemographicsReport(reportId);
    case AUDIENCE_TYPE:
      return parseAudienceReport(reportId);
    case AD_SCHEDULE_TYPE:
      return parseAdScheduleReport(reportId);
    case CAMPAIGN_TYPE:
      return parseCampaignReport(reportId);
    default:
      throw new Error(`Parsing not implemented for report type: ${type}`);
  }
};

export const listRowsByReportIdAndType = async (
  reportId: number,
  type: ReportType
) => {
  switch (type) {
    case SEARCH_TERMS_TYPE:
      return listSearchTermRowsByReportId(reportId);
    case KEYWORDS_TYPE:
      return listKeywordRowsByReportId(reportId);
    case DEVICE_TYPE:
      return listDeviceRowsByReportId(reportId);
    case PLACEMENT_TYPE:
      return listPlacementRowsByReportId(reportId);
    case GEOGRAPHIC_TYPE:
      return listGeographicRowsByReportId(reportId);
    case DEMOGRAPHICS_TYPE:
      return listDemographicsRowsByReportId(reportId);
    case AUDIENCE_TYPE:
      return listAudienceRowsByReportId(reportId);
    case AD_SCHEDULE_TYPE:
      return listAdScheduleRowsByReportId(reportId);
    case CAMPAIGN_TYPE:
      return listCampaignRowsByReportId(reportId);
    default:
      throw new Error(`Rows retrieval not implemented for report type: ${type}`);
  }
};
