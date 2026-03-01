# Aurum API (`apps/api`)

NestJS + Prisma API for Aurum.

## Stack
- NestJS 11
- Prisma ORM 7 (`@prisma/client` 7.x)
- PostgreSQL

## Run

From repo root:

```bash
pnpm --filter api dev
```

API listens on `http://localhost:3001`.

## Environment

Create `apps/api/.env` with:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/aurum
CORS_ORIGIN=http://localhost:3000
```

Notes:
- Prisma v7 config is in `apps/api/prisma.config.ts`.
- Schema path: `apps/api/prisma/schema.prisma`.

## Prisma

From repo root:

```bash
pnpm --filter api exec prisma validate
pnpm --filter api exec prisma migrate dev
pnpm --filter api exec prisma db seed
```

## API Endpoints

### Health
- `GET /v1/health`

### Accounts
- `GET /v1/accounts`

### Categories
- `GET /v1/categories`

### Transactions
- `GET /v1/transactions`
- `GET /v1/transactions/:id`
- `POST /v1/transactions`
- `PATCH /v1/transactions/:id`
- `DELETE /v1/transactions/:id`

### Analytics
- `GET /v1/analytics/monthly-summary?year=YYYY&month=M`
- `GET /v1/analytics/category-breakdown?year=YYYY&month=M`

### AI
- `GET /v1/ai/monthly-report?year=YYYY&month=M`

## Quick curl

PowerShell-friendly examples:

```powershell
curl.exe "http://localhost:3001/v1/health"
curl.exe "http://localhost:3001/v1/analytics/monthly-summary?year=2026&month=2"
curl.exe "http://localhost:3001/v1/analytics/category-breakdown?year=2026&month=2"
curl.exe "http://localhost:3001/v1/ai/monthly-report?year=2026&month=2"
```

## Checks

From repo root:

```bash
pnpm lint
pnpm typecheck
```
