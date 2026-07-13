const API_BASE_URL =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((import.meta as any).env?.VITE_API_BASE_URL as string | undefined) ??
  (import.meta.env.PROD ? '' : 'http://localhost:4000');

export const GOOGLE_ADS_SCRIPTS_NEW_URL = 'https://ads.google.com/aw/bulk/scripts/new';

export const googleAdsScriptInstallUrl = (): string =>
  `${API_BASE_URL}/api/integrations/google-ads-export-script/install`;

export const googleAdsScriptDownloadUrl = (): string =>
  `${API_BASE_URL}/api/integrations/google-ads-export-script/download`;

export const googleAdsScriptMetaUrl = (): string =>
  `${API_BASE_URL}/api/integrations/google-ads-export-script`;
