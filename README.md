# Aurum

![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-9.x-F69220?logo=pnpm&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)

Aurum is a pnpm workspace + Turborepo monorepo for building an AI-driven Personal Wealth Operating System.

This document serves as both a product overview and developer reference for Aurum.

## Table of Contents

- [Vision](#vision)
- [Core Product Modules](#core-product-modules)
- [AI System Design](#ai-system-design)
- [Mobile UX Concept](#mobile-ux-concept)
- [Current Status](#current-status)
- [Milestone Summary](#milestone-summary)
- [What Milestone 11 Changed](#what-milestone-11-changed)
- [Current Architecture](#current-architecture)
- [Long-term Vision](#long-term-vision)
- [Architecture Documents](#architecture-documents)
- [Monorepo Structure](#monorepo-structure)
- [Quickstart](#quickstart)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Auth and Session Notes](#auth-and-session-notes)
- [Conventions](#conventions)

## Vision

Aurum is an **AI-driven Personal Wealth Operating System** designed to help individuals understand, manage, and optimize their financial lives.

Unlike traditional budgeting apps, Aurum integrates:

- transaction tracking
- multi-account portfolio monitoring
- financial analytics
- AI-powered financial insights
- long-term financial planning

Aurum is not just a bookkeeping app. It is a finance platform that combines ledger operations, analytics, portfolio tracking, and AI analysis into a single operating layer.

Aurum aims to become a **central financial intelligence layer** for users.

## Core Product Modules

Aurum V1 consists of four primary modules:

### Dashboard

High-level financial overview.

**Includes:**

- Net Worth
- Assets / Liabilities
- Monthly Income / Expense
- Portfolio overview
- Financial Health Score
- AI Brief

**Purpose:**
Give users a quick snapshot of their financial status.

### Portfolio

Multi-account asset tracking.

**Tracks:**

- bank accounts
- brokerage accounts
- crypto accounts
- asset allocation
- account breakdown

**Future plans:**

- automatic account syncing (Plaid / brokerage APIs)
- investment tracking
- asset allocation analysis

### Transactions

Personal finance ledger.

**Features:**

- income and expense tracking
- categories and subcategories
- merchant information
- account linking
- filtering and search
- CSV import/export

Transactions represent **cash flow tracking**.

### AI Insights

AI-powered financial intelligence center.

- snapshot-driven portfolio report generation
- financial health score generation
- persisted report and score history
- future planning, budgeting, and goal-oriented AI workflows
- future conversation and advisor-style experiences

AI Insights is the product surface where Aurum's analysis artifacts and future AI workflows come together.

## AI System Design

Aurum's AI architecture now has a clearer split between long-term product vision and currently shipped analysis infrastructure.

### 1. Quick AI (Long-term Product Layer)

Quick AI is the future ephemeral interaction layer for:

- fast financial questions
- instant contextual analysis
- command-menu driven actions

Example intents:

- "How much did I spend on dining this month?"
- "What changed in my portfolio this week?"

This remains part of the product direction, but it is not yet the primary implemented AI surface.

### 2. AI Insights (Current Productized Analysis Layer)

The current implemented AI foundation is centered on snapshot-driven analysis.

- `PortfolioSnapshot` is the canonical upstream object for portfolio analysis.
- Portfolio reports are persisted as `AIReportArtifact` records linked to a snapshot.
- Financial health assessments are persisted as `FinancialHealthScoreArtifact` records linked to a snapshot.
- Report creation and score creation are now server-backed flows.
- `/ai-insights` operates on snapshot-scoped report and score history instead of only local transient state.

This means the current AI system is no longer just prompt generation or model text. It is an artifact-oriented analysis pipeline with explicit upstream data, persistence, and history.

### 3. Insight Engine Baseline

For broader AI text generation, Aurum already has a pluggable insight engine baseline:

- `rules`
- `llm`
- `hybrid`

That engine remains available as a foundation for future AI product layers, while Milestone 11 established the snapshot-driven report and score architecture.

## Mobile UX Concept

**Mobile navigation:**

- Home
- Portfolio
- Transactions
- AI Insights

**Center action button `+` opens a quick command menu:**

- Add Transaction
- Ask AI
- Quick Chart
- Quick Analysis

This allows fast interactions without navigating across multiple pages.

## Current Status

Milestone 1-10 are completed as foundation work. Milestone 11 is also completed as the AI foundation and snapshot-driven analysis foundation. The current focus is Milestone 12: Connected Finance & Real Ingestion.

- Foundation status: Aurum now has stable monorepo, API, web, auth, ledger, taxonomy, analytics, import/export, and dashboard foundations.
- AI foundation status: snapshot-driven report and score generation is implemented end-to-end with persistence, history, and server-backed creation flows.
- Current execution focus: move from demo and validation ingestion toward real connected finance ingestion, normalization, and sync pipelines.

## Milestone Summary

| Milestone | Name | Status | Outcome |
| --- | --- | --- | --- |
| 1-5 | Core Finance Infrastructure | Done | Monorepo, web/api foundations, auth baseline, accounts, transactions, category/subcategory taxonomy baseline, analytics baseline. |
| 6 | Insight Engine Foundation | Done | `rules` / `llm` / `hybrid` insight engine baseline, prompt validation, and pluggable AI generation foundation. |
| 7 | Auth & Productization | Done | JWT auth, refresh token rotation, reuse detection, logout-all, and user isolation. |
| 8 | Ledger v2 | Done | Date-only `occurredAt`, income support, and category/subcategory enforcement. |
| 9 | Transactions UX + Data Tooling | Done | Transaction list UX, filtering/editing, CSV import/export, backup/restore, and import idempotency. |
| 10 | Web UX Foundation | Done | App shell, page structure, settings/logout, design tokens/primitives, and dashboard foundation. |
| 11 | AI Foundation / Snapshot-Driven Analysis | Done | Shared AI contracts, prompt/task/provider/router/run foundations, workbench validation, canonical `PortfolioSnapshot`, snapshot-driven report/score flows, report persistence, score persistence, and snapshot-linked history with server-backed creation. |
| 12 | Connected Finance & Real Ingestion | Current Focus | Bank integrations, brokerage integrations, production-grade ingestion workflows, snapshot ingestion hardening, and provider normalization/sync pipeline. |
| 13 | AI Product Layer | Planned | Prompt pack expansion, conversation model, AI Insights templates, planning/budgeting/goals, and richer AI workflows. |
| 14 | Experience Layer (Desktop + Mobile UX) | Planned | Desktop UX refinement, mobile implementation aligned with Aurum-Mobile-UX-Demo, cross-platform design consistency, command menu UX, and AI-first interaction polish. |
| 15 | Connected Finance Expansion / Financial OS Direction | Future | Deeper portfolio and institution modeling, financial execution experiments, and broader Financial OS exploration. |

**Milestone 11 delivered:**

- shared AI domain contracts, task definition abstraction, prompt pack foundation, provider adapter abstraction, manual ChatGPT provider foundation, and router foundation
- AI run repository, AI workbench validation, and local/web persistence foundation
- `AIReportArtifact` foundation, `FinancialHealthScoreArtifact` foundation, and deterministic financial health score foundation
- canonical `PortfolioSnapshot` contract, CSV snapshot adapter, snapshot-to-report input mapper, and snapshot-to-score input mapper
- API-side snapshot persistence, snapshot verification endpoints, and web-side snapshot create/list demo ingestion
- `/ai-insights` snapshot-driven flow, report persistence plus snapshot-linked history, and score persistence plus snapshot-linked history
- server-backed report creation, server-backed score creation, and snapshot deletion lifecycle v1 that blocks deletion when linked artifacts exist

## What Milestone 11 Changed

Milestone 11 changed Aurum from an AI-demo-oriented foundation into a snapshot-driven analysis architecture.

- `PortfolioSnapshot` is now the canonical upstream truth for portfolio analysis.
- Reports are no longer just generated text; they are persisted report artifacts linked to snapshots.
- Financial health scores are no longer just transient calculations; they are persisted score artifacts linked to snapshots.
- Final report and score creation is server-backed rather than client-assembled.
- `/ai-insights` now works against snapshot-scoped report and score history.
- Snapshot lifecycle rules now recognize downstream analysis artifacts, including deletion blocking when linked reports exist.

In practical terms, this means Aurum now has an analysis system with upstream source objects, persistent downstream artifacts, and explicit resource relationships across web, API, and database layers.

## Current Architecture

**Backend stack:**

- NestJS
- Prisma ORM v7
- PostgreSQL

**Frontend stack:**

- Next.js App Router
- TypeScript
- Tailwind CSS

**Shared-core stack:**

- `packages/core` for canonical portfolio, AI, report, and score domain contracts
- shared adapters and mappers for snapshot ingestion and snapshot-driven analysis inputs

**Key platform surfaces:**

- ledger APIs for accounts, categories, subcategories, transactions, import/export, and analytics
- snapshot persistence and verification APIs for canonical `PortfolioSnapshot`
- snapshot-scoped report creation and report history APIs
- snapshot-scoped financial health score creation and score history APIs
- lifecycle protection that blocks snapshot deletion when persisted linked report artifacts exist

**Application architecture overview:**

```mermaid
flowchart LR
  B[Browser] --> W[Next.js Web apps/web]
  W -->|REST /v1 + bearer access token| A[NestJS API apps/api]
  A -->|Prisma ORM v7| P[(PostgreSQL)]
  C[Shared Core packages/core] --> W
  C --> A
```

**Snapshot-driven analysis flow:**

```mermaid
flowchart LR
  CSV[CSV-shaped input or future provider input]
  CSV --> ADAPTER[Snapshot adapter]
  ADAPTER --> SNAPSHOT[Canonical PortfolioSnapshot]
  SNAPSHOT --> API[Portfolio snapshot API]
  API --> DB[(PostgreSQL)]
  SNAPSHOT --> REPORTMAP[Snapshot to report input mapper]
  SNAPSHOT --> SCOREMAP[Snapshot to score input mapper]
  REPORTMAP --> REPORTCMD[Server-backed report creation]
  SCOREMAP --> SCORECMD[Server-backed score creation]
  REPORTCMD --> REPORTS[AIReportArtifact history]
  SCORECMD --> SCORES[FinancialHealthScoreArtifact history]
  REPORTS --> INSIGHTS[AI Insights web surface]
  SCORES --> INSIGHTS
```

## Long-term Vision

Aurum aims to become a **financial operating system** where users:

- monitor assets
- track spending
- receive AI guidance
- plan financial goals
- execute financial decisions

All within one unified platform.

## Architecture Documents

- [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) - backend modules, AI layer, data flow, extensibility.
- [PRODUCT_ARCHITECTURE.md](./PRODUCT_ARCHITECTURE.md) - information architecture, UX structure, AI interaction model.
- [AI_ARCHITECTURE.md](./AI_ARCHITECTURE.md) - insight engine modes, prompt architecture, AI pipeline.
- [FINANCIAL_DOMAIN_MODEL.md](./FINANCIAL_DOMAIN_MODEL.md) - financial entities, relationships, domain concepts.
- [ROADMAP.md](./ROADMAP.md) - long-term product and platform evolution.

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
```

Recommended local startup (web + api only):

```bash
# Terminal A
pnpm dev:api

# Terminal B
pnpm dev:web
```

One-command startup (web + api):

```bash
pnpm dev:app
```

One-click clean restart (Windows, kills old listeners on 3000/3001 first):

```bash
pnpm dev:restart
```

`dev:restart` also runs `prisma migrate deploy` for `apps/api` before launching web/api, so newly added DB slices are available without a separate manual migration step.

Full monorepo dev (all packages/tasks):

```bash
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

API health check:

```bash
curl http://localhost:3001/v1/health
```

Prisma (v7) commands:

```bash
pnpm --filter api exec prisma migrate dev --name <migration-name>
pnpm --filter api exec prisma db seed
pnpm --filter api exec prisma studio
```

Troubleshooting:

- If Prisma Studio or DB introspection fails, first ensure PostgreSQL is up via Docker Compose.
- If you repeatedly hit `Failed to fetch` / `Cannot POST ...` during local dev, run `pnpm dev:restart` to clear stale web/api listeners and relaunch both services.

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

Key API surfaces:

- ledger and analytics for the finance system of record
- canonical portfolio snapshot create, list, get, and lifecycle-protected delete
- snapshot-scoped report creation and snapshot-linked report history queries
- snapshot-scoped financial health score creation and snapshot-linked score history queries

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
| `/v1/export/transactions.csv` | GET | Yes | Export user transactions CSV (supports month/account/type/query filters). |
| `/v1/export/backup.json` | GET | Yes | Export full user backup JSON (accounts/categories/subcategories/transactions). |
| `/v1/import/transactions/dry-run` | POST (multipart) | Yes | Parse/validate CSV and return preview + errors (no DB writes). |
| `/v1/import/transactions` | POST (multipart) | Yes | Import CSV with taxonomy/account auto-create and idempotency protection. |
| `/v1/analytics/monthly-summary` | GET | Yes | Income/expense/net monthly summary. |
| `/v1/analytics/summary-series` | GET | Yes | Monthly summary series (`months`, `endYear`, `endMonth`) ordered oldest -> newest. |
| `/v1/analytics/category-breakdown` | GET | Yes | Monthly expense breakdown by category. |
| `/v1/ai/monthly-report` | GET | Yes | Monthly AI report payload with generated insights. |
| `/v1/portfolio-snapshots` | POST | Yes | Create canonical portfolio snapshot with nested positions. |
| `/v1/portfolio-snapshots` | GET | Yes | List persisted portfolio snapshots (newest first). |
| `/v1/portfolio-snapshots/:id` | GET | Yes | Get single portfolio snapshot by id. |
| `/v1/portfolio-snapshots/:id` | DELETE | Yes | Delete snapshot if no linked persisted reports (409 when blocked). |
| `/v1/ai-reports` | POST | Yes | Create persisted AI report artifact (verification path). |
| `/v1/ai-reports` | GET | Yes | List persisted AI report artifacts. |
| `/v1/ai-reports/by-snapshot/:sourceSnapshotId` | GET | Yes | List report artifacts linked to a snapshot. |
| `/v1/ai-reports/:id` | GET | Yes | Get report artifact by id. |
| `/v1/portfolio-snapshots/:sourceSnapshotId/reports` | POST | Yes | Server-side create report artifact from snapshot context + manual markdown content. |
| `/v1/financial-health-scores` | GET | Yes | List persisted Financial Health Score artifacts. |
| `/v1/financial-health-scores/by-snapshot/:sourceSnapshotId` | GET | Yes | List score artifacts linked to a snapshot. |
| `/v1/financial-health-scores/:id` | GET | Yes | Get score artifact by id. |
| `/v1/portfolio-snapshots/:sourceSnapshotId/financial-health-scores` | POST | Yes | Server-side create score artifact from snapshot context. |

Transactions query params (`GET /v1/transactions`):

- `limit`, `offset`
- `year`, `month`, `accountId`, `categoryId`, `type`, `q`
- `from`, `to`
- `include=refs` (optional account/category/subcategory refs)

CSV import/export schema columns:

- `occurredAt,type,amount,currency,account,category,subcategory,merchant,note`

Backup restore CLI (dev/local):

```bash
pnpm --filter api restore -- --file ./backup.json --mode wipe
pnpm --filter api restore -- --file ./backup.json --mode append --userId <targetUserId>
```

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
