export type ExperienceMode = 'junior' | 'senior';

export const isJuniorMode = (mode: ExperienceMode): boolean => mode === 'junior';

export const evidenceStrengthGuide: Record<string, string> = {
  strong:
    'Enough recent report coverage and volume to trust segment-level recommendations.',
  directional:
    'Some useful signals, but missing reports or thin data — treat actions as hypotheses.',
  weak:
    'Limited data — focus on uploading reports and fixing setup before big changes.',
};

export const readinessLabelGuide: Record<string, string> = {
  STRONG: 'You have the reports this campaign type needs for confident AI analysis.',
  DIRECTIONAL: 'Partial coverage — analysis can run but may miss important segments.',
  WEAK: 'Upload more required reports before relying on optimization advice.',
};

export const campaignTypeGuide: Record<string, string> = {
  SEARCH: 'Keyword and query-driven Search Network campaigns.',
  DISPLAY: 'Visual ads across websites and apps on the Display Network.',
  PERFORMANCE_MAX: 'Automated cross-channel campaigns using asset groups.',
  VIDEO: 'YouTube and video partner inventory.',
  SHOPPING: 'Product feed / Merchant Center shopping campaigns.',
  APP: 'Mobile app install or engagement campaigns.',
  DEMAND_GEN: 'Visual demand generation across Discover, Gmail, and YouTube.',
  OTHER: 'Generic or mixed campaign — verify type in Google Ads if unsure.',
};
