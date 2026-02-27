# Aurum

![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-9.x-F69220?logo=pnpm&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)

---

## Project Description

Aurum is a privacy-first, AI-powered personal finance assistant (Web-first MVP).

The project focuses on building a production-grade personal finance system with:

- Modern TypeScript monorepo architecture
- NestJS REST API backend
- Next.js App Router frontend
- Prisma ORM v7 + PostgreSQL
- Docker-based local infrastructure
- A future path toward AI-driven financial insights

---

## What Works Today

- Docker local infra (PostgreSQL + Redis)
- Prisma v7 configured with `@prisma/adapter-pg`
- Core schema and migrations
- Seed data (demo user + sample ledger data)
- Categories API: `GET /v1/categories`
- Accounts API: `GET /v1/accounts`
- Transactions CRUD + list filtering/pagination
- Transactions list supports `include=refs` for account/category refs
- Web transactions page supports create/edit/delete/filter/pagination

---

## Architecture

```text
System Architecture

User (Browser)
    |
    v
Next.js Web (apps/web)  -- http://localhost:3000
    |  REST
    v
NestJS API (apps/api)   -- http://localhost:3001
    |
    |-- Prisma ORM v7 (adapter-pg)
    |       |
    |       v
    |   PostgreSQL (Docker) -- localhost:5432
    |
    |-- Redis (Docker) -- localhost:6379
```

---

## Monorepo Structure

```text
Aurum/
|
|-- apps/
|   |-- web/          # Next.js frontend
|   `-- api/          # NestJS backend
|
|-- packages/
|   `-- core/         # shared types / utilities
|
|-- infra/
|   `-- docker/       # docker-compose.yml
|
|-- pnpm-workspace.yaml
|-- turbo.json
`-- package.json
```

Top-level folders:

- `apps/`: runnable applications (`web`, `api`)
- `packages/`: shared code across apps
- `infra/`: infrastructure and local Docker setup

---

## Quickstart

Prerequisites:

- Node.js 20.x
- pnpm 9.x
- Docker Desktop

Start local infrastructure:

```bash
docker compose -f infra/docker/docker-compose.yml up -d
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

---

## Database

Run migrations:

```bash
pnpm --filter api exec prisma migrate dev --name <migration-name>
```

Seed data:

```bash
pnpm --filter api exec prisma db seed
```

Open Prisma Studio:

```bash
pnpm --filter api exec prisma studio
```

---

## API Reference

Base URL: `http://localhost:3001`

| Endpoint | Method | Description |
| --- | --- | --- |
| `/v1/health` | GET | Health check |
| `/v1/categories` | GET | List categories for demo user |
| `/v1/accounts` | GET | List accounts for demo user |
| `/v1/transactions` | GET | List transactions with filters/pagination |
| `/v1/transactions/:id` | GET | Get transaction detail |
| `/v1/transactions` | POST | Create transaction |
| `/v1/transactions/:id` | PATCH | Update transaction |
| `/v1/transactions/:id` | DELETE | Delete transaction |

`GET /v1/transactions` query params:

- `limit`, `offset`
- `accountId`, `categoryId`
- `from`, `to`
- `include=refs` (optional; includes account/category refs)

---

## Phase & Milestone Plan

- [x] Milestone 1: Monorepo & baseline
- [x] Milestone 2: Database & infrastructure
- [x] Milestone 3: Core ledger features (in progress)
- [ ] Milestone 4: Analytics & AI

---

## Conventions

- Package manager: `pnpm`
- Monorepo task runner: `turbo`
- API prefix: `/v1`
- Use `.env` / `.env.local` for runtime configuration
- Keep shared cross-app logic under `packages/`

---

## Author

Zequn Yu  
Seattle, WA
