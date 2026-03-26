# Aurum Web (`apps/web`)

Next.js web app for Aurum, the AI-driven Personal Wealth Operating System.

This app is the main product surface for:

- dashboard and cashflow analytics
- portfolio and snapshot-driven analysis flows
- transaction management
- AI Insights reports, analysis workflows, planning slots, and conversations

Milestone 13 is now complete in the web layer. The current focus is Milestone 14: experience refinement on top of the shipped AI product layer.

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Recharts

## Current Product Surfaces

### Public routes

- `/` landing page
- `/login`
- `/register`

### App routes

- `/dashboard`
  monthly KPI, trend, and category breakdown views backed by analytics APIs
- `/transactions`
  transaction list, filtering, refresh, and CRUD-oriented ledger workflow
- `/portfolio`
  portfolio product surface plus snapshot and connected-finance workflows
- `/ai-insights`
  AI Product Layer surface organized into Reports, Analysis, Planning, and Conversations with:
  snapshot-driven Monthly Financial Review and Daily Market Brief workflows,
  Financial Health Score generation/history,
  guided portfolio analysis entry,
  Quick Chat with explicit Save to Conversations,
  entitlement-aware actions and historical-read-friendly states
- `/settings`
  app-level settings and session/logout surface

### Developer validation route

- `/dev/ai-workbench`
  developer-facing validation page for preset task prompt packs, local prompt inspection, run preparation, manual result submission, report generation from compatible runs, and ingestion validation

## Web Architecture Notes

The web app is no longer only a thin dashboard client. It now participates in Aurum's snapshot-driven analysis architecture.

- `packages/core` provides canonical portfolio, AI, report, and score contracts plus shared mappers/adapters.
- The web app consumes API helpers under `src/lib/api/*` for snapshot, report, score, auth, ledger, and analytics access.
- `/ai-insights` uses persisted `PortfolioSnapshot` records as the upstream analysis object.
- Final report artifacts and score artifacts are created server-side and then reloaded into user-scoped history views.
- Quick Chat remains ephemeral by default and only becomes persistent through explicit save into Conversations.
- `/dev/ai-workbench` remains useful for no-key validation, but `/ai-insights` is the product-facing AI surface.

## Key API Dependencies

This app relies on the API app for most product pages.

- Analytics:
  `GET /v1/analytics/monthly-summary`
  `GET /v1/analytics/summary-series`
  `GET /v1/analytics/category-breakdown`
- Ledger:
  accounts, categories, subcategories, transactions, import/export
- Portfolio snapshots:
  `POST /v1/portfolio-snapshots`
  `GET /v1/portfolio-snapshots`
  `GET /v1/portfolio-snapshots/:id`
  `DELETE /v1/portfolio-snapshots/:id`
- AI reports:
  `GET /v1/ai-reports`
  `GET /v1/ai-reports/by-snapshot/:sourceSnapshotId`
  `POST /v1/portfolio-snapshots/:sourceSnapshotId/reports`
- Financial health scores:
  `GET /v1/financial-health-scores/by-snapshot/:sourceSnapshotId`
  `POST /v1/portfolio-snapshots/:sourceSnapshotId/financial-health-scores`
- AI product layer:
  `GET /v1/entitlements/me`
  `POST /v1/ai/quick-chat`
  `POST /v1/ai/monthly-financial-review`
  `POST /v1/ai/daily-market-brief`
  `GET /v1/ai/daily-market-brief/preferences/me`
  `PATCH /v1/ai/daily-market-brief/preferences/me`
  `GET /v1/ai-conversations`
  `POST /v1/ai-conversations`
  `GET /v1/ai-conversations/:id`
  `PATCH /v1/ai-conversations/:id`
  `DELETE /v1/ai-conversations/:id`

## Run

From repo root:

```bash
pnpm dev:web
```

Or directly from the app directory:

```bash
pnpm -C apps/web dev
```

Open:

- Web: `http://localhost:3000`

For most real product flows, run the API at the same time:

```bash
pnpm dev:api
```

Recommended combined startup from repo root:

```bash
pnpm dev:app
```

If local ports or stale processes cause repeated `Failed to fetch` issues:

```bash
pnpm dev:restart
```

`dev:restart` relaunches web + API and applies pending API Prisma migrations before startup. The local API expects Docker Postgres on `localhost:55432`.

For a clean local login after seeding the API database:

- Demo login:
  `demo@aurum.local` / `password123`
- Or create your own account from `/register`.

## Environment

Create `apps/web/.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

This base URL is used by the web API client and Next proxy configuration.

## Design System

Shared design and layout primitives live in:

- `src/components/ui/*`
- `src/components/layout/*`
- `src/components/dashboard/*`
- `src/lib/cn.ts`

Global styling and tokens live in:

- `src/app/globals.css`

The current web layer now includes the Milestone 13 AI Product Layer. Future desktop/mobile refinement belongs to Milestone 14 rather than additional foundation work in this package.

## Checks

From repo root:

```bash
pnpm lint
pnpm typecheck
```

If you want full product behavior rather than isolated frontend rendering, run both `web` and `api`.

For no-key AI validation, keep the API running with `AURUM_LLM_ENABLED=false` and use `/dev/ai-workbench` plus `/ai-insights`.
