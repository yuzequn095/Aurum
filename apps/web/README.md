# Aurum Web (`apps/web`)

Next.js web app for Aurum, the AI-driven Personal Wealth Operating System.

This app is the main product surface for:

- Home / Dashboard daily wealth command center
- Portfolio asset center and snapshot-driven analysis flows
- Transactions ledger and cashflow management
- AI Insights reports, analysis workflows, planning slots, Quick Chat, and conversations
- Settings, session controls, and responsive shell navigation

Milestone 14 is now complete in the web layer. The web app has product-grade desktop surfaces, page-level mobile productization, a responsive app shell, mobile bottom navigation, and a central command menu.

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
  Home surface combining cashflow state, portfolio posture, AI cues, quick actions, cashflow channel visualization, and supporting analytics
- `/transactions`
  ledger/cashflow workspace with filtering, refresh, add/edit/delete transaction workflows, and category/subcategory management
- `/portfolio`
  asset-center-first portfolio surface with latest snapshot posture, snapshot library, source/account overview, connected provider flows, and manual asset maintenance
- `/ai-insights`
  AI workspace organized into Reports, Analysis, Conversations, and Planning with:
  snapshot-driven Monthly Financial Review and Daily Market Brief workflows,
  Financial Health Score generation/history,
  guided portfolio analysis entry,
  Quick Chat with explicit Save to Conversations,
  access-aware actions and saved-history-friendly states
- `/settings`
  app-level settings and session/logout surface

### Developer validation route

- `/dev/ai-workbench`
  developer-facing validation page for preset task prompt packs, local prompt inspection, run preparation, manual result submission, report generation from compatible runs, and ingestion validation

## Web Architecture Notes

The web app is no longer only a thin dashboard client. It now participates in Aurum's snapshot-driven analysis architecture.

- `packages/core` provides canonical portfolio, AI, report, and score contracts plus shared mappers/adapters.
- The web app consumes API helpers under `src/lib/api/*` for snapshot, report, score, auth, ledger, and analytics access.
- `/ai-insights` uses saved `PortfolioSnapshot` records as the upstream analysis object.
- Final reports and scores are created server-side and then reloaded into user-scoped history views.
- Quick Chat remains temporary by default and only becomes persistent through explicit save into Conversations.
- `/dev/ai-workbench` remains useful for no-key validation, but `/ai-insights` is the product-facing AI surface.
- The app shell owns desktop sidebar navigation, topbar actions, mobile bottom navigation, and the central command menu.
- Page layouts are responsive within the same route tree; mobile is not split into separate routes.

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
- `src/components/home/*`
- `src/components/app/*`
- `src/lib/cn.ts`

Global styling and tokens live in:

- `src/app/globals.css`

The current web layer includes the Milestone 14 Experience Layer: desktop polish, mobile productization, white/gold visual-system refinement, cashflow channel flow charts, mobile-native login/register direction, and final cross-surface acceptance cleanup.

## Checks

From repo root:

```bash
pnpm lint
pnpm typecheck
pnpm --filter web build
```

If you want full product behavior rather than isolated frontend rendering, run both `web` and `api`.

For no-key AI validation, keep the API running with `AURUM_LLM_ENABLED=false` and use `/dev/ai-workbench` plus `/ai-insights`.
