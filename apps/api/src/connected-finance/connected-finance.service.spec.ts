import { BadRequestException } from '@nestjs/common';
import { ConnectedFinanceService } from './connected-finance.service';

describe('ConnectedFinanceService', () => {
  const manualSourceRecord = {
    id: 'source_manual',
    userId: 'user_1',
    kind: 'MANUAL_STATIC',
    providerKey: null,
    providerConnectionId: null,
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
    providerKey: 'PLAID',
    providerConnectionId: 'item_123',
    displayName: 'First Platypus Bank',
    institutionName: 'First Platypus Bank',
  } as const;

  const manualAccountRecord = {
    id: 'account_1',
    sourceId: manualSourceRecord.id,
    externalAccountId: null,
    displayName: 'Amazon RSU',
    officialName: null,
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
        updateMany: jest.fn(),
      },
      connectedSourceSecretRecord: {
        findFirst: jest.fn(),
        upsert: jest.fn(),
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

  function createSecretsServiceMock() {
    return {
      encryptJson: jest.fn(
        (payload: unknown) => `encrypted:${JSON.stringify(payload)}`,
      ),
      decryptJson: jest.fn(),
    };
  }

  function createPlaidClientMock() {
    return {
      createLinkToken: jest.fn(),
      exchangePublicToken: jest.fn(),
      getInitialAccounts: jest.fn(),
      getCurrentBalances: jest.fn(),
    };
  }

  function createPlaidBankAdapterMock() {
    return {
      normalizationVersion: 'plaid-bank-adapter@1.0.0',
      balanceSelectionStrategy: 'AVAILABLE_THEN_CURRENT',
      normalize: jest.fn(),
    };
  }

  function createService(
    prisma: ReturnType<typeof createPrismaMock>,
    snapshotService: ReturnType<typeof createSnapshotServiceMock>,
    secretsService = createSecretsServiceMock(),
    plaidClient = createPlaidClientMock(),
    plaidBankAdapter = createPlaidBankAdapterMock(),
  ) {
    return {
      service: new ConnectedFinanceService(
        prisma as never,
        snapshotService as never,
        secretsService as never,
        plaidClient as never,
        plaidBankAdapter as never,
      ),
      secretsService,
      plaidClient,
      plaidBankAdapter,
    };
  }

  it('can create a source', async () => {
    const prisma = createPrismaMock();
    const snapshotService = createSnapshotServiceMock();
    prisma.connectedSourceRecord.create.mockResolvedValue(manualSourceRecord);

    const { service } = createService(prisma, snapshotService);

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

    const { service } = createService(prisma, snapshotService);

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

    const { service } = createService(prisma, snapshotService);

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

    const { service } = createService(prisma, snapshotService);

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

    const { service } = createService(prisma, snapshotService);

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

    const { service } = createService(prisma, snapshotService);

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

  it('exchange-public-token stores encrypted provider credentials and creates bank accounts', async () => {
    const prisma = createPrismaMock();
    const snapshotService = createSnapshotServiceMock();
    const linkedAccountRecord = {
      id: 'account_bank_1',
      sourceId: bankSourceRecord.id,
      externalAccountId: 'plaid_acc_1',
      displayName: 'Plaid Checking',
      officialName: 'Plaid Gold Checking',
      accountType: 'depository',
      currency: 'USD',
      assetType: 'CASH',
      assetSubType: 'checking',
      institutionOrIssuer: 'First Platypus Bank',
      maskLast4: '0000',
      isActive: true,
      metadata: null,
      createdAt: new Date('2026-03-19T00:00:00.000Z'),
      updatedAt: new Date('2026-03-19T00:00:00.000Z'),
    };
    const { service, secretsService, plaidClient } = createService(
      prisma,
      snapshotService,
    );

    prisma.connectedSourceRecord.findFirst.mockResolvedValue(null);
    prisma.connectedSourceRecord.create.mockResolvedValue(bankSourceRecord);
    prisma.connectedSourceAccountRecord.findMany.mockResolvedValue([]);
    prisma.connectedSourceAccountRecord.create.mockResolvedValue(
      linkedAccountRecord,
    );
    prisma.connectedSourceSecretRecord.upsert.mockResolvedValue({
      id: 'secret_1',
    });
    plaidClient.exchangePublicToken.mockResolvedValue({
      accessToken: 'access-sandbox-token',
      itemId: 'item_123',
      requestId: 'req_exchange',
    });
    plaidClient.getInitialAccounts.mockResolvedValue({
      itemId: 'item_123',
      institution: {
        institutionId: 'ins_123',
        institutionName: 'First Platypus Bank',
      },
      accounts: [
        {
          externalAccountId: 'plaid_acc_1',
          displayName: 'Plaid Checking',
          officialName: 'Plaid Gold Checking',
          accountType: 'depository',
          accountSubType: 'checking',
          currency: 'USD',
          maskLast4: '0000',
          currentBalance: 1250,
          availableBalance: 1200,
          metadata: { provider: 'PLAID' },
        },
      ],
      requestId: 'req_accounts',
    });

    const result = await service.exchangePlaidPublicToken('user_1', {
      publicToken: 'public-sandbox-token',
      metadata: {
        institution: {
          institutionId: 'ins_123',
          institutionName: 'First Platypus Bank',
        },
        linkSessionId: 'link-session-1',
      },
    });

    expect(prisma.connectedSourceRecord.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'user_1',
        kind: 'BANK',
        providerKey: 'PLAID',
        providerConnectionId: 'item_123',
      },
    });
    expect(secretsService.encryptJson).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: 'access-sandbox-token',
        itemId: 'item_123',
      }),
    );
    expect(prisma.connectedSourceSecretRecord.upsert).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      providerKey: 'PLAID',
      source: {
        id: 'source_bank',
        kind: 'BANK',
        providerKey: 'PLAID',
      },
      accounts: [
        expect.objectContaining({
          id: 'account_bank_1',
          externalAccountId: 'plaid_acc_1',
        }),
      ],
    });
  });

  it('cannot sync another user source', async () => {
    const prisma = createPrismaMock();
    const snapshotService = createSnapshotServiceMock();
    prisma.connectedSourceRecord.findFirst.mockResolvedValue(null);

    const { service } = createService(prisma, snapshotService);

    const result = await service.syncBankSource('user_2', bankSourceRecord.id);

    expect(result).toBeNull();
    expect(prisma.connectedSyncRunRecord.create).not.toHaveBeenCalled();
  });

  it('only BANK/PLAID sources can use plaid bank sync flow', async () => {
    const prisma = createPrismaMock();
    const snapshotService = createSnapshotServiceMock();
    prisma.connectedSourceRecord.findFirst.mockResolvedValue(
      manualSourceRecord,
    );

    const { service } = createService(prisma, snapshotService);

    await expect(
      service.syncBankSource('user_1', manualSourceRecord.id),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('sync creates snapshot lineage and updates existing accounts without duplication', async () => {
    const prisma = createPrismaMock();
    const snapshotService = createSnapshotServiceMock();
    const existingBankAccountRecord = {
      id: 'account_bank_1',
      sourceId: bankSourceRecord.id,
      externalAccountId: 'plaid_acc_1',
      displayName: 'Plaid Checking',
      officialName: 'Plaid Gold Checking',
      accountType: 'depository',
      currency: 'USD',
      assetType: 'CASH',
      assetSubType: 'checking',
      institutionOrIssuer: 'First Platypus Bank',
      maskLast4: '0000',
      isActive: true,
      metadata: null,
      createdAt: new Date('2026-03-18T00:00:00.000Z'),
      updatedAt: new Date('2026-03-18T00:00:00.000Z'),
    };
    const { service, secretsService, plaidClient, plaidBankAdapter } =
      createService(prisma, snapshotService);

    prisma.connectedSourceRecord.findFirst.mockResolvedValue(bankSourceRecord);
    prisma.connectedSourceSecretRecord.findFirst.mockResolvedValue({
      id: 'secret_1',
      userId: 'user_1',
      sourceId: bankSourceRecord.id,
      secretType: 'PROVIDER_CREDENTIALS',
      encryptedPayload: 'encrypted-payload',
      createdAt: new Date('2026-03-18T00:00:00.000Z'),
      updatedAt: new Date('2026-03-18T00:00:00.000Z'),
    });
    secretsService.decryptJson.mockReturnValue({
      accessToken: 'access-sandbox-token',
      itemId: 'item_123',
      institutionName: 'First Platypus Bank',
    });
    prisma.connectedSyncRunRecord.create.mockResolvedValue({
      id: 'sync_bank_1',
      userId: 'user_1',
      sourceId: bankSourceRecord.id,
      triggerType: 'MANUAL',
      status: 'RUNNING',
      startedAt: new Date('2026-03-19T10:00:00.000Z'),
      finishedAt: null,
      errorCode: null,
      errorMessage: null,
      normalizationVersion: 'plaid-bank-adapter@1.0.0',
      rawPayloadRef: null,
      producedSnapshotId: null,
      metadata: null,
      createdAt: new Date('2026-03-19T10:00:00.000Z'),
      updatedAt: new Date('2026-03-19T10:00:00.000Z'),
    });
    plaidClient.getCurrentBalances.mockResolvedValue({
      itemId: 'item_123',
      institution: {
        institutionId: 'ins_123',
        institutionName: 'First Platypus Bank',
      },
      accounts: [
        {
          externalAccountId: 'plaid_acc_1',
          displayName: 'Plaid Checking',
          officialName: 'Plaid Gold Checking',
          accountType: 'depository',
          accountSubType: 'checking',
          currency: 'USD',
          maskLast4: '0000',
          currentBalance: 1250,
          availableBalance: 1200,
          asOf: '2026-03-19T10:00:00.000Z',
          metadata: { provider: 'PLAID' },
        },
      ],
      requestId: 'req_balance',
    });
    prisma.connectedSourceAccountRecord.findMany.mockResolvedValue([
      existingBankAccountRecord,
    ]);
    prisma.connectedSourceAccountRecord.update.mockResolvedValue({
      ...existingBankAccountRecord,
      updatedAt: new Date('2026-03-19T10:00:00.000Z'),
    });
    prisma.connectedSourceAccountRecord.updateMany.mockResolvedValue({
      count: 0,
    });
    plaidBankAdapter.normalize.mockReturnValue({
      portfolioName: 'First Platypus Bank',
      sourceLabel: 'First Platypus Bank',
      snapshotDate: '2026-03-19',
      valuationCurrency: 'USD',
      totalValue: 1200,
      cashValue: 1200,
      ingestionMode: 'CONNECTED_SYNC',
      normalizationVersion: 'plaid-bank-adapter@1.0.0',
      positions: [
        {
          assetKey: 'bank:account_bank_1',
          name: 'Plaid Gold Checking',
          marketValue: 1200,
          category: 'cash',
          sourceAccountRef: 'account_bank_1',
        },
      ],
    });
    snapshotService.createSnapshot.mockResolvedValue({
      id: 'snapshot_bank_1',
      userId: 'user_1',
      metadata: {
        portfolioName: 'First Platypus Bank',
        sourceType: 'other',
        sourceLabel: 'First Platypus Bank',
        snapshotDate: '2026-03-19',
        valuationCurrency: 'USD',
        ingestionMode: 'CONNECTED_SYNC',
        sourceId: bankSourceRecord.id,
        sourceSyncRunId: 'sync_bank_1',
        normalizationVersion: 'plaid-bank-adapter@1.0.0',
        sourceFingerprint: 'fingerprint',
      },
      totalValue: 1200,
      cashValue: 1200,
      positions: [
        {
          assetKey: 'bank:account_bank_1',
          name: 'Plaid Gold Checking',
          marketValue: 1200,
          category: 'cash',
          sourceAccountId: 'account_bank_1',
        },
      ],
      createdAt: '2026-03-19T10:00:00.000Z',
      updatedAt: '2026-03-19T10:00:00.000Z',
    });
    prisma.connectedSyncRunRecord.update.mockResolvedValue({
      id: 'sync_bank_1',
      userId: 'user_1',
      sourceId: bankSourceRecord.id,
      triggerType: 'MANUAL',
      status: 'SUCCEEDED',
      startedAt: new Date('2026-03-19T10:00:00.000Z'),
      finishedAt: new Date('2026-03-19T10:01:00.000Z'),
      errorCode: null,
      errorMessage: null,
      normalizationVersion: 'plaid-bank-adapter@1.0.0',
      rawPayloadRef: 'req_balance',
      producedSnapshotId: 'snapshot_bank_1',
      metadata: null,
      createdAt: new Date('2026-03-19T10:00:00.000Z'),
      updatedAt: new Date('2026-03-19T10:01:00.000Z'),
    });
    prisma.connectedSourceRecord.update.mockResolvedValue({
      ...bankSourceRecord,
      lastSuccessfulSyncAt: new Date('2026-03-19T10:01:00.000Z'),
    });

    const result = await service.syncBankSource('user_1', bankSourceRecord.id);

    expect(prisma.connectedSourceAccountRecord.create).not.toHaveBeenCalled();
    expect(prisma.connectedSourceAccountRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'account_bank_1' },
      }),
    );
    expect(snapshotService.createSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_1',
        metadata: {
          portfolioName: 'First Platypus Bank',
          sourceType: 'other',
          sourceLabel: 'First Platypus Bank',
          snapshotDate: '2026-03-19',
          valuationCurrency: 'USD',
          sourceId: 'source_bank',
          sourceSyncRunId: 'sync_bank_1',
          ingestionMode: 'CONNECTED_SYNC',
          normalizationVersion: 'plaid-bank-adapter@1.0.0',
          sourceFingerprint:
            'f2830a17d7bc5d86e0d09b12cf98737a7be760d17284c8432f284b4b55f6812e',
        },
        positions: [
          expect.objectContaining({
            assetKey: 'bank:account_bank_1',
            marketValue: 1200,
            sourceAccountId: 'account_bank_1',
          }),
        ],
      }),
      'user_1',
    );
    expect(result).toMatchObject({
      snapshot: { id: 'snapshot_bank_1' },
      syncRun: { id: 'sync_bank_1', producedSnapshotId: 'snapshot_bank_1' },
      syncedAccountCount: 1,
      materializedPositionCount: 1,
      balanceSelectionStrategy: 'AVAILABLE_THEN_CURRENT',
    });
  });
});
