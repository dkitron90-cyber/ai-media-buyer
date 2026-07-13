import type { ImpactMetrics } from '../lib/apiClient';

interface ActionImpactMetricsProps {
  before: ImpactMetrics | null;
  after: ImpactMetrics | null;
  delta: ImpactMetrics | null;
}

const METRIC_ROWS: Array<{
  key: keyof ImpactMetrics;
  label: string;
  format: (value: unknown) => string;
  deltaPreference?: 'higher_is_better' | 'lower_is_better' | 'neutral';
}> = [
  { key: 'clicks', label: 'Clicks', format: formatInt },
  { key: 'impressions', label: 'Impressions', format: formatInt },
  { key: 'cost', label: 'Cost', format: formatCurrency, deltaPreference: 'lower_is_better' },
  { key: 'conversions', label: 'Conversions', format: formatNumber },
  { key: 'conversionValue', label: 'Conversion Value', format: formatCurrency },
  { key: 'ctr', label: 'CTR', format: formatPercent, deltaPreference: 'higher_is_better' },
  { key: 'cpc', label: 'CPC', format: formatCurrency, deltaPreference: 'lower_is_better' },
  { key: 'cpa', label: 'CPA', format: formatCurrency, deltaPreference: 'lower_is_better' },
  { key: 'roas', label: 'ROAS', format: formatPercent, deltaPreference: 'higher_is_better' },
];

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function formatInt(value: unknown): string {
  if (!isNumber(value)) return '—';
  return Math.round(value).toLocaleString();
}

function formatNumber(value: unknown): string {
  if (!isNumber(value)) return '—';
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatCurrency(value: unknown): string {
  if (!isNumber(value)) return '—';
  return value.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });
}

function formatPercent(value: unknown): string {
  if (!isNumber(value)) return '—';
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

function deltaClass(
  deltaValue: unknown,
  preference: 'higher_is_better' | 'lower_is_better' | 'neutral' = 'neutral'
): string {
  if (!isNumber(deltaValue) || deltaValue === 0) return 'impact-delta impact-delta-neutral';

  const positive = deltaValue > 0;
  if (preference === 'neutral') {
    return positive ? 'impact-delta impact-delta-positive' : 'impact-delta impact-delta-negative';
  }
  if (preference === 'higher_is_better') {
    return positive ? 'impact-delta impact-delta-positive' : 'impact-delta impact-delta-negative';
  }
  // lower_is_better
  return positive ? 'impact-delta impact-delta-negative' : 'impact-delta impact-delta-positive';
}

function formatDelta(value: unknown, format: (value: unknown) => string): string {
  if (!isNumber(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${format(value)}`;
}

export const ActionImpactMetrics = ({ before, after, delta }: ActionImpactMetricsProps) => {
  return (
    <div className="table-scroll">
      <table className="table table-compact">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Before</th>
            <th>After</th>
            <th>Δ</th>
          </tr>
        </thead>
        <tbody>
          {METRIC_ROWS.map((row) => {
            const b = before?.[row.key];
            const a = after?.[row.key];
            const d = delta?.[row.key];
            return (
              <tr key={row.key as string}>
                <td>{row.label}</td>
                <td>{row.format(b)}</td>
                <td>{row.format(a)}</td>
                <td className={deltaClass(d, row.deltaPreference)}>
                  {formatDelta(d, row.format)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

