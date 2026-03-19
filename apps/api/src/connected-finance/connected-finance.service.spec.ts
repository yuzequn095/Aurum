import { BadRequestException } from '@nestjs/common';
import type { PortfolioSnapshotsService } from '../portfolio-snapshots/portfolio-snapshots.service';
import { ConnectedFinanceService } from './connected-finance.service';

describe('ConnectedFinanceService', () => {
  const manualSourceRecord = {
    id: 'source_manual',
    userId: 'user_1',
    kind: 'MANUAL_STATIC',
    providerKey: null,
    displayName: 'Manual Holdings',
    status: 'ACTIVE',
    institutionName: 'Employer Equity',
    baseCurrency: 'USD',
    metadata: null,
    lastSuccessfulSyncAt: null,
    createdAt: new Date('2026-03-18T00:00:00.000Z'),
    updatedAt: new Date('2026-03-18T00:00:00.000Z'),
  } as const;

  const bankSourceRecord = {
    ...manualSourceRecord,
    id: 'source_bank',
    kind: 'BANK',
  } as const;

  const manualAccountRecord = {
    id: 'account_1',
    sourceId: manualSourceRecord.id,
    externalAccountId: null,
    displayName: 'Amazon RSU',
    accountType: 'RSU',
    currency: 'USD',
    assetType: 'EQUITY',
    assetSubType: 'company_rsu',
    institutionOrIssuer: 'Amazon',
    maskLast4: null,
    isActive: true,
    metadata: null,
    createdAt: new Date('2026-03-18T00:00:00.000Z'),
    updatedAt: new Date('2026-03-18T00:00:00.000Z'),
  } as const;

  function createPrismaMock() {
    return {
      connectedSourceRecord: {
        findMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
      },
      connectedSourceAccountRecord: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      connectedSyncRunRecord: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      manualStaticValuationRecord: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      portfolioSnapshotRecord: {
        findMany: jest.fn(),
      },
    };
  }

  function createSnapshotServiceMock() {
    return {
      createSnapshot: jest.fn(),
    };
  }

  it('can create a source', async () => {
    const prisma = createPrismaMock();
    const snapshotService = createSnapshotServiceMock();
    prisma.connectedSourceRecord.create.mockResolvedValue(manualSourceRecord);

    const service = new ConnectedFinanceService(
      prisma as never,
      snapshotService as never,
    );

    const created = await service.createSource('user_1', {
      kind: 'MANUAL_STATIC',
      displayName: 'Manual Holdings',
      baseCurrency: 'USD',
    });

    expect(created).toMatchObject({
      id: 'source_manual',
      userId: 'user_1',
      kind: 'MANUAL_STATIC',
      displayName: 'Manual Holdings',
    });
  });

  it('cannot append valuation to another user account', async () => {
    const prisma = createPrismaMock();
    const snapshotService = createSnapshotServiceMock();
    prisma.connectedSourceAccountRecord.findFirst.mockResolvedValue(null);

    const service = new ConnectedFinanceService(
      prisma as never,
      snapshotService as never,
    );

    const result = await service.createManualStaticValuation(
      'user_2',
      'account_1',
      {
        valuationDate: '2026-03-18',
        marketValue: 1000,
      },
    );

    expect(result).toBeNull();
    expect(prisma.manualStaticValuationRecord.create).not.toHaveBeenCalled();
  });

  it('cannot use manual valuation endpoints on non-manual-static source', async () => {
    const prisma = createPrismaMock();
    const snapshotService = createSnapshotServiceMock();
    prisma.connectedSourceAccountRecord.findFirst.mockResolvedValue({
      ...manualAccountRecord,
      sourceId: bankSourceRecord.id,
      source: bankSourceRecord,
    });

    const service = new ConnectedFinanceService(
      prisma as never,
      snapshotService as never,
    );

    await expect(
      service.createManualStaticValuation('user_1', 'account_1', {
        valuationDate: '2026-03-18',
        marketValue: 1000,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('append-only valuation history works', async () => {
    const prisma = createPrismaMock();
    const snapshotService = createSnapshotServiceMock();
    prisma.connectedSourceAccountRecord.findFirst.mockResolvedValue({
      ...manualAccountRecord,
      source: manualSourceRecord,
    });
    prisma.manualStaticValuationRecord.create
      .mockResolvedValueOnce({
        id: 'valuation_1',
        userId: 'user_1',
        sourceId: manualSourceRecord.id,
        sourceAccountId: manualAccountRecord.id,
        valuationDate: new Date('2026-03-18T00:00:00.000Z'),
        currency: 'USD',
        marketValue: 1000,
        quantity: null,
        unitPrice: null,
        symbol: 'AMZN',
        assetName: 'Amazon RSU',
        note: null,
        metadata: null,
        createdAt: new Date('2026-03-18T00:00:00.000Z'),
        updatedAt: new Date('2026-03-18T00:00:00.000Z'),
      })
      .mockResolvedValueOnce({
        id: 'valuation_2',
        userId: 'user_1',
        sourceId: manualSourceRecord.id,
        sourceAccountId: manualAccountRecord.id,
        valuationDate: new Date('2026-03-19T00:00:00.000Z'),
        currency: 'USD',
        marketValue: 1100,
        quantity: null,
        unitPrice: null,
        symbol: 'AMZN',
        assetName: 'Amazon RSU',
        note: null,
        metadata: null,
        createdAt: new Date('2026-03-19T00:00:00.000Z'),
        updatedAt: new Date('2026-03-19T00:00:00.000Z'),
      });

    const service = new ConnectedFinanceService(
      prisma as never,
      snapshotService as never,
    );

    const first = await service.createManualStaticValuation(
      'user_1',
      'account_1',
      {
        valuationDate: '2026-03-18',
        marketValue: 1000,
        symbol: 'AMZN',
        assetName: 'Amazon RSU',
      },
    );
    const second = await service.createManualStaticValuation(
      'user_1',
      'account_1',
      {
        valuationDate: '2026-03-19',
        marketValue: 1100,
        symbol: 'AMZN',
        assetName: 'Amazon RSU',
      },
    );

    expect(prisma.manualStaticValuationRecord.create).toHaveBeenCalledTimes(2);
    expect(first?.id).toBe('valuation_1');
    expect(second?.id).toBe('valuation_2');
  });

  it('cannot materialize snapshot for another user source', async () => {
    const prisma = createPrismaMock();
    const snapshotService = createSnapshotServiceMock();
    prisma.connectedSourceRecord.findFirst.mockResolvedValue(null);

    const service = new ConnectedFinanceService(
      prisma as never,
      snapshotService as never,
    );

    const result = await service.materializeManualStaticSnapshot(
      'user_2',
      manualSourceRecord.id,
      {},
    );

    expect(result).toBeNull();
    expect(prisma.connectedSyncRunRecord.create).not.toHaveBeenCalled();
  });

  it('materialization selects latest valuation per account and creates lineage links', async () => {
    const prisma = createPrismaMock();
    const snapshotService = createSnapshotServiceMock();
    let capturedSyncRunCreateArgs:
      | {
          data: {
            userId: string;
            sourceId: string;
            triggerType: string;
            status: string;
          };
        }
      | undefined;
    let capturedSyncRunUpdateArgs:
      | {
          where: { id: string };
          data: {
            status: string;
            producedSnapshotId?: string;
          };
        }
      | undefined;
    let capturedSnapshotCreateArgs:
      | {
          userId: string;
          metadata: {
            sourceId?: string;
            sourceSyncRunId?: string;
            ingestionMode?: string;
            snapshotDate: string;
          };
          positions: Array<{
            assetKey?: string;
            marketValue: number;
            sourceAccountId?: string;
          }>;
        }
      | undefined;

    prisma.connectedSourceRecord.findFirst.mockResolvedValue(
      manualSourceRecord,
    );
    prisma.connectedSourceAccountRecord.findMany.mockResolvedValue([
      manualAccountRecord,
      {
        ...manualAccountRecord,
        id: 'account_2',
        displayName: 'Manual Cash Bucket',
        accountType: 'CASH_BUCKET',
        assetType: 'CASH',
        assetSubType: 'cash_bucket',
        institutionOrIssuer: 'Manual',
      },
    ]);
    prisma.manualStaticValuationRecord.findMany.mockResolvedValue([
      {
        id: 'valuation_2_latest',
        userId: 'user_1',
        sourceId: manualSourceRecord.id,
        sourceAccountId: 'account_1',
        valuationDate: new Date('2026-03-19T00:00:00.000Z'),
        currency: 'USD',
        marketValue: 2500,
        quantity: 10,
        unitPrice: 250,
        symbol: 'AMZN',
        assetName: 'Amazon RSU',
        note: 'Latest',
        metadata: null,
        createdAt: new Date('2026-03-19T09:00:00.000Z'),
        updatedAt: new Date('2026-03-19T09:00:00.000Z'),
      },
      {
        id: 'valuation_1_old',
        userId: 'user_1',
        sourceId: manualSourceRecord.id,
        sourceAccountId: 'account_1',
        valuationDate: new Date('2026-03-18T00:00:00.000Z'),
        currency: 'USD',
        marketValue: 2000,
        quantity: 10,
        unitPrice: 200,
        symbol: 'AMZN',
        assetName: 'Amazon RSU',
        note: 'Old',
        metadata: null,
        createdAt: new Date('2026-03-18T09:00:00.000Z'),
        updatedAt: new Date('2026-03-18T09:00:00.000Z'),
      },
      {
        id: 'valuation_cash',
        userId: 'user_1',
        sourceId: manualSourceRecord.id,
        sourceAccountId: 'account_2',
        valuationDate: new Date('2026-03-17T00:00:00.000Z'),
        currency: 'USD',
        marketValue: 500,
        quantity: null,
        unitPrice: null,
        symbol: null,
        assetName: 'Cash Reserve',
        note: null,
        metadata: null,
        createdAt: new Date('2026-03-17T09:00:00.000Z'),
        updatedAt: new Date('2026-03-17T09:00:00.000Z'),
      },
    ]);
    prisma.connectedSyncRunRecord.create.mockImplementation((args: unknown) => {
      capturedSyncRunCreateArgs = args as typeof capturedSyncRunCreateArgs;

      return Promise.resolve({
        id: 'sync_1',
        userId: 'user_1',
        sourceId: manualSourceRecord.id,
        triggerType: 'MANUAL',
        status: 'RUNNING',
        startedAt: new Date('2026-03-19T10:00:00.000Z'),
        finishedAt: null,
        errorCode: null,
        errorMessage: null,
        normalizationVersion: 'manual-static-source-adapter@1.0.0',
        rawPayloadRef: null,
        producedSnapshotId: null,
        metadata: null,
        createdAt: new Date('2026-03-19T10:00:00.000Z'),
        updatedAt: new Date('2026-03-19T10:00:00.000Z'),
      });
    });
    prisma.connectedSyncRunRecord.update.mockImplementation((args: unknown) => {
      capturedSyncRunUpdateArgs = args as typeof capturedSyncRunUpdateArgs;

      return Promise.resolve({
        id: 'sync_1',
        userId: 'user_1',
        sourceId: manualSourceRecord.id,
        triggerType: 'MANUAL',
        status: 'SUCCEEDED',
        startedAt: new Date('2026-03-19T10:00:00.000Z'),
        finishedAt: new Date('2026-03-19T10:01:00.000Z'),
        errorCode: null,
        errorMessage: null,
        normalizationVersion: 'manual-static-source-adapter@1.0.0',
        rawPayloadRef: null,
        producedSnapshotId: 'snapshot_1',
        metadata: null,
        createdAt: new Date('2026-03-19T10:00:00.000Z'),
        updatedAt: new Date('2026-03-19T10:01:00.000Z'),
      });
    });
    prisma.connectedSourceRecord.update.mockResolvedValue({
      ...manualSourceRecord,
      lastSuccessfulSyncAt: new Date('2026-03-19T10:01:00.000Z'),
    });
    snapshotService.createSnapshot.mockImplementation((input: unknown) => {
      capturedSnapshotCreateArgs = input as typeof capturedSnapshotCreateArgs;

      return Promise.resolve({
        id: 'snapshot_1',
        userId: 'user_1',
        metadata: {
          portfolioName: 'Manual Holdings',
          sourceType: 'manual',
          sourceLabel: 'Manual Holdings',
          snapshotDate: '2026-03-19',
          valuationCurrency: 'USD',
          ingestionMode: 'MANUAL_STATIC',
          sourceId: manualSourceRecord.id,
          sourceSyncRunId: 'sync_1',
          normalizationVersion: 'manual-static-source-adapter@1.0.0',
          sourceFingerprint: 'fingerprint',
        },
        totalValue: 3000,
        cashValue: 500,
        positions: [
          {
            assetKey: 'manual-static:account_1',
            symbol: 'AMZN',
            name: 'Amazon RSU',
            quantity: 10,
            marketValue: 2500,
            category: 'equity',
            sourceAccountId: 'account_1',
          },
          {
            assetKey: 'manual-static:account_2',
            name: 'Cash Reserve',
            marketValue: 500,
            category: 'cash',
            sourceAccountId: 'account_2',
          },
        ],
        createdAt: '2026-03-19T10:00:00.000Z',
        updatedAt: '2026-03-19T10:00:00.000Z',
      });
    });

    const service = new ConnectedFinanceService(
      prisma as never,
      snapshotService as unknown as PortfolioSnapshotsService,
    );

    const result = await service.materializeManualStaticSnapshot(
      'user_1',
      manualSourceRecord.id,
      {},
    );

    expect(capturedSnapshotCreateArgs).toMatchObject({
      userId: 'user_1',
      metadata: {
        sourceId: 'source_manual',
        sourceSyncRunId: 'sync_1',
        ingestionMode: 'MANUAL_STATIC',
        snapshotDate: '2026-03-19',
      },
      positions: [
        expect.objectContaining({
          assetKey: 'manual-static:account_1',
          marketValue: 2500,
          sourceAccountId: 'account_1',
        }),
        expect.objectContaining({
          assetKey: 'manual-static:account_2',
          marketValue: 500,
          sourceAccountId: 'account_2',
        }),
      ],
    });
    expect(capturedSyncRunCreateArgs).toMatchObject({
      data: {
        userId: 'user_1',
        sourceId: 'source_manual',
        triggerType: 'MANUAL',
        status: 'RUNNING',
      },
    });
    expect(capturedSyncRunUpdateArgs).toMatchObject({
      where: { id: 'sync_1' },
      data: {
        status: 'SUCCEEDED',
        producedSnapshotId: 'snapshot_1',
      },
    });
    expect(result).toMatchObject({
      snapshot: { id: 'snapshot_1' },
      syncRun: { id: 'sync_1', producedSnapshotId: 'snapshot_1' },
      latestValuationCount: 2,
      materializedAccountCount: 2,
      snapshotDate: '2026-03-19',
    });
  });
});
