import type { ReportDateRange } from '../lib/apiClient';

interface DataWindowReportRangesProps {
  ranges: ReportDateRange[];
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return iso.split('T')[0];
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const DataWindowReportRanges = ({ ranges }: DataWindowReportRangesProps) => {
  if (ranges.length === 0) {
    return (
      <div className="dw-ranges-empty">
        No active reports with date information.
      </div>
    );
  }

  return (
    <div className="dw-ranges">
      <span className="dw-section-label">Active Report Ranges</span>
      <div className="table-scroll">
        <table className="table table-compact">
          <thead>
            <tr>
              <th>Report Type</th>
              <th>Start</th>
              <th>End</th>
              <th>Rows</th>
              <th>Processed</th>
            </tr>
          </thead>
          <tbody>
            {ranges.map((r) => (
              <tr key={r.reportId}>
                <td className="report-type-cell">
                  {r.reportType.replace(/_/g, ' ')}
                </td>
                <td>{formatDate(r.dateRangeStart)}</td>
                <td>{formatDate(r.dateRangeEnd)}</td>
                <td>{r.rowCount?.toLocaleString() ?? '—'}</td>
                <td>{formatTimestamp(r.processedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
