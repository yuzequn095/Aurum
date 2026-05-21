# Milestone 15 Closeout

## Summary

Milestone 15 completes Connected Finance Expansion / Portfolio Depth while preserving Aurum's modular monolith and snapshot-first architecture.

## Completed Scope

- Institution-aware manual presets for Wells Fargo, SoFi, Webull, Tiger Brokers, Fidelity, Coinbase, and RSU.
- `POST /v1/connected-finance/manual-institutions`.
- `GET /v1/connected-finance/overview`.
- `GET /v1/portfolio-snapshots/:id/lineage`.
- `GET /v1/portfolio-snapshots/:id/delta?compareTo=previous`.
- `GET /v1/portfolio-snapshots/:id/diagnostics`.
- Portfolio UI sections for institution health, snapshot delta, and diagnostics.
- Settings institution summary.
- Demo seed data for `demo@aurum.local` / `password123`.

## Intentionally Out of Scope

- Payments, transfers, trading, wallet execution, staking, tax lots, KYC, and compliance-heavy flows.
- Provider writeback or provider mutation.
- New service split.
- AI-generated investment advice.
- CSV-focused workflows.

## Architecture Decisions

- Existing `ConnectedSourceRecord` remains the institution boundary.
- Existing `ConnectedSourceAccountRecord` remains the account/sub-account boundary.
- Manual institutions use `MANUAL_STATIC`.
- Stable `institutionKey` and `accountKey` values live in metadata.
- `PortfolioSnapshot` remains canonical for downstream portfolio analysis.
- Diagnostics are deterministic and explainable.

## Validation Commands

Validated during implementation:

```bash
pnpm --filter api lint
pnpm --filter web lint
pnpm --filter api typecheck
pnpm --filter @aurum/core typecheck
pnpm --filter web typecheck
pnpm --filter api exec jest connected-finance.service.spec.ts --runInBand
pnpm --filter api exec jest portfolio-snapshots.service.spec.ts --runInBand
```

Final repo-level validation should use:

```bash
pnpm lint
pnpm typecheck
pnpm --filter api test
pnpm build
```

## Demo Notes

Seed with:

```bash
pnpm -C apps/api prisma db seed
```

Demo login:

- Email: `demo@aurum.local`
- Password: `password123`

The seed creates mock/manual financial data only. It does not include real provider credentials.

## Milestone 16 Candidates

- Reconciliation between consolidated snapshots and source-level snapshots.
- Better provider sync retry/attention workflows.
- Scheduled read-only sync orchestration.
- Deeper AI report context using diagnostics.
- Planning workflows for budget/goals without execution-layer financial actions.
