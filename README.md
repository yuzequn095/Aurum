# Aurum

![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-9.x-F69220?logo=pnpm&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)

Aurum is an AI-driven Personal Wealth Operating System. It brings together
cash-flow tracking, portfolio snapshots, financial analytics, and explainable
AI insights in one product.

<p align="center">
  <img src="./assets/readme/aurum-product-showcase.png" alt="Aurum product showcase" width="100%" />
</p>

## Product

- **Dashboard** — a daily view of cash flow, portfolio posture, and next actions.
- **Portfolio** — multi-account holdings, allocation, valuations, and snapshots.
- **Transactions** — income and expense ledger with categories and import/export.
- **AI Insights** — reports, financial-health analysis, and saved conversations.
- **Settings** — account, session, and product preferences.

Aurum uses synthetic/demo data during development. Provider integrations and
production financial-data workflows are intentionally separate from the core
product foundation.

## Architecture

The repository is a pnpm workspace and Turborepo monorepo:

```text
apps/web          Next.js web application
apps/api          NestJS API
apps/mobile-shell Capacitor iOS shell
packages/core     Shared domain and AI foundations
```

The web client communicates with the API through same-origin `/api` routes in
hosted deployments. The API is server-authoritative for accounts, transactions,
portfolio data, and AI artifacts. The mobile shell hosts the web runtime and
does not contain financial-domain state.

## Local development

Requirements: Node.js 20, pnpm 9, and PostgreSQL 16 (or the repository's local
development container setup).

```bash
pnpm install
pnpm dev
```

Useful checks:

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter api test
pnpm --filter web test
```

The local demo account is documented in [`apps/api/README.md`](apps/api/README.md).
Mobile setup is documented in [`apps/mobile-shell/README.md`](apps/mobile-shell/README.md).

## Repository guides

- [`apps/api/README.md`](apps/api/README.md)
- [`apps/web/README.md`](apps/web/README.md)
- [`apps/mobile-shell/README.md`](apps/mobile-shell/README.md)

## Status

Aurum is an active product prototype. The current focus is a stable web and
mobile foundation with synthetic data, explicit session behavior, and a clear
path toward later hosting, data-safety, and provider-integration work.
