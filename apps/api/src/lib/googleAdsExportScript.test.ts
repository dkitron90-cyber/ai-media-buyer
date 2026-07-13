import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { readGoogleAdsExportScript, resolveGoogleAdsExportScriptPath } from './googleAdsExportScript';

describe('googleAdsExportScript', () => {
  it('resolves the bundled export script on disk', () => {
    const scriptPath = resolveGoogleAdsExportScriptPath();
    assert.ok(fs.existsSync(scriptPath));
    assert.ok(scriptPath.endsWith('ai-media-buyer-export.gs'));
  });

  it('reads non-empty script content', () => {
    const text = readGoogleAdsExportScript();
    assert.ok(text.includes('function main'));
    assert.ok(text.includes('SEARCH_QUERY_PERFORMANCE_REPORT'));
  });
});
