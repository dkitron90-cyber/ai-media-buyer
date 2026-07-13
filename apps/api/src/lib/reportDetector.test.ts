import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectReportTypeAdvanced } from './reportDetector';

describe('detectReportTypeAdvanced', () => {
  it('detects SEARCH_TERMS from headers before filename', () => {
    const result = detectReportTypeAdvanced('keywords_report.csv', [
      'Search term',
      'Match type',
      'Campaign',
      'Clicks',
      'Impressions',
      'Cost',
    ]);
    assert.equal(result.reportType, 'SEARCH_TERMS');
    assert.equal(result.source, 'headers');
  });

  it('detects KEYWORDS when keyword column is present without search term', () => {
    const result = detectReportTypeAdvanced('export.csv', [
      'Keyword',
      'Campaign',
      'Clicks',
      'Impressions',
      'Cost',
    ]);
    assert.equal(result.reportType, 'KEYWORDS');
  });

  it('detects PLACEMENT from placement column', () => {
    const result = detectReportTypeAdvanced('report.csv', [
      'Placement',
      'Display name',
      'Campaign',
      'Clicks',
      'Cost',
    ]);
    assert.equal(result.reportType, 'PLACEMENT');
  });

  it('falls back to filename when headers are generic', () => {
    const result = detectReportTypeAdvanced('search_terms_last_30_days.csv', [
      'Column A',
      'Column B',
    ]);
    assert.equal(result.reportType, 'SEARCH_TERMS');
    assert.equal(result.source, 'filename');
  });
});
