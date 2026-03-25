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
- [What Milestone 12 Changed](#what-milestone-12-changed)
- [What Milestone 13 Changed](#what-milestone-13-changed)
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

**Tracks and materializes through snapshots:**

- bank accounts
- brokerage accounts
- crypto accounts
- manual static accounts
- asset allocation
- account breakdown

**Current foundation includes:**

- connected-finance sources and source accounts
- append-only manual static valuation history
- lineage-aware snapshot materialization for manual static and connected sync flows
- bank, brokerage, and crypto provider foundations inside the connected-finance model

**Still ahead:**

- deeper investment performance analytics
- broader provider coverage and production hardening
- richer portfolio analysis workflows

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

- Reports:
  Monthly Financial Review and Daily Market Brief
- Analysis:
  Financial Health Score, first-class portfolio analysis entry points, and snapshot-aware diagnostics
- Planning:
  reserved budget and goals slots for future guided workflows
- Conversations:
  ephemeral Quick Chat plus explicit Save into persistent Conversations
- persisted report, score, and conversation history with entitlement-aware create actions

AI Insights is the product surface where Aurum's snapshot-driven artifacts, preset AI workflows, and saved conversations come together.

## AI System Design

Aurum's AI architecture is now split into four practical layers that work together without breaking the snapshot-first analysis model.

### 1. Canonical Financial Inputs

- `PortfolioSnapshot` remains the canonical upstream truth for portfolio analysis.
- Ledger analytics remain the canonical upstream truth for monthly cashflow and category views.
- Connected-finance sources and manual-static sources both normalize into the same snapshot contract.

### 2. Persisted AI Artifacts

- Reports persist as snapshot-linked `AIReportArtifact` records.
- Financial health assessments persist as snapshot-linked `FinancialHealthScoreArtifact` records.
- Saved conversations persist separately and can optionally link back to snapshots, reports, and scores.
- Historical reads remain ownership-based and stay readable even after premium access expires.

### 3. AI Product Workflows

Current Milestone 13 workflows include:

- Quick Chat:
  protected, ephemeral by default, and explicitly savable into Conversations
- Reports:
  Monthly Financial Review and Daily Market Brief with persisted history
- Analysis:
  Financial Health Score plus first-class portfolio analysis entry points
- Planning:
  reserved product slots for future budget and goals workflows

These workflows are productized in `/ai-insights`, not in the developer workbench.

### 4. Prompt / Provider / Manual Validation Layer

- `packages/core` now contains task definitions, prompt packs, provider adapters, routing, and prepared-run foundations.
- Preset task prompt packs exist for:
  `monthly_financial_review_v1`,
  `daily_market_brief_v1`,
  `portfolio_analysis_v1`,
  `health_score_explainer_v1`,
  `budget_analysis_v1`,
  plus the earlier `portfolio_report_v1`.
- The default route remains provider-agnostic and currently supports a no-key `manual_chatgpt` path for workbench validation.
- Quick Chat also supports graceful local fallback when a live provider is not configured or fails.

### Insight Engine Baseline

For broader insight generation Aurum still supports:

- `rules`
- `llm`
- `hybrid`

That engine remains a reusable foundation, while Milestone 13 productized concrete report, analysis, and conversation flows on top.

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

Milestones 1-13 are now complete at the foundation-plus-productization level. Milestone 13 delivered the AI Product Layer on top of the Milestone 11 snapshot-driven analysis architecture and the Milestone 12 connected-finance ingestion foundation. The next focus is Milestone 14: Experience Layer.

- Platform status:
  monorepo, API, web, auth, ledger, taxonomy, analytics, import/export, and dashboard foundations are stable.
- Connected-finance status:
  connected sources, source accounts, sync runs, encrypted provider secret storage, and lineage-aware `PortfolioSnapshot` materialization are implemented.
- AI product status:
  AI Insights is now organized into Reports, Analysis, Planning, and Conversations with entitlement-aware create paths and historical read preservation.
- Manual/no-key status:
  AI Workbench can prepare and inspect preset prompt packs without API keys, and Quick Chat can fall back cleanly when no live provider is available.
- Current execution focus:
  Milestone 14 desktop/mobile experience refinement, workflow polish, and richer UX consistency on top of the shipped AI product layer.

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
| 12 | Connected Finance & Real Ingestion | Done | Connected source foundation, source accounts, sync runs, snapshot lineage and ingestion hardening, manual static accounts with valuation history, Plaid bank foundation, SnapTrade brokerage holdings foundation, Coinbase crypto foundation, and provider-aware fallback guidance to Manual Create when backend provider config is missing. |
| 13 | AI Product Layer | Done | Artifact ownership hardening, entitlement foundation, saved conversations, Quick Chat to Save to Conversations, AI Insights IA productization, Monthly Financial Review, Daily Market Brief, first-class analysis workflows, and preset prompt pack expansion. |
| 14 | Experience Layer (Desktop + Mobile UX) | Current Focus | Desktop UX refinement, mobile implementation aligned with Aurum-Mobile-UX-Demo, cross-platform design consistency, command menu UX, and AI-first interaction polish. |
| 15 | Connected Finance Expansion / Financial OS Direction | Future | Deeper portfolio and institution modeling, financial execution experiments, and broader Financial OS exploration. |

**Milestone 11 delivered:**

- shared AI domain contracts, task definition abstraction, prompt pack foundation, provider adapter abstraction, manual ChatGPT provider foundation, and router foundation
- AI run repository, AI workbench validation, and local/web persistence foundation
- `AIReportArtifact` foundation, `FinancialHealthScoreArtifact` foundation, and deterministic financial health score foundation
- canonical `PortfolioSnapshot` contract, CSV snapshot adapter, snapshot-to-report input mapper, and snapshot-to-score input mapper
- API-side snapshot persistence, snapshot verification endpoints, and web-side snapshot create/list demo ingestion
- `/ai-insights` snapshot-driven flow, report persistence plus snapshot-linked history, and score persistence plus snapshot-linked history
- server-backed report creation, server-backed score creation, and snapshot deletion lifecycle v1 that blocks deletion when linked artifacts exist

**Milestone 12 delivered:**

- shared connected-finance contracts for `ConnectedSource`, `ConnectedSourceAccount`, `ConnectedSyncRun`, ingestion modes, provider adapters, and stronger snapshot lineage metadata
- append-only manual static account and valuation flow with snapshot materialization through the same canonical `PortfolioSnapshot` pipeline
- Plaid Sandbox bank balance sync foundation with encrypted provider secret storage and lineage-aware sync runs
- SnapTrade brokerage holdings foundation with provider-user bootstrap, source import, and holdings-first snapshot materialization
- Coinbase read-only crypto self-connect foundation with encrypted credentials and balance-first snapshot materialization
- connected-finance web/admin validation flows plus provider-aware UI guidance that falls back to Manual Create when backend provider config is not available

**Milestone 13 delivered:**

- JWT-guarded ownership hardening for AI reports and financial health scores using snapshot ownership as the visibility boundary
- entitlement foundation with reusable feature checks, historical-read preservation, and `GET /v1/entitlements/me`
- saved conversation persistence plus current-user save/list/get/rename/delete APIs
- Quick Chat ephemeral execution with explicit Save into Conversations
- AI Insights productization around Reports, Analysis, Planning, and Conversations
- first-class Monthly Financial Review workflow
- first-class Daily Market Brief workflow plus delivery-preferences foundation
- first-class Financial Health Score workflow and guided portfolio analysis entry
- preset task prompt packs and manual provider support for workbench-based no-key validation

## What Milestone 11 Changed

Milestone 11 changed Aurum from an AI-demo-oriented foundation into a snapshot-driven analysis architecture.

- `PortfolioSnapshot` is now the canonical upstream truth for portfolio analysis.
- Reports are no longer just generated text; they are persisted report artifacts linked to snapshots.
- Financial health scores are no longer just transient calculations; they are persisted score artifacts linked to snapshots.
- Final report and score creation is server-backed rather than client-assembled.
- `/ai-insights` now works against snapshot-scoped report and score history.
- Snapshot lifecycle rules now recognize downstream analysis artifacts, including deletion blocking when linked reports exist.

In practical terms, this means Aurum now has an analysis system with upstream source objects, persistent downstream artifacts, and explicit resource relationships across web, API, and database layers.

## What Milestone 12 Changed

Milestone 12 changed Aurum from a mostly demo/manual snapshot ingestion path into a connected-finance ingestion architecture.

- `PortfolioSnapshot` remains the canonical upstream truth for downstream analysis, but snapshots can now originate from manual static sources and connected sources.
- `ConnectedSource`, `ConnectedSourceAccount`, and `ConnectedSyncRun` are now first-class system objects rather than future placeholders.
- Source adapters normalize manual static valuations, bank balances, brokerage holdings, and crypto balances into the same canonical snapshot shape.
- Snapshots now carry stronger lineage through source, sync run, ingestion mode, normalization version, and source fingerprint fields.
- The same downstream AI report and financial health score flows continue to operate on those snapshots without changing their core contract.
- Provider integrations are intentionally foundation-level: they establish connection, normalization, credential handling, and sync/materialization paths without claiming full production breadth yet.

## What Milestone 13 Changed

Milestone 13 changed Aurum from a snapshot-driven AI foundation into a usable AI product layer.

- AI artifacts now enforce the same user-scoped ownership boundary standard as portfolio snapshots.
- Entitlements now gate premium create, refresh, save, and reply actions without blocking historical reads.
- Quick Chat is implemented as an ephemeral-by-default flow with explicit Save into persistent Conversations.
- AI Insights is now organized into Reports, Analysis, Planning, and Conversations rather than behaving like a single AI demo surface.
- Monthly Financial Review and Daily Market Brief are first-class server-backed report workflows with persisted history.
- Financial Health Score is productized as a first-class analysis workflow, and portfolio analysis has a first-class entry point.
- Preset prompt packs and manual prepared-run support now make no-key testing practical across key report, analysis, and planning tasks.

In practical terms, Milestone 13 turned Aurum's AI layer into a coherent product surface while preserving the snapshot-first artifact architecture and provider-agnostic foundations.

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

- `packages/core` for canonical portfolio, connected-finance, AI, report, and score domain contracts
- shared adapters and mappers for source normalization, snapshot ingestion, and snapshot-driven analysis inputs

**Key platform surfaces:**

- ledger APIs for accounts, categories, subcategories, transactions, import/export, and analytics
- connected-finance APIs for sources, source accounts, sync runs, manual static valuations, provider connect flows, and snapshot materialization
- snapshot persistence and verification APIs for canonical `PortfolioSnapshot`
- snapshot-scoped report creation and report history APIs
- snapshot-scoped financial health score creation and score history APIs
- lifecycle protection that blocks snapshot deletion when persisted linked report artifacts exist

**Connected-finance foundation:**

- `ConnectedSource` models the user-owned source boundary for manual static, bank, brokerage, and crypto ingestion.
- `ConnectedSourceAccount` models provider-backed or manual-static accounts without collapsing them into ledger `Account`.
- `ConnectedSyncRun` records materialization attempts and sync lineage.
- `PortfolioSnapshot` remains the canonical analysis input, now with explicit ingestion and lineage metadata.

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
  MANUAL[Manual Static Source]
  BANK[Bank Provider]
  BROKERAGE[Brokerage Provider]
  CRYPTO[Crypto Provider]
  MANUAL --> ADAPTERS[Source adapters and normalization]
  BANK --> ADAPTERS
  BROKERAGE --> ADAPTERS
  CRYPTO --> ADAPTERS
  ADAPTERS --> CONNECTED[ConnectedSource plus SourceAccounts plus SyncRun]
  CONNECTED --> SNAPSHOT[Canonical PortfolioSnapshot]
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
- [MILESTONE_13_CLOSEOUT.md](./MILESTONE_13_CLOSEOUT.md) - delivered AI Product Layer capabilities, limitations, and Milestone 14 handoff notes.
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

No-key manual AI validation:

- Keep `AURUM_LLM_ENABLED=false` to validate the preset-task prompt packs and manual provider path without model credentials.
- Use `/dev/ai-workbench` to create prepared runs, inspect prompt packs, copy prompts, paste external results, and validate local report generation from completed manual runs.
- Quick Chat in `/ai-insights` can also fall back gracefully when a live provider is unavailable.

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

### Connected Finance Provider Config

Connected-finance provider setup is optional by environment. If a provider is not configured, the web flow stays visible and Aurum falls back to friendly guidance that points users to Manual Create / manual static accounts instead of surfacing a generic internal error.

| Key | Example | Purpose |
| --- | --- | --- |
| `CONNECTED_SOURCE_SECRET_KEY` | `change-me` | Required for encrypting provider credentials and secrets at rest. |
| `PLAID_CLIENT_ID` | `<id>` | Enables Plaid bank link-token and token exchange flows. |
| `PLAID_SECRET` | `<secret>` | Enables Plaid bank token exchange and balance sync flows. |
| `PLAID_ENV` | `sandbox` | Plaid environment selector for the current deployment. |
| `PLAID_PRODUCTS` | `auth` | Plaid product list for Link token creation. |
| `PLAID_COUNTRY_CODES` | `US` | Plaid country codes for Link token creation. |
| `PLAID_REDIRECT_URI` | `<uri>` | Optional redirect URI for Plaid Link flows. |
| `SNAPTRADE_CLIENT_ID` | `<id>` | Enables SnapTrade brokerage connection and sync flows. |
| `SNAPTRADE_CONSUMER_KEY` | `<key>` | Enables SnapTrade brokerage API access. |
| `SNAPTRADE_REDIRECT_URI` | `http://localhost:3000/portfolio` | Optional redirect target for the SnapTrade connection portal. |
| `SNAPTRADE_BASE_URL` | `<url>` | Optional SnapTrade API base override. |
| `COINBASE_ENABLED` | `true` / `false` | Enables Coinbase self-connect flows in the current environment. |
| `COINBASE_API_BASE_URL` | `https://api.coinbase.com` | Optional Coinbase API base override. |
| `COINBASE_API_TIMEOUT_MS` | `10000` | Coinbase API request timeout in milliseconds. |

## API Reference

Base URL: `http://localhost:3001`

Key API surfaces:

- ledger and analytics for the finance system of record
- connected-finance source, account, valuation, connect, and sync flows
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
| `/v1/connected-finance/sources` | GET / POST | Yes | List or create connected-finance sources for the current user. |
| `/v1/connected-finance/sources/:id/accounts` | GET / POST | Yes | List or create source accounts for a user-owned source. |
| `/v1/connected-finance/accounts/:accountId/manual-valuations` | GET / POST | Yes | List or append manual static valuation history for a user-owned source account. |
| `/v1/connected-finance/bank/plaid/link-token` | POST | Yes | Create a Plaid Link token when Plaid backend credentials are configured. |
| `/v1/connected-finance/brokerage/snaptrade/connection-portal-url` | POST | Yes | Create a SnapTrade connection portal URL when SnapTrade backend credentials are configured. |
| `/v1/connected-finance/crypto/coinbase/connect` | POST | Yes | Connect a read-only Coinbase crypto source for the current user when enabled. |
| `/v1/connected-finance/sources/:id/sync` | POST | Yes | Run a user-scoped connected source sync and materialize a canonical snapshot with lineage. |
| `/v1/portfolio-snapshots` | POST | Yes | Create canonical portfolio snapshot with nested positions. |
| `/v1/portfolio-snapshots` | GET | Yes | List persisted portfolio snapshots (newest first). |
| `/v1/portfolio-snapshots/:id` | GET | Yes | Get single portfolio snapshot by id. |
| `/v1/portfolio-snapshots/:id` | DELETE | Yes | Delete snapshot if no linked persisted reports (409 when blocked). |
| `/v1/entitlements/me` | GET | Yes | Get current user's effective AI entitlements and historical-read flags. |
| `/v1/ai/quick-chat` | POST | Yes | Run ephemeral Quick Chat with optional snapshot/report/score context. |
| `/v1/ai/monthly-financial-review` | POST | Yes | Create a Monthly Financial Review report artifact. |
| `/v1/ai/daily-market-brief` | POST | Yes | Create a Daily Market Brief report artifact. |
| `/v1/ai/daily-market-brief/preferences/me` | GET / PATCH | Yes | Read or update current-user Daily Market Brief delivery preferences. |
| `/v1/ai-reports` | POST | Yes | Create persisted AI report artifact (verification path). |
| `/v1/ai-reports` | GET | Yes | List persisted AI report artifacts. |
| `/v1/ai-reports/by-snapshot/:sourceSnapshotId` | GET | Yes | List report artifacts linked to a snapshot. |
| `/v1/ai-reports/:id` | GET | Yes | Get report artifact by id. |
| `/v1/portfolio-snapshots/:sourceSnapshotId/reports` | POST | Yes | Server-side create report artifact from snapshot context + manual markdown content. |
| `/v1/financial-health-scores` | GET | Yes | List persisted Financial Health Score artifacts. |
| `/v1/financial-health-scores/by-snapshot/:sourceSnapshotId` | GET | Yes | List score artifacts linked to a snapshot. |
| `/v1/financial-health-scores/:id` | GET | Yes | Get score artifact by id. |
| `/v1/portfolio-snapshots/:sourceSnapshotId/financial-health-scores` | POST | Yes | Server-side create score artifact from snapshot context. |
| `/v1/ai-conversations` | GET / POST | Yes | List or save current-user AI conversations. |
| `/v1/ai-conversations/:id` | GET / PATCH / DELETE | Yes | Get, rename, or delete a current-user saved conversation. |

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
