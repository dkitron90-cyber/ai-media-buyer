import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeCpa, computeCpc, computeCtr, computeRoas } from './reportMetrics';

describe('reportMetrics', () => {
  it('computes CTR from clicks and impressions', () => {
    assert.equal(computeCtr(25, 1000, null), 2.5);
  });

  it('prefers CTR from file when provided', () => {
    assert.equal(computeCtr(25, 1000, 3.1), 3.1);
  });

  it('computes CPC and CPA', () => {
    assert.equal(computeCpc(50, 10, null), 5);
    assert.equal(computeCpa(100, 4), 25);
  });

  it('computes ROAS from conversion value and cost', () => {
    assert.equal(computeRoas(500, 100, null), 5);
  });

  it('returns null for zero denominators', () => {
    assert.equal(computeCtr(0, 0, null), null);
    assert.equal(computeCpc(10, 0, null), null);
    assert.equal(computeCpa(10, 0), null);
  });
});
