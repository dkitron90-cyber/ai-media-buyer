import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  inferCampaignTypeForImport,
  inferCampaignTypeFromCampaignName,
  inferCampaignTypeFromReportType,
} from './inferCampaignType';

describe('inferCampaignTypeFromReportType', () => {
  it('maps search reports to SEARCH', () => {
    assert.equal(inferCampaignTypeFromReportType('SEARCH_TERMS'), 'SEARCH');
    assert.equal(inferCampaignTypeFromReportType('KEYWORDS'), 'SEARCH');
  });

  it('maps placement reports to DISPLAY', () => {
    assert.equal(inferCampaignTypeFromReportType('PLACEMENT'), 'DISPLAY');
  });

  it('returns null for ambiguous segment reports', () => {
    assert.equal(inferCampaignTypeFromReportType('CAMPAIGN'), null);
    assert.equal(inferCampaignTypeFromReportType('DEVICE'), null);
    assert.equal(inferCampaignTypeFromReportType('AD_SCHEDULE'), null);
  });
});

describe('inferCampaignTypeFromCampaignName', () => {
  it('detects PMax from campaign name', () => {
    assert.equal(
      inferCampaignTypeFromCampaignName('Brand | PMax | US'),
      'PERFORMANCE_MAX'
    );
  });

  it('detects Search from campaign name', () => {
    assert.equal(
      inferCampaignTypeFromCampaignName('NB Search - Widgets'),
      'SEARCH'
    );
  });
});

describe('inferCampaignTypeForImport', () => {
  it('prefers campaign name over report type', () => {
    const result = inferCampaignTypeForImport({
      reportType: 'SEARCH_TERMS',
      campaignName: 'YouTube Video Prospecting',
    });
    assert.equal(result.type, 'VIDEO');
    assert.equal(result.source, 'campaign_name');
    assert.equal(result.confidence, 'high');
  });

  it('falls back to report type when name is generic', () => {
    const result = inferCampaignTypeForImport({
      reportType: 'KEYWORDS',
      campaignName: 'Spring Promo',
    });
    assert.equal(result.type, 'SEARCH');
    assert.equal(result.source, 'report_type');
  });

  it('defaults to OTHER when signals are weak', () => {
    const result = inferCampaignTypeForImport({
      reportType: 'DEVICE',
      campaignName: 'Spring Promo',
    });
    assert.equal(result.type, 'OTHER');
    assert.equal(result.source, 'default');
  });
});
