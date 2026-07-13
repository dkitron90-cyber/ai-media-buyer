/**
 * Normalize campaign labels so CSV exports (odd spaces, commas) still match DB names.
 */
export const normalizeForCampaignMatch = (name: string): string =>
  name
    .trim()
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .toLowerCase();
