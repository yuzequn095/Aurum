import type { PortfolioSnapshot } from '@aurum/core';
import { MarketContextService } from './market-context.service';

describe('MarketContextService', () => {
  const snapshot: PortfolioSnapshot = {
    id: 'snapshot_1',
    metadata: {
      portfolioName: 'Household',
      snapshotDate: '2026-07-14',
    },
    totalValue: 1000,
    cashValue: 100,
    positions: [
      {
        assetKey: 'symbol:AAPL',
        symbol: 'AAPL',
        marketValue: 900,
        category: 'equity',
      },
    ],
  };

  it('uses the New York calendar date while preserving the exact generation timestamp', () => {
    const context = new MarketContextService().assembleContext({
      snapshot,
      scope: 'portfolio_aware',
      now: new Date('2026-07-15T00:30:00.000Z'),
    });

    expect(context).toMatchObject({
      briefDate: '2026-07-14',
      generatedAt: '2026-07-15T00:30:00.000Z',
      generationTimeZone: 'America/New_York',
    });
    expect(context).not.toHaveProperty('sessionLabel');
  });

  it('does not infer a market session on weekends without a market calendar', () => {
    const context = new MarketContextService().assembleContext({
      snapshot,
      scope: 'portfolio_aware',
      now: new Date('2026-07-18T16:00:00.000Z'),
    });

    expect(context.briefDate).toBe('2026-07-18');
    expect(context).not.toHaveProperty('sessionLabel');
  });
});
