import { useCallback, useState } from 'react';
import { GoogleAdsScriptInstallCard } from './GoogleAdsScriptInstallCard';

interface ReportUploadStepProps {
  clientId: number | null;
  clientName: string | null;
  file: File | null;
  onFileSelected: (file: File | null) => void;
  onInspect: () => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
}

export const ReportUploadStep = ({
  clientId,
  clientName,
  file,
  onFileSelected,
  onInspect,
  onCancel,
  loading,
  error,
}: ReportUploadStepProps) => {
  const [dragActive, setDragActive] = useState(false);

  const noClient = clientId == null;

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (noClient) return;
      const f = e.dataTransfer.files?.[0];
      if (f) onFileSelected(f);
    },
    [noClient, onFileSelected]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  return (
    <div className="modal modal-wide">
      <h3 className="modal-title">Import report to client</h3>
      <p className="modal-body">
        Map campaigns from a Google Ads export, create any missing campaigns under this
        client, and import rows in one flow.
      </p>

      <div className="stack gap-md">
        <div className="smart-upload-client-banner">
          {noClient ? (
            <p className="status status-error" role="alert">
              Select a client before importing a report.
            </p>
          ) : (
            <p className="smart-upload-client-line">
              <span className="detail-label">Importing into client</span>
              <span className="smart-upload-client-name">
                {clientName ?? `Client #${clientId}`}
              </span>
            </p>
          )}
        </div>

        <div
          className={`smart-upload-dropzone ${dragActive ? 'smart-upload-dropzone-active' : ''} ${noClient ? 'smart-upload-dropzone-disabled' : ''}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
        >
          <p className="smart-upload-dropzone-title">
            {file ? file.name : 'Drop a CSV or TSV file here'}
          </p>
          <p className="insight-secondary">or choose a file from your device</p>
          <label className="button button-ghost button-xs smart-upload-file-btn">
            Browse files
            <input
              type="file"
              accept=".csv,.tsv,text/csv,text/tab-separated-values"
              disabled={noClient || loading}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                onFileSelected(f);
              }}
            />
          </label>
        </div>

        <GoogleAdsScriptInstallCard />

        {error && <p className="status status-error">{error}</p>}

        <div className="modal-actions">
          <button
            type="button"
            className="button button-ghost button-xs"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button button-cta button-xs"
            onClick={onInspect}
            disabled={!file || loading || noClient}
          >
            {loading ? 'Inspecting…' : 'Inspect report'}
          </button>
        </div>
      </div>
    </div>
  );
};
