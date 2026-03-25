# Aurum AI Architecture

## Overview

Aurum's AI layer is now a shipped product layer built on top of the earlier snapshot-driven analysis foundation.

The current architecture is intentionally:

- snapshot-first for portfolio analysis
- artifact-oriented for persisted outputs
- provider-agnostic and model-agnostic
- usable with and without live model credentials

The AI system currently operates across four cooperating layers:

1. canonical financial inputs
2. prompt and task preparation
3. execution and fallback
4. persisted product outputs

```text
Connected Finance + Ledger Analytics
  |
  v
Canonical Snapshot + Structured Context
  |
  v
Task Definition + Prompt Pack
  |
  v
Provider Route / Manual Path / Fallback
  |
  v
Reports / Scores / Conversations / Quick Chat UI
```

---

## Canonical Inputs

### PortfolioSnapshot

`PortfolioSnapshot` remains the canonical upstream truth for portfolio analysis.

This invariant is preserved across:

- Monthly Financial Review
- Daily Market Brief
- Financial Health Score
- guided portfolio analysis entry points
- saved conversation context links

Reports and scores do not replace snapshots. They are downstream artifacts linked back to snapshots.

### Ledger Analytics

Monthly ledger analytics remain the canonical upstream truth for cashflow- and category-driven AI workflows, especially Monthly Financial Review and future planning flows.

---

## Task and Prompt Layer

`packages/core/src/ai` now provides the shared AI task layer.

Core building blocks:

- `AITaskType`
- `AITaskDefinition`
- `PromptPack`
- task registry
- provider adapter abstraction
- router abstraction
- prepared run application services

### Preset Task Coverage

Prompt packs now exist for these first-class preset tasks:

- `portfolio_report_v1`
- `monthly_financial_review_v1`
- `daily_market_brief_v1`
- `portfolio_analysis_v1`
- `health_score_explainer_v1`
- `budget_analysis_v1`

Each preset task definition includes:

- stable `taskType`
- explicit `promptVersion`
- title
- `buildPromptPack(input)`
- `summarizeInput(input)` when useful

### Prompt Pack Structure

Prompt packs are formal repository objects, not loose strings.

Each pack contains:

- system message
- user message
- expected output format
- explicit instructions
- metadata for traceability and history

This keeps preset tasks inspectable, testable, and evolvable without locking the system to one provider.

---

## Execution Layer

### Manual Provider Path

The default route still supports a manual, no-key validation path through `manual_chatgpt`.

That path allows developers to:

1. create a prepared run
2. inspect or copy the prompt pack
3. paste an external model result
4. continue downstream validation

This remains important because not every environment should require a live AI key.

### Provider-Agnostic Routing

Routing remains provider-agnostic and model-agnostic.

The system does not assume:

- OpenAI only
- ChatGPT only
- one model family only

Adapters can evolve later without changing the task definition surface.

### Quick Chat Fallback

Quick Chat is productized in the API layer and supports:

- provider-backed replies when configured
- graceful local fallback when a live provider is unavailable or fails

This preserves usability in local/dev scenarios and avoids generic internal errors.

---

## Persisted AI Outputs

### Reports

Reports persist as `AIReportArtifact` records linked to snapshots.

Current first-class report workflows:

- Monthly Financial Review
- Daily Market Brief

Historical report reads remain user-scoped and readable after entitlement loss.

### Financial Health Scores

Financial health assessments persist as `FinancialHealthScoreArtifact` records linked to snapshots.

This remains a deterministic analysis artifact rather than a free-form chat output.

### Conversations

Saved conversations persist separately as user-owned conversation and message records.

Important product rules:

- Quick Chat is ephemeral by default.
- Chats are only persisted when explicitly saved.
- Saved conversations can be listed, reopened, renamed, and deleted.
- Conversation persistence does not replace the snapshot-first artifact model.

---

## Entitlements and Access Control

The AI Product Layer now includes a lightweight server-enforced entitlement foundation.

This layer distinguishes between:

- historical read access
- premium create / refresh / save / reply actions

Current examples:

- historical reports stay readable after entitlement loss
- historical scores stay readable after entitlement loss
- historical conversations stay readable after entitlement loss
- new premium report creation can be blocked
- Quick Chat can be blocked
- conversation save and future reply flows can be blocked

Ownership remains separate from entitlement:

- ownership decides whether a user can see an artifact
- entitlement decides whether a user can create or continue premium actions

---

## AI Product Layer Surfaces

### AI Insights

`/ai-insights` is the main product-facing AI surface.

It is organized into:

- Reports
- Analysis
- Planning
- Conversations

Current productized workflows include:

- Monthly Financial Review
- Daily Market Brief
- Financial Health Score
- guided Portfolio Analysis entry
- Quick Chat
- Save to Conversations

### AI Workbench

`/dev/ai-workbench` remains the developer validation surface.

It is intentionally separate from product UI and is used for:

- prepared-run inspection
- prompt pack copying
- manual provider validation
- no-key workflow testing

---

## What Is Still Intentionally Incomplete

The current AI layer is strong enough for Milestone 13 closeout, but some work is intentionally deferred:

- richer prompt-pack iteration and tuning
- more structured portfolio analysis beyond the guided entry point
- full planning workflows for budget and goals
- full Daily Market Brief market-data expansion
- conversation reply execution
- streaming
- advanced memory or orchestration

These belong to later workflow/product refinement rather than a redesign of the architecture.

---

## Summary

Aurum's AI architecture is no longer just an experimental prompt layer.

It now combines:

- canonical financial inputs
- explicit preset task definitions
- structured prompt packs
- provider-agnostic execution foundations
- manual no-key validation paths
- persisted reports, scores, and conversations
- entitlement-aware product workflows

This gives Aurum a practical AI Product Layer while preserving the snapshot-first modular monolith architecture.
