import type { PortfolioSnapshot } from '@aurum/core';
import { PortfolioAIContextService } from './portfolio-ai-context.service';

describe('PortfolioAIContextService', () => {
  const portfolioSnapshotsService = {
    getSnapshotById: jest.fn(),
    listSnapshots: jest.fn(),
    getSnapshotDiagnostics: jest.fn(),
    getSnapshotChangeExplanation: jest.fn(),
    getPortfolioHistory: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prefers a consolidated snapshot over a newer source-level snapshot', () => {
    const service = new PortfolioAIContextService(
      portfolioSnapshotsService as never,
    );
    const sourceSnapshot = {
      id: 'source_snapshot',
      metadata: { snapshotDate: '2026-03-24', sourceId: 'source_1' },
    } as PortfolioSnapshot;
    const consolidatedSnapshot = {
      id: 'consolidated_snapshot',
      metadata: { snapshotDate: '2026-03-23' },
    } as PortfolioSnapshot;

    expect(
      service.selectPreferredSnapshot([sourceSnapshot, consolidatedSnapshot]),
    ).toBe(consolidatedSnapshot);
  });

  it('assembles same-source history, diagnostics, explanation, and limitations', async () => {
    const service = new PortfolioAIContextService(
      portfolioSnapshotsService as never,
    );
    const snapshot: PortfolioSnapshot = {
      id: 'snapshot_1',
      metadata: {
        snapshotDate: '2026-03-24',
        sourceId: 'source_1',
      },
      totalValue: 1000,
      positions: [],
    };
    portfolioSnapshotsService.getSnapshotDiagnostics.mockResolvedValue({
      dataHealth: { status: 'stale' },
    });
    portfolioSnapshotsService.getSnapshotChangeExplanation.mockResolvedValue({
      version: 'portfolio-change-explanation-v1',
      baselineSnapshotId: 'snapshot_0',
      dataLimitations: ['Snapshot state does not establish causality.'],
    });
    portfolioSnapshotsService.getPortfolioHistory.mockResolvedValue({
      summary: { scope: 'source', pointCount: 2 },
    });

    const context = await service.assembleForSnapshot('user_1', snapshot);

    expect(portfolioSnapshotsService.getPortfolioHistory).toHaveBeenCalledWith(
      { scope: 'source', sourceId: 'source_1', limit: 24 },
      'user_1',
    );
    expect(context).toMatchObject({
      version: 'portfolio-ai-context-v1',
      historyScope: 'source',
      baselineSnapshotId: 'snapshot_0',
      historySummary: { pointCount: 2 },
    });
    expect(context.dataLimitations).toEqual(
      expect.arrayContaining([
        'Snapshot state does not establish causality.',
        'Portfolio diagnostics indicate that one or more sources are stale.',
      ]),
    );
  });
});
