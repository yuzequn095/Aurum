# Aurum API (`apps/api`)

NestJS + Prisma API for Aurum.

## Stack
- NestJS 11
- Prisma ORM 7 (`@prisma/client` 7.x)
- PostgreSQL

## Run

From repo root:

```bash
pnpm dev:api
# or
pnpm -C apps/api start:dev
```

API listens on `http://localhost:3001`.

Health check:

```bash
curl.exe "http://localhost:3001/v1/health"
```

## Environment

Create `apps/api/.env` with:

```bash
DATABASE_URL=postgresql://aurum:aurum@localhost:55432/aurum_dev?schema=public
CORS_ORIGIN=http://localhost:3000
JWT_ACCESS_SECRET=dev_access_secret_change_me
JWT_REFRESH_SECRET=dev_refresh_secret_change_me
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
AURUM_INSIGHTS_MODE=rules
AURUM_LLM_ENABLED=false
```

Notes:
- Prisma v7 config is in `apps/api/prisma.config.ts`.
- Schema path: `apps/api/prisma/schema.prisma`.
- Local Docker compose exposes Postgres on `55432` to avoid Windows conflicts on `5432`.

## Prisma

From repo root:

```bash
pnpm --filter api exec prisma validate
pnpm --filter api exec prisma migrate dev
pnpm --filter api exec prisma db seed
```

Local demo auth:

- Seeding is idempotent for the demo identity and refreshes a password-backed login each time.
- Demo login:
  `demo@aurum.local` / `password123`
- To reset an existing local email/password identity:
  `pnpm --filter api run reset-password -- <email> <new-password>`
- If you prefer, you can also create your own user through `POST /v1/auth/register` or the web `/register` page.

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
