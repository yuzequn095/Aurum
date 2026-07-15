import {
  dailyMarketBriefV1TaskDefinition,
  healthScoreExplainerV1TaskDefinition,
  monthlyFinancialReviewV1TaskDefinition,
  portfolioAnalysisV1TaskDefinition,
  type PortfolioAIContextInput,
} from '@aurum/core';

describe('Milestone 16 shared prompt contracts', () => {
  const portfolioContext: PortfolioAIContextInput = {
    version: 'portfolio-ai-context-v1',
    diagnostics: null,
    changeExplanation: null,
    historySummary: {
      scope: 'consolidated',
      pointCount: 2,
      hasMore: false,
    },
    dataLimitations: ['Snapshot state does not establish causality.'],
  };

  it.each([
    monthlyFinancialReviewV1TaskDefinition.buildPromptPack({
      reviewYear: 2026,
      reviewMonth: 3,
      reviewMonthLabel: 'March 2026',
      portfolioName: 'Household',
      snapshotDate: '2026-03-24',
      snapshotSelectionStrategy: 'latest_available_snapshot',
      analyticsRangeStartDate: '2026-03-01',
      analyticsRangeEndDate: '2026-03-31',
      totalValue: 1000,
      positionsCount: 0,
      topSpendingCategories: [],
      topPositions: [],
      income: 100,
      expenses: 50,
      net: 50,
      portfolioContext,
    }),
    dailyMarketBriefV1TaskDefinition.buildPromptPack({
      briefDate: '2026-03-24',
      generatedAt: '2026-03-24T12:00:00.000Z',
      marketSessionLabel: 'intraday',
      reportScope: 'portfolio_aware',
      operatingMode: 'internal_portfolio_lens_v1',
      dataFreshnessNote: 'Portfolio snapshot only.',
      portfolioName: 'Household',
      snapshotDate: '2026-03-24',
      snapshotSelectionStrategy: 'latest_available_snapshot',
      totalValue: 1000,
      positionsCount: 0,
      topPositionWeightPercent: 0,
      topThreeWeightPercent: 0,
      watchlistSymbols: [],
      topHoldings: [],
      marketSignals: [],
      portfolioContext,
    }),
    portfolioAnalysisV1TaskDefinition.buildPromptPack({
      portfolioName: 'Household',
      snapshotDate: '2026-03-24',
      totalValue: 1000,
      positions: [],
      portfolioContext,
    }),
    healthScoreExplainerV1TaskDefinition.buildPromptPack({
      portfolioName: 'Household',
      snapshotDate: '2026-03-24',
      totalScore: 80,
      maxScore: 100,
      grade: 'STRONG',
      breakdown: [],
      portfolioContext,
    }),
  ])(
    'uses prompt/schema 1.1.0 and serializes structured portfolio context',
    (promptPack) => {
      expect(promptPack.promptVersion).toBe('1.1.0');
      expect(promptPack.schemaVersion).toBe('1.1.0');
      expect(promptPack.messages.at(-1)?.content).toContain(
        'structuredPortfolioContext',
      );
      expect(promptPack.messages.at(-1)?.content).toContain(
        'portfolio-ai-context-v1',
      );
    },
  );
});
