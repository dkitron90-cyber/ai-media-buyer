import type { CampaignSummary, AnalysisReadiness } from '../services/analysisService';
import type { DataWindow } from '../services/dataWindowService';
import type { AiCampaignContext } from '../services/aiContextService';

export interface PrioritizedAction {
  type: 'scale' | 'hold' | 'pause' | 'exclude' | 'test' | 'restructure';
  title: string;
  rationale: string;
  priority: 'high' | 'medium' | 'low';
  confidence: 'low' | 'medium' | 'high';
}

export interface CampaignDiagnosis {
  executiveSummary: string;
  evidenceStrength: 'weak' | 'directional' | 'strong';
  /** Single headline problem (decision clarity layer). */
  primaryIssue?: string;
  /** Operating theme, e.g. placement cleanup, query control. */
  focusArea?: string;
  estimatedWastedSpend?: number | null;
  estimatedUpside?: number | null;
  decisionConfidence?: 'low' | 'medium' | 'high';
  whatIsHappening: string[];
  whyItIsHappening: string[];
  risks: string[];
  opportunities: string[];
  prioritizedActions: PrioritizedAction[];
  missingData: string[];
  exclusions: string[];
  scaleTargets: string[];
}

export interface CampaignAnalysisContext {
  campaign: {
    id: number;
    clientId: number;
    name: string;
    type: string;
    status: string;
    monthlyBudget?: string | null;
    targetCpa?: string | null;
    product?: string | null;
    productUrl?: string | null;
  };
  goals: Array<{
    id: number;
    name: string;
    metric: string;
    targetValue?: string | null;
    isActive: boolean;
  }>;
  notes: Array<{
    id: number;
    author?: string | null;
    content: string;
    pinned: boolean;
    createdAt: string;
  }>;
  events: Array<{
    id: number;
    type: string;
    title: string;
    description?: string | null;
    occurredAt: string;
  }>;
  readiness: AnalysisReadiness;
  summary: CampaignSummary;
  dataWindow: DataWindow;
  campaignTypeIntelligence?: {
    label: string;
    importantReportTypes: string[];
    optimizationPriorities: string[];
    aiInstructions: string[];
    specialWarnings: string[];
  };
  uploadedReports: Array<{
    id: number;
    reportType: string;
    uploadStatus: string;
  }>;
}

export type AiDecisionOutput = {
  executiveSummary: string;
  evidenceStrength: 'weak' | 'directional' | 'strong';
  primaryIssue: string;
  focusArea: string;
  estimatedWastedSpend: number | null;
  estimatedUpside: number | null;
  confidence: 'low' | 'medium' | 'high';
  findings: string[];
  risks: string[];
  opportunities: string[];
  missingData: string[];
  prioritizedActions: Array<{
    type: 'exclude' | 'scale' | 'pause' | 'hold' | 'test' | 'restructure';
    title: string;
    rationale: string;
    priority: 'high' | 'medium' | 'low';
    confidence: 'high' | 'medium' | 'low';
    targetType?: string;
    targetValue?: string | null;
  }>;
};

const getOpenAIApiKey = (): string | null => {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key.trim() === '') {
    return null;
  }
  return key.trim();
};

const parseOptionalMoney = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/[,$\s]/g, ''));
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
};

const mapEvidenceToDecisionConfidence = (
  evidence: AiDecisionOutput['evidenceStrength']
): AiDecisionOutput['confidence'] => {
  if (evidence === 'strong') return 'high';
  if (evidence === 'directional') return 'medium';
  return 'low';
};

const sumSegmentCosts = (
  rows: Array<{ cost?: number | null }> | undefined
): number =>
  (rows ?? []).reduce((acc, r) => acc + (typeof r.cost === 'number' ? r.cost : 0), 0);

export type CampaignAnalysisResult = {
  decision: AiDecisionOutput;
  source: 'openai' | 'deterministic-fallback';
};

export class OpenAICampaignAnalyzer {
  private readonly apiKey: string | null;

  constructor() {
    this.apiKey = getOpenAIApiKey();
  }

  public isConfigured(): boolean {
    return this.apiKey !== null;
  }

  public async analyzeCampaign(
    context: AiCampaignContext
  ): Promise<CampaignAnalysisResult> {
    const fallbackDecision = this.buildDeterministicWeakFallback(context);
    const fallbackResult: CampaignAnalysisResult = {
      decision: fallbackDecision,
      source: 'deterministic-fallback',
    };

    if (!this.apiKey) {
      return fallbackResult;
    }

    const url = 'https://api.openai.com/v1/chat/completions';

    const systemPrompt = [
      'You are a senior Google Ads operator. One campaign, one clear business decision.',
      '',
      'Think first: (1) What is the MAIN problem? (2) What should they focus on next? (3) Where is money wasted or available?',
      '',
      'You receive structured JSON (performanceSummary, trust, gaps, reports, advisory, verticalBenchmark). No raw CSV rows.',
      '',
      'ADVISORY + BENCHMARKS:',
      '- Use advisory (websiteUrl, industryVertical, conversionType, accountMaturity, approximateMonthlySpend, landingPageAnalysis) to interpret goals and LP quality.',
      '- If verticalBenchmark is present, you may compare directional metrics (CTR, CPC, CPA) vs typical ranges for that vertical — say "directional" / "below typical range" language, not guarantees.',
      '- If landingPageAnalysis shows slow load, missing mobile viewport, or weak CTA, mention it as a conversion risk when relevant.',
      '- Do not invent advisory fields; only use what is in context.advisory.',
      '',
      'RULES:',
      '- primaryIssue = ONE sentence: the single most important problem right now.',
      '- focusArea = short theme: e.g. "placement cleanup", "query control", "setup completion", "data collection", "audience exclusions".',
      '- estimatedWastedSpend / estimatedUpside = numbers in the same currency as report cost, or null.',
      '- NEVER invent dollar amounts. Only set estimatedWastedSpend if you can tie it to segment cost in context (e.g. wastedSpendCandidates, placements with spend and zero conversions). Otherwise null.',
      '- NEVER invent estimatedUpside unless you can ground it in strong segments / scaleCandidates / clear conversion efficiency in context. Otherwise null.',
      '- confidence = your confidence in this decision summary (low | medium | high), separate from evidenceStrength.',
      '- evidenceStrength = weak | directional | strong based on data volume and consistency in context.',
      '- Use performanceSummary.totals, breakdowns, and performanceSummaryMeta.totalsProvenance when interpreting spend.',
      '- If some data exists, you MUST still output non-empty primaryIssue and focusArea.',
      '',
      'REQUIRED JSON SCHEMA (exact keys):',
      '{',
      '  "executiveSummary": string,',
      '  "evidenceStrength": "weak" | "directional" | "strong",',
      '  "primaryIssue": string,',
      '  "focusArea": string,',
      '  "estimatedWastedSpend": number | null,',
      '  "estimatedUpside": number | null,',
      '  "confidence": "low" | "medium" | "high",',
      '  "findings": string[],',
      '  "risks": string[],',
      '  "opportunities": string[],',
      '  "missingData": string[],',
      '  "prioritizedActions": [',
      '    { "type": "exclude"|"scale"|"pause"|"hold"|"test"|"restructure", "title": string, "rationale": string,',
      '      "priority": "high"|"medium"|"low", "confidence": "high"|"medium"|"low",',
      '      "targetType": string (optional), "targetValue": string | null (optional) }',
      '  ]',
      '}',
      '',
      'prioritizedActions: 1–5 items, concrete. For exclude/scale, include targetValue only when present in context.',
    ].join('\n');

    const userPayload = {
      task: 'Decide what matters most for profitability: wasted spend, efficiency, and scalable upside. Return JSON only.',
      context,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify(userPayload) },
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) return fallbackResult;

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const raw = data.choices?.[0]?.message?.content;
      if (!raw) return fallbackResult;

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return fallbackResult;
      }

      try {
        return {
          decision: this.validateAiDecisionOutput(parsed),
          source: 'openai',
        };
      } catch {
        return fallbackResult;
      }
    } catch {
      return fallbackResult;
    }
  }

  private buildDeterministicWeakFallback(context: AiCampaignContext): AiDecisionOutput {
    const missingFromReports = context.reports?.reportStatus?.missingReportTypes ?? [];
    const gapTitles = (context.gaps ?? []).map((g) => g.title).filter(Boolean);
    const readinessReasons = context.trust?.readiness?.reasons ?? [];

    const missingData = Array.from(
      new Set([
        ...missingFromReports.map((t) => String(t)).slice(0, 5),
        ...gapTitles.slice(0, 5),
        ...readinessReasons.slice(0, 5),
      ])
    ).slice(0, 12);

    const findings: string[] = [];
    const dw = context.trust?.dataWindow;
    if (dw?.freshnessStatus === 'STALE') {
      findings.push(
        'Most recent active report data appears stale, so optimization confidence is limited.'
      );
    } else if (dw?.freshnessStatus === 'AGING') {
      findings.push('Recent report data is aging, so conclusions should be treated directionally.');
    }
    if (dw?.alignmentStatus === 'MISALIGNED') {
      findings.push(
        'Active report date ranges are misaligned, so cross-report comparisons may be unreliable.'
      );
    } else if (dw?.alignmentStatus === 'PARTIAL') {
      findings.push('Active report date ranges only partially overlap, so comparisons may be directional.');
    }
    if ((context.reports?.reportStatus?.missingReportTypes ?? []).length > 0) {
      findings.push(
        'Key report coverage is missing, which blocks stronger findings at the segment/action level.'
      );
    }

    if (missingData.length > 0) {
      findings.push(`Missing/weak signals: ${missingData.slice(0, 3).join('; ')}`);
    }

    if (findings.length === 0) {
      findings.push('Insufficient evidence is available to produce confident findings.');
    }

    const uploadMissingReportsPriority: AiDecisionOutput['prioritizedActions'][number] = {
      type: 'test',
      title: 'Upload missing required report types',
      rationale:
        'Evidence gaps limit defensible findings. Add missing reports so the system can analyze at the correct granularity.',
      priority: 'high',
      confidence: 'low',
    };

    const checklistPriority: AiDecisionOutput['prioritizedActions'][number] = {
      type: 'restructure',
      title: 'Complete checklist foundations before scaling',
      rationale:
        'Checklist completion is unknown, so treat optimization as hypotheses until measurement, structure, and controls are validated.',
      priority: 'medium',
      confidence: 'low',
    };

    const ps = context.performanceSummary;
    const wasteSum = sumSegmentCosts(ps?.wastedSpendCandidates);
    const scaleSum = sumSegmentCosts(ps?.scaleCandidates);
    const estimatedWastedSpend = wasteSum > 0 ? wasteSum : null;
    const estimatedUpside = scaleSum > 0 ? scaleSum : null;

    const primaryIssue =
      missingFromReports.length > 0
        ? 'Report coverage gaps prevent full performance diagnosis and waste identification.'
        : gapTitles[0]
          ? `Operational gap: ${gapTitles[0]}`
          : 'Limited or weak evidence — strengthen measurement and uploads before aggressive changes.';

    const focusArea =
      (context.gaps ?? []).find((g) => g.severity === 'high')?.category === 'reports'
        ? 'data collection'
        : (context.gaps ?? []).find((g) => g.severity === 'high')?.category === 'settings'
          ? 'setup completion'
          : missingFromReports.length > 0
            ? 'data collection'
            : 'measurement and controls';

    return {
      executiveSummary: trimString(
        (findings[0] ?? 'Insufficient evidence.') +
          (missingData.length ? ` Evidence gaps: ${missingData.slice(0, 3).join('; ')}.` : ''),
        500
      ),
      evidenceStrength: 'weak',
      primaryIssue: trimString(primaryIssue, 320),
      focusArea: trimString(focusArea, 120),
      estimatedWastedSpend,
      estimatedUpside,
      confidence: 'low',
      findings: findings.slice(0, 8).map((s) => trimString(s, 220)),
      risks: [
        'Recommendations could be inaccurate due to incomplete report coverage or weak data sufficiency.',
        ...(context.trust?.readiness?.reasons?.slice(0, 2) ?? []),
      ].slice(0, 8),
      opportunities: [
        'Upload the missing high-priority report types to unlock clearer optimization levers.',
        ...(missingData.length ? ['Turn evidence gaps into concrete actions once reports arrive.'] : []),
      ].slice(0, 8),
      missingData: (missingData.length ? missingData : ['Missing required report coverage or readiness signals.'])
        .slice(0, 12)
        .map((s) => trimString(s, 220)),
      prioritizedActions: [
        ...(missingFromReports.length > 0 ? [uploadMissingReportsPriority] : []),
        checklistPriority,
      ],
    };
  }

  private validateAiDecisionOutput(payload: unknown): AiDecisionOutput {
    if (typeof payload !== 'object' || payload === null) {
      throw new Error('AI decision output is not a JSON object.');
    }
    const obj = payload as Partial<AiDecisionOutput>;

    const ensureString = (v: unknown): string => {
      if (typeof v !== 'string') throw new Error('Expected string.');
      const s = v.trim();
      if (!s) throw new Error('Expected non-empty string.');
      return s;
    };

    const ensureStringArray = (v: unknown, fieldName: string): string[] => {
      if (!Array.isArray(v)) throw new Error(`Expected ${fieldName} array.`);
      const out: string[] = [];
      for (const item of v) {
        if (typeof item !== 'string') {
          throw new Error(`Expected ${fieldName} items to be strings.`);
        }
        const s = item.trim();
        if (!s) throw new Error(`Expected ${fieldName} items to be non-empty.`);
        out.push(s);
      }
      return out;
    };

    const allowedEvidence = ['weak', 'directional', 'strong'] as const;
    const evidenceStrength = allowedEvidence.includes(obj.evidenceStrength as any)
      ? (obj.evidenceStrength as AiDecisionOutput['evidenceStrength'])
      : (() => {
          throw new Error('Invalid evidenceStrength.');
        })();

    const executiveSummary = ensureString(obj.executiveSummary);

    let primaryIssue =
      typeof obj.primaryIssue === 'string' && obj.primaryIssue.trim()
        ? obj.primaryIssue.trim()
        : '';
    if (!primaryIssue) {
      primaryIssue = executiveSummary.slice(0, 280);
    }

    let focusArea =
      typeof obj.focusArea === 'string' && obj.focusArea.trim()
        ? obj.focusArea.trim()
        : '';
    if (!focusArea) {
      focusArea = 'Campaign optimization';
    }

    const estimatedWastedSpend = parseOptionalMoney(obj.estimatedWastedSpend);
    const estimatedUpside = parseOptionalMoney(obj.estimatedUpside);

    const allowedDecisionConf = ['low', 'medium', 'high'] as const;
    const confidence = allowedDecisionConf.includes(obj.confidence as any)
      ? (obj.confidence as AiDecisionOutput['confidence'])
      : mapEvidenceToDecisionConfidence(evidenceStrength);

    const findings = ensureStringArray(obj.findings, 'findings');
    const risks = ensureStringArray(obj.risks, 'risks');
    const opportunities = ensureStringArray(obj.opportunities, 'opportunities');
    const missingData = ensureStringArray(obj.missingData, 'missingData');

    const allowedActionTypes = ['exclude', 'scale', 'pause', 'hold', 'test', 'restructure'] as const;
    const allowedPriority = ['high', 'medium', 'low'] as const;
    const allowedConfidence = ['high', 'medium', 'low'] as const;

    if (!Array.isArray(obj.prioritizedActions)) {
      throw new Error('Missing prioritizedActions array.');
    }

    const prioritizedActions = obj.prioritizedActions.map((item) => {
      if (typeof item !== 'object' || item === null) {
        throw new Error('Invalid prioritizedActions element.');
      }
      const a = item as Record<string, unknown>;

      const typeRaw = a.type;
      if (!allowedActionTypes.includes(typeRaw as any)) {
        throw new Error('Invalid prioritizedActions.type.');
      }
      const type = typeRaw as AiDecisionOutput['prioritizedActions'][number]['type'];

      const title = ensureString(a.title);
      const rationale = ensureString(a.rationale);

      const priorityRaw = a.priority;
      if (!allowedPriority.includes(priorityRaw as any)) {
        throw new Error('Invalid prioritizedActions.priority.');
      }
      const priority = priorityRaw as AiDecisionOutput['prioritizedActions'][number]['priority'];

      const confidenceRaw = a.confidence;
      if (!allowedConfidence.includes(confidenceRaw as any)) {
        throw new Error('Invalid prioritizedActions.confidence.');
      }
      const confidence = confidenceRaw as AiDecisionOutput['prioritizedActions'][number]['confidence'];

      const targetType =
        a.targetType === undefined
          ? undefined
          : typeof a.targetType === 'string'
            ? (() => {
                const trimmed = a.targetType.trim();
                if (!trimmed) throw new Error('Invalid prioritizedActions.targetType.');
                return trimmed;
              })()
            : (() => {
                throw new Error('Invalid prioritizedActions.targetType.');
              })();

      const targetValue =
        a.targetValue === undefined
          ? undefined
          : a.targetValue === null
            ? null
            : typeof a.targetValue === 'string'
              ? (() => {
                  const trimmed = a.targetValue.trim();
                  if (!trimmed) throw new Error('Invalid prioritizedActions.targetValue.');
                  return trimmed;
                })()
              : (() => {
                  throw new Error('Invalid prioritizedActions.targetValue.');
                })();

      const action: AiDecisionOutput['prioritizedActions'][number] = {
        type,
        title,
        rationale,
        priority,
        confidence,
        ...(targetType !== undefined ? { targetType } : {}),
        ...(targetValue !== undefined ? { targetValue } : {}),
      };

      return action;
    });

    return {
      executiveSummary,
      evidenceStrength,
      primaryIssue: trimString(primaryIssue, 400),
      focusArea: trimString(focusArea, 160),
      estimatedWastedSpend,
      estimatedUpside,
      confidence,
      findings,
      risks,
      opportunities,
      missingData,
      prioritizedActions: prioritizedActions as AiDecisionOutput['prioritizedActions'],
    };
  }
}

function trimString(s: string, maxLen: number): string {
  const t = s.trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen - 1) + '…';
}

