import { useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import {
  GOOGLE_ADS_SCRIPTS_NEW_URL,
  googleAdsScriptDownloadUrl,
  googleAdsScriptInstallUrl,
} from '../../lib/googleAdsScript';

type InstallStatus = 'idle' | 'working' | 'copied' | 'error';

export const GoogleAdsScriptInstallCard = () => {
  const [status, setStatus] = useState<InstallStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleInstallInApp = async () => {
    setStatus('working');
    setStatusMessage(null);
    try {
      const meta = await apiClient.getGoogleAdsExportScript();
      await navigator.clipboard.writeText(meta.scriptText);
      window.open(GOOGLE_ADS_SCRIPTS_NEW_URL, '_blank', 'noopener,noreferrer');
      setStatus('copied');
      setStatusMessage(
        'Script copied! In Google Ads: + → New script → paste (Ctrl+V) → Save → Authorize → Run main.'
      );
    } catch {
      setStatus('error');
      setStatusMessage(
        'Could not copy automatically. Use “Open install page” or download the .gs file.'
      );
    }
  };

  const handleDownload = () => {
    window.open(googleAdsScriptDownloadUrl(), '_blank', 'noopener,noreferrer');
  };

  const handleOpenInstallPage = () => {
    window.open(googleAdsScriptInstallUrl(), '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="card card-compact smart-upload-script-hint">
      <h4 className="template-subheading">Google Ads export script</h4>
      <p className="list-item-meta">
        Install our default script to export all 9 report types (search terms, keywords,
        placements, device, location, demographics, audience, ad schedule, campaign) to
        Google Drive as upload-ready CSV files.
      </p>

      <div className="smart-upload-script-actions">
        <button
          type="button"
          className="button button-primary button-xs"
          onClick={handleInstallInApp}
          disabled={status === 'working'}
        >
          {status === 'working' ? 'Copying…' : 'Install in Google Ads'}
        </button>
        <button
          type="button"
          className="button button-ghost button-xs"
          onClick={handleOpenInstallPage}
        >
          Open install page
        </button>
        <button
          type="button"
          className="button button-ghost button-xs"
          onClick={handleDownload}
        >
          Download .gs
        </button>
      </div>

      <p className="list-item-meta smart-upload-script-share">
        Shareable install URL:{' '}
        <a href={googleAdsScriptInstallUrl()} target="_blank" rel="noopener noreferrer">
          {googleAdsScriptInstallUrl()}
        </a>
      </p>

      {statusMessage && (
        <p
          className={
            status === 'copied'
              ? 'status status-ok smart-upload-script-status'
              : 'status status-error smart-upload-script-status'
          }
          role="status"
        >
          {statusMessage}
        </p>
      )}
    </div>
  );
};
