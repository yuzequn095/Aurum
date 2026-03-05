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
- [Current Architecture](#current-architecture)
- [Completed Milestones](#completed-milestones)
- [Upcoming Roadmap](#upcoming-roadmap)
- [Long-term Vision](#long-term-vision)
- [Current Status](#current-status)
- [Detailed Engineering Progress](#detailed-engineering-progress)
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

**Reports:**

- Monthly financial report
- Quarterly report
- Yearly report

**Analysis:**

- spending breakdown
- financial health score
- trend analysis

**Planning:**

- budget tracking
- financial goals

**Conversations:**

- saved AI conversations

AI Insights will evolve into Aurum's **financial intelligence engine**.

## AI System Design

Aurum contains two layers of AI interaction.

### 1. Quick AI (Ephemeral Chat)

Accessible from the "+" action menu.

**Purpose:**

- quick financial questions
- instant analysis

**Examples:**

- "How much did I spend on dining this month?"
- "What was my biggest expense category?"

**Characteristics:**

- temporary
- not saved by default
- user may optionally save the conversation

Saved conversations are stored in **AI Insights > Conversations**.

### 2. Insight AI (Persistent Conversations)

Located inside the AI Insights module.

These are structured AI conversations such as:

- Monthly Report
- Budget Analysis
- Financial Health Score
- Goal Tracking

These conversations persist over time and act as **AI financial advisors**.

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

Milestones 7, 8, 9.1, 9.2, 9.3, and 9.4 are complete.

- Auth: email/password login, JWT access token + refresh token, refresh rotation/reuse detection, logout/logout-all, guarded APIs, server-side userId isolation.
- Ledger v2: income transactions, date-only `occurredAt` API contract (`YYYY-MM-DD`) with DB `DateTime`, category + subcategory taxonomy, and enforced category/subcategory for income/expense.
- UX + List: standardized `ApiError`, toast system, improved taxonomy UX/defaults, server-side transaction filters, row-click edit flow, and transaction list view-model/formatters.
- Import/Export: CSV export, CSV dry-run + import with taxonomy auto-create, idempotent import via content hash (`ImportLog`), and user backup JSON export.
- Restore tooling: development backup restore CLI (`wipe|append`) with ID-preserving upserts.
- Analytics + AI: monthly summary and category breakdown endpoints; AI monthly report is available via pluggable insight engine (`rules` / `llm` / `hybrid`).
- LLM is optional and controlled by env flags to avoid cost in local/dev.
- Milestone 10.2 foundation is active on web: premium app shell, full-bleed canvas, reusable UI primitives (Card/Button/Badge/Skeleton), KPI section, chart foundation, 6-month trend chart, category donut chart, settings + logout flow.
- Analytics now includes monthly summary time series endpoint for trend visualizations: `GET /v1/analytics/summary-series`.

## Current Architecture

**Backend stack:**

- NestJS
- Prisma ORM
- PostgreSQL

**Frontend stack:**

- Next.js
- TypeScript
- Tailwind

**Key backend modules:**

- auth
- accounts
- transactions
- categories / subcategories
- analytics
- AI insights
- CSV import/export
- backup / restore

**Application architecture overview:**

```mermaid
flowchart LR
  B[Browser] --> W[Next.js Web<br/>apps/web]
  W -->|REST /v1 + Bearer access token| A[NestJS API<br/>apps/api]
  A -->|Prisma ORM v7| P[(PostgreSQL)]
  W -.->|refresh token in localStorage<br/>dev mode| W
  A -->|issue/verify access + refresh| A
```

**AI insight generation flow:**

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

## Completed Milestones

### Phase 1 - Core Finance Infrastructure

- authentication system
- account model
- category / subcategory taxonomy
- transaction tracking
- analytics APIs

### Phase 2 - AI Financial Intelligence

- insight engine
- monthly analysis
- hybrid rule + AI system

### Phase 3 - Data Management

- CSV import/export
- backup system
- restore tools
- import idempotency

## Upcoming Roadmap

### Milestone 10 - UX Implementation

- responsive layout
- dashboard UI
- portfolio UI
- transactions UI
- insights UI

### Milestone 11 - Advanced AI

- financial health score
- proactive AI alerts
- budget analysis
- goal tracking

### Milestone 12 - Connected Finance

- bank integrations
- brokerage integrations
- automated portfolio tracking

### Milestone 13 - Financial Execution Layer

- investment tools
- digital wallet functionality
- financial product integrations

## Long-term Vision

Aurum aims to become a **financial operating system** where users:

- monitor assets
- track spending
- receive AI guidance
- plan financial goals
- execute financial decisions

All within one unified platform.

## Detailed Engineering Progress

| Phase | Milestones | Status | Notes |
| --- | --- | --- | --- |
| Phase 1 - Foundation | M1 Monorepo setup, M2 DB schema (Prisma v7 + Postgres), M3 Transactions CRUD, M4 Analytics Dashboard | Done | Core stack and ledger/analytics baseline landed. |
| Phase 2 - AI Report Baseline | M5 AI monthly report (rule-based baseline + UI states) | Done | Stable rule-based report and UI handling for loading/error/empty. |
| Phase 3 - Insight Engine | M6 refactor + LLM scaffold + hybrid merge + tests | Done | `rules`/`llm`/`hybrid` modes available; LLM path optional by env. |
| Phase 4 - Auth & Productization | M7 Auth (email/password, identities, refresh tokens, guards, user scoping) | Done | Refresh rotation + reuse detection + logout-all implemented. |
| Phase 5 - Ledger v2 | M8.1 Date-only occurredAt, M8.2 Income, M8.3 Category/Subcategory taxonomy | Done | API date-only, DB DateTime retained (Strategy A). |
| Phase 6 - UX + List | M9.1 API errors/toasts/taxonomy UX, M9.2 list VM + filters + row edit | Done | Transactions list supports server-side filtering and fast in-place edit updates. |
| Phase 7 - Import/Export + Backup | M9.3 CSV import/export, M9.4 idempotency + backup export + restore CLI | Done | End-to-end CSV workflow plus JSON backup/restore tooling for local/dev. |
| Phase 8 - Web UX Foundation | M10.1 app shell + route group, M10.2 design tokens + UI primitives + dashboard KPI/charts + settings/logout | In Progress | Premium layout baseline landed; dashboard now includes KPI + trend + category visuals with loading/empty states. |

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
| `/v1/export/transactions.csv` | GET | Yes | Export user transactions CSV (supports month/account/type/query filters). |
| `/v1/export/backup.json` | GET | Yes | Export full user backup JSON (accounts/categories/subcategories/transactions). |
| `/v1/import/transactions/dry-run` | POST (multipart) | Yes | Parse/validate CSV and return preview + errors (no DB writes). |
| `/v1/import/transactions` | POST (multipart) | Yes | Import CSV with taxonomy/account auto-create and idempotency protection. |
| `/v1/analytics/monthly-summary` | GET | Yes | Income/expense/net monthly summary. |
| `/v1/analytics/summary-series` | GET | Yes | Monthly summary series (`months`, `endYear`, `endMonth`) ordered oldest -> newest. |
| `/v1/analytics/category-breakdown` | GET | Yes | Monthly expense breakdown by category. |
| `/v1/ai/monthly-report` | GET | Yes | Monthly AI report payload with generated insights. |

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
