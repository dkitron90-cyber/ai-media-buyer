import { openai } from "../index";
import {
  OptimizationResultSchema,
  type OptimizationResult,
} from "../schemas/optimization";

const INSTRUCTIONS = `
You are a senior Google Ads optimization strategist.

You will receive:
- campaign input
- data sufficiency result
- campaign analysis

Your job is to produce practical, prioritized optimization actions.

Return ONLY valid JSON with this exact shape:

{
  "recommended_actions": "..."
}

Rules:
- recommended_actions must be plain English
- prioritize the most important actions first
- keep the actions concise and practical
- if data is limited, avoid aggressive recommendations
- do NOT repeat the full analysis
- do NOT return text outside JSON
`;

export async function runOptimizationAgent(
  input: string
): Promise<OptimizationResult> {
  const response = await openai.responses.parse({
    model: "gpt-5.4",
    instructions: INSTRUCTIONS,
    input,
    text_format: OptimizationResultSchema,
  });

  if (!response.output_parsed) {
    throw new Error("Optimization agent returned no parsed output");
  }

  return response.output_parsed;
}