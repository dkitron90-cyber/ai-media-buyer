/** Derived Google Ads metrics — shared by parsers and tests. */

export const computeCtr = (
  clicks: number,
  impressions: number,
  ctrFromFile: number | null = null
): number | null => {
  if (ctrFromFile !== null) return ctrFromFile;
  return impressions > 0 ? (clicks / impressions) * 100 : null;
};

export const computeCpc = (
  cost: number,
  clicks: number,
  cpcFromFile: number | null = null
): number | null => {
  if (cpcFromFile !== null) return cpcFromFile;
  return clicks > 0 ? cost / clicks : null;
};

export const computeCpa = (cost: number, conversions: number): number | null =>
  conversions > 0 ? cost / conversions : null;

export const computeRoas = (
  conversionValue: number,
  cost: number,
  roasFromFile: number | null = null
): number | null => {
  if (roasFromFile !== null) return roasFromFile;
  return cost > 0 ? conversionValue / cost : null;
};
