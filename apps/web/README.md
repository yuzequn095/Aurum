# Aurum Web (`apps/web`)

Next.js web app for Aurum, the AI-driven Personal Wealth Operating System.

This app is the main product surface for:

- dashboard and cashflow analytics
- portfolio and snapshot-driven analysis flows
- transaction management
- AI Insights report and financial health score history

Milestone 10 and Milestone 11 foundation work are complete in the web layer. The current focus is Milestone 12: Connected Finance & Real Ingestion.

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
  portfolio product surface placeholder/foundation
- `/ai-insights`
  snapshot-driven AI analysis surface with:
  report history scoped by selected snapshot,
  score history scoped by selected snapshot,
  demo snapshot creation path through the canonical snapshot adapter,
  server-backed report creation,
  server-backed financial health score creation
- `/settings`
  app-level settings and session/logout surface

### Developer validation route

- `/dev/ai-workbench`
  developer-facing validation page for manual AI workflow, local prompt inspection, run preparation, manual result submission, report generation from runs, and ingestion validation

## Web Architecture Notes

The web app is no longer only a thin dashboard client. It now participates in Aurum's snapshot-driven analysis architecture.

- `packages/core` provides canonical portfolio, AI, report, and score contracts plus shared mappers/adapters.
- The web app consumes API helpers under `src/lib/api/*` for snapshot, report, score, auth, ledger, and analytics access.
- `/ai-insights` uses persisted `PortfolioSnapshot` records as the upstream analysis object.
- Final report artifacts and score artifacts are created server-side and then reloaded into snapshot-scoped history views.
- `/dev/ai-workbench` remains useful for validation, but `/ai-insights` is the product-facing analysis surface.

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
  `GET /v1/ai-reports/by-snapshot/:sourceSnapshotId`
  `POST /v1/portfolio-snapshots/:sourceSnapshotId/reports`
- Financial health scores:
  `GET /v1/financial-health-scores/by-snapshot/:sourceSnapshotId`
  `POST /v1/portfolio-snapshots/:sourceSnapshotId/financial-health-scores`

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

`dev:restart` relaunches web + API and applies pending API Prisma migrations before startup.

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

The current web layer reflects Milestone 10 foundation work: app shell, reusable primitives, dashboard visual foundation, and AI/product entry surfaces. Future desktop/mobile refinement belongs to the planned Experience Layer milestone rather than this completed foundation milestone.

## Checks

From repo root:

```bash
pnpm lint
pnpm typecheck
```

If you want full product behavior rather than isolated frontend rendering, run both `web` and `api`.
