import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../db/prisma';
import { detectReportTypeAdvanced } from '../lib/reportDetector';
import { normalizeHeader } from '../lib/csv';
import {
  loadCsvMetadata,
  parseDelimitedLine,
  type SupportedEncoding,
} from '../lib/universalCsv';
import {
  inferFileMappingWithAi,
  buildAiPreviewFromMetadata,
  type AiFileMappingResult,
  type AiCanonicalColumnKey,
  type AiConfidence,
} from './aiFileMappingService';
import { normalizeForCampaignMatch } from '../lib/campaignNameMatch';
import {
  inferCampaignTypeForImport,
  type CampaignTypeInferenceSource,
} from '../lib/inferCampaignType';
import type { CanonicalCampaignTypeCode } from '../campaignTypes/types';
import { getUploadsDir } from '../lib/runtimePaths';

const uploadsDir = getUploadsDir();

export { normalizeForCampaignMatch } from '../lib/campaignNameMatch';

const tryParseDate = (value: string): Date | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // ISO-like (2026-03-18)
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime())) return d;
  }

  // Slash formats (3/18/2026 or 03/18/26)
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(trimmed)) {
    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime())) return d;
  }

  // Month name formats (March 18, 2026)
  if (
    /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}$/i.test(
      trimmed
    )
  ) {
    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime())) return d;
  }

  return null;
};

export type ReportIntakeMatchStatus = 'exact' | 'normalized' | 'no_match';

export interface ReportIntakeCampaignMatch {
  campaignName: string;
  matchedCampaignId: number | null;
  matchedCampaignName: string | null;
  matchStatus: ReportIntakeMatchStatus;
  inferredCampaignType: CanonicalCampaignTypeCode;
  inferredCampaignTypeSource: CampaignTypeInferenceSource;
  inferredCampaignTypeConfidence: 'high' | 'medium' | 'low';
}

export interface ReportInspectionResult {
  stagingId: string;
  reportType: string | null;
  fileName: string;
  detectedEncoding: SupportedEncoding;
  detectedDelimiter: string;
  detectedHeaderRowIndex: number;
  originalHeaders: string[];
  normalizedHeaders: string[];
  detectedCampaignColumnName: string | null;
  numberOfRowsScanned: number;
  numberOfCampaignRowsDetected: number;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  campaignNames: string[];
  campaignMatches: ReportIntakeCampaignMatch[];
  previewRowCount: number;
  warnings: string[];
  inferredCampaignType: CanonicalCampaignTypeCode;
  inferredCampaignTypeSource: CampaignTypeInferenceSource;
  inferredCampaignTypeConfidence: 'high' | 'medium' | 'low';
  // Optional AI diagnostics for debugging "messy export" rescue path.
  aiMappingUsed?: boolean;
  aiConfidence?: AiConfidence;
  aiHeaderRowIndex?: number | null;
  aiColumnMapping?: Partial<Record<AiCanonicalColumnKey, string | null>>;
}

export const inspectUploadedReportFile = async (
  filePath: string,
  originalFileName: string,
  clientId?: number
): Promise<ReportInspectionResult> => {
  const meta = await loadCsvMetadata(filePath);
  const {
    encoding,
    delimiter: detectedDelimiter,
    lines,
    headerRowIndex,
    headerRow,
    headerResult,
  } = meta;
  const warnings: string[] = [];

  if (lines.length === 0) {
    warnings.push('File appears to be empty.');
  }

  const traceNeedle = process.env.AI_MAPPING_TRACE_FILE?.trim().toLowerCase() ?? '';
  const traceOn =
    !!traceNeedle && `${originalFileName} ${filePath}`.toLowerCase().includes(traceNeedle);
  const traceLog = (...args: unknown[]) => {
    if (!traceOn) return;
    // eslint-disable-next-line no-console
    console.log('[INTAKE_TRACE]', ...args);
  };

  traceLog('encoding detected:', encoding, 'delimiter detected:', detectedDelimiter);
  traceLog('first decoded non-empty lines:', lines.slice(0, 10));

  let effectiveHeaderRowIndex = headerRowIndex;
  let effectiveHeaders = headerRow;
  let effectiveNormalizedHeaders = effectiveHeaders.map((h) => normalizeHeader(h));

  if (effectiveHeaders.length === 0) {
    warnings.push('No header row could be read from the report.');
  }

  const detection = detectReportTypeAdvanced(originalFileName, effectiveHeaders);
  traceLog('deterministic detection result:', {
    reportType: detection.reportType,
    source: detection.source,
    recognizedFields: Array.from(detection.headerResult.canonicalFields),
  });
  let effectiveReportType: string | null = detection.reportType;

  if (!detection.reportType) {
    warnings.push('Could not confidently detect report type from headers or filename.');
  }

  // Campaign names (same column resolution as split/attach)
  let campaignIndex = headerResult.fieldIndexMap.get('campaignName');
  if (campaignIndex === undefined || campaignIndex < 0) {
    campaignIndex = effectiveNormalizedHeaders.findIndex(
      (h) => h === 'campaign name' || h === 'campaign'
    );
  }

  const looksLikeGoogleAdsExport = (): boolean => {
    const haystack = [
      ...effectiveNormalizedHeaders,
      ...effectiveHeaders.map((h) => normalizeHeader(h)),
      originalFileName.toLowerCase(),
    ].join(' ');
    return [
      'clicks',
      'impr',
      'impressions',
      'cost',
      'conversions',
      'campaign',
      'placement',
      'keyword',
      'device',
      'audience',
    ].some((kw) => haystack.includes(kw));
  };

  let aiMappingUsed = false;
  let aiConfidence: AiConfidence | undefined;
  let aiHeaderRowIndex: number | null | undefined;
  let aiColumnMapping: AiFileMappingResult['columnMapping'] | undefined;

  const shouldTriggerAi =
    (!detection.reportType || (campaignIndex !== undefined && campaignIndex < 0)) &&
    looksLikeGoogleAdsExport();
  traceLog('AI fallback trigger check:', {
    shouldTriggerAi,
    detectionReportType: detection.reportType,
    campaignIndex,
    looksLikeGoogleAdsExport: looksLikeGoogleAdsExport(),
  });

  if (shouldTriggerAi) {
    try {
      const aiDeterministicWarnings: string[] = [...warnings];
      if (!detection.reportType) {
        aiDeterministicWarnings.push('Report type detection failed (reportType=null).');
      }
      if (campaignIndex === undefined || campaignIndex < 0) {
        aiDeterministicWarnings.push('Campaign name column was not detected.');
      }

      const preview = await buildAiPreviewFromMetadata({
        filePath,
        fileName: originalFileName,
        deterministicWarnings: aiDeterministicWarnings,
      });

      const aiMapping = await inferFileMappingWithAi({
        cacheKey: `inspectUploadedReportFile:${filePath}`,
        fileName: originalFileName,
        filePath,
        preview,
      });

      aiMappingUsed = aiMapping.reportType !== 'UNKNOWN';
      aiConfidence = aiMapping.confidence;
      aiHeaderRowIndex = aiMapping.headerRowIndex;
      aiColumnMapping = aiMapping.columnMapping;
      traceLog('AI fallback result (validated):', {
        used: aiMappingUsed,
        reportType: aiMapping.reportType,
        headerRowIndex: aiMapping.headerRowIndex,
        confidence: aiMapping.confidence,
        columnMapping: aiMapping.columnMapping,
        warnings: aiMapping.warnings,
        notes: aiMapping.notes,
      });

      if (aiMapping.reportType !== 'UNKNOWN') {
        effectiveReportType = aiMapping.reportType;
      }

      // Validate headerRowIndex bounds if present.
      if (
        aiMapping.headerRowIndex !== null &&
        aiMapping.headerRowIndex >= 0 &&
        aiMapping.headerRowIndex < lines.length
      ) {
        effectiveHeaderRowIndex = aiMapping.headerRowIndex;
        effectiveHeaders = parseDelimitedLine(
          lines[effectiveHeaderRowIndex]!,
          detectedDelimiter
        );
        effectiveNormalizedHeaders = effectiveHeaders.map((h) => normalizeHeader(h));
      }

      // Update campaignIndex when campaignName column is missing.
      if (aiMapping.columnMapping.campaignName) {
        const target = normalizeHeader(aiMapping.columnMapping.campaignName);
        const idx = effectiveHeaders.findIndex(
          (h) => normalizeHeader(h ?? '') === target
        );
        if (idx >= 0) campaignIndex = idx;
      }
      if (campaignIndex === undefined || campaignIndex < 0) {
        campaignIndex = effectiveNormalizedHeaders.findIndex(
          (h) => h === 'campaign name' || h === 'campaign'
        );
      }

      if (aiMapping.warnings?.length) {
        warnings.push(...aiMapping.warnings);
      }
      if (aiMapping.notes?.length) {
        warnings.push(...aiMapping.notes);
      }
    } catch {
      // Ignore AI failures; return deterministic output.
    }
  }

  const campaignNameSet = new Set<string>();
  let rowCountPreview = 0;
  let campaignRowCount = 0;

  for (let i = effectiveHeaderRowIndex + 1; i < lines.length; i += 1) {
    const raw = lines[i]!;
    const cells = parseDelimitedLine(raw, detectedDelimiter);
    if (cells.every((c) => !c.trim())) continue;
    const firstCell = cells[0]?.trim().toLowerCase() ?? '';
    if (firstCell.startsWith('total:') || firstCell === 'total') continue;
    rowCountPreview += 1;
    if (campaignIndex >= 0 && campaignIndex < cells.length) {
      const name = cells[campaignIndex]!.trim();
      if (name) {
        campaignNameSet.add(name);
        campaignRowCount += 1;
      }
    }
    if (rowCountPreview >= 5000) break;
  }

  if (campaignIndex < 0) {
    warnings.push('No campaign name column was detected in the report header.');
  }

  // Date range detection (best-effort)
  let dateRangeStart: string | null = null;
  let dateRangeEnd: string | null = null;

  // 1) Try preamble rows above the header for a date range like "March 18, 2026 - March 19, 2026"
  for (let i = 0; i < effectiveHeaderRowIndex; i += 1) {
    const line = lines[i] ?? '';
    const rangeMatch = line.match(/(.+?)\s*-\s*(.+)/);
    if (!rangeMatch) continue;
    const left = rangeMatch[1]?.trim() ?? '';
    const right = rangeMatch[2]?.trim() ?? '';
    const start = tryParseDate(left);
    const end = tryParseDate(right);
    if (start && end) {
      dateRangeStart = start.toISOString();
      dateRangeEnd = end.toISOString();
      break;
    }
  }

  const dateHeaderIndex = effectiveNormalizedHeaders.findIndex(
    (h) => h === 'day' || h === 'date' || h === 'report date'
  );

  // 2) If not found in preamble, fall back to scanning date column (if present)
  if ((!dateRangeStart || !dateRangeEnd) && dateHeaderIndex >= 0) {
    let min: Date | null = null;
    let max: Date | null = null;
    for (let i = effectiveHeaderRowIndex + 1; i < lines.length; i += 1) {
      const cells = parseDelimitedLine(lines[i]!, detectedDelimiter);
      if (dateHeaderIndex >= cells.length) continue;
      const d = tryParseDate(cells[dateHeaderIndex] ?? '');
      if (!d) continue;
      if (!min || d.getTime() < min.getTime()) min = d;
      if (!max || d.getTime() > max.getTime()) max = d;
    }
    if (min) dateRangeStart = min.toISOString();
    if (max) dateRangeEnd = max.toISOString();
  }

  if (!dateRangeStart || !dateRangeEnd) {
    warnings.push('Could not reliably determine date range from the report.');
  }

  const campaignNames = Array.from(campaignNameSet).sort((a, b) =>
    a.localeCompare(b)
  );

  // Campaign matching: exact name, then normalized (spacing / comma / case),
  // scoped to a specific client when clientId is provided.
  let campaignMatches: ReportIntakeCampaignMatch[] = [];
  if (campaignNames.length > 0) {
    const existing = await prisma.campaign.findMany({
      where: clientId
        ? {
            clientId,
          }
        : undefined,
      select: { id: true, name: true },
    });
    const byExactName = new Map(existing.map((c) => [c.name, c]));
    const byNormKey = new Map<string, { id: number; name: string }[]>();
    for (const c of existing) {
      const key = normalizeForCampaignMatch(c.name);
      const list = byNormKey.get(key) ?? [];
      list.push({ id: c.id, name: c.name });
      byNormKey.set(key, list);
    }

    const buildMatch = (
      campaignName: string,
      base: {
        matchedCampaignId: number | null;
        matchedCampaignName: string | null;
        matchStatus: ReportIntakeMatchStatus;
      }
    ): ReportIntakeCampaignMatch => {
      const inferred = inferCampaignTypeForImport({
        reportType: effectiveReportType,
        campaignName,
      });
      return {
        campaignName,
        ...base,
        inferredCampaignType: inferred.type,
        inferredCampaignTypeSource: inferred.source,
        inferredCampaignTypeConfidence: inferred.confidence,
      };
    };

    campaignMatches = campaignNames.map((campaignName) => {
      const exactHit = byExactName.get(campaignName);
      if (exactHit) {
        return buildMatch(campaignName, {
          matchedCampaignId: exactHit.id,
          matchedCampaignName: exactHit.name,
          matchStatus: 'exact',
        });
      }

      const normKey = normalizeForCampaignMatch(campaignName);
      const candidates = byNormKey.get(normKey) ?? [];
      if (candidates.length === 1) {
        const c = candidates[0]!;
        return buildMatch(campaignName, {
          matchedCampaignId: c.id,
          matchedCampaignName: c.name,
          matchStatus: 'normalized',
        });
      }
      if (candidates.length > 1) {
        const trimmedFile = campaignName.trim();
        const uniqueTrim = candidates.filter((c) => c.name.trim() === trimmedFile);
        if (uniqueTrim.length === 1) {
          const c = uniqueTrim[0]!;
          return buildMatch(campaignName, {
            matchedCampaignId: c.id,
            matchedCampaignName: c.name,
            matchStatus: 'exact',
          });
        }
      }

      return buildMatch(campaignName, {
        matchedCampaignId: null,
        matchedCampaignName: null,
        matchStatus: 'no_match',
      });
    });
  }

  const fileInference = inferCampaignTypeForImport({
    reportType: effectiveReportType,
    campaignName: campaignNames[0] ?? null,
  });

  const unmatched = campaignMatches.filter((m) => m.matchedCampaignId == null);
  if (unmatched.length > 0) {
    warnings.push(
      `Found ${unmatched.length.toString()} campaign name(s) in the file that do not match any existing campaigns.`
    );
  }

  return {
    stagingId: path.basename(filePath),
    reportType: effectiveReportType,
    fileName: originalFileName,
    detectedEncoding: encoding,
    detectedDelimiter,
    detectedHeaderRowIndex: effectiveHeaderRowIndex,
    originalHeaders: effectiveHeaders,
    normalizedHeaders: effectiveNormalizedHeaders,
    detectedCampaignColumnName:
      campaignIndex >= 0 && campaignIndex < effectiveHeaders.length
        ? effectiveHeaders[campaignIndex] ?? null
        : null,
    numberOfRowsScanned: rowCountPreview,
    numberOfCampaignRowsDetected: campaignRowCount,
    dateRangeStart,
    dateRangeEnd,
    campaignNames,
    campaignMatches,
    previewRowCount: rowCountPreview,
    warnings,
    inferredCampaignType: fileInference.type,
    inferredCampaignTypeSource: fileInference.source,
    inferredCampaignTypeConfidence: fileInference.confidence,
    aiMappingUsed,
    aiConfidence,
    aiHeaderRowIndex: aiMappingUsed ? aiHeaderRowIndex : undefined,
    aiColumnMapping: aiMappingUsed ? aiColumnMapping : undefined,
  };
};

export const resolveStagedReportPath = (stagingId: string): string => {
  const baseName = path.basename(stagingId);
  if (!baseName || baseName !== stagingId || baseName.includes('..')) {
    throw new Error('Invalid stagingId.');
  }
  const resolved = path.resolve(uploadsDir, baseName);
  const uploadsResolved = path.resolve(uploadsDir);
  if (
    resolved !== uploadsResolved &&
    !resolved.startsWith(`${uploadsResolved}${path.sep}`)
  ) {
    throw new Error('Invalid stagingId.');
  }
  return resolved;
};

export interface AttachMapping {
  campaignId: number;
  // Optional explicit campaignName used client-side; server always re-resolves from DB
  campaignName?: string;
  /** CSV campaign label to match rows (when remapped to a differently named campaign). */
  sourceCampaignName?: string;
}

export interface AttachResult {
  campaignId: number;
  uploadedReportId: number;
}

/**
 * Split a staged multi-campaign report into per-campaign CSV/TSV files containing
 * only rows for the selected campaigns. This allows reuse of the existing
 * per-campaign parsing pipeline without changing parsers.
 */
export const splitStagedReportByCampaign = async (
  stagingId: string,
  mappings: AttachMapping[]
): Promise<{
  headerLine: string;
  detectedDelimiter: string;
  encoding: SupportedEncoding;
  byCampaign: Map<number, { filePath: string }>;
}> => {
  const stagedPath = resolveStagedReportPath(stagingId);
  const meta = await loadCsvMetadata(stagedPath);
  const {
    delimiter: detectedDelimiter,
    lines,
    headerRowIndex,
    headerResult,
    encoding,
  } = meta;

  if (lines.length === 0) {
    throw new Error('Staged report appears to be empty.');
  }

  let effectiveHeaderRowIndex = headerRowIndex;
  let headerLine = lines[effectiveHeaderRowIndex]!;
  let campaignIndex = headerResult.fieldIndexMap.get('campaignName');
  if (campaignIndex === undefined || campaignIndex < 0) {
    const normalizedHeaders = headerResult.normalizedHeaders;
    campaignIndex = normalizedHeaders.findIndex(
      (h) => h === 'campaign name' || h === 'campaign'
    );
  }
  if (campaignIndex < 0) {
    // Rescue path: use AI to find the real header row + campaignName column.
    try {
      const deterministicWarnings = [
        'Cannot attach report: no campaign name column detected in header.',
      ];

      const preview = await buildAiPreviewFromMetadata({
        filePath: stagedPath,
        fileName: stagingId,
        deterministicWarnings,
      });

      const aiMapping = await inferFileMappingWithAi({
        cacheKey: `splitStagedReportByCampaign:${stagingId}`,
        fileName: stagingId,
        filePath: stagedPath,
        preview,
      });

      if (
        aiMapping.headerRowIndex !== null &&
        aiMapping.headerRowIndex >= 0 &&
        aiMapping.headerRowIndex < lines.length
      ) {
        effectiveHeaderRowIndex = aiMapping.headerRowIndex;
        headerLine = lines[effectiveHeaderRowIndex]!;
      }

      const headerCells = parseDelimitedLine(
        headerLine,
        detectedDelimiter
      );

      if (aiMapping.columnMapping.campaignName) {
        const target = normalizeHeader(aiMapping.columnMapping.campaignName);
        const idx = headerCells.findIndex(
          (h) => normalizeHeader(h ?? '') === target
        );
        if (idx >= 0) campaignIndex = idx;
      }

      if (campaignIndex === undefined || campaignIndex < 0) {
        const normalizedHeaders = headerCells.map((h) => normalizeHeader(h));
        campaignIndex = normalizedHeaders.findIndex(
          (h) => h === 'campaign name' || h === 'campaign'
        );
      }
    } catch {
      // Keep original deterministic error.
    }
  }

  if (campaignIndex < 0) {
    throw new Error('Cannot attach report: no campaign name column detected in header.');
  }

  // Resolve campaignId -> official name to avoid trusting client name blindly.
  const campaignIds = Array.from(
    new Set(mappings.map((m) => m.campaignId).filter((id) => Number.isInteger(id)))
  ) as number[];
  const existingCampaigns = await prisma.campaign.findMany({
    where: { id: { in: campaignIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(existingCampaigns.map((c) => [c.id, c.name]));

  const rowMatchNamesByCampaignId = new Map<number, Set<string>>();
  for (const mapping of mappings) {
    const officialName = nameById.get(mapping.campaignId);
    if (!officialName) continue;
    const names =
      rowMatchNamesByCampaignId.get(mapping.campaignId) ?? new Set<string>();
    names.add(officialName);
    const sourceName = mapping.sourceCampaignName ?? mapping.campaignName;
    if (sourceName?.trim()) {
      names.add(sourceName.trim());
    }
    rowMatchNamesByCampaignId.set(mapping.campaignId, names);
  }

  const byCampaign = new Map<number, { filePath: string }>();
  const writeStreams = new Map<number, fs.FileHandle>();

  try {
    // Create one temp file per campaign with the same header line (real header, not preamble).
    const openedCampaignIds = new Set<number>();
    for (const mapping of mappings) {
      if (openedCampaignIds.has(mapping.campaignId)) continue;
      const officialName = nameById.get(mapping.campaignId);
      if (!officialName) continue;
      openedCampaignIds.add(mapping.campaignId);
      const tempName = `${Date.now()}-${mapping.campaignId}-${stagingId}`;
      const tempPath = path.join(uploadsDir, tempName);
      const handle = await fs.open(tempPath, 'w');
      await handle.writeFile(`${headerLine}\n`, { encoding: 'utf8' });
      writeStreams.set(mapping.campaignId, handle);
      byCampaign.set(mapping.campaignId, { filePath: tempPath });
    }

    if (byCampaign.size === 0) {
      throw new Error('No valid campaigns provided for attachment.');
    }

    // Data rows start after the detected header row (skip preamble + header).
    for (let i = effectiveHeaderRowIndex + 1; i < lines.length; i += 1) {
      const rawLine = lines[i]!;
      if (!rawLine.trim()) continue;
      const cells = parseDelimitedLine(rawLine, detectedDelimiter);
      const firstCell = cells[0]?.trim().toLowerCase() ?? '';
      if (firstCell.startsWith('total:') || firstCell === 'total') continue;
      if (campaignIndex >= cells.length) continue;
      const rowCampaignName = cells[campaignIndex]!.trim();
      if (!rowCampaignName) continue;

      const rowKey = normalizeForCampaignMatch(rowCampaignName);
      for (const [campaignId, matchNames] of rowMatchNamesByCampaignId.entries()) {
        const rowMatches = Array.from(matchNames).some(
          (name) =>
            rowCampaignName === name ||
            rowKey === normalizeForCampaignMatch(name)
        );
        if (!rowMatches) continue;
        const handle = writeStreams.get(campaignId);
        if (handle) {
          await handle.writeFile(`${rawLine}\n`, { encoding: 'utf8' });
        }
      }
    }

    return {
      headerLine,
      detectedDelimiter,
      encoding,
      byCampaign,
    };
  } finally {
    await Promise.all(
      Array.from(writeStreams.values()).map((h) => h.close().catch(() => undefined))
    );
  }
};

