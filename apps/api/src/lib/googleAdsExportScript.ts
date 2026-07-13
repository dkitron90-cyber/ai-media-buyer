import fs from 'fs';
import path from 'path';

export const GOOGLE_ADS_EXPORT_SCRIPT_FILE = 'ai-media-buyer-export.gs';

/** Resolve repo script from common cwd locations (dev + production). */
export const resolveGoogleAdsExportScriptPath = (): string => {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, '..', '..', 'scripts', 'google-ads', GOOGLE_ADS_EXPORT_SCRIPT_FILE),
    path.join(cwd, 'scripts', 'google-ads', GOOGLE_ADS_EXPORT_SCRIPT_FILE),
    path.join(__dirname, '..', '..', '..', '..', 'scripts', 'google-ads', GOOGLE_ADS_EXPORT_SCRIPT_FILE),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Google Ads export script not found. Expected ${GOOGLE_ADS_EXPORT_SCRIPT_FILE} under scripts/google-ads/.`
  );
};

export const readGoogleAdsExportScript = (): string => {
  return fs.readFileSync(resolveGoogleAdsExportScriptPath(), 'utf8');
};
