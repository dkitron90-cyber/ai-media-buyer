import { useState } from 'react';
import type { ActiveReport } from '../lib/apiClient';
import { IconChevronDown, IconChevronRight } from '../lib/icons';

interface SupersededReportsPanelProps {
  supersededReports: ActiveReport[];
  renderStatusPill: (status: string) => React.ReactNode;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export const SupersededReportsPanel = ({
  supersededReports,
  renderStatusPill,
}: SupersededReportsPanelProps) => {
  const [expanded, setExpanded] = useState(false);

  if (supersededReports.length === 0) return null;

  return (
    <div className="superseded-panel">
      <button
        type="button"
        className="superseded-toggle"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="superseded-toggle-label">
          Superseded reports ({supersededReports.length})
        </span>
        <span className="superseded-toggle-icon" aria-hidden>
          {expanded ? (
            <IconChevronDown className="superseded-toggle-icon__svg" />
          ) : (
            <IconChevronRight className="superseded-toggle-icon__svg" />
          )}
        </span>
      </button>

      {expanded && (
        <table className="table table-compact">
          <thead>
            <tr>
              <th>Type</th>
              <th>File</th>
              <th>Status</th>
              <th>Uploaded</th>
            </tr>
          </thead>
          <tbody>
            {supersededReports.map((report) => (
              <tr key={report.id}>
                <td>
                  <span className="report-type-cell">
                    {report.reportType}
                    <span className="pill pill-superseded">Superseded</span>
                  </span>
                </td>
                <td title={report.fileName}>{report.fileName}</td>
                <td>{renderStatusPill(report.uploadStatus)}</td>
                <td>{formatDate(report.uploadedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
