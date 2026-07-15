import type { PortfolioSnapshot } from '@aurum/core';
import { PrismaService } from '../prisma/prisma.service';
import { LEGACY_SNAPSHOT_OWNER_USER_ID } from './legacy-snapshot-owner';
import { PortfolioSnapshotsService } from './portfolio-snapshots.service';

describe('PortfolioSnapshotsService', () => {
  type SnapshotFindFirstArgs = {
    where?: {
      sourceId?: string | null;
    };
  };

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

  it('rejects snapshot lineage references owned by another user', async () => {
    const prisma = {
      connectedSourceRecord: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      connectedSyncRunRecord: {
        findFirst: jest.fn(),
      },
      connectedSourceAccountRecord: {
        findMany: jest.fn(),
      },
      portfolioSnapshotRecord: {
        create: jest.fn(),
      },
    };
    const service = new PortfolioSnapshotsService(
      prisma as unknown as PrismaService,
    );

    await expect(
      service.createSnapshot(
        {
          metadata: {
            snapshotDate: '2026-03-18',
            sourceId: 'foreign_source',
          },
          totalValue: 100,
          positions: [],
        },
        'user_1',
      ),
    ).rejects.toThrow('Snapshot source must belong to the authenticated user.');
    expect(prisma.portfolioSnapshotRecord.create).not.toHaveBeenCalled();
  });

  it('rejects foreign accounts and mixed-source accounts for source-level snapshots', async () => {
    const prisma = {
      connectedSourceRecord: {
        findFirst: jest.fn().mockResolvedValue({ id: 'source_1' }),
      },
      connectedSyncRunRecord: {
        findFirst: jest.fn(),
      },
      connectedSourceAccountRecord: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([{ id: 'account_1', sourceId: 'source_1' }])
          .mockResolvedValueOnce([
            { id: 'account_1', sourceId: 'source_1' },
            { id: 'account_2', sourceId: 'source_2' },
          ]),
      },
      portfolioSnapshotRecord: {
        create: jest.fn(),
      },
    };
    const service = new PortfolioSnapshotsService(
      prisma as unknown as PrismaService,
    );
    const buildSnapshot = (accountIds: string[]): PortfolioSnapshot => ({
      metadata: {
        snapshotDate: '2026-03-18',
        sourceId: 'source_1',
      },
      totalValue: accountIds.length * 100,
      positions: accountIds.map((sourceAccountId, index) => ({
        assetKey: `asset_${index}`,
        marketValue: 100,
        sourceAccountId,
      })),
    });

    await expect(
      service.createSnapshot(
        buildSnapshot(['account_1', 'foreign_account']),
        'user_1',
      ),
    ).rejects.toThrow(
      'Every snapshot account must belong to the authenticated user.',
    );
    await expect(
      service.createSnapshot(
        buildSnapshot(['account_1', 'account_2']),
        'user_1',
      ),
    ).rejects.toThrow(
      'A source-level snapshot may only reference accounts from its source.',
    );
    expect(prisma.portfolioSnapshotRecord.create).not.toHaveBeenCalled();
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

  it('builds consolidated history without mixing in source snapshots', async () => {
    const previousSnapshot = {
      ...baseSnapshotRecord,
      id: 'snapshot_consolidated_previous',
      sourceId: null,
      totalValue: 1500,
      snapshotDate: new Date('2026-03-19T00:00:00.000Z'),
      createdAt: new Date('2026-03-19T10:00:00.000Z'),
    };
    const currentSnapshot = {
      ...baseSnapshotRecord,
      id: 'snapshot_consolidated_current',
      sourceId: null,
      totalValue: 2000,
    };
    let capturedFindManyArgs:
      | {
          where: { sourceId: string | null; userId: string };
          take: number;
        }
      | undefined;
    const prisma = {
      portfolioSnapshotRecord: {
        findMany: jest
          .fn()
          .mockImplementation((args: typeof capturedFindManyArgs) => {
            capturedFindManyArgs = args;
            return Promise.resolve([currentSnapshot, previousSnapshot]);
          }),
      },
      connectedSourceAccountRecord: {
        findFirst: jest.fn(),
      },
    };
    const service = new PortfolioSnapshotsService(
      prisma as unknown as PrismaService,
    );

    const history = await service.getPortfolioHistory(
      { scope: 'consolidated' },
      'user_1',
    );

    expect(capturedFindManyArgs?.where).toMatchObject({
      sourceId: null,
      userId: 'user_1',
    });
    expect(capturedFindManyArgs?.take).toBe(25);
    expect(
      prisma.connectedSourceAccountRecord.findFirst,
    ).not.toHaveBeenCalled();
    expect(history).toMatchObject({
      scope: 'consolidated',
      points: [
        {
          snapshotId: 'snapshot_consolidated_current',
          chronologicalIndex: 1,
          value: 2000,
          deltaFromPrevious: 500,
          percentDeltaFromPrevious: 500 / 1500,
        },
        {
          snapshotId: 'snapshot_consolidated_previous',
          chronologicalIndex: 0,
          value: 1500,
        },
      ],
      summary: {
        pointCount: 2,
        latestValue: 2000,
        previousValue: 1500,
        deltaFromPrevious: 500,
      },
    });
  });

  it('keeps account history within the account source and calculates scoped values', async () => {
    const currentSnapshot = {
      ...baseSnapshotRecord,
      positions: [baseSnapshotRecord.positions[0]],
    };
    const previousSnapshot = {
      ...baseSnapshotRecord,
      id: 'snapshot_previous',
      snapshotDate: new Date('2026-03-19T00:00:00.000Z'),
      createdAt: new Date('2026-03-19T10:00:00.000Z'),
      positions: [{ ...baseSnapshotRecord.positions[0], marketValue: 1000 }],
    };
    const prisma = {
      portfolioSnapshotRecord: {
        findMany: jest
          .fn()
          .mockResolvedValue([currentSnapshot, previousSnapshot]),
      },
      connectedSourceAccountRecord: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'account_shares',
          sourceId: 'source_1',
          displayName: 'Shares',
        }),
      },
    };
    const service = new PortfolioSnapshotsService(
      prisma as unknown as PrismaService,
    );

    const history = await service.getPortfolioHistory(
      { scope: 'account', sourceAccountId: 'account_shares' },
      'user_1',
    );

    expect(prisma.portfolioSnapshotRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user_1',
          sourceId: 'source_1',
          positions: { some: { sourceAccountId: 'account_shares' } },
        },
      }),
    );
    expect(history).toMatchObject({
      scope: 'account',
      sourceId: 'source_1',
      sourceAccountId: 'account_shares',
      sourceAccountLabel: 'Shares',
      points: [
        expect.objectContaining({ value: 1500, deltaFromPrevious: 500 }),
        expect.objectContaining({ value: 1000 }),
      ],
    });
  });

  it('uses consolidated snapshots for asset-category history unless a source is explicit', async () => {
    const prisma = {
      portfolioSnapshotRecord: {
        findMany: jest.fn().mockResolvedValue([
          {
            ...baseSnapshotRecord,
            sourceId: null,
            positions: [baseSnapshotRecord.positions[1]],
          },
        ]),
      },
      connectedSourceAccountRecord: {
        findFirst: jest.fn(),
      },
    };
    const service = new PortfolioSnapshotsService(
      prisma as unknown as PrismaService,
    );

    const history = await service.getPortfolioHistory(
      { scope: 'asset_category', assetCategory: 'cash', limit: 500 },
      'user_1',
    );

    expect(prisma.portfolioSnapshotRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user_1',
          sourceId: null,
          positions: { some: { category: 'CASH' } },
        },
        take: 121,
      }),
    );
    expect(history).toMatchObject({
      scope: 'asset_category',
      assetCategory: 'cash',
      points: [expect.objectContaining({ value: 500 })],
    });
  });

  it('returns an explainable empty change state when no baseline exists', async () => {
    const service = new PortfolioSnapshotsService({} as PrismaService);
    jest.spyOn(service, 'getSnapshotDelta').mockResolvedValue({
      baseSnapshotId: 'snapshot_current',
      totalValueDelta: 0,
      cashValueDelta: 0,
      positionDeltas: [],
      accountDeltas: [],
      baselineStatus: 'no_baseline',
    });
    jest.spyOn(service, 'getSnapshotLineage').mockResolvedValue({
      snapshot: {
        id: 'snapshot_current',
        metadata: {
          snapshotDate: '2026-03-20',
          sourceId: 'source_1',
        },
        totalValue: 2000,
        cashValue: 500,
        positions: [],
      },
      sourcesById: {},
      accountsById: {},
      positionsWithAccountContext: [],
    });
    jest.spyOn(service, 'getSnapshotDiagnostics').mockResolvedValue(null);

    const explanation = await service.getSnapshotChangeExplanation(
      'snapshot_current',
      'previous',
      'user_1',
    );

    expect(explanation).toMatchObject({
      baselineStatus: 'no_baseline',
      causalityStatus: 'insufficient_data_for_causality',
      drivers: [],
    });
    expect(explanation?.notes.map((note) => note.code)).toContain(
      'no_baseline',
    );
    expect(explanation?.summary).toContain('same scope');
  });

  it('builds deterministic drivers and classifies RSU account changes as employer equity', async () => {
    const service = new PortfolioSnapshotsService({} as PrismaService);
    const rsuAccount = {
      id: 'account_rsu',
      sourceId: 'source_fidelity',
      displayName: 'Fidelity RSU',
      accountType: 'brokerage',
      currency: 'USD',
      assetSubType: 'employer_rsu',
      institutionOrIssuer: 'Amazon',
      isActive: true,
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-20T00:00:00.000Z',
    };
    const fidelitySource = {
      id: 'source_fidelity',
      userId: 'user_1',
      kind: 'MANUAL_STATIC' as const,
      displayName: 'Fidelity',
      status: 'ACTIVE' as const,
      institutionName: 'Fidelity',
      baseCurrency: 'USD',
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-20T00:00:00.000Z',
    };
    const previousSnapshot: PortfolioSnapshot = {
      id: 'snapshot_previous',
      metadata: {
        snapshotDate: '2026-03-19',
        sourceId: 'source_fidelity',
        sourceLabel: 'Fidelity',
      },
      totalValue: 1500,
      cashValue: 300,
      positions: [
        {
          assetKey: 'symbol:ACME',
          symbol: 'ACME',
          marketValue: 1200,
          category: 'equity',
          sourceAccountId: 'account_rsu',
        },
        {
          assetKey: 'cash:USD',
          name: 'Cash',
          marketValue: 300,
          category: 'cash',
          sourceAccountId: 'account_rsu',
        },
      ],
    };
    const currentSnapshot: PortfolioSnapshot = {
      ...previousSnapshot,
      id: 'snapshot_current',
      metadata: { ...previousSnapshot.metadata, snapshotDate: '2026-03-20' },
      totalValue: 2000,
      cashValue: 250,
      positions: [
        {
          ...previousSnapshot.positions[0],
          marketValue: 1750,
        },
        {
          ...previousSnapshot.positions[1],
          marketValue: 250,
        },
      ],
    };
    jest.spyOn(service, 'getSnapshotDelta').mockResolvedValue({
      baseSnapshotId: 'snapshot_current',
      compareSnapshotId: 'snapshot_previous',
      totalValueDelta: 500,
      cashValueDelta: -50,
      baselineStatus: 'available',
      accountDeltas: [
        {
          sourceAccountId: 'account_rsu',
          sourceAccountName: 'Fidelity RSU',
          previousValue: 1500,
          currentValue: 2000,
          delta: 500,
        },
      ],
      positionDeltas: [
        {
          assetKey: 'symbol:ACME',
          symbol: 'ACME',
          previousMarketValue: 1200,
          currentMarketValue: 1750,
          marketValueDelta: 550,
          sourceAccountId: 'account_rsu',
          sourceAccountName: 'Fidelity RSU',
          changeType: 'increased',
        },
      ],
    });
    jest
      .spyOn(service, 'getSnapshotLineage')
      .mockResolvedValueOnce({
        snapshot: currentSnapshot,
        sourcesById: { source_fidelity: fidelitySource },
        accountsById: { account_rsu: rsuAccount },
        positionsWithAccountContext: [],
      })
      .mockResolvedValueOnce({
        snapshot: previousSnapshot,
        sourcesById: { source_fidelity: fidelitySource },
        accountsById: { account_rsu: rsuAccount },
        positionsWithAccountContext: [],
      });
    jest.spyOn(service, 'getSnapshotDiagnostics').mockResolvedValue(null);

    const explanation = await service.getSnapshotChangeExplanation(
      'snapshot_current',
      'previous',
      'user_1',
    );

    expect(explanation).toMatchObject({
      baselineStatus: 'available',
      stateDeltaStatus: 'deterministic_state_delta',
      causalityStatus: 'insufficient_data_for_causality',
    });
    expect(explanation?.drivers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dimension: 'employer_equity',
          sourceAccountId: 'account_rsu',
          delta: 500,
        }),
        expect.objectContaining({
          dimension: 'institution',
          label: 'Fidelity',
          delta: 500,
        }),
        expect.objectContaining({
          dimension: 'asset_category',
          assetCategory: 'equity',
          delta: 550,
        }),
        expect.objectContaining({
          dimension: 'holding',
          symbol: 'ACME',
          changeType: 'increased',
        }),
      ]),
    );
    const wording = JSON.stringify(explanation).toLowerCase();
    expect(wording).not.toContain('you bought');
    expect(wording).not.toContain('you sold');
    expect(wording).not.toContain('market caused');
    expect(explanation?.driverGroups?.primary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dimension: 'holding',
          delta: 550,
        }),
      ]),
    );
  });

  it('attributes consolidated institutions through account sources instead of issuers', async () => {
    const service = new PortfolioSnapshotsService({} as PrismaService);
    const sources = {
      source_wells: {
        id: 'source_wells',
        userId: 'user_1',
        kind: 'MANUAL_STATIC' as const,
        displayName: 'Wells Fargo',
        institutionName: 'Wells Fargo',
        status: 'ACTIVE' as const,
        baseCurrency: 'USD',
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-20T00:00:00.000Z',
      },
      source_fidelity: {
        id: 'source_fidelity',
        userId: 'user_1',
        kind: 'MANUAL_STATIC' as const,
        displayName: 'Fidelity',
        institutionName: 'Fidelity',
        status: 'ACTIVE' as const,
        baseCurrency: 'USD',
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-20T00:00:00.000Z',
      },
      source_coinbase: {
        id: 'source_coinbase',
        userId: 'user_1',
        kind: 'MANUAL_STATIC' as const,
        displayName: 'Coinbase',
        institutionName: 'Coinbase',
        status: 'ACTIVE' as const,
        baseCurrency: 'USD',
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-20T00:00:00.000Z',
      },
    };
    const accounts = {
      account_checking: {
        id: 'account_checking',
        sourceId: 'source_wells',
        displayName: 'Checking',
        accountType: 'checking',
        currency: 'USD',
        isActive: true,
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-20T00:00:00.000Z',
      },
      account_401k: {
        id: 'account_401k',
        sourceId: 'source_fidelity',
        displayName: '401(k)',
        accountType: 'retirement',
        currency: 'USD',
        isActive: true,
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-20T00:00:00.000Z',
      },
      account_rsu: {
        id: 'account_rsu',
        sourceId: 'source_fidelity',
        displayName: 'RSU',
        accountType: 'brokerage',
        assetSubType: 'employer_rsu',
        institutionOrIssuer: 'Amazon',
        currency: 'USD',
        isActive: true,
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-20T00:00:00.000Z',
      },
      account_crypto: {
        id: 'account_crypto',
        sourceId: 'source_coinbase',
        displayName: 'Crypto',
        accountType: 'crypto',
        currency: 'USD',
        isActive: true,
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-20T00:00:00.000Z',
      },
    };
    const previousValues = [100, 200, 300, 400];
    const currentValues = [120, 230, 340, 450];
    const accountIds = Object.keys(accounts) as Array<keyof typeof accounts>;
    const buildSnapshot = (
      id: string,
      snapshotDate: string,
      values: number[],
    ): PortfolioSnapshot => ({
      id,
      metadata: { snapshotDate },
      totalValue: values.reduce((sum, value) => sum + value, 0),
      positions: accountIds.map((sourceAccountId, index) => ({
        assetKey: `asset_${index}`,
        marketValue: values[index] ?? 0,
        category: index === 0 ? 'cash' : index === 3 ? 'crypto' : 'equity',
        sourceAccountId,
      })),
    });
    const previousSnapshot = buildSnapshot(
      'snapshot_previous',
      '2026-03-19',
      previousValues,
    );
    const currentSnapshot = buildSnapshot(
      'snapshot_current',
      '2026-03-20',
      currentValues,
    );
    jest.spyOn(service, 'getSnapshotDelta').mockResolvedValue({
      baseSnapshotId: 'snapshot_current',
      compareSnapshotId: 'snapshot_previous',
      totalValueDelta: 140,
      cashValueDelta: 20,
      baselineStatus: 'available',
      positionDeltas: [],
      accountDeltas: accountIds.map((sourceAccountId, index) => ({
        sourceAccountId,
        sourceAccountName: accounts[sourceAccountId].displayName,
        previousValue: previousValues[index] ?? 0,
        currentValue: currentValues[index] ?? 0,
        delta: (currentValues[index] ?? 0) - (previousValues[index] ?? 0),
      })),
    });
    jest
      .spyOn(service, 'getSnapshotLineage')
      .mockResolvedValueOnce({
        snapshot: currentSnapshot,
        sourcesById: sources,
        accountsById: accounts,
        positionsWithAccountContext: [],
      })
      .mockResolvedValueOnce({
        snapshot: previousSnapshot,
        sourcesById: sources,
        accountsById: accounts,
        positionsWithAccountContext: [],
      });
    jest.spyOn(service, 'getSnapshotDiagnostics').mockResolvedValue(null);

    const explanation = await service.getSnapshotChangeExplanation(
      'snapshot_current',
      'previous',
      'user_1',
    );
    const institutions =
      explanation?.driverGroups?.byInstitution.map((driver) => driver.label) ??
      [];

    expect(institutions).toEqual(['Fidelity', 'Coinbase', 'Wells Fargo']);
    expect(institutions).not.toContain('Amazon');
  });

  it('returns no-baseline delta when a source-level snapshot has no same-source previous snapshot', async () => {
    const currentSnapshot = {
      ...baseSnapshotRecord,
      id: 'snapshot_fidelity_current',
      sourceId: 'source_fidelity',
      sourceLabel: 'Fidelity',
    };
    const olderConsolidatedSnapshot = {
      ...baseSnapshotRecord,
      id: 'snapshot_consolidated_previous',
      sourceId: null,
      totalValue: 1500,
      snapshotDate: new Date('2026-03-19T00:00:00.000Z'),
      createdAt: new Date('2026-03-19T10:00:00.000Z'),
    };
    const findFirst = jest
      .fn<Promise<unknown>, [SnapshotFindFirstArgs]>()
      .mockResolvedValueOnce(currentSnapshot)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(olderConsolidatedSnapshot);
    const prisma = {
      portfolioSnapshotRecord: {
        findFirst,
      },
      connectedSourceAccountRecord: {
        findMany: jest.fn(),
      },
    };
    const service = new PortfolioSnapshotsService(
      prisma as unknown as PrismaService,
    );

    const delta = await service.getSnapshotDelta(
      'snapshot_fidelity_current',
      'previous',
      'user_1',
    );

    expect(findFirst).toHaveBeenCalledTimes(2);
    expect(findFirst.mock.calls[1]?.[0].where?.sourceId).toBe(
      'source_fidelity',
    );
    expect(prisma.connectedSourceAccountRecord.findMany).not.toHaveBeenCalled();
    expect(delta).toMatchObject({
      baseSnapshotId: 'snapshot_fidelity_current',
      baselineStatus: 'no_baseline',
      positionDeltas: [],
      accountDeltas: [],
    });
  });

  it('computes added, removed, increased, decreased, and account-level deltas for same-source previous snapshots', async () => {
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
          .fn<Promise<unknown>, [SnapshotFindFirstArgs]>()
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
    expect(
      prisma.portfolioSnapshotRecord.findFirst.mock.calls[1]?.[0].where
        ?.sourceId,
    ).toBe('source_1');
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

  it('compares a consolidated snapshot only against a previous consolidated snapshot', async () => {
    const currentSnapshot = {
      ...baseSnapshotRecord,
      id: 'snapshot_consolidated_current',
      sourceId: null,
      totalValue: 2000,
      snapshotDate: new Date('2026-03-20T00:00:00.000Z'),
      createdAt: new Date('2026-03-20T10:03:00.000Z'),
    };
    const consolidatedPrevious = {
      ...baseSnapshotRecord,
      id: 'snapshot_consolidated_previous',
      sourceId: null,
      totalValue: 1500,
      snapshotDate: new Date('2026-03-19T00:00:00.000Z'),
      createdAt: new Date('2026-03-19T10:00:00.000Z'),
    };
    const findFirst = jest
      .fn<Promise<unknown>, [SnapshotFindFirstArgs]>()
      .mockResolvedValueOnce(currentSnapshot)
      .mockResolvedValueOnce(consolidatedPrevious);
    const prisma = {
      portfolioSnapshotRecord: {
        findFirst,
      },
      connectedSourceAccountRecord: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new PortfolioSnapshotsService(
      prisma as unknown as PrismaService,
    );

    const delta = await service.getSnapshotDelta(
      'snapshot_consolidated_current',
      'previous',
      'user_1',
    );

    const secondFindFirstArgs = findFirst.mock.calls[1]?.[0];
    expect(findFirst).toHaveBeenCalledTimes(2);
    expect(secondFindFirstArgs?.where?.sourceId).toBeNull();
    expect(delta).toMatchObject({
      baseSnapshotId: 'snapshot_consolidated_current',
      compareSnapshotId: 'snapshot_consolidated_previous',
      totalValueDelta: 500,
      baselineStatus: 'available',
    });
  });

  it('returns no-baseline delta when a consolidated snapshot has no previous consolidated snapshot', async () => {
    const currentSnapshot = {
      ...baseSnapshotRecord,
      id: 'snapshot_consolidated_current',
      sourceId: null,
      totalValue: 2000,
      snapshotDate: new Date('2026-03-20T00:00:00.000Z'),
      createdAt: new Date('2026-03-20T10:03:00.000Z'),
    };
    const olderSourceSnapshot = {
      ...baseSnapshotRecord,
      id: 'snapshot_fidelity_previous',
      sourceId: 'source_fidelity',
      totalValue: 1500,
      snapshotDate: new Date('2026-03-19T00:00:00.000Z'),
      createdAt: new Date('2026-03-19T10:00:00.000Z'),
    };
    const findFirst = jest
      .fn<Promise<unknown>, [SnapshotFindFirstArgs]>()
      .mockResolvedValueOnce(currentSnapshot)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(olderSourceSnapshot);
    const prisma = {
      portfolioSnapshotRecord: {
        findFirst,
      },
      connectedSourceAccountRecord: {
        findMany: jest.fn(),
      },
    };
    const service = new PortfolioSnapshotsService(
      prisma as unknown as PrismaService,
    );

    const delta = await service.getSnapshotDelta(
      'snapshot_consolidated_current',
      'previous',
      'user_1',
    );

    expect(findFirst).toHaveBeenCalledTimes(2);
    expect(findFirst.mock.calls[1]?.[0].where?.sourceId).toBeNull();
    expect(prisma.connectedSourceAccountRecord.findMany).not.toHaveBeenCalled();
    expect(delta).toMatchObject({
      baseSnapshotId: 'snapshot_consolidated_current',
      baselineStatus: 'no_baseline',
      positionDeltas: [],
      accountDeltas: [],
    });
  });

  it('rejects unsupported snapshot delta comparison modes', async () => {
    const prisma = {
      portfolioSnapshotRecord: {
        findFirst: jest.fn(),
      },
      connectedSourceAccountRecord: {
        findMany: jest.fn(),
      },
    };
    const service = new PortfolioSnapshotsService(
      prisma as unknown as PrismaService,
    );

    await expect(
      service.getSnapshotDelta('snapshot_current', 'latest', 'user_1'),
    ).rejects.toThrow('compareTo must be "previous".');
    expect(prisma.portfolioSnapshotRecord.findFirst).not.toHaveBeenCalled();
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
    expect(lineage?.sourcesById.source_1).toMatchObject({
      institutionName: 'Fidelity',
    });
    expect(prisma.connectedSourceAccountRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          sourceId: 'source_1',
          source: { userId: 'user_1' },
        },
        include: { source: true },
      }),
    );
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

  it('computes portfolio diagnostics allocations, top holdings, and concentration flags', async () => {
    const staleDate = new Date('2026-03-01T00:00:00.000Z');
    const diagnosticSnapshot = {
      ...baseSnapshotRecord,
      totalValue: 2000,
      cashValue: 800,
      positions: [
        {
          ...baseSnapshotRecord.positions[0],
          id: 'position_rsu',
          assetKey: 'symbol:ACME',
          symbol: 'ACME',
          name: 'Acme RSU',
          marketValue: 800,
          sourceAccountId: 'account_rsu',
        },
        {
          ...baseSnapshotRecord.positions[1],
          id: 'position_cash',
          marketValue: 800,
          sourceAccountId: 'account_cash',
        },
        {
          ...baseSnapshotRecord.positions[0],
          id: 'position_crypto',
          assetKey: 'symbol:BTC',
          symbol: 'BTC',
          name: 'Bitcoin',
          marketValue: 400,
          category: 'CRYPTO',
          sourceAccountId: 'account_crypto',
        },
        {
          ...baseSnapshotRecord.positions[0],
          id: 'position_unknown',
          assetKey: 'manual:unknown',
          symbol: null,
          name: 'Private Asset',
          marketValue: 0,
          category: 'OTHER',
          sourceAccountId: null,
        },
      ],
      source: null,
    };
    const source = {
      id: 'source_fidelity',
      userId: 'user_1',
      kind: 'MANUAL_STATIC',
      providerKey: null,
      providerConnectionId: null,
      displayName: 'Fidelity',
      status: 'ACTIVE',
      institutionName: 'Fidelity',
      baseCurrency: 'USD',
      metadata: { institutionKey: 'fidelity' },
      lastSuccessfulSyncAt: staleDate,
      createdAt: staleDate,
      updatedAt: staleDate,
    };
    const prisma = {
      portfolioSnapshotRecord: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(diagnosticSnapshot)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null),
      },
      connectedSourceAccountRecord: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'account_rsu',
            sourceId: 'source_fidelity',
            externalAccountId: null,
            displayName: 'RSU',
            officialName: null,
            accountType: 'Shares',
            currency: 'USD',
            assetType: 'EQUITY',
            assetSubType: 'employer_rsu',
            institutionOrIssuer: 'Fidelity',
            maskLast4: null,
            isActive: true,
            metadata: { employerStockCandidate: true },
            createdAt: staleDate,
            updatedAt: staleDate,
            source,
          },
          {
            id: 'account_cash',
            sourceId: 'source_rsu',
            externalAccountId: null,
            displayName: 'Cash',
            officialName: null,
            accountType: 'Cash',
            currency: 'USD',
            assetType: 'CASH',
            assetSubType: 'cash',
            institutionOrIssuer: 'Fidelity',
            maskLast4: null,
            isActive: true,
            metadata: null,
            createdAt: staleDate,
            updatedAt: staleDate,
            source,
          },
          {
            id: 'account_crypto',
            sourceId: 'source_coinbase',
            externalAccountId: null,
            displayName: 'Crypto',
            officialName: null,
            accountType: 'Crypto',
            currency: 'USD',
            assetType: 'CRYPTO',
            assetSubType: 'crypto_wallet',
            institutionOrIssuer: 'Coinbase',
            maskLast4: null,
            isActive: true,
            metadata: null,
            createdAt: staleDate,
            updatedAt: staleDate,
            source: {
              ...source,
              id: 'source_coinbase',
              displayName: 'Coinbase',
              institutionName: 'Coinbase',
              metadata: { institutionKey: 'coinbase' },
            },
          },
        ]),
      },
    };
    const service = new PortfolioSnapshotsService(
      prisma as unknown as PrismaService,
    );

    const diagnostics = await service.getSnapshotDiagnostics(
      'snapshot_current',
      'user_1',
    );

    expect(diagnostics).toMatchObject({
      snapshotId: 'snapshot_current',
      totalValue: 2000,
      concentration: {
        topHoldingWeight: 0.4,
        topInstitutionWeight: 0.8,
        employerStockWeight: 0.4,
      },
      dataHealth: {
        status: 'incomplete',
        missingSourceAccountPositionCount: 1,
        hasBaselineSnapshot: false,
      },
    });
    expect(diagnostics?.allocationByAssetCategory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'cash', value: 800, weight: 0.4 }),
        expect.objectContaining({ key: 'crypto', value: 400, weight: 0.2 }),
      ]),
    );
    expect(diagnostics?.allocationByInstitution).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Fidelity',
          value: 1600,
          weight: 0.8,
        }),
        expect.objectContaining({ label: 'Coinbase', value: 400, weight: 0.2 }),
      ]),
    );
    expect(diagnostics?.allocationByAccount).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Unknown', value: 0, weight: 0 }),
      ]),
    );
    expect(diagnostics?.topHoldings[0]).toMatchObject({
      assetKey: 'symbol:ACME',
      weight: 0.4,
      sourceAccountName: 'RSU',
    });
    expect(diagnostics?.flags.map((flag) => flag.code)).toEqual(
      expect.arrayContaining([
        'high_cash',
        'high_crypto',
        'high_single_name_concentration',
        'high_institution_concentration',
        'high_employer_stock_concentration',
        'stale_data',
        'missing_valuation',
        'no_baseline_snapshot',
      ]),
    );
  });

  it('keeps diagnostics safe for zero-value snapshots', async () => {
    const zeroSnapshot = {
      ...baseSnapshotRecord,
      totalValue: 0,
      cashValue: 0,
      positions: [
        {
          ...baseSnapshotRecord.positions[0],
          marketValue: 0,
          sourceAccountId: null,
        },
      ],
      source: null,
    };
    const prisma = {
      portfolioSnapshotRecord: {
        findFirst: jest.fn().mockResolvedValueOnce(zeroSnapshot),
      },
      connectedSourceAccountRecord: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new PortfolioSnapshotsService(
      prisma as unknown as PrismaService,
    );

    const diagnostics = await service.getSnapshotDiagnostics(
      'snapshot_current',
      'user_1',
    );

    expect(diagnostics?.allocationByAssetCategory[0]?.weight).toBe(0);
    expect(diagnostics?.concentration.topHoldingWeight).toBe(0);
    expect(diagnostics?.postureSummary.cashRatio).toBe(0);
  });
});
