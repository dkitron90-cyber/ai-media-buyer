import type { Request, Response } from 'express';
import {
  GOOGLE_ADS_EXPORT_SCRIPT_FILE,
  readGoogleAdsExportScript,
} from '../lib/googleAdsExportScript';

const SCRIPT_VERSION = '1.0.0';
const SCRIPT_DISPLAY_NAME = 'AI Media Buyer Export';

export const GOOGLE_ADS_SCRIPTS_NEW_URL = 'https://ads.google.com/aw/bulk/scripts/new';
export const GOOGLE_ADS_SCRIPTS_HOME_URL = 'https://ads.google.com/aw/bulk/scripts';

const REPORTS_EXPORTED = [
  'SEARCH_TERMS',
  'KEYWORDS',
  'PLACEMENT',
  'DEVICE',
  'GEOGRAPHIC',
  'DEMOGRAPHICS',
  'AUDIENCE',
  'AD_SCHEDULE',
  'CAMPAIGN',
] as const;

const INSTALL_STEPS = [
  'Click Install in Google Ads (script copies to your clipboard).',
  'In Google Ads → Tools → Bulk actions → Scripts, click + → New script.',
  'Name it “AI Media Buyer Export”, paste (Ctrl+V / Cmd+V), and Save.',
  'Click Authorize, then run function main.',
  'Open Google Drive → folder “AI Media Buyer Exports” and upload CSVs here.',
] as const;

export const getGoogleAdsExportScriptMeta = (_req: Request, res: Response): void => {
  try {
    const scriptText = readGoogleAdsExportScript();
    res.json({
      fileName: GOOGLE_ADS_EXPORT_SCRIPT_FILE,
      displayName: SCRIPT_DISPLAY_NAME,
      version: SCRIPT_VERSION,
      downloadPath: '/api/integrations/google-ads-export-script/download',
      installPath: '/api/integrations/google-ads-export-script/install',
      googleAdsScriptsNewUrl: GOOGLE_ADS_SCRIPTS_NEW_URL,
      googleAdsScriptsHomeUrl: GOOGLE_ADS_SCRIPTS_HOME_URL,
      dateRangeDefault: 'LAST_30_DAYS',
      reportsExported: REPORTS_EXPORTED,
      installSteps: INSTALL_STEPS,
      scriptText,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Script unavailable';
    res.status(500).json({ error: message });
  }
};

export const downloadGoogleAdsExportScript = (_req: Request, res: Response): void => {
  try {
    const scriptText = readGoogleAdsExportScript();
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${GOOGLE_ADS_EXPORT_SCRIPT_FILE}"`
    );
    res.send(scriptText);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Script unavailable';
    res.status(500).json({ error: message });
  }
};

export const getGoogleAdsExportScriptInstallPage = (req: Request, res: Response): void => {
  try {
    const scriptText = readGoogleAdsExportScript();
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const downloadUrl = `${baseUrl}/api/integrations/google-ads-export-script/download`;
    const escapedScript = JSON.stringify(scriptText);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Install ${SCRIPT_DISPLAY_NAME}</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #0f1419;
      --card: #1a2332;
      --text: #e8eef7;
      --muted: #9aa8bc;
      --accent: #3b82f6;
      --accent-hover: #2563eb;
      --ok: #22c55e;
      --border: #2a3648;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background: radial-gradient(circle at top, #1e293b 0%, var(--bg) 55%);
      color: var(--text);
      display: grid;
      place-items: center;
      padding: 24px;
    }
    .card {
      width: min(560px, 100%);
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 28px;
      box-shadow: 0 24px 48px rgba(0,0,0,.35);
    }
    h1 { margin: 0 0 8px; font-size: 1.5rem; }
    p { margin: 0 0 12px; color: var(--muted); line-height: 1.5; }
    ol { margin: 16px 0 0; padding-left: 20px; color: var(--muted); line-height: 1.6; }
    li { margin-bottom: 8px; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
    button, a.btn {
      appearance: none;
      border: none;
      border-radius: 10px;
      padding: 12px 18px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .primary {
      background: var(--accent);
      color: white;
    }
    .primary:hover { background: var(--accent-hover); }
    .ghost {
      background: transparent;
      color: var(--text);
      border: 1px solid var(--border);
    }
    .status {
      margin-top: 16px;
      min-height: 1.25rem;
      font-size: 0.9rem;
    }
    .status.ok { color: var(--ok); }
    .meta { font-size: 0.85rem; margin-top: 20px; color: var(--muted); }
    code { color: #93c5fd; }
  </style>
</head>
<body>
  <main class="card">
    <h1>${SCRIPT_DISPLAY_NAME}</h1>
    <p>
      One-click setup for Google Ads. Exports all 9 report types the AI Media Buyer
      app understands — search terms, keywords, placements, device, location,
      demographics, audience, ad schedule, and campaign — to Google Drive as CSV.
    </p>
    <ol>
      ${INSTALL_STEPS.map((step) => `<li>${step}</li>`).join('')}
    </ol>
    <div class="actions">
      <button type="button" class="primary" id="install-btn">Install in Google Ads</button>
      <a class="btn ghost" href="${downloadUrl}" download="${GOOGLE_ADS_EXPORT_SCRIPT_FILE}">Download .gs file</a>
      <a class="btn ghost" href="${GOOGLE_ADS_SCRIPTS_HOME_URL}" target="_blank" rel="noopener noreferrer">Open Scripts</a>
    </div>
    <p class="status" id="status" role="status"></p>
    <p class="meta">Default date range: <code>LAST_30_DAYS</code> · v${SCRIPT_VERSION}</p>
  </main>
  <script>
    const SCRIPT_TEXT = ${escapedScript};
    const GOOGLE_ADS_NEW = ${JSON.stringify(GOOGLE_ADS_SCRIPTS_NEW_URL)};
    const statusEl = document.getElementById('status');
    const installBtn = document.getElementById('install-btn');

    async function copyScript() {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(SCRIPT_TEXT);
        return true;
      }
      const ta = document.createElement('textarea');
      ta.value = SCRIPT_TEXT;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    }

    installBtn.addEventListener('click', async function () {
      statusEl.textContent = 'Copying script…';
      statusEl.className = 'status';
      try {
        const copied = await copyScript();
        if (!copied) throw new Error('Copy failed');
        statusEl.textContent = 'Script copied! Paste in the Google Ads editor (Ctrl+V / Cmd+V), then Save → Authorize → Run main.';
        statusEl.className = 'status ok';
        window.open(GOOGLE_ADS_NEW, '_blank', 'noopener,noreferrer');
      } catch (err) {
        statusEl.textContent = 'Could not copy automatically. Use Download .gs file instead.';
        statusEl.className = 'status';
      }
    });
  </script>
</body>
</html>`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Script unavailable';
    res.status(500).send(message);
  }
};
