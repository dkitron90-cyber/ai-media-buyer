import { openai } from "../index";
import {
  type SufficiencyResult,
  SufficiencyResultSchema,
} from "../schemas/sufficiency";

const INSTRUCTIONS = `
You are a Google Ads data sufficiency analyst.

Your job is ONLY to determine if the campaign data is sufficient.

Return ONLY valid JSON.

Rules:
- status must be one of: insufficient, limited, actionable
- confidence must be one of: low, medium, high
- missing_data: what is missing
- reason: why data is insufficient or not
- user_message: message for user

Classification guidance:
- insufficient = not enough signal to analyze meaningfully
- limited = enough signal for directional analysis, but not enough for aggressive recommendations
- actionable = enough signal for confident optimization recommendations

If the input includes spend, conversions, CPA, target KPI, and at least some segment-level clues (for example device or geography issues), prefer "limited" rather than "insufficient".

DO NOT:
- optimize
- suggest actions
- overanalyze
`;

export async function runSufficiencyAgent(
  input: string
): Promise<SufficiencyResult> {
  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: INSTRUCTIONS },
      { role: "user", content: input },
    ],
  });

  const raw = response.choices?.[0]?.message?.content;
  if (!raw) {
    throw new Error("Sufficiency agent returned no output");
  }

  const parsed = JSON.parse(raw) as Record<string, unknown>;

  const normalize = (v: unknown): string => {
    if (typeof v === "string") return v;
    if (Array.isArray(v)) return v.map((x) => String(x)).join(" | ");
    if (v && typeof v === "object") return JSON.stringify(v);
    return String(v ?? "");
  };

  const normalizeStatus = (v: unknown): SufficiencyResult["status"] => {
    const s = String(v ?? "").toLowerCase();
    if (s === "insufficient" || s === "limited" || s === "actionable") return s;
    return "limited";
  };

  const normalizeConfidence = (
    v: unknown
  ): SufficiencyResult["confidence"] => {
    const s = String(v ?? "").toLowerCase();
    if (s === "low" || s === "medium" || s === "high") return s;
    return "medium";
  };

  const normalized: SufficiencyResult = {
    status: normalizeStatus(parsed.status),
    confidence: normalizeConfidence(parsed.confidence),
    missing_data: normalize(parsed.missing_data ?? parsed.missingData),
    reason: normalize(parsed.reason ?? parsed.rationale),
    user_message: normalize(parsed.user_message ?? parsed.userMessage),
  };

  return SufficiencyResultSchema.parse(normalized);
}