import { z } from "zod";

export const SufficiencyResultSchema = z.object({
  status: z.enum(["insufficient", "limited", "actionable"]),
  confidence: z.enum(["low", "medium", "high"]),
  missing_data: z.string(),
  reason: z.string(),
  user_message: z.string(),
});

export type SufficiencyResult = z.infer<typeof SufficiencyResultSchema>;