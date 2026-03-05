# Aurum System Architecture

## Overview

Aurum is an **AI-driven Personal Wealth Operating System** designed to help users manage, understand, and optimize their financial lives.

The system integrates:

- financial transaction tracking
- multi-account portfolio monitoring
- financial analytics
- AI-powered insights and reports
- long-term financial planning

Aurum is designed with modular architecture so it can evolve from a **manual finance tracking system** into a **connected financial platform** with real-time financial integrations.

---

## High-Level Architecture

The system consists of three main layers:

1. Frontend Layer
2. Backend Services
3. AI Intelligence Layer

```text
Frontend (Web / Mobile)
  |
  v
Backend API Layer (NestJS)
  |
  v
Data Layer (PostgreSQL + Prisma)
  |
  v
AI Intelligence Layer
```

---

## Frontend Architecture

Current stack:

- Next.js
- TypeScript
- TailwindCSS

Frontend responsibilities:

- user interface
- page routing
- API integration
- visualization of financial data
- user interaction with AI

Primary application pages:

### Dashboard

Financial overview including:

- Net Worth
- Assets vs Liabilities
- Monthly income / expense
- Portfolio summary
- Financial health score
- AI brief

---

### Portfolio

Asset and account tracking.

Tracks:

- bank accounts
- brokerage accounts
- crypto wallets
- asset allocation

Future expansions:

- automatic account syncing
- investment performance analysis
- institution integrations

---

### Transactions

Financial ledger for income and expenses.

Features:

- transaction creation
- category & subcategory classification
- merchant tracking
- account association
- filtering and search
- CSV import/export

Transactions represent the **cash flow layer** of the system.

---

### AI Insights

The financial intelligence center.

Provides:

Reports
- monthly financial report
- quarterly financial review
- yearly financial report

Analysis
- spending breakdown
- trend analysis
- financial health score

Planning
- budgeting
- goal tracking

Conversations
- saved AI conversations

---

## Backend Architecture

Backend stack:

- NestJS
- Prisma ORM
- PostgreSQL

The backend is structured into modular services.

Core modules:

### Auth Module

Handles:

- user registration
- login
- refresh tokens
- authentication guards

Future support:

- OAuth providers
- social login

---

### Accounts Module

Represents financial accounts.

Examples:

- checking accounts
- savings accounts
- brokerage accounts
- crypto wallets

Accounts are the foundation of **portfolio tracking**.

---

### Transactions Module

Handles all transaction operations.

Responsibilities:

- create transactions
- update transactions
- list transactions
- transaction filtering
- account linkage
- category validation

Transactions are scoped per user.

---

### Categories & Subcategories

Transaction taxonomy.

Structure:

```text
Category
\- Subcategory
```

Example:

```text
Food
 \- Dining

Transportation
 \- Ride Sharing
```

Users can create custom categories.

---

### Analytics Module

Provides financial analysis APIs.

Examples:

- monthly summary
- category breakdown
- trend analysis
- net cash flow

Analytics APIs power both the Dashboard and AI Insights.

---

### Import / Export Module

Handles external data ingestion and export.

Features:

- CSV import
- CSV export
- transaction parsing
- validation
- idempotent import protection

---

### Backup Module

Provides user data backup and recovery.

Includes:

- full JSON backup
- restore CLI tools
- development recovery utilities

---

## AI System Architecture

Aurum uses a **two-layer AI architecture**.

### 1. Quick AI (Ephemeral Chat)

Accessible via the "+" quick action menu.

Characteristics:

- temporary
- not saved by default
- designed for quick financial questions

Examples:

"How much did I spend on travel this month?"

"What is my biggest spending category?"

Users can optionally **save the conversation**, which moves it to AI Insights.

Saved conversations are stored in:

AI Insights -> Conversations

---

### 2. Insight AI (Persistent AI)

Located in the AI Insights module.

These are structured AI sessions.

Examples:

- Monthly Financial Report
- Budget Analysis
- Financial Health Score
- Goal Tracking

These sessions act as **long-term AI financial advisors**.

---

## Data Model Overview

Core entities:

- User
- Accounts
- Transactions
- Categories
- Subcategories
- AI Conversations
- AI Reports

Relationships:

```text
User
|- Accounts
|- Transactions
|- Categories
|- Subcategories
\- AI Conversations
```

Transactions reference:

- accountId
- categoryId
- subcategoryId

---

## Financial Intelligence Pipeline

Financial insights are generated using a hybrid system.

### Step 1 - Data aggregation

Analytics service aggregates:

- monthly income
- monthly expenses
- category breakdown
- portfolio changes

### Step 2 - Rule-based analysis

Example triggers:

- spending spikes
- budget threshold violations
- unusual expense categories

### Step 3 - AI interpretation

AI models transform structured data into:

- natural language insights
- financial recommendations
- reports

---

## Future Architecture Expansion

Aurum is designed to evolve into a **connected financial ecosystem**.

### Phase 1 - Manual Finance Tracking (Current)

- manual transaction entry
- CSV import
- analytics
- AI insights

---

### Phase 2 - Connected Finance

Integrations with:

- banking APIs
- brokerage APIs
- crypto exchanges

Potential providers:

- Plaid
- Teller
- Snaptrade

---

### Phase 3 - Financial Execution Layer

Aurum becomes a **financial operating platform**.

Users will be able to:

- buy investment products
- manage digital assets
- perform transfers
- execute financial decisions

---

## Design Principles

The architecture follows several core principles:

### Modular Services

Each financial capability is isolated in its own module.

---

### User Data Isolation

All data is scoped by userId.

---

### Extensible AI Layer

AI is designed as an independent layer so it can evolve from simple prompts to complex financial agents.

---

### Future Financial Integrations

The architecture allows external financial APIs to be added without redesigning core services.

---

## Summary

Aurum combines:

- finance tracking
- asset management
- AI-driven insights
- long-term planning

into a unified **financial intelligence platform**.

The system is intentionally designed to evolve from a simple personal finance tracker into a **full financial operating system**.
