# Google Ads Export Script for AI Media Buyer

This folder contains a **copy-paste Google Ads Script** that exports every report type the product understands — with CSV headers and filenames tuned for automatic detection on upload.

## One-click install (recommended)

**From the app:** Smart Report Upload → **Install in Google Ads** (copies script + opens Google Ads).

**Shareable install page** (send this link to clients or teammates):

```
http://localhost:4000/api/integrations/google-ads-export-script/install
```

Replace the host with your deployed API URL in production.

The install page copies the script to clipboard and opens the Google Ads Scripts editor.

## Download

| Method | URL |
|--------|-----|
| API download | `GET /api/integrations/google-ads-export-script/download` |
| Metadata + script text | `GET /api/integrations/google-ads-export-script` |
| Static fallback (Vite) | `/google-ads/ai-media-buyer-export.gs` |

## What you get

| File exported | Report type in app | Best for |
|---------------|-------------------|----------|
| `Search_terms_report.csv` | SEARCH_TERMS | Negatives, query intent |
| `Keywords_report.csv` | KEYWORDS | Match types, keyword cleanup |
| `Placement_report.csv` | PLACEMENT | Display/Video placement exclusions |
| `Device_report.csv` | DEVICE | Device bid adjustments |
| `Location_report.csv` | GEOGRAPHIC | Geo bid modifiers |
| `Demographics_report.csv` | DEMOGRAPHICS | Age / gender / income tuning |
| `Audience_report.csv` | AUDIENCE | Audience performance |
| `Ad_schedule_report.csv` | AD_SCHEDULE | Day/hour bid adjustments |
| `Campaign_report.csv` | CAMPAIGN | Aggregate CPA/ROAS & pacing |

Default date window: **last 30 days** (recommended so reports align in analysis).

## Quick setup

### Option A — Install page (easiest)

1. Open `/api/integrations/google-ads-export-script/install` on your API server.
2. Click **Install in Google Ads**.
3. In Google Ads: paste → Save → Authorize → run `main`.
4. Download CSVs from Google Drive → upload in Smart Report Upload.

### Option B — Manual

1. Open **Google Ads** (client account — not MCC overview).
2. Go to **Tools & settings → Bulk actions → Scripts**.
3. Click **+** to create a script.
4. Name it `AI Media Buyer Export`.
5. Paste the full contents of [`ai-media-buyer-export.gs`](./ai-media-buyer-export.gs) or download from the API.
6. Click **Authorize** and approve Google Ads + Drive (and Gmail if you set `NOTIFY_EMAIL`).
7. Select function **`main`** and click **Run**.
8. Open **Google Drive** → folder **`AI Media Buyer Exports`**.
9. Upload the CSV files in **AI Media Buyer → Smart Report Upload**.

## Configuration

Edit the `CONFIG` block at the top of `ai-media-buyer-export.gs`:

```javascript
var CONFIG = {
  DATE_RANGE: 'LAST_30_DAYS',        // LAST_7_DAYS | LAST_14_DAYS | LAST_90_DAYS
  DRIVE_FOLDER_NAME: 'AI Media Buyer Exports',
  NOTIFY_EMAIL: '',                  // your@email.com for completion email
  EXPORT_SEARCH_TERMS: true,         // set false to skip a report
  // ...
  SKIP_ZERO_IMPRESSIONS: true,
};
```

## Weekly automation

After a successful test run:

1. In the script editor, choose function **`createWeeklySchedule`**.
2. Run it once.

This schedules **`main`** every **Monday at 6:00 AM** (account timezone). Re-run `createWeeklySchedule` to replace an existing trigger.

## Manager (MCC) accounts

Run the script **inside each client account** that you manage in AI Media Buyer.

For many clients, Google Ads Scripts supports [parallel execution across accounts](https://developers.google.com/google-ads/scripts/docs/features/manager-scripts) — extend `main` with `MccApp` if you operate at scale.

## Which reports matter by campaign type

| Campaign type | Must-have reports |
|---------------|-------------------|
| **Search** | Search terms, Keywords, Device, Campaign |
| **Display** | Placement, Device, Audience, Demographics, Geographic, Campaign |
| **Performance Max** | Campaign, Device, Audience, Geographic (+ Search terms / Placement when available) |
| **Video** | Placement, Device, Audience, Ad schedule, Campaign |
| **Shopping** | Campaign, Device, Geographic |

The script exports **all** types by default. Disable unneeded exports in `CONFIG` to speed up runs.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Report shows ✗ in logs | Normal for accounts without that inventory (e.g. no Display → no placements). Others still export. |
| Empty Search terms | Search campaigns need query volume in the date range; widen `DATE_RANGE`. |
| Authorization failed | Re-run Authorize; ensure you have edit access to the Ads account. |
| Files not in Drive | Check folder name matches `DRIVE_FOLDER_NAME`; look in Drive root search. |
| Upload not detected | Keep filenames as exported (`Search_terms_report.csv`, etc.). Do not rename columns. |

## CSV format

Each file includes:

1. A **title row** (e.g. `Search terms report`)
2. A **quoted date range** row (e.g. `"January 14, 2026 - February 12, 2026"`)
3. **Header row** matching Google Ads UI exports
4. Data rows

This matches real Google Ads CSV exports already tested with the app's parsers.

## Upload in AI Media Buyer

1. Select your **client**.
2. Open **Smart Report Upload**.
3. Drop one or more CSV files from the Drive folder.
4. Map detected campaigns (create new or link existing).
5. Override campaign type on create if inference is wrong.
6. Import → run analysis when coverage is sufficient.
