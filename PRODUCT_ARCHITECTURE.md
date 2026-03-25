# Aurum Product Architecture

## Overview

Aurum is an AI-driven Personal Wealth Operating System that combines:

- cashflow tracking
- portfolio monitoring
- analytics
- AI-driven interpretation
- planning foundations

The current product architecture keeps AI productized, but not conversation-first. Portfolio and financial analysis still anchor to canonical data models rather than drifting into an unstructured chat product.

---

## Core Product Philosophy

Aurum is built around three financial layers:

1. Cash Flow Layer
2. Asset Layer
3. Intelligence Layer

```text
Assets and Portfolio State
  |
  v
Cash Flow and Ledger History
  |
  v
AI Insights and Planning
```

The Dashboard sits above these layers as the summary surface.

---

## Product Modules

### Dashboard

The financial command center for:

- net worth
- assets vs liabilities
- monthly income and expense
- portfolio summary
- Financial Health Score visibility

### Portfolio

The asset layer, built around:

- connected-finance sources
- manual-static sources
- source accounts and sync runs
- canonical snapshots

Portfolio is not just a holdings table. It is the upstream context provider for downstream analysis.

### Transactions

The ledger layer for:

- income and expense capture
- taxonomy and categorization
- filtering and import/export
- analytics-ready cashflow history

### AI Insights

The productized intelligence layer.

AI Insights is functionally organized into:

- Reports
- Analysis
- Planning
- Conversations

This classification is now reflected directly in the shipped web surface.

---

## AI Insights Information Architecture

### Reports

Current first-class report entries:

- Monthly Financial Review
- Daily Market Brief

Report rules:

- reports are system-provided workflows, not free-form user-authored templates
- reports persist as snapshot-linked artifacts
- report history remains readable after entitlement loss

### Analysis

Current first-class analysis entries:

- Financial Health Score
- Portfolio Analysis entry

Analysis rules:

- analysis remains grounded in canonical snapshots
- Financial Health Score remains a persisted downstream artifact
- portfolio analysis can use conversational entry points without changing the snapshot-first model

### Planning

Current Planning is intentionally lightweight.

The product surface already reserves stable slots for:

- Budget
- Goals

This keeps future workflow additions straightforward without requiring another IA rewrite.

### Conversations

Conversation rules are explicit:

- Quick Chat is ephemeral by default
- Quick Chat is not auto-saved
- Save is explicit
- saved chats live under AI Insights -> Conversations
- saved chats can be reopened, renamed, and deleted

Conversations are a product surface, not the canonical analysis source of truth.

---

## AI Interaction Model

### Quick Chat

Quick Chat is the lightweight interaction layer for fast contextual questions.

Current behavior:

- protected by entitlement
- grounded by optional snapshot/report/score context
- ephemeral by default
- usable even without a live provider because fallback exists
- explicitly savable into Conversations

### Saved Conversations

Saved conversations are persistent transcripts for later reference.

They are mainly entered through:

Quick Chat -> Save -> Conversations

This keeps product behavior simple and prevents the app from drifting into a generic chat-first system.

---

## Template and Preset Strategy

Milestone 13 uses system-owned preset tasks rather than custom end-user prompt authoring.

Current preset coverage includes:

- Monthly Financial Review
- Daily Market Brief
- Portfolio Analysis
- Financial Health Score Explainer
- Budget Analysis

This strategy keeps:

- output structure stable
- testing practical
- future prompt improvement straightforward

---

## Subscription and Access Model

The AI product layer now distinguishes between:

- historical reads
- premium creation and continuation actions

Current rules:

- historical reports remain readable after subscription loss
- historical scores remain readable after subscription loss
- historical saved conversations remain readable after subscription loss
- premium create, save, and future reply actions can be blocked by entitlement

This provides product clarity without requiring billing integration yet.

---

## Web Product Direction

The current web product direction is pragmatic:

- AI Insights is the main user-facing AI surface
- AI Workbench stays developer-facing
- Monthly Financial Review and Daily Market Brief are first-class report actions
- Financial Health Score is a first-class analysis workflow
- Portfolio Analysis has a clear entry point now, even if richer structured output evolves later

This keeps the shipped product coherent while leaving room for Milestone 14 experience refinement.

---

## What Remains Ahead

The following are intentionally not overbuilt yet:

- richer planning workflows
- Daily Market Brief market-data expansion
- full conversation reply execution and streaming
- custom workflow/template authoring
- deeper mobile-first productization

These are product refinements, not missing architectural foundations.

---

## Summary

Aurum's current product architecture treats AI as a structured intelligence surface rather than a generic assistant shell.

The key product decisions are:

- keep snapshots canonical
- keep reports and scores persisted
- keep Quick Chat ephemeral by default
- keep Save explicit
- keep AI Insights functionally organized
- keep providers and models replaceable

That gives Aurum a stable product foundation for richer Milestone 14 experience work.
