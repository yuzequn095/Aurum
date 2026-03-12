import type {
  FinancialHealthScoreInput,
  PortfolioCsvImportInput,
  PortfolioReportInput,
} from '@aurum/core';

export const mockPortfolioReportInput: PortfolioReportInput = {
  portfolioName: 'Aurum Core Growth',
  snapshotDate: '2026-03-09',
  totalValue: 412860.73,
  cashValue: 36840.73,
  positions: [
    {
      symbol: 'VOO',
      name: 'Vanguard S&P 500 ETF',
      marketValue: 142400,
      portfolioWeight: 34.5,
      pnlPercent: 15.6,
    },
    {
      symbol: 'QQQ',
      name: 'Invesco QQQ Trust',
      marketValue: 116220,
      portfolioWeight: 28.1,
      pnlPercent: 19.4,
    },
    {
      symbol: 'MSFT',
      name: 'Microsoft Corp.',
      marketValue: 54990,
      portfolioWeight: 13.3,
      pnlPercent: 12.1,
    },
    {
      symbol: 'BRK.B',
      name: 'Berkshire Hathaway',
      marketValue: 62410,
      portfolioWeight: 15.1,
      pnlPercent: 7.2,
    },
  ],
  userContext: {
    goal: 'Long-term growth with moderate volatility tolerance',
    riskPreference: 'Moderate',
    concerns: ['Large-cap concentration', 'Deploying excess cash'],
  },
};

export const mockPortfolioReportManualOutput = `## Overall assessment
The portfolio is growth-oriented with strong large-cap quality exposure and a healthy cash buffer. Current positioning supports long-term appreciation, but concentration in broad U.S. equity beta is notable.

## Key strengths
- Core exposure is anchored by diversified index ETFs with durable long-term return characteristics.
- Position quality is high, with meaningful allocations to profitable, large-cap businesses.
- Cash allocation provides optionality for staged deployment during market pullbacks.

## Key risks
- Portfolio sensitivity to U.S. mega-cap drawdowns remains elevated.
- Correlation across top holdings may reduce diversification benefits during risk-off periods.
- A prolonged rally could create opportunity cost if cash is not deployed gradually.

## Concentration observations
- The top two ETF positions account for a majority of invested assets.
- Equity style bias leans toward growth and technology-linked earnings.
- Consider whether this concentration aligns with downside tolerance.

## Suggested next actions
1. Define a cash deployment schedule over the next 8-12 weeks.
2. Add one diversifying sleeve (international or defensive value exposure).
3. Re-check target weights monthly and rebalance if concentration thresholds are exceeded.`;

export const mockFinancialHealthScoreInput: FinancialHealthScoreInput = {
  snapshotDate: '2026-03-09',
  totalAssets: 412860.73,
  cashValue: 36840.73,
  positions: [
    {
      symbol: 'VOO',
      marketValue: 142400,
      category: 'broad_market_equity',
    },
    {
      symbol: 'QQQ',
      marketValue: 116220,
      category: 'growth_equity',
    },
    {
      symbol: 'MSFT',
      marketValue: 54990,
      category: 'technology_equity',
    },
    {
      symbol: 'BRK.B',
      marketValue: 62410,
      category: 'value_equity',
    },
  ],
};

export const mockPortfolioCsvImportInput: PortfolioCsvImportInput = {
  portfolioName: 'Aurum Core Growth',
  sourceLabel: 'Demo CSV Portfolio Export',
  snapshotDate: '2026-03-09',
  valuationCurrency: 'USD',
  cashValue: 36840.73,
  rows: [
    {
      symbol: 'VOO',
      name: 'Vanguard S&P 500 ETF',
      quantity: 270.1,
      marketValue: 142400,
      portfolioWeight: 34.5,
      category: 'etf',
    },
    {
      symbol: 'QQQ',
      name: 'Invesco QQQ Trust',
      quantity: 236.4,
      marketValue: 116220,
      portfolioWeight: 28.1,
      category: 'etf',
    },
    {
      symbol: 'MSFT',
      name: 'Microsoft Corp.',
      quantity: 143.5,
      marketValue: 54990,
      portfolioWeight: 13.3,
      category: 'equity',
    },
    {
      symbol: 'BRK.B',
      name: 'Berkshire Hathaway',
      quantity: 132.8,
      marketValue: 62410,
      portfolioWeight: 15.1,
      category: 'equity',
    },
  ],
};
