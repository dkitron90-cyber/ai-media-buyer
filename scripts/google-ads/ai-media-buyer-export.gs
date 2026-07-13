/**
 * AI Media Buyer — Google Ads Export Script
 * =========================================
 *
 * Exports every report type this product understands as upload-ready CSV files.
 * Headers and filenames match the app's auto-detection and parsers.
 *
 * SETUP (5 minutes)
 * 1. Google Ads → Tools → Bulk actions → Scripts → + (New script)
 * 2. Paste this entire file, save as "AI Media Buyer Export"
 * 3. Authorize when prompted (Google Ads + Drive; Gmail only if NOTIFY_EMAIL is set)
 * 4. Run `main` once to test
 * 5. Optional: run `createWeeklySchedule` once for automatic Monday exports
 *
 * OUTPUT
 * CSV files land in Google Drive → folder "AI Media Buyer Exports"
 * Upload those files in the app via Smart Report Upload.
 *
 * TIP: Use LAST_30_DAYS so all reports share the same analysis window.
 */

// ─── Configuration ───────────────────────────────────────────────────────────

var CONFIG = {
  /** AWQL date literal: LAST_7_DAYS | LAST_14_DAYS | LAST_30_DAYS | LAST_90_DAYS */
  DATE_RANGE: 'LAST_30_DAYS',

  /** Google Drive folder for CSV output */
  DRIVE_FOLDER_NAME: 'AI Media Buyer Exports',

  /**
   * Optional email when export finishes (leave '' to skip).
   * Requires Gmail scope on authorization.
   */
  NOTIFY_EMAIL: '',

  /** Skip reports you do not need (all default true) */
  EXPORT_SEARCH_TERMS: true,
  EXPORT_KEYWORDS: true,
  EXPORT_PLACEMENT: true,
  EXPORT_DEVICE: true,
  EXPORT_GEOGRAPHIC: true,
  EXPORT_DEMOGRAPHICS: true,
  EXPORT_AUDIENCE: true,
  EXPORT_AD_SCHEDULE: true,
  EXPORT_CAMPAIGN: true,

  /**
   * Only export rows with impressions > 0 (reduces file size).
   * Set false to include zero-impression rows.
   */
  SKIP_ZERO_IMPRESSIONS: true,
};

// ─── Entry points ────────────────────────────────────────────────────────────

function main() {
  var folder = getOrCreateDriveFolder_(CONFIG.DRIVE_FOLDER_NAME);
  var dateLabel = buildDateRangeLabel_(CONFIG.DATE_RANGE);
  var results = [];

  if (CONFIG.EXPORT_SEARCH_TERMS) {
    results.push(exportSearchTerms_(folder, dateLabel));
  }
  if (CONFIG.EXPORT_KEYWORDS) {
    results.push(exportKeywords_(folder, dateLabel));
  }
  if (CONFIG.EXPORT_PLACEMENT) {
    results.push(exportPlacement_(folder, dateLabel));
  }
  if (CONFIG.EXPORT_DEVICE) {
    results.push(exportDevice_(folder, dateLabel));
  }
  if (CONFIG.EXPORT_GEOGRAPHIC) {
    results.push(exportGeographic_(folder, dateLabel));
  }
  if (CONFIG.EXPORT_DEMOGRAPHICS) {
    results.push(exportDemographics_(folder, dateLabel));
  }
  if (CONFIG.EXPORT_AUDIENCE) {
    results.push(exportAudience_(folder, dateLabel));
  }
  if (CONFIG.EXPORT_AD_SCHEDULE) {
    results.push(exportAdSchedule_(folder, dateLabel));
  }
  if (CONFIG.EXPORT_CAMPAIGN) {
    results.push(exportCampaign_(folder, dateLabel));
  }

  var summary = buildSummary_(results, folder.getUrl());
  Logger.log(summary);

  if (CONFIG.NOTIFY_EMAIL) {
    MailApp.sendEmail(CONFIG.NOTIFY_EMAIL, 'AI Media Buyer — Google Ads export ready', summary);
  }
}

/** Run once to schedule weekly exports (Mondays 6:00 AM account timezone). */
function createWeeklySchedule() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'main') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('main')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(6)
    .create();

  Logger.log('Weekly export scheduled: Mondays at 6:00 AM.');
}

// ─── Report exporters ────────────────────────────────────────────────────────

function exportSearchTerms_(folder, dateLabel) {
  return runAwqlExport_({
    folder: folder,
    dateLabel: dateLabel,
    title: 'Search terms report',
    fileName: 'Search_terms_report',
    query:
      'SELECT Query, MatchType, CampaignName, Clicks, Impressions, Cost, Conversions ' +
      'FROM SEARCH_QUERY_PERFORMANCE_REPORT',
    headers: [
      'Search term',
      'Match type',
      'Campaign',
      'Clicks',
      'Impressions',
      'Cost',
      'Conversions',
    ],
    mapRow: function (row) {
      return [
        row['Query'],
        row['MatchType'],
        row['CampaignName'],
        row['Clicks'],
        row['Impressions'],
        formatMoney_(row['Cost']),
        formatNumber_(row['Conversions']),
      ];
    },
    hasImpressions: function (row) {
      return Number(row['Impressions']) > 0;
    },
  });
}

function exportKeywords_(folder, dateLabel) {
  return runAwqlExport_({
    folder: folder,
    dateLabel: dateLabel,
    title: 'Keywords report',
    fileName: 'Keywords_report',
    query:
      'SELECT Criteria, CampaignName, Clicks, Impressions, Cost, Conversions ' +
      'FROM KEYWORDS_PERFORMANCE_REPORT',
    headers: ['Keyword', 'Campaign', 'Clicks', 'Impressions', 'Cost', 'Conversions'],
    mapRow: function (row) {
      return [
        row['Criteria'],
        row['CampaignName'],
        row['Clicks'],
        row['Impressions'],
        formatMoney_(row['Cost']),
        formatNumber_(row['Conversions']),
      ];
    },
    hasImpressions: function (row) {
      return Number(row['Impressions']) > 0;
    },
  });
}

function exportPlacement_(folder, dateLabel) {
  return runAwqlExport_({
    folder: folder,
    dateLabel: dateLabel,
    title: 'Placement report',
    fileName: 'Placement_report',
    query:
      'SELECT Placement, DisplayName, CampaignName, Clicks, Impressions, Cost, Conversions ' +
      'FROM PLACEMENT_PERFORMANCE_REPORT',
    headers: [
      'Placement',
      'Display name',
      'Campaign',
      'Clicks',
      'Impressions',
      'Cost',
      'Conversions',
    ],
    mapRow: function (row) {
      return [
        row['Placement'] || row['DisplayUrl'] || '',
        row['DisplayName'] || '',
        row['CampaignName'],
        row['Clicks'],
        row['Impressions'],
        formatMoney_(row['Cost']),
        formatNumber_(row['Conversions']),
      ];
    },
    hasImpressions: function (row) {
      return Number(row['Impressions']) > 0;
    },
  });
}

function exportDevice_(folder, dateLabel) {
  return runAwqlExport_({
    folder: folder,
    dateLabel: dateLabel,
    title: 'Device report',
    fileName: 'Device_report',
    query:
      'SELECT Device, CampaignName, Clicks, Impressions, Cost, Conversions ' +
      'FROM CAMPAIGN_PERFORMANCE_REPORT',
    headers: ['Device', 'Campaign', 'Clicks', 'Impressions', 'Cost', 'Conversions'],
    mapRow: function (row) {
      return [
        row['Device'],
        row['CampaignName'],
        row['Clicks'],
        row['Impressions'],
        formatMoney_(row['Cost']),
        formatNumber_(row['Conversions']),
      ];
    },
    hasImpressions: function (row) {
      return Number(row['Impressions']) > 0;
    },
  });
}

function exportGeographic_(folder, dateLabel) {
  return runAwqlExport_({
    folder: folder,
    dateLabel: dateLabel,
    title: 'Location report',
    fileName: 'Location_report',
    query:
      'SELECT Country, Region, City, CampaignName, Clicks, Impressions, Cost, Conversions ' +
      'FROM GEO_PERFORMANCE_REPORT',
    headers: ['Location', 'Campaign', 'Clicks', 'Impressions', 'Cost', 'Conversions'],
    mapRow: function (row) {
      return [
        buildLocationLabel_(row['City'], row['Region'], row['Country']),
        row['CampaignName'],
        row['Clicks'],
        row['Impressions'],
        formatMoney_(row['Cost']),
        formatNumber_(row['Conversions']),
      ];
    },
    hasImpressions: function (row) {
      return Number(row['Impressions']) > 0;
    },
  });
}

function exportDemographics_(folder, dateLabel) {
  var lines = [];
  lines.push('Demographics report');
  lines.push('"' + dateLabel + '"');
  lines.push('Dimension,Value,Campaign,Clicks,Impressions,Cost,Conversions');

  var rowCount = 0;
  var errors = [];

  rowCount += appendDemographicSlice_(
    lines,
    'Age range',
    'SELECT AgeRange, CampaignName, Clicks, Impressions, Cost, Conversions FROM AGE_RANGE_PERFORMANCE_REPORT',
    'AgeRange'
  );
  rowCount += appendDemographicSlice_(
    lines,
    'Gender',
    'SELECT Gender, CampaignName, Clicks, Impressions, Cost, Conversions FROM GENDER_PERFORMANCE_REPORT',
    'Gender'
  );
  rowCount += appendDemographicSlice_(
    lines,
    'Parental status',
    'SELECT ParentalStatus, CampaignName, Clicks, Impressions, Cost, Conversions FROM PARENTAL_STATUS_PERFORMANCE_REPORT',
    'ParentalStatus'
  );
  rowCount += appendDemographicSlice_(
    lines,
    'Household income',
    'SELECT HouseholdIncome, CampaignName, Clicks, Impressions, Cost, Conversions FROM HOUSEHOLD_INCOME_PERFORMANCE_REPORT',
    'HouseholdIncome'
  );

  if (rowCount === 0) {
    return {
      report: 'Demographics',
      ok: false,
      rows: 0,
      error: 'No demographic rows returned (campaign may not have demographic data).',
    };
  }

  try {
    var file = folder.createFile('Demographics_report.csv', lines.join('\n'), MimeType.CSV);
    return { report: 'Demographics', ok: true, rows: rowCount, fileName: file.getName() };
  } catch (e) {
    return { report: 'Demographics', ok: false, rows: 0, error: String(e) };
  }
}

function exportAudience_(folder, dateLabel) {
  return runAwqlExport_({
    folder: folder,
    dateLabel: dateLabel,
    title: 'Audience report',
    fileName: 'Audience_report',
    query:
      'SELECT Criteria, CampaignName, Clicks, Impressions, Cost, Conversions ' +
      'FROM AUDIENCE_PERFORMANCE_REPORT',
    headers: ['Audience', 'Campaign', 'Clicks', 'Impressions', 'Cost', 'Conversions'],
    mapRow: function (row) {
      return [
        row['Criteria'],
        row['CampaignName'],
        row['Clicks'],
        row['Impressions'],
        formatMoney_(row['Cost']),
        formatNumber_(row['Conversions']),
      ];
    },
    hasImpressions: function (row) {
      return Number(row['Impressions']) > 0;
    },
  });
}

function exportAdSchedule_(folder, dateLabel) {
  return runAwqlExport_({
    folder: folder,
    dateLabel: dateLabel,
    title: 'Ad schedule report',
    fileName: 'Ad_schedule_report',
    query:
      'SELECT DayOfWeek, HourOfDay, CampaignName, Clicks, Impressions, Cost, Conversions ' +
      'FROM CAMPAIGN_PERFORMANCE_REPORT',
    headers: [
      'Day of week',
      'Hour of day',
      'Campaign',
      'Clicks',
      'Impressions',
      'Cost',
      'Conversions',
    ],
    mapRow: function (row) {
      return [
        row['DayOfWeek'],
        row['HourOfDay'],
        row['CampaignName'],
        row['Clicks'],
        row['Impressions'],
        formatMoney_(row['Cost']),
        formatNumber_(row['Conversions']),
      ];
    },
    hasImpressions: function (row) {
      return Number(row['Impressions']) > 0;
    },
  });
}

function exportCampaign_(folder, dateLabel) {
  return runAwqlExport_({
    folder: folder,
    dateLabel: dateLabel,
    title: 'Campaign report',
    fileName: 'Campaign_report',
    query:
      'SELECT CampaignName, Clicks, Impressions, Cost, Conversions, ConversionValue ' +
      'FROM CAMPAIGN_PERFORMANCE_REPORT',
    headers: [
      'Campaign',
      'Clicks',
      'Impressions',
      'Cost',
      'Conversions',
      'Conversion value',
    ],
    mapRow: function (row) {
      return [
        row['CampaignName'],
        row['Clicks'],
        row['Impressions'],
        formatMoney_(row['Cost']),
        formatNumber_(row['Conversions']),
        formatMoney_(row['ConversionValue']),
      ];
    },
    hasImpressions: function (row) {
      return Number(row['Impressions']) > 0;
    },
  });
}

// ─── Core helpers ────────────────────────────────────────────────────────────

function runAwqlExport_(spec) {
  var result = {
    report: spec.fileName.replace(/_/g, ' '),
    ok: false,
    rows: 0,
    fileName: spec.fileName + '.csv',
    error: null,
  };

  try {
    var query = spec.query + ' DURING ' + CONFIG.DATE_RANGE;
    var report = AdsApp.report(query);
    var rows = report.rows();

    var lines = [];
    lines.push(spec.title);
    lines.push('"' + spec.dateLabel + '"');
    lines.push(spec.headers.join(','));

    while (rows.hasNext()) {
      var row = rows.next();
      if (CONFIG.SKIP_ZERO_IMPRESSIONS && spec.hasImpressions && !spec.hasImpressions(row)) {
        continue;
      }
      var mapped = spec.mapRow(row);
      lines.push(mapped.map(csvEscape_).join(','));
      result.rows++;
    }

    if (result.rows === 0) {
      result.error = 'Query returned zero rows for this account/date range.';
      return result;
    }

    spec.folder.createFile(result.fileName, lines.join('\n'), MimeType.CSV);
    result.ok = true;
  } catch (e) {
    result.error = String(e);
  }

  return result;
}

function appendDemographicSlice_(lines, dimensionLabel, queryBase, valueField) {
  var added = 0;
  try {
    var query = queryBase + ' DURING ' + CONFIG.DATE_RANGE;
    var rows = AdsApp.report(query).rows();
    while (rows.hasNext()) {
      var row = rows.next();
      if (CONFIG.SKIP_ZERO_IMPRESSIONS && Number(row['Impressions']) <= 0) {
        continue;
      }
      var value = row[valueField];
      if (!value) continue;
      lines.push(
        [
          dimensionLabel,
          value,
          row['CampaignName'],
          row['Clicks'],
          row['Impressions'],
          formatMoney_(row['Cost']),
          formatNumber_(row['Conversions']),
        ]
          .map(csvEscape_)
          .join(',')
      );
      added++;
    }
  } catch (e) {
    Logger.log('Demographics slice skipped (' + dimensionLabel + '): ' + e);
  }
  return added;
}

function getOrCreateDriveFolder_(name) {
  var folders = DriveApp.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(name);
}

function buildDateRangeLabel_(rangeLiteral) {
  var end = new Date();
  var start = new Date(end.getTime());
  var days = 30;
  if (rangeLiteral === 'LAST_7_DAYS') days = 7;
  if (rangeLiteral === 'LAST_14_DAYS') days = 14;
  if (rangeLiteral === 'LAST_90_DAYS') days = 90;
  start.setDate(start.getDate() - (days - 1));
  return formatDate_(start) + ' - ' + formatDate_(end);
}

function formatDate_(d) {
  var months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}

function buildLocationLabel_(city, region, country) {
  var parts = [];
  if (city) parts.push(city);
  if (region) parts.push(region);
  if (country) parts.push(country);
  return parts.join(', ') || 'Unknown';
}

function formatMoney_(value) {
  var n = Number(value);
  if (isNaN(n)) return '0';
  return n.toFixed(2);
}

function formatNumber_(value) {
  var n = Number(value);
  if (isNaN(n)) return '0';
  return String(n);
}

function csvEscape_(value) {
  var s = value === null || value === undefined ? '' : String(value);
  if (s.indexOf(',') >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function buildSummary_(results, folderUrl) {
  var lines = [];
  lines.push('AI Media Buyer — Google Ads export complete');
  lines.push('Date range: ' + CONFIG.DATE_RANGE);
  lines.push('Drive folder: ' + folderUrl);
  lines.push('');
  results.forEach(function (r) {
    if (r.ok) {
      lines.push('✓ ' + r.report + ' — ' + r.rows + ' rows → ' + r.fileName);
    } else {
      lines.push('✗ ' + r.report + ' — skipped (' + (r.error || 'unknown error') + ')');
    }
  });
  lines.push('');
  lines.push('Upload the CSV files in AI Media Buyer via Smart Report Upload.');
  return lines.join('\n');
}
