import type {
  BudgetAnalysisInput,
  DailyMarketBriefInput,
  FinancialHealthScoreInput,
  HealthScoreExplainerInput,
  MonthlyFinancialReviewInput,
  PortfolioAnalysisInput,
  PortfolioCsvImportInput,
  PortfolioReportInput,
  AITaskType,
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
The portfolio remains fundamentally strong and growth-oriented, with quality large-cap exposure and enough cash to stay flexible. The main tradeoff is meaningful concentration in U.S. equity beta, especially technology-linked exposure.

## Key strengths
- Core allocations are built around durable, liquid holdings.
- Cash reserves provide optionality without forcing immediate risk-taking.
- Current winners still align with a long-term growth mandate.

## Key risks
- The top holdings are correlated enough to amplify drawdowns in a growth-led selloff.
- Cash drag could rise if deployment discipline does not improve.
- Diversification outside U.S. large-cap growth remains limited.

## Concentration observations
- The top ETF sleeves dominate portfolio behavior.
- Technology and U.S. growth remain the clearest implicit factor bet.
- Berkshire softens the style mix, but it does not fully offset index concentration.

## Suggested next actions
1. Define a staged cash deployment plan before the next volatility spike.
2. Add one diversifying sleeve outside core U.S. growth exposure.
3. Revisit concentration thresholds and rebalance triggers monthly.`;

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

export const mockMonthlyFinancialReviewInput: MonthlyFinancialReviewInput = {
  reviewYear: 2026,
  reviewMonth: 2,
  reviewMonthLabel: 'February 2026',
  portfolioName: 'Aurum Core Growth',
  snapshotDate: '2026-02-28',
  snapshotSelectionStrategy: 'latest_snapshot_on_or_before_month_end',
  analyticsRangeStartDate: '2026-02-01',
  analyticsRangeEndDate: '2026-02-28',
  totalValue: 404120.18,
  cashValue: 35240.18,
  positionsCount: 4,
  income: 18250,
  expenses: 9730,
  net: 8520,
  netChangePercent: 4.6,
  topSpendingCategories: [
    { categoryName: 'Housing', expense: 3200 },
    { categoryName: 'Travel', expense: 1850 },
    { categoryName: 'Dining', expense: 910 },
  ],
  topPositions: [
    { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', marketValue: 139800 },
    { symbol: 'QQQ', name: 'Invesco QQQ Trust', marketValue: 113640 },
    { symbol: 'BRK.B', name: 'Berkshire Hathaway', marketValue: 60210 },
  ],
  latestHealthScore: {
    totalScore: 78,
    maxScore: 100,
    grade: 'good',
    headline: 'Healthy core foundation with manageable concentration risk.',
    summary:
      'Liquidity and balance remain solid, but the portfolio would benefit from modest diversification and a clearer cash deployment plan.',
  },
  notableInsights: [
    {
      title: 'Travel spend spiked',
      severity: 'warn',
      body: 'Travel was the largest variable expense driver this month, but overall savings still held up.',
    },
    {
      title: 'Cashflow remained positive',
      severity: 'info',
      body: 'Net cashflow stayed positive even with elevated discretionary expenses.',
    },
  ],
};

export const mockDailyMarketBriefInput: DailyMarketBriefInput = {
  briefDate: '2026-03-24',
  generatedAt: '2026-03-24T15:30:00.000Z',
  marketSessionLabel: 'pre_market',
  reportScope: 'portfolio_aware',
  operatingMode: 'internal_market_template_v1',
  dataFreshnessNote:
    'This is a workflow validation brief using internal heuristics and snapshot context rather than live market feeds.',
  portfolioName: 'Aurum Core Growth',
  snapshotDate: '2026-03-24',
  snapshotSelectionStrategy: 'latest_available_snapshot',
  totalValue: 412860.73,
  cashValue: 36840.73,
  positionsCount: 4,
  topPositionWeightPercent: 34.5,
  topThreeWeightPercent: 75.9,
  watchlistSymbols: ['VOO', 'QQQ', 'MSFT'],
  topHoldings: [
    {
      symbol: 'VOO',
      name: 'Vanguard S&P 500 ETF',
      marketValue: 142400,
      weightPercent: 34.5,
    },
    {
      symbol: 'QQQ',
      name: 'Invesco QQQ Trust',
      marketValue: 116220,
      weightPercent: 28.1,
    },
  ],
  marketSignals: [
    {
      title: 'Concentration watch',
      severity: 'warn',
      summary:
        'The portfolio remains anchored to U.S. growth leadership, so index-heavy weakness would likely show up quickly.',
    },
    {
      title: 'Cash optionality',
      severity: 'info',
      summary:
        'Current cash reserves still provide flexibility if a pullback creates a better entry window.',
    },
  ],
};

export const mockPortfolioAnalysisInput: PortfolioAnalysisInput = {
  portfolioName: 'Aurum Core Growth',
  snapshotDate: '2026-03-24',
  totalValue: 412860.73,
  cashValue: 36840.73,
  positions: [
    {
      symbol: 'VOO',
      name: 'Vanguard S&P 500 ETF',
      category: 'core_equity',
      marketValue: 142400,
      portfolioWeight: 34.5,
      pnlPercent: 15.6,
    },
    {
      symbol: 'QQQ',
      name: 'Invesco QQQ Trust',
      category: 'growth_equity',
      marketValue: 116220,
      portfolioWeight: 28.1,
      pnlPercent: 19.4,
    },
    {
      symbol: 'MSFT',
      name: 'Microsoft Corp.',
      category: 'technology_equity',
      marketValue: 54990,
      portfolioWeight: 13.3,
      pnlPercent: 12.1,
    },
    {
      symbol: 'BRK.B',
      name: 'Berkshire Hathaway',
      category: 'value_equity',
      marketValue: 62410,
      portfolioWeight: 15.1,
      pnlPercent: 7.2,
    },
  ],
  investorProfile: {
    goal: 'Long-term wealth growth with moderate volatility tolerance',
    riskPreference: 'Moderate',
    concerns: ['Growth concentration', 'How to deploy excess cash'],
  },
};

export const mockHealthScoreExplainerInput: HealthScoreExplainerInput = {
  portfolioName: 'Aurum Core Growth',
  snapshotDate: '2026-03-24',
  totalScore: 78,
  maxScore: 100,
  grade: 'good',
  headline: 'Healthy core foundation with manageable concentration risk.',
  summary:
    'Liquidity and portfolio balance are solid, but concentration risk still prevents the portfolio from reaching an excellent grade.',
  breakdown: [
    {
      dimension: 'liquidity',
      score: 22,
      maxScore: 25,
      label: 'Strong liquidity',
      reason: 'Cash reserves cover short-term flexibility without dominating the portfolio.',
    },
    {
      dimension: 'diversification',
      score: 18,
      maxScore: 25,
      label: 'Moderate diversification',
      reason: 'The portfolio contains several quality holdings, but factor exposure is still narrow.',
    },
    {
      dimension: 'concentration_risk',
      score: 16,
      maxScore: 25,
      label: 'Elevated concentration',
      reason: 'Top holdings and correlated ETF exposure drive a large share of total portfolio behavior.',
    },
    {
      dimension: 'portfolio_balance',
      score: 22,
      maxScore: 25,
      label: 'Balanced posture',
      reason: 'Cash, core equity, and quality holdings create a stable overall structure.',
    },
  ],
};

export const mockBudgetAnalysisInput: BudgetAnalysisInput = {
  periodLabel: 'March 2026',
  monthlyIncome: 18250,
  essentialExpenses: 6840,
  discretionaryExpenses: 2890,
  savingsAmount: 8520,
  targetSavingsRate: 0.28,
  topExpenseCategories: [
    { categoryName: 'Housing', amount: 3200 },
    { categoryName: 'Travel', amount: 1850 },
    { categoryName: 'Dining', amount: 910 },
  ],
  planningGoals: ['Maintain a 25%+ savings rate', 'Free up cash for taxable investing'],
  pressurePoints: ['Travel overspend', 'Dining drift during busy work weeks'],
};

export const AI_WORKBENCH_SCENARIOS: Array<{
  taskType: AITaskType;
  title: string;
  description: string;
  payload: Record<string, unknown>;
  manualOutputExample?: string;
  reportCapable: boolean;
}> = [
  {
    taskType: 'portfolio_report_v1',
    title: 'Portfolio Report',
    description: 'Baseline snapshot report from the Milestone 11 manual workflow.',
    payload: mockPortfolioReportInput as unknown as Record<string, unknown>,
    manualOutputExample: mockPortfolioReportManualOutput,
    reportCapable: true,
  },
  {
    taskType: 'monthly_financial_review_v1',
    title: 'Monthly Financial Review',
    description: 'Preset report task that combines monthly analytics with snapshot context.',
    payload: mockMonthlyFinancialReviewInput as unknown as Record<string, unknown>,
    reportCapable: true,
  },
  {
    taskType: 'daily_market_brief_v1',
    title: 'Daily Market Brief',
    description: 'Preset report task for a compact system-generated daily market read.',
    payload: mockDailyMarketBriefInput as unknown as Record<string, unknown>,
    reportCapable: true,
  },
  {
    taskType: 'portfolio_analysis_v1',
    title: 'Portfolio Analysis',
    description: 'First-class analysis task focused on portfolio strengths, risks, and concentration.',
    payload: mockPortfolioAnalysisInput as unknown as Record<string, unknown>,
    reportCapable: false,
  },
  {
    taskType: 'health_score_explainer_v1',
    title: 'Health Score Explainer',
    description: 'Analysis task that turns a score artifact into an explainable markdown narrative.',
    payload: mockHealthScoreExplainerInput as unknown as Record<string, unknown>,
    reportCapable: false,
  },
  {
    taskType: 'budget_analysis_v1',
    title: 'Budget Analysis',
    description: 'Secondary planning task for budgeting guidance without requiring live model APIs.',
    payload: mockBudgetAnalysisInput as unknown as Record<string, unknown>,
    reportCapable: false,
  },
];
