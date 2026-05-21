import type { PortfolioSnapshot } from '@aurum/core';
import { PrismaService } from '../prisma/prisma.service';
import { LEGACY_SNAPSHOT_OWNER_USER_ID } from './legacy-snapshot-owner';
import { PortfolioSnapshotsService } from './portfolio-snapshots.service';

describe('PortfolioSnapshotsService', () => {
  const baseSnapshotRecord = {
    id: 'snapshot_current',
    userId: 'user_1',
    sourceId: 'source_1',
    sourceSyncRunId: 'sync_1',
    ingestionMode: 'MANUAL_STATIC',
    normalizationVersion: 'manual-static-source-adapter@1.0.0',
    sourceFingerprint: 'fingerprint_current',
    portfolioName: 'Fidelity',
    sourceType: 'MANUAL',
    sourceLabel: 'Fidelity',
    snapshotDate: new Date('2026-03-20T00:00:00.000Z'),
    valuationCurrency: 'USD',
    totalValue: 2000,
    cashValue: 500,
    createdAt: new Date('2026-03-20T10:00:00.000Z'),
    updatedAt: new Date('2026-03-20T10:00:00.000Z'),
    positions: [
      {
        id: 'position_aapl_current',
        snapshotId: 'snapshot_current',
        assetKey: 'symbol:AAPL',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        quantity: 3,
        marketValue: 1500,
        portfolioWeight: null,
        costBasis: null,
        pnlPercent: null,
        category: 'EQUITY',
        sourceAccountId: 'account_shares',
        notes: null,
      },
      {
        id: 'position_cash_current',
        snapshotId: 'snapshot_current',
        assetKey: 'cash:USD',
        symbol: null,
        name: 'Cash',
        quantity: null,
        marketValue: 500,
        portfolioWeight: null,
        costBasis: null,
        pnlPercent: null,
        category: 'CASH',
        sourceAccountId: 'account_cash',
        notes: null,
      },
    ],
  } as const;

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

  it('returns no-baseline delta when there is no previous snapshot', async () => {
    const prisma = {
      portfolioSnapshotRecord: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ ...baseSnapshotRecord, sourceId: null })
          .mockResolvedValueOnce(null),
      },
      connectedSourceAccountRecord: {
        findMany: jest.fn(),
      },
    };
    const service = new PortfolioSnapshotsService(
      prisma as unknown as PrismaService,
    );

    const delta = await service.getSnapshotDelta(
      'snapshot_current',
      'previous',
      'user_1',
    );

    expect(delta).toMatchObject({
      baseSnapshotId: 'snapshot_current',
      baselineStatus: 'no_baseline',
      positionDeltas: [],
      accountDeltas: [],
    });
  });

  it('computes added, removed, increased, decreased, and account-level deltas', async () => {
    const previousSnapshot = {
      ...baseSnapshotRecord,
      id: 'snapshot_previous',
      totalValue: 1600,
      cashValue: 700,
      snapshotDate: new Date('2026-03-19T00:00:00.000Z'),
      createdAt: new Date('2026-03-19T10:00:00.000Z'),
      positions: [
        {
          ...baseSnapshotRecord.positions[0],
          id: 'position_aapl_previous',
          snapshotId: 'snapshot_previous',
          quantity: 2,
          marketValue: 1000,
        },
        {
          ...baseSnapshotRecord.positions[1],
          id: 'position_cash_previous',
          snapshotId: 'snapshot_previous',
          marketValue: 700,
        },
        {
          ...baseSnapshotRecord.positions[0],
          id: 'position_removed_previous',
          snapshotId: 'snapshot_previous',
          assetKey: 'symbol:MSFT',
          symbol: 'MSFT',
          name: 'Microsoft Corp.',
          quantity: 1,
          marketValue: 600,
        },
      ],
    };
    const currentSnapshot = {
      ...baseSnapshotRecord,
      positions: [
        ...baseSnapshotRecord.positions,
        {
          ...baseSnapshotRecord.positions[0],
          id: 'position_added_current',
          assetKey: 'symbol:NVDA',
          symbol: 'NVDA',
          name: 'NVIDIA Corp.',
          quantity: 1,
          marketValue: 300,
        },
      ],
    };
    const prisma = {
      portfolioSnapshotRecord: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(currentSnapshot)
          .mockResolvedValueOnce(previousSnapshot),
      },
      connectedSourceAccountRecord: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'account_shares',
            displayName: 'Shares',
          },
          {
            id: 'account_cash',
            displayName: 'Cash',
          },
        ]),
      },
    };
    const service = new PortfolioSnapshotsService(
      prisma as unknown as PrismaService,
    );

    const delta = await service.getSnapshotDelta(
      'snapshot_current',
      'previous',
      'user_1',
    );

    expect(delta).toMatchObject({
      baseSnapshotId: 'snapshot_current',
      compareSnapshotId: 'snapshot_previous',
      totalValueDelta: 400,
      cashValueDelta: -200,
      baselineStatus: 'available',
    });
    expect(delta?.positionDeltas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          assetKey: 'symbol:AAPL',
          marketValueDelta: 500,
          quantityDelta: 1,
          changeType: 'increased',
          sourceAccountName: 'Shares',
        }),
        expect.objectContaining({
          assetKey: 'cash:USD',
          marketValueDelta: -200,
          changeType: 'decreased',
          sourceAccountName: 'Cash',
        }),
        expect.objectContaining({
          assetKey: 'symbol:NVDA',
          marketValueDelta: 300,
          changeType: 'added',
        }),
        expect.objectContaining({
          assetKey: 'symbol:MSFT',
          marketValueDelta: -600,
          changeType: 'removed',
        }),
      ]),
    );
    expect(delta?.accountDeltas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceAccountId: 'account_shares',
          sourceAccountName: 'Shares',
          previousValue: 1600,
          currentValue: 1800,
          delta: 200,
        }),
        expect.objectContaining({
          sourceAccountId: 'account_cash',
          sourceAccountName: 'Cash',
          previousValue: 700,
          currentValue: 500,
          delta: -200,
        }),
      ]),
    );
  });

  it('returns snapshot lineage with account context', async () => {
    const prisma = {
      portfolioSnapshotRecord: {
        findFirst: jest.fn().mockResolvedValue({
          ...baseSnapshotRecord,
          source: {
            id: 'source_1',
            userId: 'user_1',
            kind: 'MANUAL_STATIC',
            providerKey: null,
            providerConnectionId: null,
            displayName: 'Fidelity',
            status: 'ACTIVE',
            institutionName: 'Fidelity',
            baseCurrency: 'USD',
            metadata: { institutionKey: 'fidelity' },
            lastSuccessfulSyncAt: new Date('2026-03-20T10:00:00.000Z'),
            createdAt: new Date('2026-03-18T00:00:00.000Z'),
            updatedAt: new Date('2026-03-20T10:00:00.000Z'),
          },
          sourceSyncRun: {
            id: 'sync_1',
            userId: 'user_1',
            sourceId: 'source_1',
            triggerType: 'MANUAL',
            status: 'SUCCEEDED',
            startedAt: new Date('2026-03-20T10:00:00.000Z'),
            finishedAt: new Date('2026-03-20T10:01:00.000Z'),
            errorCode: null,
            errorMessage: null,
            normalizationVersion: 'manual-static-source-adapter@1.0.0',
            rawPayloadRef: null,
            producedSnapshotId: 'snapshot_current',
            metadata: null,
            createdAt: new Date('2026-03-20T10:00:00.000Z'),
            updatedAt: new Date('2026-03-20T10:01:00.000Z'),
          },
        }),
      },
      connectedSourceAccountRecord: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'account_shares',
            sourceId: 'source_1',
            externalAccountId: null,
            displayName: 'Shares',
            officialName: null,
            accountType: 'Shares',
            currency: 'USD',
            assetType: 'EQUITY',
            assetSubType: 'brokerage_shares',
            institutionOrIssuer: 'Fidelity',
            maskLast4: null,
            isActive: true,
            metadata: null,
            createdAt: new Date('2026-03-18T00:00:00.000Z'),
            updatedAt: new Date('2026-03-18T00:00:00.000Z'),
          },
        ]),
      },
    };
    const service = new PortfolioSnapshotsService(
      prisma as unknown as PrismaService,
    );

    const lineage = await service.getSnapshotLineage(
      'snapshot_current',
      'user_1',
    );

    expect(lineage).toMatchObject({
      snapshot: {
        id: 'snapshot_current',
        metadata: {
          sourceId: 'source_1',
          sourceSyncRunId: 'sync_1',
          ingestionMode: 'MANUAL_STATIC',
        },
      },
      source: {
        id: 'source_1',
        metadata: {
          institutionKey: 'fidelity',
        },
      },
      sourceSyncRun: {
        id: 'sync_1',
        status: 'SUCCEEDED',
      },
    });
    expect(lineage?.accountsById.account_shares).toMatchObject({
      displayName: 'Shares',
    });
    expect(
      lineage?.positionsWithAccountContext.find(
        (position) => position.assetKey === 'symbol:AAPL',
      ),
    ).toMatchObject({
      sourceAccount: {
        displayName: 'Shares',
      },
    });
  });
});
