import type { PortfolioSnapshot } from '@aurum/core';
import { PrismaService } from '../prisma/prisma.service';
import { LEGACY_SNAPSHOT_OWNER_USER_ID } from './legacy-snapshot-owner';
import { PortfolioSnapshotsService } from './portfolio-snapshots.service';

describe('PortfolioSnapshotsService', () => {
  it('preserves legacy snapshot creation defaults while storing lineage fields', async () => {
    let capturedCreateArgs:
      | {
          data: {
            userId: string;
            ingestionMode: string;
            positions: {
              create: Array<{
                assetKey: string;
                symbol?: string;
              }>;
            };
          };
          include: {
            positions: {
              orderBy: Array<Record<string, 'asc' | 'desc'>>;
            };
          };
        }
      | undefined;

    const prisma = {
      portfolioSnapshotRecord: {
        create: jest.fn().mockImplementation((args: unknown) => {
          capturedCreateArgs = args as typeof capturedCreateArgs;

          return Promise.resolve({
            id: 'snapshot_1',
            userId: LEGACY_SNAPSHOT_OWNER_USER_ID,
            sourceId: null,
            sourceSyncRunId: null,
            ingestionMode: 'CSV_IMPORT',
            normalizationVersion: null,
            sourceFingerprint: null,
            portfolioName: 'Retirement',
            sourceType: 'CSV_IMPORT',
            sourceLabel: 'Imported CSV',
            snapshotDate: new Date('2026-03-18T00:00:00.000Z'),
            valuationCurrency: 'USD',
            totalValue: 1200,
            cashValue: 200,
            createdAt: new Date('2026-03-18T00:00:00.000Z'),
            updatedAt: new Date('2026-03-18T00:00:00.000Z'),
            positions: [
              {
                id: 'position_1',
                snapshotId: 'snapshot_1',
                assetKey: 'symbol:AAPL',
                symbol: 'AAPL',
                name: 'Apple Inc.',
                quantity: 2,
                marketValue: 1000,
                portfolioWeight: null,
                costBasis: null,
                pnlPercent: null,
                category: 'EQUITY',
                sourceAccountId: null,
                notes: null,
              },
            ],
          });
        }),
      },
    };
    const service = new PortfolioSnapshotsService(
      prisma as unknown as PrismaService,
    );

    const snapshot: PortfolioSnapshot = await service.createSnapshot({
      metadata: {
        portfolioName: 'Retirement',
        sourceType: 'csv_import',
        sourceLabel: 'Imported CSV',
        snapshotDate: '2026-03-18',
      },
      totalValue: 1200,
      cashValue: 200,
      positions: [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          marketValue: 1000,
          quantity: 2,
          category: 'equity',
        },
      ],
    });

    expect(prisma.portfolioSnapshotRecord.create).toHaveBeenCalledTimes(1);
    expect(capturedCreateArgs?.data.userId).toBe(LEGACY_SNAPSHOT_OWNER_USER_ID);
    expect(capturedCreateArgs?.data.ingestionMode).toBe('CSV_IMPORT');
    expect(capturedCreateArgs?.data.positions.create[0]).toMatchObject({
      assetKey: 'symbol:AAPL',
      symbol: 'AAPL',
    });
    expect(capturedCreateArgs?.include.positions.orderBy).toEqual([
      { marketValue: 'desc' },
      { assetKey: 'asc' },
    ]);
    expect(snapshot).toMatchObject({
      id: 'snapshot_1',
      userId: LEGACY_SNAPSHOT_OWNER_USER_ID,
      metadata: {
        sourceType: 'csv_import',
        sourceLabel: 'Imported CSV',
        ingestionMode: 'CSV_IMPORT',
      },
      positions: [
        expect.objectContaining({
          assetKey: 'symbol:AAPL',
          symbol: 'AAPL',
        }),
      ],
    });
  });
});
