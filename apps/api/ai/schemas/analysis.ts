import { z } from "zod";

export const AnalysisResultSchema = z.object({
  analysis: z.string(),
  key_issues: z.string(),
  risk_assessment: z.string(),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;