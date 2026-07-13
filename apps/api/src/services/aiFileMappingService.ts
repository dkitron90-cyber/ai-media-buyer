import fs from 'fs';
import crypto from 'crypto';
import { loadCsvMetadata, parseDelimitedLine, type SupportedEncoding } from '../lib/universalCsv';
import { normalizeHeader } from '../lib/csv';

// Canonical fields used by existing parsing logic.
export type AiCanonicalColumnKey =
  | 'campaignName'
  | 'searchTerm'
  | 'keywordText'
  | 'device'
  | 'placement'
  | 'displayName'
  | 'location'
  | 'country'
  | 'region'
  | 'city'
  | 'ageRange'
  | 'gender'
  | 'parentalStatus'
  | 'audienceName'
  | 'audienceType'
  | 'dayOfWeek'
  | 'hourOfDay'
  | 'impressions'
  | 'clicks'
  | 'cost'
  | 'conversions'
  | 'ctr'
  | 'avgCpc'
  | 'conversionValue'
  | 'costPerConversion';

export type AiReportType =
  | 'SEARCH_TERMS'
  | 'KEYWORDS'
  | 'DEVICE'
  | 'PLACEMENT'
  | 'GEOGRAPHIC'
  | 'DEMOGRAPHICS'
  | 'AUDIENCE'
  | 'AD_SCHEDULE'
  | 'CAMPAIGN'
  | 'UNKNOWN';

export type AiConfidence = 'low' | 'medium' | 'high';

export interface AiFileMappingResult {
  reportType: AiReportType;
  headerRowIndex: number | null;
  confidence: AiConfidence;
  columnMapping: Record<AiCanonicalColumnKey, string | null>;
  warnings: string[];
  notes: string[];
}

export interface InferFileMappingWithAiInput {
  cacheKey: string;
  fileName: string;
  filePath: string;
  // Compact preview data (token-conscious).
  preview: {
    encoding: SupportedEncoding;
    delimiter: string;
    totalNonEmptyLines: number;
    // A small slice to help AI infer header row + type.
    firstRows: Array<{ index: number; cells: string[] }>;
    // Title/preamble rows above the best deterministic header (if known).
    preambleRows: Array<{ index: number; cells: string[] }>;
    // Candidate headers with normalization.
    candidateHeaderRows: Array<{
      index: number;
      rawCells: string[];
      normalizedCells: string[];
    }>;
    deterministicWarnings: string[];
    deterministicErrors?: string[];
  };
}

const aiMappingCache = new Map<string, AiFileMappingResult>();

const getOpenAiKey = (): string | null => {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key.trim() === '') return null;
  return key.trim();
};

const traceNeedle = process.env.AI_MAPPING_TRACE_FILE?.trim().toLowerCase() ?? '';

const isTraceEnabled = (fileName: string, filePath: string, cacheKey: string): boolean => {
  if (!traceNeedle) return false;
  const haystack = `${fileName} ${filePath} ${cacheKey}`.toLowerCase();
  return haystack.includes(traceNeedle);
};

export const AI_FILE_MAPPING_SYSTEM_PROMPT = [
  'You are interpreting Google Ads export files (CSV/TSV).',
  'Your job is to rescue messy real-world exports when deterministic parsing is low-confidence or fails.',
  '',
  'Return ONLY STRICT JSON that matches the required schema below. Do not include markdown, commentary, or extra keys.',
  '',
  'You must identify:',
  '1) the real header row',
  '2) the report type',
  '3) the column mapping from visible headers to canonical fields',
  '',
  'Be conservative. If you are unsure, use nulls and lower confidence instead of guessing.',
  '',
  'REQUIRED OUTPUT SCHEMA (exact keys, no extras):',
  '{',
  '  "reportType": "SEARCH_TERMS" | "KEYWORDS" | "DEVICE" | "PLACEMENT" | "GEOGRAPHIC" | "DEMOGRAPHICS" | "AUDIENCE" | "AD_SCHEDULE" | "CAMPAIGN" | "UNKNOWN",',
  '  "headerRowIndex": number | null,',
  '  "confidence": "low" | "medium" | "high",',
  '  "columnMapping": {',
  '    "campaignName": string | null,',
  '    "searchTerm": string | null,',
  '    "keywordText": string | null,',
  '    "device": string | null,',
  '    "placement": string | null,',
  '    "displayName": string | null,',
  '    "location": string | null,',
  '    "country": string | null,',
  '    "region": string | null,',
  '    "city": string | null,',
  '    "ageRange": string | null,',
  '    "gender": string | null,',
  '    "parentalStatus": string | null,',
  '    "audienceName": string | null,',
  '    "audienceType": string | null,',
  '    "dayOfWeek": string | null,',
  '    "hourOfDay": string | null,',
  '    "impressions": string | null,',
  '    "clicks": string | null,',
  '    "cost": string | null,',
  '    "conversions": string | null,',
  '    "ctr": string | null,',
  '    "avgCpc": string | null,',
  '    "conversionValue": string | null,',
  '    "costPerConversion": string | null',
  '  },',
  '  "warnings": string[],',
  '  "notes": string[]',
  '}',
  '',
  'CRITICAL: columnMapping keys MUST be canonical field names (like "placement", "clicks").',
  'Do NOT return a mapping keyed by visible header labels.',
  'CRITICAL: reportType MUST be a string from the allowed list; never null. Use "UNKNOWN" if unsure.',
  'For headerRowIndex, use the index space of the provided preview.nonEmptyLines rows (the "index" field in the preview objects).',
].join('\n');

const makeEmptyMapping = (): Record<AiCanonicalColumnKey, string | null> => ({
  campaignName: null,
  searchTerm: null,
  keywordText: null,
  device: null,
  placement: null,
  displayName: null,
  location: null,
  country: null,
  region: null,
  city: null,
  ageRange: null,
  gender: null,
  parentalStatus: null,
  audienceName: null,
  audienceType: null,
  dayOfWeek: null,
  hourOfDay: null,
  impressions: null,
  clicks: null,
  cost: null,
  conversions: null,
  ctr: null,
  avgCpc: null,
  conversionValue: null,
  costPerConversion: null,
});

const validateAiResultShape = (raw: unknown): AiFileMappingResult => {
  if (!raw || typeof raw !== 'object') {
    throw new Error('AI mapping response was not an object.');
  }
  const obj = raw as Record<string, unknown>;

  const reportType = obj.reportType;
  const headerRowIndex = obj.headerRowIndex;
  const confidence = obj.confidence;
  const columnMapping = obj.columnMapping;
  const warnings = obj.warnings;
  const notes = obj.notes;

  const allowedReportTypes: AiReportType[] = [
    'SEARCH_TERMS',
    'KEYWORDS',
    'DEVICE',
    'PLACEMENT',
    'GEOGRAPHIC',
    'DEMOGRAPHICS',
    'AUDIENCE',
    'AD_SCHEDULE',
    'CAMPAIGN',
    'UNKNOWN',
  ];
  if (typeof reportType !== 'string' || !allowedReportTypes.includes(reportType as AiReportType)) {
    throw new Error('AI mapping: invalid reportType.');
  }
  if (!(headerRowIndex === null || typeof headerRowIndex === 'number')) {
    throw new Error('AI mapping: invalid headerRowIndex.');
  }
  if (confidence !== 'low' && confidence !== 'medium' && confidence !== 'high') {
    throw new Error('AI mapping: invalid confidence.');
  }
  if (!columnMapping || typeof columnMapping !== 'object') {
    throw new Error('AI mapping: invalid columnMapping.');
  }
  const mappingObj = columnMapping as Record<string, unknown>;
  const empty = makeEmptyMapping();
  for (const key of Object.keys(empty) as AiCanonicalColumnKey[]) {
    const v = mappingObj[key];
    if (!(v === null || typeof v === 'string' || typeof v === 'undefined')) {
      throw new Error(`AI mapping: columnMapping.${key} must be string|null.`);
    }
    empty[key] = typeof v === 'string' ? v : null;
  }
  if (!Array.isArray(warnings) || !warnings.every((w) => typeof w === 'string')) {
    throw new Error('AI mapping: warnings must be string[].');
  }
  if (!Array.isArray(notes) || !notes.every((n) => typeof n === 'string')) {
    throw new Error('AI mapping: notes must be string[].');
  }

  return {
    reportType: reportType as AiReportType,
    headerRowIndex: headerRowIndex as number | null,
    confidence: confidence as AiConfidence,
    columnMapping: empty,
    warnings,
    notes,
  };
};

const getFileSha256 = (filePath: string): string | null => {
  try {
    const hash = crypto.createHash('sha256');
    const buf = fs.readFileSync(filePath);
    hash.update(buf);
    return hash.digest('hex');
  } catch {
    return null;
  }
};

export const buildAiPreviewFromMetadata = async (args: {
  filePath: string;
  fileName: string;
  deterministicWarnings: string[];
  deterministicErrors?: string[];
}): Promise<InferFileMappingWithAiInput['preview']> => {
  const meta = await loadCsvMetadata(args.filePath);
  const { encoding, delimiter, lines } = meta;

  const nonEmptyLines = lines;
  const totalNonEmptyLines = nonEmptyLines.length;

  const maxPreviewRows = 25;
  const firstRows = nonEmptyLines.slice(0, maxPreviewRows).map((raw, idx) => {
    const cells = parseDelimitedLine(raw, delimiter).slice(0, 20);
    return { index: idx, cells };
  });

  const preambleRows = meta.headerRowIndex > 0
    ? nonEmptyLines.slice(0, Math.min(meta.headerRowIndex, 6)).map((raw, idx) => {
        const cells = parseDelimitedLine(raw, delimiter).slice(0, 20);
        return { index: idx, cells };
      })
    : [];

  // Candidate header rows: first 10 non-empty lines + the chosen deterministic best header (if different).
  const candidateIndices = new Set<number>([
    ...Array.from({ length: Math.min(10, nonEmptyLines.length) }, (_, i) => i),
    meta.headerRowIndex,
  ]);
  const candidateHeaderRows = Array.from(candidateIndices)
    .filter((i) => i >= 0 && i < nonEmptyLines.length)
    .sort((a, b) => a - b)
    .map((i) => {
      const cells = parseDelimitedLine(nonEmptyLines[i]!, delimiter).slice(0, 30);
      return {
        index: i,
        rawCells: cells,
        normalizedCells: cells.map((c) => normalizeHeader(c)),
      };
    });

  return {
    encoding,
    delimiter,
    totalNonEmptyLines,
    firstRows,
    preambleRows,
    candidateHeaderRows,
    deterministicWarnings: args.deterministicWarnings,
    deterministicErrors: args.deterministicErrors,
  };
};

export const inferFileMappingWithAi = async (
  input: InferFileMappingWithAiInput
): Promise<AiFileMappingResult> => {
  const cached = aiMappingCache.get(input.cacheKey);
  if (cached) return cached;

  const traceOn = isTraceEnabled(input.fileName, input.filePath, input.cacheKey);
  const traceLog = (...args: unknown[]) => {
    if (!traceOn) return;
    // eslint-disable-next-line no-console
    console.log('[AI_MAPPING_TRACE]', ...args);
  };

  const apiKey = getOpenAiKey();
  if (!apiKey) {
    const fallback: AiFileMappingResult = {
      reportType: 'UNKNOWN',
      headerRowIndex: null,
      confidence: 'low',
      columnMapping: makeEmptyMapping(),
      warnings: ['OPENAI_API_KEY is not configured. AI mapping disabled.'],
      notes: [],
    };
    aiMappingCache.set(input.cacheKey, fallback);
    return fallback;
  }

  const userPayload = {
    fileName: input.fileName,
    preview: input.preview,
  };

  traceLog('AI fallback triggered');
  traceLog('AI preview payload:', JSON.stringify(userPayload).slice(0, 20000));

  const url = 'https://api.openai.com/v1/chat/completions';

  const callOpenAi = async (repairMode: boolean): Promise<unknown> => {
    const repairSuffix = repairMode
      ? '\n\nREPAIR INSTRUCTION: Your previous output did not match the schema. ' +
        'You MUST return ALL required keys with the exact types. ' +
        'Do NOT omit confidence/warnings/notes. reportType MUST be one of the allowed strings (use "UNKNOWN" instead of null). ' +
        'columnMapping keys MUST be canonical field names (not visible header labels).'
      : '';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: AI_FILE_MAPPING_SYSTEM_PROMPT },
          {
            role: 'user',
            content:
              'Return strict JSON only. Use the exact schema. ' +
              'Do NOT reverse the columnMapping direction.\n\n' +
              JSON.stringify(userPayload) +
              repairSuffix,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI mapping request failed with status ${response.status}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) {
      throw new Error('AI mapping response had no message content.');
    }
    return raw;
  };

  let raw: string;
  let parsed: unknown;

  try {
    raw = (await callOpenAi(false)) as string;
    traceLog('AI raw response:', raw.slice(0, 8000));
    parsed = JSON.parse(raw);
    const validated = validateAiResultShape(parsed);
    traceLog('AI validated result:', JSON.stringify(validated).slice(0, 20000));
    aiMappingCache.set(input.cacheKey, validated);
    return validated;
  } catch (firstErr) {
    if (!traceOn) throw firstErr;
    traceLog('AI mapping validation failed; retrying with repair instructions:', firstErr);
  }

  // One repair retry; if it fails, bubble the original error.
  raw = (await callOpenAi(true)) as string;
  traceLog('AI raw response (repair):', raw.slice(0, 8000));
  parsed = JSON.parse(raw);
  const validated = validateAiResultShape(parsed);
  traceLog('AI validated result (repair):', JSON.stringify(validated).slice(0, 20000));
  aiMappingCache.set(input.cacheKey, validated);
  return validated;
};

