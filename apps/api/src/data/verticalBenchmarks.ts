/**
 * Directional industry benchmarks for AI context (not guarantees).
 * Currency-agnostic ratios where possible; CPA in typical USD ranges for US search/display mix.
 */

export type IndustryVerticalCode =
  | 'Ecommerce'
  | 'SaaS/Software'
  | 'Finance/Insurance'
  | 'Healthcare'
  | 'Education'
  | 'Real Estate'
  | 'Travel'
  | 'Legal'
  | 'App Install'
  | 'Other';

export interface VerticalBenchmark {
  vertical: IndustryVerticalCode;
  /** Typical CPC range hint (account currency) */
  avgCpc: { min: number; max: number };
  avgCtr: { min: number; max: number }; // 0–1 fraction e.g. 0.02 = 2%
  avgConvRate: { min: number; max: number };
  avgCpa: { min: number; max: number };
  notes?: string;
}

export const VERTICAL_BENCHMARKS: VerticalBenchmark[] = [
  {
    vertical: 'Ecommerce',
    avgCpc: { min: 0.4, max: 2.5 },
    avgCtr: { min: 0.02, max: 0.08 },
    avgConvRate: { min: 0.015, max: 0.05 },
    avgCpa: { min: 15, max: 80 },
    notes: 'ROAS often primary; seasonality heavy.',
  },
  {
    vertical: 'SaaS/Software',
    avgCpc: { min: 3, max: 25 },
    avgCtr: { min: 0.01, max: 0.04 },
    avgConvRate: { min: 0.01, max: 0.04 },
    avgCpa: { min: 80, max: 400 },
    notes: 'Long sales cycles; trial/leads common.',
  },
  {
    vertical: 'Finance/Insurance',
    avgCpc: { min: 5, max: 60 },
    avgCtr: { min: 0.008, max: 0.03 },
    avgConvRate: { min: 0.005, max: 0.02 },
    avgCpa: { min: 100, max: 500 },
    notes: 'Strict policies; high CPC.',
  },
  {
    vertical: 'Healthcare',
    avgCpc: { min: 2, max: 15 },
    avgCtr: { min: 0.01, max: 0.04 },
    avgConvRate: { min: 0.01, max: 0.035 },
    avgCpa: { min: 50, max: 250 },
    notes: 'HIPAA/geo restrictions may apply.',
  },
  {
    vertical: 'Education',
    avgCpc: { min: 1, max: 8 },
    avgCtr: { min: 0.015, max: 0.05 },
    avgConvRate: { min: 0.02, max: 0.08 },
    avgCpa: { min: 30, max: 150 },
    notes: 'Enrollment windows drive volatility.',
  },
  {
    vertical: 'Real Estate',
    avgCpc: { min: 1, max: 12 },
    avgCtr: { min: 0.012, max: 0.045 },
    avgConvRate: { min: 0.01, max: 0.04 },
    avgCpa: { min: 40, max: 200 },
    notes: 'Lead quality varies by geo.',
  },
  {
    vertical: 'Travel',
    avgCpc: { min: 0.5, max: 4 },
    avgCtr: { min: 0.02, max: 0.07 },
    avgConvRate: { min: 0.01, max: 0.04 },
    avgCpa: { min: 25, max: 120 },
    notes: 'Seasonal; mobile share high.',
  },
  {
    vertical: 'Legal',
    avgCpc: { min: 5, max: 80 },
    avgCtr: { min: 0.006, max: 0.025 },
    avgConvRate: { min: 0.005, max: 0.02 },
    avgCpa: { min: 80, max: 400 },
    notes: 'High intent keywords; LSAs may overlap.',
  },
  {
    vertical: 'App Install',
    avgCpc: { min: 0.5, max: 6 },
    avgCtr: { min: 0.01, max: 0.06 },
    avgConvRate: { min: 0.05, max: 0.25 },
    avgCpa: { min: 2, max: 25 },
    notes: 'CPI/CPA mix; MMP matters.',
  },
  {
    vertical: 'Other',
    avgCpc: { min: 0.5, max: 20 },
    avgCtr: { min: 0.01, max: 0.05 },
    avgConvRate: { min: 0.01, max: 0.05 },
    avgCpa: { min: 25, max: 200 },
    notes: 'Use as loose prior only.',
  },
];

export function getBenchmarkForVertical(
  industryVertical: string | null | undefined
): VerticalBenchmark | null {
  if (!industryVertical?.trim()) return null;
  const t = industryVertical.trim();
  const hit = VERTICAL_BENCHMARKS.find((b) => b.vertical === t);
  return hit ?? VERTICAL_BENCHMARKS.find((b) => b.vertical === 'Other') ?? null;
}
