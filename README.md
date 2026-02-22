# Aurum

Aurum is a privacy-first, AI-powered personal finance assistant
(Web-first MVP).

The goal of this project is to build a production-grade personal finance
system while exploring:

-   Modern TypeScript monorepo architecture
-   NestJS backend (REST API)
-   Next.js frontend (App Router)
-   Prisma ORM v7 with PostgreSQL adapter
-   Docker-based local infrastructure
-   Future AI-driven financial insights

------------------------------------------------------------------------

# 🏗 Architecture Overview

Browser (localhost:3000) │ ▼ Next.js (apps/web) │ REST ▼ NestJS API
(apps/api) │ ├── Prisma ORM v7 (Postgres adapter) ├── PostgreSQL
(Docker) └── Redis (Docker)

------------------------------------------------------------------------

# 📦 Monorepo Structure

Aurum/ ├── apps/ │ ├── web/ \# Next.js frontend │ └── api/ \# NestJS
backend ├── packages/ │ └── core/ \# Shared types / utilities (future)
├── infra/ │ └── docker/ \# docker-compose.yml

Monorepo managed with:

-   pnpm workspaces
-   Turborepo

------------------------------------------------------------------------

# 🚀 Current Progress (Milestone 2 Complete)

✅ Docker infrastructure (Postgres + Redis)\
✅ Prisma v7 configured with adapter-pg\
✅ Database schema (User, Account, Category, Transaction)\
✅ Initial migration applied\
✅ Seed script (demo user + sample data)\
✅ First DB-backed endpoint: GET /v1/categories

------------------------------------------------------------------------

# 🧱 Tech Stack

## Frontend

-   Next.js 16 (App Router)
-   TypeScript
-   ESLint

## Backend

-   NestJS
-   Prisma ORM v7
-   PostgreSQL
-   Redis (reserved for caching / queue)

## Dev Infrastructure

-   Docker Desktop
-   pnpm
-   Turborepo

------------------------------------------------------------------------

# 🛠 Local Development

## Prerequisites

-   Node.js v20 (LTS)
-   pnpm v9
-   Docker Desktop (WSL2 enabled)

------------------------------------------------------------------------

## Install dependencies

pnpm install

------------------------------------------------------------------------

## Start Docker services

docker compose -f infra/docker/docker-compose.yml up -d

This starts:

-   PostgreSQL → localhost:5432
-   Redis → localhost:6379

------------------------------------------------------------------------

## Run Web + API

pnpm dev

------------------------------------------------------------------------

# 🔌 Ports

  Service         URL
  --------------- ---------------------------------
  Web             http://localhost:3000
  API             http://localhost:3001
  Health          http://localhost:3001/v1/health
  Prisma Studio   http://localhost:5555

------------------------------------------------------------------------

# 🗄 Database (Prisma v7)

## Run migration

pnpm --filter api exec prisma migrate dev --name
`<migration-name>`{=html}

## Seed database

pnpm --filter api exec prisma db seed

## Open Prisma Studio

pnpm --filter api exec prisma studio

------------------------------------------------------------------------

# 🌱 Environment Variables

## Web (apps/web/.env.local)

NEXT_PUBLIC_API_BASE_URL=http://localhost:3001

## API (apps/api/.env)

PORT=3001 CORS_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://aurum:aurum@localhost:5432/aurum_dev?schema=public
REDIS_URL=redis://localhost:6379

------------------------------------------------------------------------

# 🧪 Useful Commands

pnpm dev \# start web + api pnpm lint \# lint all packages pnpm
typecheck \# type check all packages pnpm build \# production build

------------------------------------------------------------------------

# 🧠 Roadmap

Milestone 1 --- Monorepo & Baseline\
Milestone 2 --- Database & Infrastructure (Completed)\
Milestone 3 --- Core Ledger Features (Next)\
Milestone 4 --- Analytics & AI

------------------------------------------------------------------------

# 👤 Author

Zequn Yu\
Seattle, WA
