import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeForCampaignMatch } from './campaignNameMatch';

describe('normalizeForCampaignMatch', () => {
  it('normalizes spacing and comma spacing', () => {
    assert.equal(
      normalizeForCampaignMatch('  Brand ,  US  '),
      'brand, us'
    );
  });

  it('normalizes non-breaking spaces', () => {
    assert.equal(
      normalizeForCampaignMatch('Brand\u00a0US'),
      'brand us'
    );
  });
});
