import type { ActiveReport, UploadedReport } from '../lib/apiClient';

interface ActiveReportsPanelProps {
  activeReports: ActiveReport[];
  onSelectReport: (report: UploadedReport) => void;
  selectedReportId: number | null;
  renderStatusPill: (status: string) => React.ReactNode;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export const ActiveReportsPanel = ({
  activeReports,
  onSelectReport,
  selectedReportId,
  renderStatusPill,
}: ActiveReportsPanelProps) => {
  if (activeReports.length === 0) {
    return (
      <p className="status status-loading">
        No active reports. Upload and parse a report to activate it.
      </p>
    );
  }

  return (
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
        {activeReports.map((report) => (
          <tr
            key={report.id}
            className={selectedReportId === report.id ? 'row-selected' : undefined}
          >
            <td>
              <span className="report-type-cell">
                {report.reportType}
                <span className="pill pill-active">Active</span>
              </span>
            </td>
            <td title={report.fileName}>{report.fileName}</td>
            <td>{renderStatusPill(report.uploadStatus)}</td>
            <td>{formatDate(report.uploadedAt)}</td>
            <td className="table-actions">
              <button
                type="button"
                className="button button-ghost"
                onClick={() =>
                  onSelectReport({
                    ...report,
                    filePath: '',
                    fileSizeBytes: null,
                    checksum: null,
                    errorMessage: null,
                    createdAt: report.uploadedAt,
                    updatedAt: report.uploadedAt,
                  })
                }
              >
                View rows
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
