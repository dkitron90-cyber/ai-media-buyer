import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAndMapHeaders } from './headerNormalizer';

describe('normalizeAndMapHeaders', () => {
  it('maps Google Ads search term headers to canonical fields', () => {
    const result = normalizeAndMapHeaders([
      'Search term',
      'Match type',
      'Campaign',
      'Clicks',
      'Impressions',
      'Cost',
    ]);
    assert.ok(result.canonicalFields.has('searchTerm'));
    assert.ok(result.canonicalFields.has('matchType'));
    assert.ok(result.canonicalFields.has('campaignName'));
    assert.equal(result.fieldIndexMap.get('searchTerm'), 0);
  });

  it('maps placement and device headers', () => {
    const placement = normalizeAndMapHeaders(['Placement', 'Campaign', 'Cost']);
    assert.ok(placement.canonicalFields.has('placement'));

    const device = normalizeAndMapHeaders(['Device', 'Campaign', 'Clicks']);
    assert.ok(device.canonicalFields.has('device'));
  });
});
