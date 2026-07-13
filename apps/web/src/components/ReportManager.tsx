import { useEffect, useState } from 'react';
import {
  apiClient,
  type ActiveReportSummary,
  type CampaignReportStatus,
  type SearchTermReportRow,
  type UploadedReport,
} from '../lib/apiClient';
import { ReportCoverageSummary } from './ReportCoverageSummary';
import { CollapsibleSection } from './CollapsibleSection';

interface ReportManagerProps {
  campaignId: number;
  refreshTrigger?: number;
  onOpenClientImport?: () => void;
}

type LoadState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: T };

const renderStatusPill = (status: string) => {
  const normalized = status.toUpperCase();
  const className =
    normalized === 'PARSED'
      ? 'pill pill-ok'
      : normalized === 'FAILED'
        ? 'pill pill-error'
        : normalized === 'PARSING'
          ? 'pill pill-warning'
          : 'pill';
  return <span className={className}>{normalized}</span>;
};

const formatUploaded = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  });

export const ReportManager = ({
  campaignId,
  refreshTrigger = 0,
  onOpenClientImport,
}: ReportManagerProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [reportsState, setReportsState] = useState<LoadState<UploadedReport[]>>({
    status: 'idle',
  });
  const [statusState, setStatusState] = useState<LoadState<CampaignReportStatus>>({
    status: 'idle',
  });
  const [activeState, setActiveState] = useState<LoadState<ActiveReportSummary>>({
    status: 'idle',
  });

  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [rowsState, setRowsState] = useState<LoadState<SearchTermReportRow[]>>({
    status: 'idle',
  });
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [busyReportId, setBusyReportId] = useState<number | null>(null);

  const refreshReports = async () => {
    try {
      setReportsState({ status: 'loading' });
      const reports = await apiClient.listCampaignReports(campaignId);
      setReportsState({ status: 'success', data: reports });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load reports.';
      setReportsState({ status: 'error', error: message });
    }
  };

  const refreshStatus = async () => {
    try {
      setStatusState({ status: 'loading' });
      const status = await apiClient.getCampaignReportStatus(campaignId);
      setStatusState({ status: 'success', data: status });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load report status.';
      setStatusState({ status: 'error', error: message });
    }
  };

  const refreshActive = async () => {
    try {
      setActiveState({ status: 'loading' });
      const summary = await apiClient.getActiveReports(campaignId);
      setActiveState({ status: 'success', data: summary });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load active reports.';
      setActiveState({ status: 'error', error: message });
    }
  };

  const refreshAll = async () => {
    await Promise.all([refreshReports(), refreshStatus(), refreshActive()]);
  };

  const refreshRows = async (reportId: number) => {
    try {
      setRowsState({ status: 'loading' });
      const rows = await apiClient.listSearchTermRows(reportId);
      setRowsState({ status: 'success', data: rows });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to load parsed SEARCH_TERMS rows.';
      setRowsState({ status: 'error', error: message });
    }
  };

  useEffect(() => {
    void refreshAll();
    setSelectedReportId(null);
    setRowsState({ status: 'idle' });
  }, [campaignId, refreshTrigger]);

  const activeIds =
    activeState.status === 'success'
      ? new Set(activeState.data.activeReports.map((r) => r.id))
      : new Set<number>();

  const supersededIds =
    activeState.status === 'success'
      ? new Set(activeState.data.supersededReports.map((r) => r.id))
      : new Set<number>();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;
    const file = event.target.files[0]!;

    try {
      setUploading(true);
      setUploadError(null);
      await apiClient.uploadCampaignReport(campaignId, file);
      try {
        await refreshReports();
      } catch (refreshErr: unknown) {
        const message =
          refreshErr instanceof Error ? refreshErr.message : 'Failed to refresh reports.';
        setUploadError(message);
      }
      void refreshStatus().catch(() => undefined);
      void refreshActive().catch(() => undefined);
      event.target.value = '';
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to upload report.';
      setUploadError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleParseReport = async (report: UploadedReport) => {
    try {
      setBusyReportId(report.id);
      setActionMessage(null);
      await apiClient.parseReport(report.id);
      await refreshAll();
      setSelectedReportId(report.id);
      if (report.reportType === 'SEARCH_TERMS') {
        await refreshRows(report.id);
      } else {
        setRowsState({
          status: 'error',
          error: 'Row preview is only available for SEARCH_TERMS reports.',
        });
      }
      setActionMessage('Report parsed.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to parse report.';
      setRowsState({ status: 'error', error: message });
      await refreshAll();
      setActionMessage(message);
    } finally {
      setBusyReportId(null);
    }
  };

  const handleReparseReport = async (report: UploadedReport) => {
    try {
      setBusyReportId(report.id);
      setActionMessage(null);
      await apiClient.reparseReport(report.id);
      await refreshAll();
      if (report.reportType === 'SEARCH_TERMS' && selectedReportId === report.id) {
        await refreshRows(report.id);
      }
      setActionMessage('Report reparsed.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to reparse report.';
      setActionMessage(message);
      await refreshAll();
    } finally {
      setBusyReportId(null);
    }
  };

  const handleDeleteReport = async (report: UploadedReport) => {
    try {
      setBusyReportId(report.id);
      setActionMessage(null);
      await apiClient.deleteReport(campaignId, report.id);
      if (selectedReportId === report.id) {
        setSelectedReportId(null);
        setRowsState({ status: 'idle' });
      }
      await refreshAll();
      setActionMessage('Report deleted.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete report.';
      setActionMessage(message);
    } finally {
      setBusyReportId(null);
    }
  };

  const handleSelectReport = (report: UploadedReport) => {
    setSelectedReportId(report.id);
    if (report.reportType === 'SEARCH_TERMS') {
      void refreshRows(report.id);
    } else {
      setRowsState({
        status: 'error',
        error: 'Row preview is only available for SEARCH_TERMS reports.',
      });
    }
  };

  const getReportBadge = (reportId: number) => {
    if (activeIds.has(reportId)) {
      return <span className="pill pill-active">Active</span>;
    }
    if (supersededIds.has(reportId)) {
      return <span className="pill pill-superseded">Old</span>;
    }
    return null;
  };

  const reportCount =
    reportsState.status === 'success' ? reportsState.data.length : 0;

  return (
    <section className="card report-manager">
      <div className="report-manager__head">
        <h2>Reports</h2>
        {reportCount > 0 && (
          <span className="pill pill-muted">{reportCount} uploaded</span>
        )}
      </div>

      <div className="report-upload-row">
        <div className="report-upload-row-main">
          <label className="button button-secondary button-xs">
            <span>{uploading ? 'Uploading…' : 'Upload CSV'}</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>
          {onOpenClientImport && (
            <button
              type="button"
              className="button button-primary button-xs"
              onClick={onOpenClientImport}
            >
              Import wizard
            </button>
          )}
        </div>
        {uploadError && <p className="status status-error">{uploadError}</p>}
      </div>

      {actionMessage && <p className="status status-loading">{actionMessage}</p>}

      {activeState.status === 'success' && statusState.status === 'success' && (
        <ReportCoverageSummary
          activeSummary={activeState.data}
          relevantReportTypes={statusState.data.relevantReportTypes}
        />
      )}

      <CollapsibleSection
        title="Uploaded files"
        subtitle={
          reportCount > 0
            ? `${reportCount} file${reportCount === 1 ? '' : 's'}`
            : 'None yet'
        }
        defaultCollapsed={reportCount === 0}
      >
        {reportsState.status === 'loading' && (
          <p className="status status-loading">Loading reports…</p>
        )}
        {reportsState.status === 'error' && (
          <p className="status status-error">{reportsState.error}</p>
        )}
        {reportsState.status === 'success' &&
          (reportsState.data.length === 0 ? (
            <p className="status status-loading">No reports uploaded yet.</p>
          ) : (
            <div className="report-table-wrap">
              <table className="table report-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>File</th>
                    <th>Status</th>
                    <th>When</th>
                    <th className="report-table__actions-head">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reportsState.data.map((report) => (
                    <tr
                      key={report.id}
                      className={
                        selectedReportId === report.id ? 'row-selected' : undefined
                      }
                    >
                      <td>
                        <span className="report-type-cell">
                          <span className="report-type-cell__label">
                            {report.reportType.replace(/_/g, ' ')}
                          </span>
                          {getReportBadge(report.id)}
                        </span>
                      </td>
                      <td className="report-table__file" title={report.fileName}>
                        {report.fileName}
                      </td>
                      <td>{renderStatusPill(report.uploadStatus)}</td>
                      <td className="report-table__when">
                        {formatUploaded(report.uploadedAt)}
                      </td>
                      <td className="table-actions table-actions--compact">
                        <button
                          type="button"
                          className="button button-ghost button-xs"
                          onClick={() => handleSelectReport(report)}
                        >
                          Rows
                        </button>
                        {report.reportType === 'SEARCH_TERMS' && (
                          <button
                            type="button"
                            className="button button-primary button-xs"
                            onClick={() => handleParseReport(report)}
                            disabled={busyReportId === report.id}
                          >
                            {busyReportId === report.id ? '…' : 'Parse'}
                          </button>
                        )}
                        <button
                          type="button"
                          className="button button-secondary button-xs"
                          onClick={() => handleReparseReport(report)}
                          disabled={busyReportId === report.id}
                        >
                          Redo
                        </button>
                        <button
                          type="button"
                          className="button button-danger button-xs"
                          onClick={() => {
                            const confirmed = window.confirm(
                              'Delete this report? This cannot be undone.'
                            );
                            if (confirmed) void handleDeleteReport(report);
                          }}
                          disabled={busyReportId === report.id}
                        >
                          Del
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

        {selectedReportId != null && (
          <CollapsibleSection
            title="Search term rows"
            subtitle="Preview parsed SEARCH_TERMS data"
            defaultCollapsed={rowsState.status !== 'success'}
          >
            {rowsState.status === 'idle' && (
              <p className="status status-loading">
                Select a SEARCH_TERMS report and tap Rows.
              </p>
            )}
            {rowsState.status === 'loading' && (
              <p className="status status-loading">Loading rows…</p>
            )}
            {rowsState.status === 'error' && (
              <p className="status status-error">{rowsState.error}</p>
            )}
            {rowsState.status === 'success' &&
              (rowsState.data.length === 0 ? (
                <p className="status status-loading">No rows in this report.</p>
              ) : (
                <div className="table-scroll">
                  <table className="table table-compact">
                    <thead>
                      <tr>
                        <th>Term</th>
                        <th>Clicks</th>
                        <th>Impr.</th>
                        <th>Cost</th>
                        <th>Conv.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rowsState.data.map((row) => (
                        <tr key={row.id}>
                          <td>{row.searchTerm}</td>
                          <td>{row.clicks}</td>
                          <td>{row.impressions}</td>
                          <td>{row.cost.toFixed(2)}</td>
                          <td>{row.conversions.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
          </CollapsibleSection>
        )}
      </CollapsibleSection>
    </section>
  );
};
