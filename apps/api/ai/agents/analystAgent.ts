import { openai } from "../index";
import {
  type AnalysisResult,
  AnalysisResultSchema,
} from "../schemas/analysis";

const INSTRUCTIONS = `
You are a senior Google Ads media buyer.

Your job is to analyze campaign performance.

Return ONLY valid JSON with this exact shape:

{
  "analysis": "short plain-English summary",
  "key_issues": "plain-English bullet-style issues in one string",
  "risk_assessment": "plain-English risk summary"
}

Rules:
- analysis must be a normal sentence or short paragraph
- key_issues must be plain text, not JSON, and should summarize the main problems
- risk_assessment must be plain text, not JSON
- do NOT return nested JSON inside strings
- do NOT leave fields empty
- do NOT suggest optimizations
- do NOT return text outside JSON
`;

export async function runAnalystAgent(
  input: string
): Promise<AnalysisResult> {
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
    throw new Error("Analyst agent returned no output");
  }

  const parsed = JSON.parse(raw) as Record<string, unknown>;

  const normalize = (v: unknown): string => {
    if (typeof v === "string") return v;
    if (Array.isArray(v)) return v.map((x) => String(x)).join(" | ");
    if (v && typeof v === "object") return JSON.stringify(v);
    return String(v ?? "");
  };

  const normalized = {
    analysis: normalize(parsed.analysis ?? parsed.summary ?? parsed.overview),
    key_issues: normalize(parsed.key_issues ?? parsed.issues ?? parsed.keyIssues),
    risk_assessment: normalize(
      parsed.risk_assessment ?? parsed.risks ?? parsed.riskAssessment
    ),
  };

  return AnalysisResultSchema.parse(normalized);
}