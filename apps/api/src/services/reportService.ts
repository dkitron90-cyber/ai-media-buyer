import { prisma } from '../db/prisma';
import {
  determineRequiredReports,
  SUPPORTED_REPORT_TYPES,
  type ReportType,
} from '../lib/reportTypes';
import {
  detectReportTypeAdvanced,
  buildDetectionErrorMessage,
} from '../lib/reportDetector';
import { loadCsvMetadata, parseDelimitedLine } from '../lib/universalCsv';
import { parseReportByType } from './reportParsingService';
import { inferFileMappingWithAi, buildAiPreviewFromMetadata, type AiFileMappingResult, type AiCanonicalColumnKey } from './aiFileMappingService';
import { normalizeHeader } from '../lib/csv';
import { normalizeAndMapHeaders } from '../lib/headerNormalizer';
import path from 'path';
import fs from 'fs/promises';

const CSV_DELIMITER = ',';

const escapeCsvCell = (value: string): string => {
  const needsQuoting = value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r');
  if (!needsQuoting) return value;
  return `"${value.replace(/"/g, '""')}"`;
};

const serializeCsvRow = (cells: string[]): string => {
  return cells.map((c) => escapeCsvCell(c)).join(CSV_DELIMITER);
};

const canonicalFieldToHeaderAlias = (key: AiCanonicalColumnKey): string => {
  // Values must be compatible with `normalizeAndMapHeaders` (headerNormalizer CANONICAL_HEADER_MAP keys).
  switch (key) {
    case 'campaignName':
      return 'Campaign';
    case 'searchTerm':
      return 'Search term';
    case 'keywordText':
      return 'Keyword text';
    case 'device':
      return 'Device';
    case 'placement':
      return 'Placement';
    case 'displayName':
      return 'Display name';
    case 'location':
      return 'Location';
    case 'country':
      return 'Country';
    case 'region':
      return 'Region';
    case 'city':
      return 'City';
    case 'ageRange':
      return 'Age range';
    case 'gender':
      return 'Gender';
    case 'parentalStatus':
      return 'Parental status';
    case 'audienceName':
      return 'Audience';
    case 'audienceType':
      return 'Audience type';
    case 'dayOfWeek':
      return 'Day of week';
    case 'hourOfDay':
      return 'Hour of day';
    case 'impressions':
      return 'Impressions';
    case 'clicks':
      return 'Clicks';
    case 'cost':
      return 'Cost';
    case 'conversions':
      return 'Conversions';
    case 'ctr':
      return 'CTR';
    case 'avgCpc':
      return 'Avg cpc';
    case 'conversionValue':
      return 'Conversion value';
    case 'costPerConversion':
      return 'Cost / conv';
    default:
      return key;
  }
};

const findHeaderCellIndexByAiMapping = (headerCells: string[], mappingValue: string): number => {
  const target = normalizeHeader(mappingValue);
  for (let i = 0; i < headerCells.length; i += 1) {
    if (normalizeHeader(headerCells[i] ?? '') === target) return i;
  }

  // Soft fallback: substring match after normalization (still conservative).
  for (let i = 0; i < headerCells.length; i += 1) {
    const normCell = normalizeHeader(headerCells[i] ?? '');
    if (!normCell) continue;
    if (normCell.includes(target) || target.includes(normCell)) return i;
  }

  return -1;
};

const getRequiredHeaderKeysForAiReportType = (reportType: AiFileMappingResult['reportType']): {
  dimensionKeys: AiCanonicalColumnKey[];
  metricKeys: AiCanonicalColumnKey[];
} => {
  const metrics: AiCanonicalColumnKey[] = ['clicks', 'impressions', 'cost', 'conversions'];
  switch (reportType) {
    case 'SEARCH_TERMS':
      return { dimensionKeys: ['searchTerm'], metricKeys: metrics };
    case 'KEYWORDS':
      return { dimensionKeys: ['keywordText'], metricKeys: metrics };
    case 'DEVICE':
      return { dimensionKeys: ['device'], metricKeys: metrics };
    case 'PLACEMENT':
      // For PLACEMENT we only require the placement dimension; metrics can be optional.
      return { dimensionKeys: ['placement'], metricKeys: [] };
    case 'GEOGRAPHIC':
      return { dimensionKeys: ['location'], metricKeys: metrics };
    case 'AUDIENCE':
      return { dimensionKeys: ['audienceName'], metricKeys: metrics };
    case 'AD_SCHEDULE':
      return { dimensionKeys: ['dayOfWeek', 'hourOfDay'], metricKeys: metrics };
    case 'DEMOGRAPHICS':
      // demographicType can be one of several; parser accepts any.
      return { dimensionKeys: ['ageRange', 'gender', 'parentalStatus'], metricKeys: metrics };
    case 'CAMPAIGN':
      // campaignName is populated from DB fallback in parser, so it should not block rescue.
      return { dimensionKeys: [], metricKeys: metrics };
    default:
      return { dimensionKeys: [], metricKeys: [] };
  }
};

const buildAiMappedTempCsvFile = async (args: {
  originalFilePath: string;
  originalFileName: string;
  meta: Awaited<ReturnType<typeof loadCsvMetadata>>;
  aiMapping: AiFileMappingResult;
  cacheKey: string;
}): Promise<{ tempFilePath: string }> => {
  const { originalFilePath, originalFileName, meta, aiMapping } = args;

  const traceNeedle = process.env.AI_MAPPING_TRACE_FILE?.trim().toLowerCase() ?? '';
  const traceOn =
    !!traceNeedle &&
    `${originalFileName} ${originalFilePath} ${args.cacheKey}`.toLowerCase().includes(traceNeedle);
  const traceLog = (...logArgs: unknown[]) => {
    if (!traceOn) return;
    // eslint-disable-next-line no-console
    console.log('[AI_MAP_TRACE]', ...logArgs);
  };

  const chosenHeaderRowIndex = aiMapping.headerRowIndex ?? meta.headerRowIndex;
  if (
    chosenHeaderRowIndex < 0 ||
    chosenHeaderRowIndex >= meta.lines.length
  ) {
    throw new Error('AI mapping returned an out-of-bounds headerRowIndex.');
  }

  traceLog('chosenHeaderRowIndex:', chosenHeaderRowIndex, 'reportType:', aiMapping.reportType);
  traceLog('non-null mapping entries:', Object.entries(aiMapping.columnMapping).filter(([, v]) => v).slice(0, 20));

  const headerCells = parseDelimitedLine(
    meta.lines[chosenHeaderRowIndex]!,
    meta.delimiter
  );

  // Create a synthetic canonical header row (parser uses `normalizeAndMapHeaders` / alias resolution).
  const syntheticHeaderCells = headerCells.slice();

  // Apply AI-driven mapping replacements.
  for (const [canonicalKey, mappingValue] of Object.entries(aiMapping.columnMapping) as Array<[AiCanonicalColumnKey, string | null]>) {
    if (!mappingValue) continue;
    const idx = findHeaderCellIndexByAiMapping(headerCells, mappingValue);
    if (idx >= 0) {
      syntheticHeaderCells[idx] = canonicalFieldToHeaderAlias(canonicalKey);
    }
  }

  // Extra: for DEMOGRAPHICS the parser expects the "demographicValue" via fallback aliases like "value"/"segment"/"range".
  // If we can detect those from the header, normalize them to "Value" for robustness.
  if (aiMapping.reportType === 'DEMOGRAPHICS') {
    for (let i = 0; i < syntheticHeaderCells.length; i += 1) {
      const norm = normalizeHeader(syntheticHeaderCells[i] ?? '');
      if (norm === 'value' || norm === 'segment' || norm === 'range') {
        syntheticHeaderCells[i] = 'Value';
        break;
      }
    }
  }

  const headerLine = serializeCsvRow(syntheticHeaderCells);

  const { delimiter } = meta;

  // Write only the header + data rows after it; also filter obvious totals rows.
  const outputLines: string[] = [headerLine];
  for (let i = chosenHeaderRowIndex + 1; i < meta.lines.length; i += 1) {
    const rawLine = meta.lines[i]!;
    if (!rawLine.trim()) continue;
    const cells = parseDelimitedLine(rawLine, delimiter).map((c) => c ?? '');
    const firstCell = (cells[0] ?? '').trim().toLowerCase();
    if (firstCell.startsWith('total:') || firstCell === 'total') continue;
    outputLines.push(serializeCsvRow(cells));
  }

  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  const safeBase = originalFileName.trim().replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const tempName = `${Date.now()}-${safeBase}-ai-mapped`;
  const tempFilePath = path.join(uploadsDir, tempName);

  await fs.writeFile(tempFilePath, outputLines.join('\n'), { encoding: 'utf8' });
  traceLog('temp file written:', tempFilePath, 'outputLines:', outputLines.length);
  return { tempFilePath };
};

export interface SaveUploadedReportInput {
  campaignId: number;
  fileName: string;
  filePath: string;
  fileSizeBytes?: number;
}

export const saveUploadedReport = async (input: SaveUploadedReportInput) => {
  const { campaignId, fileName, filePath, fileSizeBytes } = input;
  const traceNeedle = process.env.AI_MAPPING_TRACE_FILE?.trim().toLowerCase() ?? '';
  const traceOn =
    !!traceNeedle && `${fileName} ${filePath}`.toLowerCase().includes(traceNeedle);
  const traceLog = (...args: unknown[]) => {
    if (!traceOn) return;
    // eslint-disable-next-line no-console
    console.log('[SAVE_UPLOAD_TRACE]', ...args);
  };

  const meta = await loadCsvMetadata(filePath);
  const headers = meta.headerRow;
  traceLog('encoding/delimiter detected:', {
    encoding: meta.encoding,
    delimiter: meta.delimiter,
    firstLines: meta.lines.slice(0, 10),
    deterministicHeaderRowIndex: meta.headerRowIndex,
  });
  const detection = detectReportTypeAdvanced(fileName, headers);

  if (!detection.reportType) {
    traceLog('deterministic detection failed', {
      reportType: detection.reportType,
      source: detection.source,
      recognizedFields: Array.from(detection.headerResult.canonicalFields),
      headerRowIndex: meta.headerRowIndex,
    });
    // Rescue path: deterministic detection failed, try AI-assisted header + mapping.
    const deterministicWarnings = [
      buildDetectionErrorMessage(fileName, detection.headerResult),
      'Deterministic reportType detection returned null.',
    ];

    try {
      const preview = await buildAiPreviewFromMetadata({
        filePath,
        fileName,
        deterministicWarnings,
      });

      const aiMapping = await inferFileMappingWithAi({
        cacheKey: `saveUploadedReport:${filePath}`,
        fileName,
        filePath,
        preview,
      });
      traceLog('AI mapping validated:', {
        reportType: aiMapping.reportType,
        headerRowIndex: aiMapping.headerRowIndex,
        confidence: aiMapping.confidence,
        warnings: aiMapping.warnings,
      });

      const chosenReportType = aiMapping.reportType;
      if (chosenReportType === 'UNKNOWN') {
        throw new Error('AI mapping could not infer a report type.');
      }

      // Basic validation: required dimension + metric headers must exist after mapping.
      const required = getRequiredHeaderKeysForAiReportType(chosenReportType);
      const headerRowIndex = aiMapping.headerRowIndex ?? meta.headerRowIndex;
      if (headerRowIndex < 0 || headerRowIndex >= meta.lines.length) {
        throw new Error('AI mapping headerRowIndex out of bounds.');
      }

      const headerCells = parseDelimitedLine(meta.lines[headerRowIndex]!, meta.delimiter);

      const syntheticHeaderCells = headerCells.slice();
      for (const [canonicalKey, mappingValue] of Object.entries(aiMapping.columnMapping) as Array<[AiCanonicalColumnKey, string | null]>) {
        if (!mappingValue) continue;
        const idx = findHeaderCellIndexByAiMapping(headerCells, mappingValue);
        if (idx >= 0) syntheticHeaderCells[idx] = canonicalFieldToHeaderAlias(canonicalKey);
      }

      const headerResult = normalizeAndMapHeaders(syntheticHeaderCells);

      const missingMetrics = required.metricKeys.filter((k) => headerResult.fieldIndexMap.get(k) == null);
      const missingDimensions =
        required.dimensionKeys.length === 0
          ? []
          : chosenReportType === 'DEMOGRAPHICS'
            ? required.dimensionKeys.some((k) => headerResult.fieldIndexMap.get(k) != null)
              ? []
              : required.dimensionKeys
            : required.dimensionKeys.filter((k) => headerResult.fieldIndexMap.get(k) == null);

      if (missingMetrics.length > 0 || missingDimensions.length > 0) {
        traceLog('AI validation rejected mapping', {
          missingMetrics,
          missingDimensions,
          required,
        });
        throw new Error('AI mapping validation failed: required headers missing.');
      }

      const { tempFilePath } = await buildAiMappedTempCsvFile({
        originalFilePath: filePath,
        originalFileName: fileName,
        meta,
        aiMapping,
        cacheKey: filePath,
      });
      traceLog('AI mapped temp file written:', { tempFilePath });

      // Now save using AI-inferred reportType.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reportType = chosenReportType as any as ReportType;
      return prisma.uploadedReport.create({
        data: {
          campaignId,
          reportType,
          fileName: fileName.trim(),
          filePath: tempFilePath,
          uploadStatus: 'UPLOADED',
          fileSizeBytes: fileSizeBytes ?? undefined,
        },
      });
    } catch (aiErr) {
      // If AI fails, keep the clean deterministic error.
      const message =
        aiErr instanceof Error ? aiErr.message : 'AI mapping failed.';
      throw new Error(
        buildDetectionErrorMessage(fileName, detection.headerResult) +
          `\nAI mapping attempt failed: ${message}`
      );
    }
  }

  console.log(
    `[ReportDetection] "${fileName}" → ${detection.reportType} (source: ${detection.source})`
  );

  return prisma.uploadedReport.create({
    data: {
      campaignId,
      reportType: detection.reportType,
      fileName: fileName.trim(),
      filePath,
      uploadStatus: 'UPLOADED',
      fileSizeBytes: fileSizeBytes ?? undefined,
    },
  });
};

export const listUploadedReports = async (campaignId: number) => {
  return prisma.uploadedReport.findMany({
    where: { campaignId },
    orderBy: { uploadedAt: 'desc' },
  });
};

export interface ReportStatus {
  campaignId: number;
  campaignType: string;
  relevantReportTypes: ReportType[];
  uploadedReportTypes: ReportType[];
  missingReportTypes: ReportType[];
  uploadedReports: Awaited<ReturnType<typeof listUploadedReports>>;
}

export const getReportStatus = async (
  campaignId: number,
  campaignType: string
): Promise<ReportStatus> => {
  const uploadedReports = await listUploadedReports(campaignId);
  const relevantReportTypes = determineRequiredReports(campaignType);

  const uploadedRelevantTypes = new Set<ReportType>();
  for (const report of uploadedReports) {
    const reportType = report.reportType as ReportType;
    if (relevantReportTypes.includes(reportType)) {
      uploadedRelevantTypes.add(reportType);
    }
  }

  const uploadedReportTypes = Array.from(uploadedRelevantTypes);
  const missingReportTypes = relevantReportTypes.filter(
    (required) => !uploadedRelevantTypes.has(required)
  );

  return {
    campaignId,
    campaignType,
    relevantReportTypes,
    uploadedReportTypes,
    missingReportTypes,
    uploadedReports,
  };
};

export interface AutoParseResult {
  attempted: boolean;
  success: boolean;
  parsedRowCount: number | null;
  error: string | null;
}

const isSupportedReportType = (type: string): type is ReportType =>
  (SUPPORTED_REPORT_TYPES as readonly string[]).includes(type);

const aiAutoParseAttempted = new Set<number>();

export const autoParseReport = async (
  reportId: number,
  reportType: string
): Promise<AutoParseResult> => {
  if (!isSupportedReportType(reportType)) {
    return { attempted: false, success: false, parsedRowCount: null, error: null };
  }

  try {
    const result = await parseReportByType(reportId, reportType);
    return {
      attempted: true,
      success: true,
      parsedRowCount: result.parsedRowCount,
      error: null,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Auto-parse failed for unknown reason.';
    console.error(`[AutoParse] Report ${reportId} (${reportType}): ${message}`);

    const maybeAiRescue =
      typeof message === 'string' &&
      (message.includes('Missing required') ||
        message.includes('header row') ||
        message.includes('No header') ||
        message.includes('Could not detect report type'));

    if (!maybeAiRescue || aiAutoParseAttempted.has(reportId)) {
      return { attempted: true, success: false, parsedRowCount: null, error: message };
    }

    aiAutoParseAttempted.add(reportId);
    try {
      const report = await prisma.uploadedReport.findUnique({
        where: { id: reportId },
      });
      if (!report) {
        return { attempted: true, success: false, parsedRowCount: null, error: message };
      }

      const traceNeedle = process.env.AI_MAPPING_TRACE_FILE?.trim().toLowerCase() ?? '';
      const traceOn =
        !!traceNeedle && `${report.fileName} ${report.filePath}`.toLowerCase().includes(traceNeedle);
      const traceLog = (...args: unknown[]) => {
        if (!traceOn) return;
        // eslint-disable-next-line no-console
        console.log('[AUTOPARSE_TRACE]', ...args);
      };

      traceLog('AI rescue triggered due to parse error:', message);

      const preview = await buildAiPreviewFromMetadata({
        filePath: report.filePath,
        fileName: report.fileName ?? 'unknown.csv',
        deterministicWarnings: [message],
      });

      const aiMapping = await inferFileMappingWithAi({
        cacheKey: `autoParseReport:${report.filePath}`,
        fileName: report.fileName ?? 'unknown.csv',
        filePath: report.filePath,
        preview,
      });

      traceLog('AI mapping validated:', {
        used: aiMapping.reportType !== 'UNKNOWN',
        reportType: aiMapping.reportType,
        headerRowIndex: aiMapping.headerRowIndex,
        confidence: aiMapping.confidence,
      });

      if (aiMapping.reportType === 'UNKNOWN') {
        return { attempted: true, success: false, parsedRowCount: null, error: message };
      }

      const newType = aiMapping.reportType as unknown as ReportType;
      const meta = await loadCsvMetadata(report.filePath);

      const originalFilePath = report.filePath;
      const originalReportType = report.reportType as unknown as ReportType;

      const { tempFilePath } = await buildAiMappedTempCsvFile({
        originalFilePath: report.filePath,
        originalFileName: report.fileName ?? 'unknown.csv',
        meta,
        aiMapping,
        cacheKey: report.filePath,
      });

      try {
        await prisma.uploadedReport.update({
          where: { id: reportId },
          data: {
            filePath: tempFilePath,
            reportType: newType,
          },
        });

        traceLog('DB updated for AI mapped temp file:', { tempFilePath, newType });

        const result = await parseReportByType(reportId, newType);
        return {
          attempted: true,
          success: true,
          parsedRowCount: result.parsedRowCount,
          error: null,
        };
      } catch (parseErr) {
        // Validation failed at parsing time; revert DB writes to the original state.
        await prisma.uploadedReport.update({
          where: { id: reportId },
          data: {
            filePath: originalFilePath,
            reportType: originalReportType,
          },
        });
        traceLog('AI-mapped parse still failed:', parseErr);

        const parseMessage =
          parseErr instanceof Error ? parseErr.message : 'AI-mapped parse failed.';
        return {
          attempted: true,
          success: false,
          parsedRowCount: null,
          error:
            `${parseMessage}\n` +
            `[aiFallbackUsed=true]\n` +
            `aiReportType=${aiMapping.reportType}, aiConfidence=${aiMapping.confidence}, ` +
            `aiHeaderRowIndex=${aiMapping.headerRowIndex ?? 'null'}`,
        };
      }
    } catch {
      return {
        attempted: true,
        success: false,
        parsedRowCount: null,
        error: `${message}\n[aiFallbackUsed=true]`,
      };
    }

    return { attempted: true, success: false, parsedRowCount: null, error: message };
  }
};

export const getUploadedReportById = async (id: number) => {
  return prisma.uploadedReport.findUnique({ where: { id } });
};

export const deleteUploadedReportById = async (id: number) => {
  const existing = await prisma.uploadedReport.findUnique({ where: { id } });
  if (!existing) return { deleted: false, filePath: null as string | null };

  await prisma.$transaction(async (tx) => {
    await tx.searchTermReportRow.deleteMany({ where: { uploadedReportId: id } });
    await tx.keywordReportRow.deleteMany({ where: { uploadedReportId: id } });
    await tx.deviceReportRow.deleteMany({ where: { uploadedReportId: id } });
    await tx.placementReportRow.deleteMany({ where: { uploadedReportId: id } });
    await tx.geographicReportRow.deleteMany({ where: { uploadedReportId: id } });
    await tx.demographicsReportRow.deleteMany({ where: { uploadedReportId: id } });
    await tx.audienceReportRow.deleteMany({ where: { uploadedReportId: id } });
    await tx.adScheduleReportRow.deleteMany({ where: { uploadedReportId: id } });
    await tx.campaignReportRow.deleteMany({ where: { uploadedReportId: id } });

    await tx.uploadedReport.delete({ where: { id } });
  });

  return { deleted: true, filePath: existing.filePath };
};
