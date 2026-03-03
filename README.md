# Aurum

![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-9.x-F69220?logo=pnpm&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)

Aurum is a pnpm workspace + Turborepo monorepo for personal finance tracking and AI-assisted monthly insights.

## Current Status

Milestone 7 (Auth) and Milestone 8 (Ledger v2) are complete.

- Auth: email/password login, JWT access token + refresh token, refresh rotation/reuse detection, logout/logout-all, guarded APIs, server-side userId isolation.
- Ledger v2: income transactions, date-only `occurredAt` API contract (`YYYY-MM-DD`) with DB `DateTime`, category + subcategory taxonomy, and enforced category/subcategory for income/expense.
- Analytics + AI: monthly summary and category breakdown endpoints; AI monthly report is available via pluggable insight engine (`rules` / `llm` / `hybrid`).
- LLM is optional and controlled by env flags to avoid cost in local/dev.

## Architecture

```mermaid
flowchart LR
  B[Browser] --> W[Next.js Web<br/>apps/web]
  W -->|REST /v1 + Bearer access token| A[NestJS API<br/>apps/api]
  A -->|Prisma ORM v7| P[(PostgreSQL)]
  W -.->|refresh token in localStorage<br/>dev mode| W
  A -->|issue/verify access + refresh| A
```

```mermaid
flowchart LR
  MS[Monthly Summary] --> AIS[AiService]
  CB[Category Breakdown] --> AIS
  AIS --> IE[Insight Engine]
  IE --> R[Rule Engine]
  IE --> L[LLM Engine]
  IE --> H[Hybrid Merge]
  H --> OUT[Insights Response]
```

## Progress Table

| Phase | Milestones | Status | Notes |
| --- | --- | --- | --- |
| Phase 1 - Foundation | M1 Monorepo setup, M2 DB schema (Prisma v7 + Postgres), M3 Transactions CRUD, M4 Analytics Dashboard | Done | Core stack and ledger/analytics baseline landed. |
| Phase 2 - AI Report Baseline | M5 AI monthly report (rule-based baseline + UI states) | Done | Stable rule-based report and UI handling for loading/error/empty. |
| Phase 3 - Insight Engine | M6 refactor + LLM scaffold + hybrid merge + tests | Done | `rules`/`llm`/`hybrid` modes available; LLM path optional by env. |
| Phase 4 - Auth & Productization | M7 Auth (email/password, identities, refresh tokens, guards, user scoping) | Done | Refresh rotation + reuse detection + logout-all implemented. |
| Phase 5 - Ledger v2 | M8.1 Date-only occurredAt, M8.2 Income, M8.3 Category/Subcategory taxonomy | Done | API date-only, DB DateTime retained (Strategy A). |

## Next Up

- M9 UX hardening: taxonomy defaults, clearer validation/errors, transaction list/filter usability.
- M10 Mobile UI and page structure upgrade: route/layout cleanup with stronger responsive behavior.
- M11 Import/Export: CSV import/export and backup workflows.
- M12 AI cost-managed integration: prompt pack/copy, provider abstraction, optional self-hosted vLLM later.
- M13 Observability and output: logging/metrics, caching strategy, PDF export.

## Monorepo Structure

```text
Aurum/
├─ apps/
│  ├─ api/              # NestJS + Prisma v7
│  └─ web/              # Next.js App Router
├─ packages/
│  └─ core/             # shared types/utilities
├─ infra/
│  └─ docker/           # local postgres compose
├─ package.json
├─ pnpm-workspace.yaml
└─ turbo.json
```

## Quickstart

Prerequisites:

- Node.js 20.x
- pnpm 9.x
- Docker Desktop

Start/stop infrastructure:

```bash
docker compose -f infra/docker/docker-compose.yml up -d
docker compose -f infra/docker/docker-compose.yml down
```

Install and run:

```bash
pnpm install
pnpm dev
```

Quality checks:

```bash
pnpm lint
pnpm typecheck
```

Common ports:

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- Prisma Studio: dynamic port (shown in terminal after `prisma studio`)

Prisma (v7) commands:

```bash
pnpm --filter api exec prisma migrate dev --name <migration-name>
pnpm --filter api exec prisma db seed
pnpm --filter api exec prisma studio
```

Troubleshooting:

- If Prisma Studio or DB introspection fails, first ensure PostgreSQL is up via Docker Compose.

## Environment Variables

### Web (`apps/web/.env.local`)

| Key | Example | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:3001` | API base URL used by web client. |

### API (`apps/api/.env`)

| Key | Example | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/aurum` | Prisma/Postgres connection string (Prisma v7 config path). |
| `PORT` | `3001` | API port (if overridden by runtime/start script). |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed web origin. |
| `JWT_ACCESS_SECRET` | `change-me` | Access token signing secret. |
| `JWT_REFRESH_SECRET` | `change-me-too` | Refresh token signing secret. |
| `JWT_ACCESS_TTL` | `15m` | Access token TTL. |
| `JWT_REFRESH_TTL` | `30d` | Refresh token TTL. |
| `AURUM_INSIGHTS_MODE` | `rules` / `llm` / `hybrid` | Insight engine mode. |
| `AURUM_LLM_ENABLED` | `false` | Toggle LLM engine on/off. |
| `AURUM_INSIGHTS_MAX` | `10` | Max merged insights in hybrid mode. |
| `AURUM_LLM_BASE_URL` | `http://localhost:8000` | OpenAI-compatible LLM endpoint. |
| `AURUM_LLM_API_KEY` | `<key>` | Required for non-local providers. |
| `AURUM_LLM_MODEL` | `gpt-4.1-mini` | LLM model id. |
| `AURUM_LLM_TIMEOUT_MS` | `8000` | LLM HTTP timeout (ms). |

## API Reference

Base URL: `http://localhost:3001`

| Endpoint | Method | Auth | Description |
| --- | --- | --- | --- |
| `/v1/health` | GET | No | Health check. |
| `/v1/auth/register` | POST | No | Register with email/password, returns `{ user, accessToken, refreshToken }`. |
| `/v1/auth/login` | POST | No | Login with email/password, returns `{ user, accessToken, refreshToken }`. |
| `/v1/auth/refresh` | POST | No | Rotate refresh token, returns `{ accessToken, refreshToken }`. |
| `/v1/auth/logout` | POST | No | Revoke provided refresh token. |
| `/v1/auth/logout-all` | POST | Yes | Revoke all refresh tokens for current user. |
| `/v1/accounts` | GET | Yes | List accounts for current user. |
| `/v1/accounts` | POST | Yes | Create account for current user. |
| `/v1/accounts/:id` | GET | Yes | Get account (user-scoped). |
| `/v1/accounts/:id` | PATCH | Yes | Update account (user-scoped). |
| `/v1/accounts/:id` | DELETE | Yes | Delete account (user-scoped). |
| `/v1/categories` | GET | Yes | List categories (user-scoped). |
| `/v1/categories` | POST | Yes | Create category (unique per user). |
| `/v1/subcategories` | GET | Yes | List subcategories by `categoryId` (user-scoped). |
| `/v1/subcategories` | POST | Yes | Create subcategory under a user-owned category. |
| `/v1/transactions` | GET | Yes | List transactions with filters/pagination (user-scoped). |
| `/v1/transactions` | POST | Yes | Create transaction (income/expense require `categoryId` + `subcategoryId`). |
| `/v1/transactions/:id` | GET | Yes | Get transaction by id (user-scoped). |
| `/v1/transactions/:id` | PATCH | Yes | Update transaction (user-scoped + taxonomy validation). |
| `/v1/transactions/:id` | DELETE | Yes | Delete transaction (user-scoped). |
| `/v1/analytics/monthly-summary` | GET | Yes | Income/expense/net monthly summary. |
| `/v1/analytics/category-breakdown` | GET | Yes | Monthly expense breakdown by category. |
| `/v1/ai/monthly-report` | GET | Yes | Monthly AI report payload with generated insights. |

Transactions query params (`GET /v1/transactions`):

- `limit`, `offset`
- `accountId`, `categoryId`
- `from`, `to`
- `include=refs` (optional account/category/subcategory refs)

## Auth and Session Notes

- Protected web routes use client-side `AuthGate`.
- Current dev storage is `localStorage` for access/refresh tokens.
- Refresh rotation and reuse detection are enforced server-side.
- Future production hardening target: `httpOnly` secure cookie-based session flow.

## Conventions

- Package manager: `pnpm`
- Task runner: `turbo`
- API prefix: `/v1`
- Shared cross-app logic: `packages/`
