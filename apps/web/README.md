# Aurum Web (`apps/web`)

Next.js web app for Aurum.

## Stack
- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4
- Recharts (dashboard charts)

## Run

From repo root:

```bash
pnpm --filter web dev
```

Open: `http://localhost:3000`

## Environment

Create `apps/web/.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

## Current Pages

- `/` home (includes link to dashboard)
- `/transactions` transactions CRUD UI
- `/dashboard` KPI + analytics charts

## Dashboard Data Flow

`/dashboard` fetches analytics from API using:

- `fetchMonthlySummary(year, month)`
- `fetchCategoryBreakdown(year, month)`

Source:
- `src/lib/api.ts`
- `src/app/dashboard/page.tsx`

## Dashboard Charts

Chart components:
- `src/components/charts/DashboardCharts.tsx`
  - `IncomeExpenseBarChart`
  - `CategoryBreakdownPieChart`

Behavior:
- Income vs Expense bar chart uses live monthly totals.
- Category Breakdown doughnut uses live category breakdown.
- Empty category data shows: `No expenses this month`.
- Chart containers remain responsive and keep existing card styling.

## Design System

Shared primitives:
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/layout.tsx`
- `src/lib/cn.ts`

Design tokens:
- `tailwind.config.ts` (`colors.aurum`, `borderRadius.aurum`, `boxShadow.aurum*`)
- `src/app/globals.css`

## Checks

From repo root:

```bash
pnpm lint
pnpm typecheck
```
