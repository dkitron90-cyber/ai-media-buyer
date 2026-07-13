import { useEffect, useState } from 'react';
import {
  apiClient,
  type ActiveReportSummary,
  type CampaignReportStatus,
  type SearchTermReportRow,
  type UploadedReport,
} from '../lib/apiClient';
import { ReportCoverageSummary } from './ReportCoverageSummary';
import { ActiveReportsPanel } from './ActiveReportsPanel';
import { SupersededReportsPanel } from './SupersededReportsPanel';
import { CollapsibleSection } from './CollapsibleSection';

interface ReportManagerProps {
  campaignId: number;
  refreshTrigger?: number;
  /** Opens the client-level import wizard (same client as this campaign). */
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

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!event.target.files?.length) return;
    const file = event.target.files[0]!;

    try {
      setUploading(true);
      setUploadError(null);
      // Always refresh the report list after upload; other panels can fail
      // (e.g. readiness/gaps endpoints) without blocking the upload UX.
      await apiClient.uploadCampaignReport(campaignId, file);
      try {
        await refreshReports();
      } catch (refreshErr: unknown) {
        const message =
          refreshErr instanceof Error ? refreshErr.message : 'Failed to refresh reports.';
        setUploadError(message);
      }

      // Best-effort refresh of analysis-related panels.
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
      if (report.reportType === 'SEARCH_TERMS') {
        setSelectedReportId(report.id);
        await refreshRows(report.id);
      } else {
        setSelectedReportId(report.id);
        setRowsState({
          status: 'error',
          error: 'Parsed rows viewer is available for SEARCH_TERMS reports only.',
        });
      }
      setActionMessage('Report parsed successfully.');
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
      if (report.reportType === 'SEARCH_TERMS') {
        setSelectedReportId(report.id);
        await refreshRows(report.id);
      }
      setActionMessage('Report reparsed successfully.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to reparse report.';
      setRowsState({ status: 'error', error: message });
      await refreshAll();
      setActionMessage(message);
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
        error: 'Parsed rows viewer is available for SEARCH_TERMS reports only.',
      });
    }
  };

  const getReportBadge = (reportId: number) => {
    if (activeIds.has(reportId)) {
      return <span className="pill pill-active">Active</span>;
    }
    if (supersededIds.has(reportId)) {
      return <span className="pill pill-superseded">Superseded</span>;
    }
    return null;
  };

  return (
    <section className="card">
      <h2>Reports</h2>

      <div className="report-upload-row">
        <div className="report-upload-row-main">
          <label className="button button-secondary">
            <span>
              {uploading ? 'Uploading…' : 'Upload report to this campaign'}
            </span>
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
              Import report
            </button>
          )}
        </div>
        {uploadError && <p className="status status-error">{uploadError}</p>}
      </div>

      {actionMessage && <p className="status status-loading">{actionMessage}</p>}

      {/* Coverage summary */}
      {activeState.status === 'success' &&
        statusState.status === 'success' && (
          <ReportCoverageSummary
            activeSummary={activeState.data}
            relevantReportTypes={statusState.data.relevantReportTypes}
          />
        )}

      <CollapsibleSection
        title="Active & historical reports"
        subtitle="Manage uploads, parsing, and coverage"
        defaultCollapsed
      >
        {/* Active reports */}
        {activeState.status === 'loading' && (
          <p className="status status-loading">Loading active reports…</p>
        )}
        {activeState.status === 'error' && (
          <p className="status status-error">{activeState.error}</p>
        )}
        {activeState.status === 'success' && (
          <>
            <h3 className="report-section-heading">Active reports</h3>
            <ActiveReportsPanel
              activeReports={activeState.data.activeReports}
              onSelectReport={handleSelectReport}
              selectedReportId={selectedReportId}
              renderStatusPill={renderStatusPill}
            />
            <SupersededReportsPanel
              supersededReports={activeState.data.supersededReports}
              renderStatusPill={renderStatusPill}
            />
          </>
        )}

        <div className="report-layout">
          <div className="report-column">
            <h3>All uploaded reports</h3>
            {reportsState.status === 'loading' && (
              <p className="status status-loading">Loading reports…</p>
            )}
            {reportsState.status === 'error' && (
              <p className="status status-error">{reportsState.error}</p>
            )}
            {reportsState.status === 'success' &&
              (reportsState.data.length === 0 ? (
                <p className="status status-loading">
                  No reports uploaded for this campaign yet.
                </p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>File</th>
                      <th>Status</th>
                      <th>Uploaded</th>
                      <th />
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
                            {report.reportType}
                            {getReportBadge(report.id)}
                          </span>
                        </td>
                        <td title={report.fileName}>{report.fileName}</td>
                        <td>{renderStatusPill(report.uploadStatus)}</td>
                        <td>
                          {new Date(report.uploadedAt).toLocaleString(undefined, {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="table-actions">
                          <button
                            type="button"
                            className="button button-ghost"
                            onClick={() => handleSelectReport(report)}
                          >
                            View rows
                          </button>
                          {report.reportType === 'SEARCH_TERMS' && (
                            <button
                              type="button"
                              className="button button-primary"
                              onClick={() => handleParseReport(report)}
                              disabled={busyReportId === report.id}
                            >
                              {busyReportId === report.id ? 'Parsing…' : 'Parse'}
                            </button>
                          )}
                          <button
                            type="button"
                            className="button button-secondary"
                            onClick={() => handleReparseReport(report)}
                            disabled={busyReportId === report.id}
                          >
                            {busyReportId === report.id ? 'Reparsing…' : 'Reparse'}
                          </button>
                          <button
                            type="button"
                            className="button button-danger"
                            onClick={() => {
                              // simple inline confirmation
                              // eslint-disable-next-line no-alert
                              const confirmed = window.confirm(
                                'Delete this report? This cannot be undone.'
                              );
                              if (confirmed) void handleDeleteReport(report);
                            }}
                            disabled={busyReportId === report.id}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}
          </div>

          <div className="report-column">
            <h3>Report status</h3>
            {statusState.status === 'loading' && (
              <p className="status status-loading">Loading report status…</p>
            )}
            {statusState.status === 'error' && (
              <p className="status status-error">{statusState.error}</p>
            )}
            {statusState.status === 'success' && (
              <div className="status-grid">
                <div>
                  <span className="detail-label">Relevant types</span>
                  <div className="pill-row">
                    {statusState.data.relevantReportTypes.map((type) => (
                      <span key={type} className="pill">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="detail-label">Uploaded</span>
                  <div className="pill-row">
                    {statusState.data.uploadedReportTypes.length === 0 ? (
                      <span className="pill pill-muted">None</span>
                    ) : (
                      statusState.data.uploadedReportTypes.map((type) => (
                        <span key={type} className="pill pill-ok">
                          {type}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <span className="detail-label">Missing</span>
                  <div className="pill-row">
                    {statusState.data.missingReportTypes.length === 0 ? (
                      <span className="pill pill-ok">All covered</span>
                    ) : (
                      statusState.data.missingReportTypes.map((type) => (
                        <span key={type} className="pill pill-warning">
                          {type}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            <h3>Parsed SEARCH_TERMS rows</h3>
            {rowsState.status === 'idle' && (
              <p className="status status-loading">
                Select a SEARCH_TERMS report and parse it to view rows.
              </p>
            )}
            {rowsState.status === 'loading' && (
              <p className="status status-loading">Loading parsed rows…</p>
            )}
            {rowsState.status === 'error' && (
              <p className="status status-error">{rowsState.error}</p>
            )}
            {rowsState.status === 'success' &&
              (rowsState.data.length === 0 ? (
                <p className="status status-loading">
                  No parsed rows found for this report.
                </p>
              ) : (
                <div className="table-scroll">
                  <table className="table table-compact">
                    <thead>
                      <tr>
                        <th>Search term</th>
                        <th>Campaign</th>
                        <th>Clicks</th>
                        <th>Impr.</th>
                        <th>Cost</th>
                        <th>Conv.</th>
                        <th>CTR %</th>
                        <th>CPC</th>
                        <th>CPA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rowsState.data.map((row) => (
                        <tr key={row.id}>
                          <td>{row.searchTerm}</td>
                          <td>{row.campaignName}</td>
                          <td>{row.clicks}</td>
                          <td>{row.impressions}</td>
                          <td>{row.cost.toFixed(2)}</td>
                          <td>{row.conversions.toFixed(2)}</td>
                          <td>
                            {row.ctr != null ? row.ctr.toFixed(2) : '—'}
                          </td>
                          <td>
                            {row.cpc != null ? row.cpc.toFixed(2) : '—'}
                          </td>
                          <td>
                            {row.cpa != null ? row.cpa.toFixed(2) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
          </div>
        </div>
      </CollapsibleSection>
    </section>
  );
};
