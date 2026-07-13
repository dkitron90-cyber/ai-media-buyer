import { parseCsvLine } from './csv';
import { detectReportTypeAdvanced } from './reportDetector';
import {
  normalizeAndMapHeaders,
  resolveFieldIndex,
  type NormalizedHeaderResult,
} from './headerNormalizer';
import { computeCpa, computeCpc, computeCtr } from './reportMetrics';
import type { ReportType } from './reportTypeCodes';

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

const keywordHeaderAliases: Record<string, string[]> = {
  keywordText: ['keyword text', 'keyword', 'keyword text matching query'],
  campaignName: ['campaign', 'campaign name'],
  clicks: ['clicks'],
  impressions: ['impr', 'impressions'],
  cost: ['cost'],
  conversions: ['conversions', 'conv'],
  ctr: ['ctr'],
  cpc: ['avg cpc', 'cpc', 'average cpc'],
};

const placementHeaderAliases: Record<string, string[]> = {
  placement: ['placement', 'where ads showed', 'website', 'app', 'url'],
  campaignName: ['campaign', 'campaign name'],
  clicks: ['clicks'],
  impressions: ['impr', 'impressions'],
  cost: ['cost'],
  conversions: ['conversions', 'conv'],
  ctr: ['ctr'],
  cpc: ['avg cpc', 'cpc', 'average cpc'],
};

const parseInteger = (value: string): number => {
  const n = parseInt(value.replace(/,/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
};

const parseFloatValue = (value: string): number => {
  const cleaned = value.replace(/[$,%\s]/g, '').replace(/,/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
};

export interface ParsedFixtureRow {
  reportType: ReportType;
  rowIndex: number;
  campaignName: string;
  dimensionValue: string;
  clicks: number;
  impressions: number;
  cost: number;
  conversions: number;
  ctr: number | null;
  cpc: number | null;
  cpa: number | null;
}

const resolveIndexesForType = (
  reportType: ReportType,
  headerResult: NormalizedHeaderResult
) => {
  switch (reportType) {
    case 'SEARCH_TERMS':
      return {
        dimension: resolveFieldIndex(
          headerResult,
          ['searchTerm'],
          searchTermHeaderAliases.searchTerm!
        ),
        campaignName: resolveFieldIndex(
          headerResult,
          ['campaignName'],
          searchTermHeaderAliases.campaignName!
        ),
        clicks: resolveFieldIndex(
          headerResult,
          ['clicks'],
          searchTermHeaderAliases.clicks!
        ),
        impressions: resolveFieldIndex(
          headerResult,
          ['impressions'],
          searchTermHeaderAliases.impressions!
        ),
        cost: resolveFieldIndex(
          headerResult,
          ['cost'],
          searchTermHeaderAliases.cost!
        ),
        conversions: resolveFieldIndex(
          headerResult,
          ['conversions'],
          searchTermHeaderAliases.conversions!
        ),
        ctr: resolveFieldIndex(
          headerResult,
          ['ctr'],
          searchTermHeaderAliases.ctr!
        ),
        cpc: resolveFieldIndex(
          headerResult,
          ['avgCpc', 'cpc'],
          searchTermHeaderAliases.cpc!
        ),
      };
    case 'KEYWORDS':
      return {
        dimension: resolveFieldIndex(
          headerResult,
          ['keywordText'],
          keywordHeaderAliases.keywordText!
        ),
        campaignName: resolveFieldIndex(
          headerResult,
          ['campaignName'],
          keywordHeaderAliases.campaignName!
        ),
        clicks: resolveFieldIndex(
          headerResult,
          ['clicks'],
          keywordHeaderAliases.clicks!
        ),
        impressions: resolveFieldIndex(
          headerResult,
          ['impressions'],
          keywordHeaderAliases.impressions!
        ),
        cost: resolveFieldIndex(
          headerResult,
          ['cost'],
          keywordHeaderAliases.cost!
        ),
        conversions: resolveFieldIndex(
          headerResult,
          ['conversions'],
          keywordHeaderAliases.conversions!
        ),
        ctr: resolveFieldIndex(
          headerResult,
          ['ctr'],
          keywordHeaderAliases.ctr!
        ),
        cpc: resolveFieldIndex(
          headerResult,
          ['avgCpc', 'cpc'],
          keywordHeaderAliases.cpc!
        ),
      };
    case 'PLACEMENT':
      return {
        dimension: resolveFieldIndex(
          headerResult,
          ['placement'],
          placementHeaderAliases.placement!
        ),
        campaignName: resolveFieldIndex(
          headerResult,
          ['campaignName'],
          placementHeaderAliases.campaignName!
        ),
        clicks: resolveFieldIndex(
          headerResult,
          ['clicks'],
          placementHeaderAliases.clicks!
        ),
        impressions: resolveFieldIndex(
          headerResult,
          ['impressions'],
          placementHeaderAliases.impressions!
        ),
        cost: resolveFieldIndex(
          headerResult,
          ['cost'],
          placementHeaderAliases.cost!
        ),
        conversions: resolveFieldIndex(
          headerResult,
          ['conversions'],
          placementHeaderAliases.conversions!
        ),
        ctr: resolveFieldIndex(
          headerResult,
          ['ctr'],
          placementHeaderAliases.ctr!
        ),
        cpc: resolveFieldIndex(
          headerResult,
          ['avgCpc', 'cpc'],
          placementHeaderAliases.cpc!
        ),
      };
    default:
      return null;
  }
};

/**
 * Pure CSV fixture parser for QA tests — mirrors core search/keyword/placement
 * parsing rules without Prisma or filesystem I/O.
 */
export const parseGoogleAdsFixtureCsv = (
  fileName: string,
  csvContent: string
): ParsedFixtureRow[] => {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) return [];

  const headerLine = lines[0]!;
  const headers = parseCsvLine(headerLine);
  const detection = detectReportTypeAdvanced(fileName, headers);
  if (!detection.reportType) return [];

  const reportType = detection.reportType;
  const headerResult: NormalizedHeaderResult = normalizeAndMapHeaders(headers);
  const indexByField = resolveIndexesForType(reportType, headerResult);

  if (
    !indexByField ||
    indexByField.dimension < 0 ||
    indexByField.clicks < 0 ||
    indexByField.impressions < 0 ||
    indexByField.cost < 0
  ) {
    return [];
  }

  const rows: ParsedFixtureRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i]!);
    const dimensionValue = (cells[indexByField.dimension] ?? '').trim();
    if (!dimensionValue) continue;

    const campaignName =
      indexByField.campaignName >= 0
        ? (cells[indexByField.campaignName] ?? '').trim()
        : '';

    const clicks = parseInteger(cells[indexByField.clicks] ?? '');
    const impressions = parseInteger(cells[indexByField.impressions] ?? '');
    const cost = parseFloatValue(cells[indexByField.cost] ?? '');
    const conversions =
      indexByField.conversions >= 0
        ? parseFloatValue(cells[indexByField.conversions] ?? '')
        : 0;

    const ctrFromFile =
      indexByField.ctr >= 0 ? parseFloatValue(cells[indexByField.ctr] ?? '') : null;
    const cpcFromFile =
      indexByField.cpc >= 0 ? parseFloatValue(cells[indexByField.cpc] ?? '') : null;

    rows.push({
      reportType,
      rowIndex: i,
      campaignName,
      dimensionValue,
      clicks,
      impressions,
      cost,
      conversions,
      ctr: computeCtr(clicks, impressions, ctrFromFile || null),
      cpc: computeCpc(cost, clicks, cpcFromFile || null),
      cpa: computeCpa(cost, conversions),
    });
  }

  return rows;
};
