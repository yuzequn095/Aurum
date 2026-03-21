# Aurum Product Architecture

## Overview

Aurum is an **AI-driven Personal Wealth Operating System** designed to help users manage their financial life through a unified platform.

The product integrates:

- financial tracking
- asset portfolio monitoring
- financial analytics
- AI-powered financial insights
- long-term financial planning

Aurum is not only a bookkeeping tool, but a **financial intelligence platform** that helps users understand and optimize their financial decisions.

---

## Core Product Philosophy

Aurum is built around three fundamental financial layers:

1. **Cash Flow Layer**
2. **Asset Layer**
3. **Intelligence Layer**

```text
Assets (Portfolio)
  |
  v
Cash Flow (Transactions)
  |
  v
Financial Intelligence (AI Insights)
```

The Dashboard sits on top of these layers to provide a unified overview.

---

## Information Architecture

The Aurum product is organized into four primary modules.

### Dashboard

High-level financial overview.

Purpose:
Provide a quick understanding of the user's financial status.

Main elements:

- Net Worth
- Assets vs Liabilities
- Monthly Income
- Monthly Expenses
- Portfolio summary
- Financial Health Score
- AI Brief

The dashboard acts as the **financial command center**.

---

### Portfolio

Tracks user assets across accounts and institutions.

Supported assets:

- bank accounts
- brokerage accounts
- crypto wallets
- investment portfolios
- manual static accounts

Features:

- account list
- asset allocation
- institution breakdown
- portfolio value tracking
- manual static valuation history
- connected-finance source and sync foundations

Current foundation:

- manual static account creation and valuation materialization
- connected source flows for bank, brokerage, and crypto ingestion foundations
- snapshot-driven portfolio analysis across multiple upstream source types

Future capabilities:

- investment performance analytics
- portfolio risk analysis
- broader production hardening for provider flows

Portfolio represents the **asset layer** of Aurum.

---

### Transactions

Represents the user's financial ledger.

Tracks:

- income
- expenses
- merchants
- categories
- subcategories
- account associations

Features:

- transaction creation
- filtering and search
- category taxonomy
- CSV import/export
- transaction editing

Transactions represent the **cash flow layer** of the system.

---

### AI Insights

The AI-driven financial intelligence center.

This module transforms financial data into actionable insights.

It contains four functional sections:

Reports
- Monthly Financial Report
- Quarterly Review
- Yearly Summary

Analysis
- Spending breakdown
- Financial health score
- Trend analysis

Planning
- Budget tracking
- Financial goals
- long-term financial planning

Conversations
- saved AI chats

AI Insights represents the **intelligence layer** of Aurum.

---

## AI Interaction Model

Aurum supports two types of AI interaction.

### Quick AI (Ephemeral Chat)

Accessible from the quick action menu.

Purpose:
Allow users to quickly ask financial questions.

Examples:

- "How much did I spend on dining this month?"
- "What was my largest expense last quarter?"

Characteristics:

- temporary session
- not saved by default
- optional user save

If saved, the conversation is stored under:

AI Insights -> Conversations

Saved conversations can be renamed or deleted.

---

### Persistent AI Conversations

Located inside the AI Insights module.

These conversations are structured and persistent.

Examples:

- Monthly Report
- Budget Analysis
- Financial Health Score
- Goal Tracking

These act as **AI financial advisors** that help users monitor long-term financial patterns.

---

## AI Insights Organization

AI Insights uses **functional classification**.

Structure:

```text
Reports
  Monthly
  Quarterly
  Yearly

Analysis
  Spending Breakdown
  Financial Health Score
  Portfolio Analysis

Planning
  Budget
  Financial Goals

Conversations
  Saved user chats
```

Saved chats are ordered by most recent activity.

Default chat names use timestamps:

YYYY-MM-DD

Users may rename conversations later.

---

## Mobile Product Architecture

Mobile navigation prioritizes quick financial interactions.

Main tabs:

- Home
- Portfolio
- Transactions
- AI Insights

Center action button opens a command menu.

```text
|- Add Transaction
|- Ask AI
|- Quick Chart
\- Quick Analysis
```

Purpose:

Allow users to perform common actions quickly without navigating across multiple screens.

---

## Web Product Architecture

Desktop layout uses a sidebar navigation.

Navigation items:

- Dashboard
- Portfolio
- Transactions
- AI Insights
- Settings

This layout prioritizes data visualization and financial analysis.

---

## Financial Health Score

Aurum introduces a **Financial Health Score** as a key product metric.

The score evaluates financial stability using factors such as:

- savings rate
- spending balance
- asset diversification
- debt ratio
- income stability

The score provides users with a simple representation of financial wellbeing.

---

## Future Product Capabilities

Aurum is designed to evolve through multiple stages.

### Phase 1 - Finance Tracking

- manual transactions
- portfolio tracking
- AI insights

---

### Phase 2 - Connected Finance Foundation

Integrations with external financial services.

Examples:

- banking APIs
- brokerage APIs
- crypto exchanges

Foundation scope now implemented:

- provider connection flows
- source/account modeling
- sync runs
- snapshot materialization

Production breadth and deeper automation remain future work.

---

### Phase 3 - Financial Operating System

Aurum becomes a platform where users can execute financial decisions.

Potential capabilities:

- investment purchasing
- digital wallet
- transfers
- financial product integrations

---

## Product Design Principles

Aurum follows several design principles.

### Financial Clarity

Financial data must be understandable at a glance.

---

### AI-Augmented Decisions

AI should assist decision making rather than replace user control.

---

### Progressive Complexity

Users can start with simple tracking and gradually access more advanced tools.

---

### Unified Financial Platform

Aurum aims to unify financial tracking, analysis, and planning within a single system.

---

## Summary

Aurum is designed as a **financial intelligence platform** that integrates:

- personal finance tracking
- portfolio monitoring
- AI financial analysis
- financial planning tools

into a single cohesive product.

The architecture ensures Aurum can evolve from a simple financial tracker into a **complete financial operating system**.
