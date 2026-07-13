import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { parseGoogleAdsFixtureCsv } from './parseGoogleAdsFixtureCsv';
import { resolveCampaignTypeForCreate } from './inferCampaignType';

const fixture = (name: string): string =>
  fs.readFileSync(
    path.join(__dirname, '..', '__fixtures__', name),
    'utf8'
  );

describe('parseGoogleAdsFixtureCsv', () => {
  it('parses search terms fixture with metrics', () => {
    const rows = parseGoogleAdsFixtureCsv(
      'search_terms_sample.csv',
      fixture('search_terms_sample.csv')
    );
    assert.equal(rows.length, 3);
    assert.equal(rows[0]!.reportType, 'SEARCH_TERMS');
    assert.equal(rows[0]!.dimensionValue, 'running shoes');
    assert.equal(rows[0]!.campaignName, 'Brand Search US');
    assert.equal(rows[0]!.clicks, 120);
    assert.equal(rows[0]!.ctr, 5);
    assert.equal(rows[0]!.cpa, 48.5 / 6);
    assert.equal(rows[2]!.dimensionValue, 'buy trainers');
  });

  it('parses keywords fixture', () => {
    const rows = parseGoogleAdsFixtureCsv(
      'keywords_sample.csv',
      fixture('keywords_sample.csv')
    );
    assert.equal(rows.length, 2);
    assert.equal(rows[0]!.reportType, 'KEYWORDS');
    assert.equal(rows[0]!.dimensionValue, '[women shoes]');
    assert.equal(rows[1]!.campaignName, 'PMax - Shoes');
  });

  it('parses placement fixture', () => {
    const rows = parseGoogleAdsFixtureCsv(
      'placement_sample.csv',
      fixture('placement_sample.csv')
    );
    assert.equal(rows.length, 2);
    assert.equal(rows[0]!.reportType, 'PLACEMENT');
    assert.equal(rows[0]!.dimensionValue, 'example.com/page');
    assert.equal(rows[1]!.clicks, 5);
  });

  it('returns empty array for unrecognizable CSV', () => {
    const rows = parseGoogleAdsFixtureCsv('unknown.csv', 'Foo,Bar\n1,2\n');
    assert.deepEqual(rows, []);
  });
});

describe('resolveCampaignTypeForCreate', () => {
  it('uses explicit override when provided', () => {
    assert.equal(
      resolveCampaignTypeForCreate({
        reportType: 'SEARCH_TERMS',
        campaignName: 'Generic Promo',
        override: 'PERFORMANCE_MAX',
      }),
      'PERFORMANCE_MAX'
    );
  });

  it('falls back to inference when override is absent', () => {
    assert.equal(
      resolveCampaignTypeForCreate({
        reportType: 'PLACEMENT',
        campaignName: 'Spring Promo',
      }),
      'DISPLAY'
    );
  });
});
