import fs from 'fs/promises';
import { normalizeHeader } from './csv';
import { normalizeAndMapHeaders, type NormalizedHeaderResult } from './headerNormalizer';

export type SupportedEncoding = 'UTF-8' | 'UTF-8-BOM' | 'UTF-16LE' | 'UNKNOWN';

export interface CsvFileMetadata {
  encoding: SupportedEncoding;
  delimiter: string;
  lines: string[];
  headerRowIndex: number;
  headerRow: string[];
  headerResult: NormalizedHeaderResult;
}

export const detectEncoding = (buffer: Buffer): SupportedEncoding => {
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return 'UTF-8-BOM';
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return 'UTF-16LE';
  }
  return 'UTF-8';
};

export const decodeBuffer = (buffer: Buffer, encoding: SupportedEncoding): string => {
  if (encoding === 'UTF-16LE') {
    return buffer.toString('utf16le');
  }
  return buffer.toString('utf8');
};

export const detectDelimiter = (line: string): string => {
  // Fallback for single-line usage; delegates to multi-line helper.
  return detectDelimiterFromLines([line]);
};

const detectDelimiterFromLines = (lines: string[]): string => {
  const candidates = [',', '\t', ';'];
  const counts: Record<string, number> = { ',': 0, '\t': 0, ';': 0 };

  const maxScan = Math.min(lines.length, 10);
  for (let i = 0; i < maxScan; i += 1) {
    const line = lines[i] ?? '';
    if (!line.trim()) continue;
    for (const d of candidates) {
      const c = (line.match(new RegExp(`\\${d}`, 'g')) ?? []).length;
      counts[d] += c;
    }
  }

  let best = ',';
  let bestCount = -1;
  for (const d of candidates) {
    if (counts[d] > bestCount) {
      bestCount = counts[d];
      best = d;
    }
  }

  // If we saw no separators at all, fall back to comma.
  if (bestCount <= 0) return ',';
  return best;
};

export const parseDelimitedLine = (line: string, delimiter: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]!;

    if (char === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
};

const HEADER_KEYWORDS = new Set<string>([
  'campaign',
  'campaign name',
  'campaign id',
  'clicks',
  'impr.',
  'impressions',
  'cost',
  'ctr',
  'status',
  'budget',
  'conv. rate',
  'conversion rate',
  'conversions',
]);

const scoreHeaderRow = (cells: string[]): number => {
  // Require at least a few columns to be considered a header.
  if (cells.length < 3) return -1;

  const normalized = cells.map((h) => normalizeHeader(h));
  const joined = normalized.join(' ').toLowerCase();
  if (joined.startsWith('report ') || joined.startsWith('account ')) {
    return -1;
  }

  const headerResult = normalizeAndMapHeaders(cells);
  const canonicalCount = headerResult.canonicalFields.size;

  let keywordCount = 0;
  for (const h of normalized) {
    if (HEADER_KEYWORDS.has(h)) {
      keywordCount += 1;
    }
  }

  if (canonicalCount === 0 && keywordCount === 0) {
    return -1;
  }

  // Weight canonical matches heavily, then header keywords, then column count.
  const columnBonus = Math.min(cells.length, 10);
  return canonicalCount * 10 + keywordCount * 5 + columnBonus;
};

/**
 * Reads and normalizes a Google Ads CSV/TSV file:
 * - detects encoding and delimiter
 * - finds the most likely header row (skipping title/preamble rows)
 * - normalizes and maps headers to canonical fields
 */
export const loadCsvMetadata = async (filePath: string): Promise<CsvFileMetadata> => {
  const buffer = await fs.readFile(filePath);
  const encoding = detectEncoding(buffer);
  const text = decodeBuffer(buffer, encoding);

  const allLines = text.split(/\r?\n/);
  const lines = allLines.filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    throw new Error('Report file appears to be empty.');
  }

  const delimiter = detectDelimiterFromLines(lines);

  let bestHeaderIndex = 0;
  let bestScore = -1;
  let bestHeaderRow: string[] = [];

  const maxScan = Math.min(lines.length, 10);
  for (let i = 0; i < maxScan; i += 1) {
    const raw = lines[i]!;
    const cells = parseDelimitedLine(raw, delimiter);
    const score = scoreHeaderRow(cells);
    if (score > bestScore) {
      bestScore = score;
      bestHeaderIndex = i;
      bestHeaderRow = cells;
    }
  }

  if (!bestHeaderRow.length) {
    bestHeaderRow = parseDelimitedLine(lines[0]!, delimiter);
    bestHeaderIndex = 0;
  }

  const headerResult = normalizeAndMapHeaders(bestHeaderRow);

  return {
    encoding,
    delimiter,
    lines,
    headerRowIndex: bestHeaderIndex,
    headerRow: bestHeaderRow,
    headerResult,
  };
};

