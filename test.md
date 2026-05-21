# Aurum Milestone 15 Test Guide

## Demo Account

- Email: `demo@aurum.local`
- Password: `password123`

The seed data is local/demo-only. It includes no real provider credentials and no provider secrets.

## Run Locally

1. Start Postgres from the repo's Docker setup if needed.
2. Configure `DATABASE_URL` for the API.
3. Install dependencies with `pnpm install`.
4. Apply Prisma migrations from `apps/api`.
5. Seed demo data:

```bash
pnpm -C apps/api prisma db seed
```

6. Start the app:

```bash
pnpm dev:app
```

## Seed Assumptions

The seed creates manual institutions for Wells Fargo, SoFi, Webull, Tiger Brokers, Fidelity, Coinbase, and RSU under `demo@aurum.local`.

It adds manual valuation history and demo `PortfolioSnapshot` records, including source-level snapshots and two consolidated snapshots so delta and diagnostics can be validated.

## Manual Validation

1. Log in as `demo@aurum.local` / `password123`.
2. Open Portfolio and confirm Institution Overview shows institutions, account counts, last synced status, and recommended actions.
3. Create a manual institution with `POST /v1/connected-finance/manual-institutions`, for example `{ "institutionKey": "fidelity" }`. If the seed already created Fidelity, confirm duplicate creation fails clearly.
4. Add a manual valuation to a manual account from Portfolio.
5. Create a snapshot from a manual institution.
6. Confirm `GET /v1/connected-finance/overview` returns source health and latest snapshots.
7. Confirm `GET /v1/portfolio-snapshots/:id/lineage` includes snapshot lineage and account context.
8. Confirm `GET /v1/portfolio-snapshots/:id/delta?compareTo=previous` returns position and account deltas.
9. Confirm `GET /v1/portfolio-snapshots/:id/diagnostics` returns allocation, concentration, data health, and flags.

Provider integrations remain read-only and optional. No real Plaid, SnapTrade, Coinbase, wallet, trading, transfer, staking, KYC, or compliance credentials are included.
