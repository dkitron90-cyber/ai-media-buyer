import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHeader, parseCsvLine } from './csv';

describe('parseCsvLine', () => {
  it('parses quoted commas correctly', () => {
    assert.deepEqual(parseCsvLine('"Campaign, US",Clicks,Cost'), [
      'Campaign, US',
      'Clicks',
      'Cost',
    ]);
  });

  it('handles simple quoted fields', () => {
    assert.deepEqual(parseCsvLine('"Hello world",10'), ['Hello world', '10']);
  });
});

describe('normalizeHeader', () => {
  it('lowercases and normalizes punctuation', () => {
    assert.equal(normalizeHeader('  Search Term '), 'search term');
    assert.equal(normalizeHeader('Avg. CPC'), 'avg cpc');
  });
});
