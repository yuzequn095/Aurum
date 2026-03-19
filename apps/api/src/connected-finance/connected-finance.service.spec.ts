import { ConnectedFinanceService } from './connected-finance.service';

describe('ConnectedFinanceService', () => {
  const baseSourceRecord = {
    id: 'source_1',
    userId: 'user_1',
    kind: 'MANUAL_STATIC',
    providerKey: null,
    displayName: 'Primary Portfolio',
    status: 'ACTIVE',
    institutionName: null,
    baseCurrency: 'USD',
    metadata: null,
    lastSuccessfulSyncAt: null,
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
      },
      connectedSourceAccountRecord: {
        findMany: jest.fn(),
      },
      connectedSyncRunRecord: {
        findMany: jest.fn(),
      },
    };
  }

  it('can create a source', async () => {
    const prisma = createPrismaMock();
    prisma.connectedSourceRecord.create.mockResolvedValue(baseSourceRecord);
    const service = new ConnectedFinanceService(prisma as never);

    const created = await service.createSource('user_1', {
      kind: 'MANUAL_STATIC',
      displayName: 'Primary Portfolio',
      baseCurrency: 'USD',
    });

    expect(prisma.connectedSourceRecord.create).toHaveBeenCalledWith({
      data: {
        userId: 'user_1',
        kind: 'MANUAL_STATIC',
        providerKey: undefined,
        displayName: 'Primary Portfolio',
        status: 'ACTIVE',
        institutionName: undefined,
        baseCurrency: 'USD',
        metadata: undefined,
      },
    });
    expect(created).toMatchObject({
      id: 'source_1',
      userId: 'user_1',
      kind: 'MANUAL_STATIC',
      displayName: 'Primary Portfolio',
      status: 'ACTIVE',
    });
  });

  it('can list own sources', async () => {
    const prisma = createPrismaMock();
    prisma.connectedSourceRecord.findMany.mockResolvedValue([baseSourceRecord]);
    const service = new ConnectedFinanceService(prisma as never);

    const sources = await service.listSources('user_1', {
      kind: 'MANUAL_STATIC',
    });

    expect(prisma.connectedSourceRecord.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user_1',
        kind: 'MANUAL_STATIC',
        status: undefined,
      },
      orderBy: [{ createdAt: 'desc' }],
    });
    expect(sources).toHaveLength(1);
    expect(sources[0]?.id).toBe('source_1');
  });

  it('cannot read another user source', async () => {
    const prisma = createPrismaMock();
    prisma.connectedSourceRecord.findFirst.mockResolvedValue(null);
    const service = new ConnectedFinanceService(prisma as never);

    const source = await service.getSourceById('user_2', 'source_1');

    expect(prisma.connectedSourceRecord.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'source_1',
        userId: 'user_2',
      },
    });
    expect(source).toBeNull();
  });

  it('can read accounts for own source', async () => {
    const prisma = createPrismaMock();
    prisma.connectedSourceRecord.findFirst.mockResolvedValue(baseSourceRecord);
    prisma.connectedSourceAccountRecord.findMany.mockResolvedValue([
      {
        id: 'account_1',
        sourceId: 'source_1',
        externalAccountId: null,
        displayName: 'Cash Management',
        accountType: 'CASH',
        currency: 'USD',
        maskLast4: '1234',
        isActive: true,
        metadata: null,
        createdAt: new Date('2026-03-18T00:00:00.000Z'),
        updatedAt: new Date('2026-03-18T00:00:00.000Z'),
      },
    ]);
    const service = new ConnectedFinanceService(prisma as never);

    const accounts = await service.listSourceAccounts('user_1', 'source_1');

    expect(accounts).toEqual([
      expect.objectContaining({
        id: 'account_1',
        sourceId: 'source_1',
        displayName: 'Cash Management',
      }),
    ]);
  });

  it('can read sync runs for own source', async () => {
    const prisma = createPrismaMock();
    prisma.connectedSourceRecord.findFirst.mockResolvedValue(baseSourceRecord);
    prisma.connectedSyncRunRecord.findMany.mockResolvedValue([
      {
        id: 'sync_1',
        userId: 'user_1',
        sourceId: 'source_1',
        triggerType: 'MANUAL',
        status: 'SUCCEEDED',
        startedAt: new Date('2026-03-18T00:00:00.000Z'),
        finishedAt: new Date('2026-03-18T00:01:00.000Z'),
        errorCode: null,
        errorMessage: null,
        normalizationVersion: '1.0.0',
        rawPayloadRef: null,
        producedSnapshotId: null,
        metadata: null,
        createdAt: new Date('2026-03-18T00:00:00.000Z'),
        updatedAt: new Date('2026-03-18T00:01:00.000Z'),
      },
    ]);
    const service = new ConnectedFinanceService(prisma as never);

    const syncRuns = await service.listSourceSyncRuns('user_1', 'source_1');

    expect(syncRuns).toEqual([
      expect.objectContaining({
        id: 'sync_1',
        sourceId: 'source_1',
        status: 'SUCCEEDED',
      }),
    ]);
  });
});
