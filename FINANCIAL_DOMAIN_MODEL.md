# Aurum Financial Domain Model

## Overview

Aurum models a user's financial life using several core financial entities.

The system tracks:

- accounts
- assets
- transactions
- categories
- portfolio composition
- net worth

These entities form the foundation of Aurum's financial analytics and AI insights.

---

## Core Financial Entities

### User

Represents the owner of financial data.

A user can have:

- multiple accounts
- custom categories
- transactions
- AI insights
- portfolios

```text
User
|- Accounts
|- Transactions
|- Categories
\- AI Insights
```

---

## Accounts

Accounts represent containers of financial value.

Examples:

- bank checking account
- savings account
- brokerage account
- crypto wallet
- cash wallet

Ledger accounts store balances and transactions for the cash-flow system of record.

Attributes:

- account name
- account type
- currency
- balance
- institution

Future support:

- institution integration
- automatic balance sync
- transaction import

Connected-finance ingestion intentionally does not merge these ledger accounts with connected source accounts. Provider-backed portfolio sources are modeled separately and normalized into canonical snapshots.

---

## Transactions

Transactions represent financial events.

Examples:

- expense
- income
- transfer
- investment purchase
- asset sale

Transactions contain:

- account
- amount
- currency
- date
- merchant
- category
- subcategory
- note

Transactions are the primary data source for financial analytics.

---

## Transaction Types

Aurum currently supports:

- Expense
- Income
- Transfer

Future types may include:

- InvestmentBuy
- InvestmentSell
- Dividend
- Interest

This design allows Aurum to expand beyond simple expense tracking.

---

## Categories

Categories organize transactions into financial groups.

Examples:

- Transportation
- Dining
- Housing
- Utilities
- Shopping

Categories are user-customizable.

Each category belongs to a user.

---

## Subcategories

Subcategories provide finer classification of spending.

Example:

- Category: Transportation
- Subcategories:
  - Flight
  - Taxi
  - Train

Subcategories must belong to a category.

Relationship:

```text
Category
|
|-- Subcategory
|-- Subcategory
\-- Subcategory
```

Transactions reference both category and subcategory.

---

## Portfolio

Portfolio represents the user's assets across accounts.

Examples:

- brokerage holdings
- crypto assets
- bank balances

Portfolio analysis includes:

- asset allocation
- portfolio growth
- diversification

Portfolio data may come from:

- manual entry
- manual static sources
- connected provider integrations
- imported statements

### Connected Finance Foundation

Milestone 12 added a connected-finance ingestion layer around portfolio data.

Core entities:

- `ConnectedSource`
- `ConnectedSourceAccount`
- `ConnectedSyncRun`
- `PortfolioSnapshot`

Supported source kinds at the foundation level:

- manual static
- bank
- brokerage
- crypto

Normalization rule:

- provider or manual-static inputs are normalized into canonical `PortfolioSnapshot` records
- downstream AI reports and financial health scores consume snapshots rather than provider payloads directly

---

## Net Worth

Net worth represents total financial position.

Formula:

```text
Net Worth = Assets - Liabilities
```

Assets:

- cash
- investments
- crypto

Liabilities:

- credit cards
- loans
- mortgages

Net worth is one of the primary metrics displayed on the Dashboard.

---

## Financial Analytics

Financial analytics are computed from transactions and portfolio data.

Examples:

- Monthly income
- Monthly expenses
- Savings rate
- Spending categories
- Cash flow trends

Analytics feed into the Insight Engine.

---

## Multi-Currency Support

Future versions of Aurum will support multiple currencies.

Key requirements:

- currency tracking per account
- exchange rate conversion
- normalized reporting currency

Example:

```text
USD
EUR
JPY
BTC
```

A base reporting currency will be used for analytics.

---

## Transfers

Transfers represent movement between accounts.

Example:

Checking -> Brokerage

Transfers should not affect total net worth.

Instead they change asset distribution.

---

## Financial Data Flow

Financial data flows through the system as follows.

```text
Transactions --------------------\
                                  \
Connected Sources -> Snapshots ----> Financial Analytics and Snapshot Mappers
                                    |
                                    v
                               Insight Engine
                                    |
                                    v
                                 AI Insights
```

This structure allows Aurum to transform raw financial data into financial intelligence.

---

## Future Financial Features

The financial model is designed to support future capabilities.

Examples:

- Investment tracking
- Bank integrations
- Brokerage integrations
- Crypto integrations
- Automated transaction imports
- AI budgeting
- Financial goal planning

The domain model ensures these features can be added without major system redesign.

---

## Summary

Aurum models personal finance through several core entities:

- User
- Accounts
- Transactions
- Categories
- Subcategories
- Portfolio
- Net Worth

This domain model provides the foundation for:

- financial analytics
- AI insights
- long-term financial planning
