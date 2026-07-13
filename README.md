# AI Media Buyer — Google Ads Campaign Intelligence OS

**Live demo:** https://ai-media-buyer-iota.vercel.app  
**Repository:** https://github.com/dkitron90-cyber/ai-media-buyer

A full-stack **Google Ads campaign intelligence platform** for agencies and media buyers. It ingests performance CSV exports, structures them in a database, tracks campaign history over time, and uses **server-side AI** to generate concrete optimization recommendations — not just charts.

The live demo ships with pre-loaded client **Demo Brand Co.** (Search, Display, and Performance Max campaigns with parsed reports).

---

## What problem this solves

Google Ads managers export CSV reports (search terms, keywords, placements, devices, etc.) from the Google Ads UI. Today that work is usually:

- Manual spreadsheet analysis
- Disconnected notes in Slack or Docs
- No memory of what was changed last month and whether it worked

This app turns that into a **persistent campaign OS**: upload reports → structured data → gap detection → AI recommendations → logged actions → impact tracking.

---

## User workflow

```
Create client + campaigns
        ↓
Upload Google Ads CSVs (or auto-export via bundled script)
        ↓
Auto-detect report type → parse into typed DB rows
        ↓
Check missing reports / data gaps / analysis readiness
        ↓
Run AI analysis → recommended actions
        ↓
Log execution → capture before/after impact
```

1. **Multi-tenant setup** — Create clients (e.g. Demo Brand Co.) and campaigns (Search, Display, Performance Max, YouTube, etc.).
2. **Report intake** — Upload CSV exports or install the bundled **Google Ads script** that auto-exports 9 report types to Google Drive.
3. **Smart parsing** — Backend detects report type from headers and filename, normalizes columns, and maps rows to Prisma models.
4. **Campaign memory** — Goals, notes, events, checklist items, placement blacklists/whitelists, and analysis history persist per campaign.
5. **Readiness & gaps** — The system knows which reports are missing for each campaign type and whether there is enough data to analyze.
6. **AI optimization** — Server calls OpenAI with assembled context (metrics + history + goals); falls back to deterministic rules if no API key is set.
7. **Action loop** — Recommendations become trackable actions; users mark them executed and capture before/after impact.

---

## Technical architecture

| Layer | Technology | Role |
|-------|------------|------|
| Frontend | React + Vite + TypeScript (`apps/web`) | 55+ components, workflow UI, wizards, campaign dashboards |
| Backend | Express + TypeScript (`apps/api`) | Parsing, business logic, AI, all REST APIs |
| Database | Prisma + SQLite | Typed models for clients, campaigns, report rows, analyses |
| AI | OpenAI (backend only) | Campaign analysis, file mapping, advisor chat |
| Deploy | Vercel serverless | Single domain: static React + `/api/*` Express function |
| Tests | 32 API unit tests | CSV parser fixtures for report detection and parsing |

**Design rule:** the browser never calls OpenAI directly. Secrets stay on the server; the frontend only consumes backend APIs.

```
apps/
  api/          Express API, Prisma, parsers, AI
  web/          React UI
api/            Vercel serverless entry
scripts/        Google Ads export script
vercel.json     Deploy config
```

---

## Data the system understands

### Report types (9 parsers, each with its own DB table)

`SEARCH_TERMS` · `KEYWORDS` · `PLACEMENT` · `DEVICE` · `GEOGRAPHIC` · `AUDIENCE` · `DEMOGRAPHICS` · `AD_SCHEDULE` · `CAMPAIGN`

### Campaign types

Search, Display, Performance Max, YouTube, and others — each with **type-specific required reports**, playbooks, and settings schemas (`campaignTypeRules`).

### Derived metrics (computed on the backend)

CTR, CPC, CPA, ROAS, conversion rates, spend efficiency, and other performance metrics from raw CSV fields.

---

## Backend API surface

Roughly **80+ REST endpoints**, including:

| Area | Examples |
|------|----------|
| Clients | CRUD, advisory profile (industry, spend, landing-page analysis) |
| Campaigns | CRUD, goals, notes, events, type-specific settings (JSON) |
| Reports | Upload, parse, reparse, list rows |
| Report intake | Multi-file wizard: inspect → map campaigns → attach |
| Intelligence | Analysis readiness, gaps, checklist, decision engine, playbook |
| AI | `/analyze`, `/ai-analyze`, advisor chat, next-best-action |
| Actions | Create from analysis, execute, capture impact snapshots |
| Placements | Blacklist / whitelist management with history |
| Integrations | Google Ads export script (install page + download) |

Production health check:

```bash
curl https://ai-media-buyer-iota.vercel.app/health
# {"status":"ok","service":"ai-media-buyer-api","mode":"demo"}
```

---

## AI layer

1. **Context assembly** — Backend builds structured JSON: campaign settings, parsed report aggregates, missing data, recent actions, goals, notes.
2. **OpenAI analysis** — Prompts position the model as a senior Google Ads operator; output is structured recommendations.
3. **Advisor chat** — Follow-up Q&A grounded in campaign context (persisted per campaign).
4. **File mapping AI** — When CSV headers do not match expected columns, AI suggests canonical field mappings before import.
5. **Graceful fallback** — Without `OPENAI_API_KEY`, deterministic analysis still runs so the demo never breaks.

---

## What makes this more than a dashboard

| Typical dashboard | This project |
|-------------------|--------------|
| Shows charts from one upload | Tracks **report coverage over time** and what is missing |
| Static UI | **Campaign memory** (goals, notes, actions, impact) |
| Generic advice | **Type-specific playbooks** (Search vs PMax vs Display) |
| Frontend-only demo | Real **Express API + Prisma persistence + parsers** |
| Manual CSV wrangling | **Auto report-type detection** + parser test suite |

---

## Engineering highlights

- **Multi-tenant data model** — Clients → campaigns → typed report rows → analyses → actions (20+ Prisma models)
- **CSV ingestion pipeline** — Detection, header normalization, campaign-type inference, path-safe file handling
- **Serverless adaptation** — SQLite demo DB copied to `/tmp`, writable uploads directory on Vercel
- **Type-safe full stack** — TypeScript across frontend, backend, and Prisma
- **Integration asset** — Google Ads `.gs` script with one-click install URL
- **Test coverage** — Fixture-based parser tests for real Google Ads export shapes

---

## Demo data

Pre-seeded **Demo Brand Co.** with three campaigns:

| Campaign | Type | Data |
|----------|------|------|
| Brand Search US | Search | Keywords + search terms |
| Display Remarketing | Display | Placements |
| PMax - Shoes | Performance Max | Keywords + search terms |

Open a campaign to see report status, analysis readiness, recommendations, placement tools, and the report upload wizard.

---

## Frontend UI (deep dive)

The UI is a **single-page React app** (`apps/web`, 55+ components) built around one idea: **tell the media buyer what to do next**, not dump raw tables. It is workflow-driven — clients → campaigns → reports → analysis → actions — with progressive disclosure so junior buyers get guidance and senior buyers get full control.

### Design philosophy

| Principle | How it shows up in the UI |
|-----------|---------------------------|
| **Action-first** | Campaign detail leads with “Start here” + today’s playbook, not charts |
| **Progressive disclosure** | Deep tools live under a collapsed **More** section |
| **Backend truth** | Every panel calls real APIs; nothing is faked in the browser |
| **Type-aware** | Campaign type (Search, Display, PMax…) changes required reports, checklist, and settings forms |
| **Two skill levels** | **Junior** vs **Senior** experience mode toggles hints and default panel expansion |

### Application shell

```
┌─────────────────────────────────────────────────────────────────┐
│  SIDEBAR (fixed)          │  MAIN CONTENT (scrollable)            │
│  ─────────────────        │  ─────────────────────────────        │
│  Brand + API health         │  Demo banner (when in demo mode)     │
│  Workspace nav              │  Dashboard stat cards (on Dashboard) │
│  Intelligence shortcuts     │  Page title + subtitle               │
│  Client list (scrollable)   │  Primary actions (Import / New…)     │
│  Experience mode toggle     │  Active page content                 │
│  User stub                  │                                       │
└─────────────────────────────────────────────────────────────────┘
```

- **No page router** — navigation is state-driven inside `App.tsx` (`activeNav`: `dashboard` | `clients` | `campaigns`).
- **Client selection** in the sidebar drives which campaigns load; campaign row selection opens **Campaign Detail** inline below the campaigns list.
- **Modals** — the Smart Report Upload Wizard is a full-screen modal overlay, not a separate route.
- **Styling** — custom CSS (`styles.css`), SaaS-style cards/panels, status pills (`pill-ok`, `pill-warning`, `pill-error`), collapsible sections.

### Sidebar navigation

| Section | Item | What it does |
|---------|------|--------------|
| **Workspace** | Dashboard | Portfolio overview + getting-started hint |
| | Clients | Client CRUD and advisory profile |
| | Campaigns | All campaigns list + inline campaign detail |
| | Import Report | Opens the 5-step upload wizard |
| **Intelligence** | Compare | Jumps to campaigns list for side-by-side selection |
| | Portfolio | Scrolls to dashboard stat cards |
| **Clients panel** | Client list | Click to select account; `+ New` creates a client |
| **Footer** | Experience mode | **Junior** / **Senior** toggle (persisted in `localStorage`) |
| | API health | Live `/health` status from backend |

### Experience mode (Junior vs Senior)

Toggled in the sidebar and passed through campaign views:

| Behavior | Junior | Senior |
|----------|--------|--------|
| **More** section (reports, settings, diagnosis) | Expanded by default | Collapsed by default |
| **Start here** card | Shows blocking reasons + “what this step opens” | Compact — title, reason, impact only |
| **Readiness labels** | Plain-language guides (`readinessLabelGuide`) | Shorter technical labels |
| **Evidence strength** | Explains strong / directional / weak data | Standard pills |

Junior mode is for onboarding new media buyers; Senior mode is for operators who already know Google Ads vocabulary.

### Dashboard view

Six **portfolio stat cards** (aggregated from backend APIs across loaded clients):

| Stat | Meaning |
|------|---------|
| Total clients | Count in sidebar client list |
| Total campaigns | Across all clients |
| Active | Campaigns with `ACTIVE` status |
| Needs attention | High/medium gap count from gap analysis API |
| Performing well | Strong/directional readiness, no urgent gaps |
| Blended CPA | When spend data is available |

Header actions: **Refresh**, **Import report**, **New Campaign** (requires a selected client).

### Clients view

- **Client list** with select / edit / delete
- **Client form** — create or edit account name
- **Advisory context** (via campaign detail’s “More” → “Your business”) — industry, conversion type, monthly spend, website URL, landing-page analysis snapshot

Clients are the **tenant boundary**: all campaigns and report imports are scoped to a client.

### Campaigns view

Two-pane mental model on one page:

1. **All campaigns table** (`CampaignList`) — every campaign across clients, with client name column, edit/delete, empty-state hint pointing to import
2. **Campaign detail** (`CampaignDetail`) — appears when a row is selected

Quick actions in header: **Import report**, **New Campaign** (collapsible `CampaignForm` for the selected client).

### Campaign detail — action-first layout

The campaign screen is the core product surface. Layout top → bottom:

```
CampaignHeader (name, type, status, budget, CPA target, edit/delete)
        │
        ├── CampaignPlaybookSurface          ├── ExecutionTabs
        │   • Start here (top priority)      │   • Actions tab
        │   • Today’s playbook list          │   • Placements tab
        │   • One-click CTA per item         │   • Run analysis button
        │
        └── CampaignDataSection (“More”)  [collapsed by default in Senior mode]
            └── 10+ sub-panels (see below)
```

#### Playbook surface (`CampaignPlaybookSurface`)

Fetches `GET /api/campaigns/:id/playbook` and drives the **daily workflow**:

- **Start here** — single highest-priority `PlaybookItem` with title, reason, estimated impact, and CTA
- **Today’s playbook** — ordered list of next steps
- **Smart CTAs** — clicking an item can:
  - Execute an action (`execute_action`)
  - Open report upload (`upload_report`)
  - Jump to settings (`fix_setting`)
  - Scroll to analysis (`run_analysis`)
  - Open checklist section

#### Execution panel (`ExecutionTabs`)

| Tab | Component | Purpose |
|-----|-----------|---------|
| **Actions** | `CampaignActions` | Full action plan: create, edit, execute, delete; highlights actions from latest AI run |
| **Placements** | `PlacementManager` | Blacklist/whitelist with filters (status, source: manual/AI/imported), bulk archive |

**Run analysis** button in this panel triggers `POST /api/campaigns/:id/analyze` and refreshes action highlights.

#### “More” section (`CampaignDataSection`)

Collapsed panel titled **“More — Reports, settings, full diagnosis”**. Contains:

| Block | Component | What the user sees |
|-------|-----------|-------------------|
| Campaign control | `CampaignControlPanel` | Type-specific settings form (schema-versioned JSON) |
| AI summary | `CampaignImpactSurface` | Decision summary + impact narrative from backend |
| Your business | `AdvisoryContextPanel` | Client advisory profile editor |
| Data timing & coverage | `DataWindowCard` + `ReadinessCard` | Date ranges per report type; STRONG / DIRECTIONAL / WEAK readiness |
| Reports & uploads | `ReportManager` | Coverage summary, active vs superseded reports, parse/reparse, row preview |
| Analysis history | `AnalysisHistory` | Past saved analyses with timestamps |
| Decision engine | `DecisionEnginePanel` | Gaps, diagnosis, evidence strength, prioritized actions, AI feedback |
| Template & checklist | `CampaignTypeTemplatePanel` + `CampaignChecklistPanel` | Type playbook + setup checklist |
| Goals & notes | `CampaignGoals` + `CampaignNotes` | Persistent campaign memory |
| Raw analysis | `CampaignAnalysis` | Readiness gate + run analysis + `AnalysisResult` display |

Deep-link scrolling: playbook CTAs call `scrollToSection()` to open **More** and jump to `#section-reports`, `#section-settings`, etc.

### Smart Report Upload Wizard (5 steps)

Modal wizard (`SmartReportUploadWizard`) — the primary **data ingestion UX**:

```
Step 1: Upload          Step 2: Inspect         Step 3: Map campaigns
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────────────┐
│ Drag-and-drop    │ →  │ Detected report  │ →  │ Per CSV campaign name:   │
│ CSV file         │    │ type, headers,   │    │ • Skip                     │
│ Google Ads       │    │ row preview      │    │ • Map to existing campaign │
│ script install   │    │                  │    │ • Create new (+ type pick) │
│ card             │    │                  │    │ Inferred type + override   │
└──────────────────┘    └──────────────────┘    └──────────────────────────┘
        │                                                    │
        ▼                                                    ▼
Step 4: Review                    Step 5: Result
┌──────────────────┐             ┌──────────────────┐
│ Confirm mappings │      →      │ Per-campaign     │
│ before import    │             │ success/failure  │
└──────────────────┘             │ Refreshes lists  │
                                 └──────────────────┘
```

| Step | Component | Backend call |
|------|-----------|--------------|
| Upload | `ReportUploadStep` | — (local file + `GoogleAdsScriptInstallCard`) |
| Inspect | `ReportInspectStep` | `POST /api/report-intake/inspect` |
| Map | `ReportCampaignMappingStep` | Uses inspect `campaignMatches`; loads types from `/api/campaign-types` |
| Review | `ReportImportReviewStep` | — |
| Result | `ReportImportResultStep` | `POST /api/report-intake/attach` |

Requires a **selected client** before upload. On success, bumps `importRefreshKey` so campaign detail panels reload.

### Report manager (inside campaign)

`ReportManager` is the per-campaign report control center:

- **Report coverage summary** — which of the 9 types are present vs required for this campaign type
- **Active reports** — current version per report type (date range, row count)
- **Superseded reports** — older uploads kept for history
- **Per-report actions** — parse, reparse, delete, view parsed rows
- **Status pills** — `PARSED` / `PARSING` / `FAILED`

### Actions & impact tracking

| UI piece | Behavior |
|----------|----------|
| `ActionCard` / `ActionList` | Priority, status, source (manual / AI), execute button |
| `ActionForm` | Create manual actions |
| `ActionImpactPanel` | Before/after metrics after execution |
| `captureActionImpact` | User triggers snapshot; compares performance windows |
| Highlight ring | Actions created by the latest analysis run are sorted to top |

### Placement management

`PlacementManager` supports Display/PMax placement hygiene:

- Filters: **All / Blacklist / Whitelist** × **Active / Archived** × **Manual / AI / Imported**
- Bulk select + archive
- `PlacementForm` — add placement URL or app ID with list type and notes
- Entries can originate from AI analysis (`POST .../placements/from-analysis`)

### Frontend technical patterns

| Pattern | Implementation |
|---------|----------------|
| **API client** | `apps/web/src/lib/apiClient.ts` — typed fetch wrapper, shared DTOs |
| **State** | React `useState` / `useEffect` / `useCallback` per component (no Redux) |
| **Loading UX** | Discriminated unions: `{ status: 'loading' \| 'error' \| 'success', data? }` |
| **Production API URL** | Same-origin `/api/*` on Vercel; `localhost:4000` in dev |
| **Collapsibles** | `CollapsibleSection` — used heavily to reduce visual noise |
| **Accessibility** | `aria-label`, `role="tablist"` on execution tabs, `role="status"` on demo banner |
| **Component count** | 55 top-level components + 6 report-import subcomponents |

### Demo walkthrough (for evaluators / recruiters)

Suggested 3-minute path on https://ai-media-buyer-iota.vercel.app:

1. **Landing** — Note the demo banner and sidebar health check (`mode: demo`).
2. **Dashboard** — Scan portfolio cards (clients, campaigns, needs attention).
3. **Sidebar → Demo Brand Co.** — Select the pre-loaded client.
4. **Campaigns → Brand Search US** — Open campaign detail.
5. **Start here** — Read the top playbook card; click **Run analysis** in Execution.
6. **Actions tab** — See AI-generated action items highlighted at top.
7. **Placements tab** — (on Display campaign) Browse blacklist filters.
8. **Expand More** — Open Reports, Readiness (STRONG/DIRECTIONAL/WEAK), Decision engine.
9. **Import Report** — Walk wizard step 1: drag-drop zone + Google Ads script install card.
10. **Experience mode** — Toggle Junior → see extra hints on Start here and expanded More.

This path shows: **multi-tenant UX**, **real API integration**, **AI workflow**, **report ingestion**, and **operator-grade placement/action tooling** — not a static mockup.

### UI component map (`apps/web/src/components/`)

| Category | Components |
|----------|------------|
| **Shell & nav** | `DemoBanner`, `CollapsibleSection` |
| **Clients** | `ClientList`, `ClientForm`, `AdvisoryContextPanel` |
| **Campaigns** | `CampaignList`, `CampaignForm`, `CampaignHeader`, `CampaignDetail`, `CampaignDataSection`, `CampaignControlPanel`, `CampaignSettingsPanel`, `CampaignTypeSettingsForm` |
| **Playbook & guidance** | `CampaignPlaybookSurface`, `StartHereCard`, `TodayPlaybook`, `NextBestActionCard`, `CampaignGuidanceCard`, `CampaignGapsPanel`, `CampaignChecklistPanel`, `CampaignTypeTemplatePanel` |
| **Analysis & AI** | `CampaignAnalysis`, `AnalysisReadiness`, `AnalysisResult`, `AnalysisHistory`, `AnalysisHistoryList`, `AnalysisHistoryItem`, `DecisionEnginePanel`, `CampaignImpactSurface`, `AiInsightCard`, `AiGenerationFeedback`, `ReadinessCard` |
| **Actions** | `ExecutionTabs`, `CampaignActions`, `ActionList`, `ActionCard`, `ActionForm`, `RecommendedActions`, `PrioritizedActions`, `ActionImpactPanel`, `ActionImpactMetrics`, `ConfirmButton` |
| **Reports** | `ReportManager`, `ReportCoverageSummary`, `ActiveReportsPanel`, `SupersededReportsPanel`, `DataWindowCard`, `DataWindowReportRanges`, `SmartReportUploadWizard` |
| **Report import wizard** | `reportImport/ReportUploadStep`, `ReportInspectStep`, `ReportCampaignMappingStep`, `ReportImportReviewStep`, `ReportImportResultStep`, `GoogleAdsScriptInstallCard` |
| **Placements** | `PlacementManager`, `PlacementList`, `PlacementForm`, `PlacementEntryCard` |
| **Memory** | `CampaignGoals`, `CampaignNotes` |

Shared types and API calls live in `apps/web/src/lib/` (`apiClient.ts`, `experienceMode.ts`, `actionPlanDisplay.ts`, `playbookCta.ts`).

---

## Quick start (local)

```bash
# API
cd apps/api
cp .env.example .env
npm install
npx prisma migrate deploy
npm run dev

# Web (new terminal)
cd apps/web
npm install
npm run dev
```

Open http://localhost:5173 — API at http://localhost:4000

### Optional: seed demo data locally

```bash
cd apps/api
npx prisma migrate deploy
# Windows PowerShell (DB path is relative to prisma/schema.prisma):
$env:DATABASE_URL="file:./demo.db"
npm run demo:seed
# demo.db is written to apps/api/prisma/demo.db
```

---

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import project in [Vercel](https://vercel.com/new).
3. **Framework preset:** Other (uses root `vercel.json`).
4. **Environment variables** (optional):

   | Variable | Required | Notes |
   |----------|----------|-------|
   | `OPENAI_API_KEY` | No | Enables live AI analysis; without it, deterministic fallback runs |
   | `DEMO_MODE` | Auto | Set to `true` in `vercel.json` |
   | `DATABASE_URL` | Auto | Serverless copies bundled `apps/api/prisma/demo.db` to `/tmp` |

5. Deploy. Frontend + API share one domain (`/api/*` → Express serverless).

### Shareable links after deploy

| URL | Purpose |
|-----|---------|
| `/` | Demo app |
| `/api/integrations/google-ads-export-script/install` | One-click Google Ads script install page |
| `/health` | API health (`mode: demo`) |

---

## Google Ads export script

Bundled script exports all 9 report types to Google Drive. See [`scripts/google-ads/README.md`](scripts/google-ads/README.md).

In the app: **Smart Report Upload → Install in Google Ads**.

---

## Scripts (root)

```bash
npm run dev:api      # API on :4000
npm run dev:web      # Vite on :5173
npm run demo:seed    # Seed demo client + campaigns + reports
npm test             # API parser tests (32 tests)
```

### Regenerate demo database

After schema changes:

```bash
cd apps/api
rm prisma/demo.db   # or del on Windows
$env:DATABASE_URL="file:./demo.db"
npx prisma migrate deploy
npm run demo:seed
git add prisma/demo.db
```

---

## License

Private / demo — adjust before public release.
