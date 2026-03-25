# Aurum System Architecture

## Overview

Aurum is a modular monolith for an AI-driven Personal Wealth Operating System.

The current system architecture combines:

- finance and ledger services
- connected-finance ingestion
- canonical portfolio snapshots
- AI product workflows
- web and API product surfaces

Milestone 13 completed the AI Product Layer on top of the earlier snapshot-driven and connected-finance foundations.

---

## High-Level Layers

```text
Frontend (Next.js)
  |
  v
Backend API (NestJS)
  |
  v
Persistence (PostgreSQL + Prisma)
  |
  v
Shared Domain + AI Contracts (packages/core)
```

This is still a modular monolith, not a split-service system.

---

## Frontend Architecture

The web app is responsible for:

- navigation and product flow
- authenticated API consumption
- AI Insights productization
- developer validation via AI Workbench

Primary user-facing surfaces:

- Dashboard
- Portfolio
- Transactions
- AI Insights
- Settings

Developer-only validation surface:

- `/dev/ai-workbench`

The workbench remains useful, but it is intentionally separate from the main product path.

---

## Backend Modules

### Finance and Ledger Modules

Core operational modules include:

- auth
- accounts
- categories and subcategories
- transactions
- analytics
- import/export
- backup and restore

These modules remain the financial system of record for cashflow and user data.

### Connected Finance Module

Connected-finance modules handle:

- `ConnectedSource`
- `ConnectedSourceAccount`
- `ConnectedSyncRun`
- provider secret storage
- provider-specific connect and sync foundations
- manual-static valuation history

These flows materialize canonical snapshots rather than bypassing them.

### Portfolio Snapshot Module

`PortfolioSnapshot` remains the canonical upstream object for portfolio analysis.

This module is responsible for:

- snapshot create/list/get/delete
- snapshot ownership scoping
- lifecycle protection when downstream artifacts exist

### AI Report Module

The AI report module persists snapshot-linked report artifacts and now includes:

- ownership hardening through snapshot ownership
- historical read paths
- entitlement-aware create paths
- first-class preset report workflows

### Financial Health Score Module

The score module persists deterministic score artifacts and includes:

- ownership hardening through snapshot ownership
- historical read paths
- entitlement-aware generation paths

### Entitlements Module

The entitlement module provides:

- current-user entitlement reads
- reusable feature checks
- separation between read visibility and premium create/reply actions

This is intentionally lightweight and not a billing platform.

### AI Conversations Module

The conversation module provides:

- saved conversation persistence
- normalized conversation messages
- ownership-safe list/get/update/delete
- optional links to snapshots, reports, and scores

### AI Workflow Module

The `ai` module now exposes product workflows for:

- Quick Chat
- Monthly Financial Review
- Daily Market Brief
- Daily Market Brief delivery preferences

Quick Chat can use provider-backed execution or local fallback without changing the outer API contract.

---

## Shared Core Architecture

`packages/core` provides the shared contracts and application logic for:

- portfolio and snapshot types
- connected-finance domain contracts
- AI task and prompt contracts
- provider adapter interfaces
- routing abstractions
- prepared runs
- local repositories for workbench validation
- report and score artifact contracts

This keeps cross-app behavior aligned without splitting the system into services.

---

## AI Product Layer Architecture

### Snapshot-First Analysis

The most important invariant is preserved:

- `PortfolioSnapshot` is canonical upstream truth for portfolio analysis
- reports and scores are downstream persisted artifacts
- conversations may reference artifacts, but do not replace them

### Product Workflows

Current AI product workflows include:

- Monthly Financial Review
- Daily Market Brief
- Financial Health Score
- Quick Chat
- Save to Conversations

### Prompt and Provider Preparation

Preset tasks are formally defined in `packages/core/src/ai/tasks`.

The system currently supports:

- structured prompt packs
- provider-agnostic task routing
- manual prepared-run validation
- no-key development workflows

### Fallback Behavior

The system is designed to behave cleanly when a live provider is unavailable:

- AI Workbench uses prepared runs plus manual result submission
- Quick Chat falls back instead of throwing generic provider errors
- connected-finance product flows show guidance when provider config is missing

---

## Data Model Overview

Important entities now include:

- User
- Account
- Transaction
- Category
- Subcategory
- ConnectedSource
- ConnectedSourceAccount
- ConnectedSyncRun
- PortfolioSnapshot
- AIReportArtifact
- FinancialHealthScoreArtifact
- AIEntitlement
- AIConversation
- AIConversationMessage
- DailyMarketBriefPreference

Relationship highlights:

- snapshots belong to users
- reports and scores derive visibility from snapshot ownership
- conversations belong directly to users
- conversations may optionally link to snapshots, reports, and scores
- entitlements belong to users and gate premium actions

---

## Financial Intelligence Pipeline

```text
Ledger + Connected Finance Inputs
  |
  v
Canonical Snapshot + Analytics Context
  |
  v
Preset Task / Prompt Preparation
  |
  v
Provider Route / Manual Path / Fallback
  |
  v
Persisted Report / Persisted Score / Ephemeral Quick Chat / Saved Conversation
```

This is the core system-level view of the Milestone 13 AI Product Layer.

---

## Current Limitations

Some capabilities are intentionally not overbuilt yet:

- full scheduling execution for Daily Market Brief
- external delivery channel infrastructure
- conversation reply execution and streaming
- advanced memory/orchestration
- richer planning workflow backends

These limitations are compatible with the current architecture and do not require redesign.

---

## Summary

Aurum's current system architecture combines a stable financial data foundation with a productized AI layer.

The key architectural decisions remain:

- modular monolith
- snapshot-first portfolio analysis
- persisted downstream artifacts
- provider-agnostic AI foundations
- no-key/manual validation viability
- entitlement-aware premium actions

That makes the system ready for Milestone 14 experience refinement without revisiting Milestone 13 fundamentals.
