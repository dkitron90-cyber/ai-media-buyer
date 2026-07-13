# AI Media Buyer — Google Ads Campaign Intelligence OS

Multi-tenant Google Ads campaign intelligence: CSV report ingestion, auto-detection, campaign memory, and AI-powered optimization recommendations.

**Live demo** ships with pre-loaded client **Demo Brand Co.** (Search, Display, and PMax campaigns + parsed reports).

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite + TypeScript (`apps/web`) |
| Backend | Express + TypeScript (`apps/api`) |
| Database | Prisma + SQLite |
| AI | OpenAI (backend only; deterministic fallback without key) |

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

## Deploy to Vercel (demo)

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

## Google Ads export script

Bundled script exports all 9 report types to Google Drive. See [`scripts/google-ads/README.md`](scripts/google-ads/README.md).

In the app: **Smart Report Upload → Install in Google Ads**.

## Project structure

```
apps/
  api/          Express API, Prisma, parsers, AI
  web/          React UI
api/            Vercel serverless entry
scripts/        Google Ads export script
vercel.json     Deploy config
```

## Scripts (root)

```bash
npm run dev:api      # API on :4000
npm run dev:web      # Vite on :5173
npm run demo:seed    # Seed demo client + campaigns + reports
npm test             # API parser tests (32 tests)
```

## Regenerate demo database

After schema changes:

```bash
cd apps/api
rm prisma/demo.db   # or del on Windows
$env:DATABASE_URL="file:./demo.db"
npx prisma migrate deploy
npm run demo:seed
git add prisma/demo.db
```

## License

Private / demo — adjust before public release.
