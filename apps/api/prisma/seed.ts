import 'dotenv/config';
import {
  AIEntitlementFeatureKey,
  AIEntitlementStatus,
  AuthProvider,
  PortfolioAssetCategoryType,
  PortfolioSnapshotIngestionMode,
  PortfolioSnapshotSourceType,
  PrismaClient,
  TransactionType,
} from '@prisma/client';
import { manualInstitutionPresets } from '../../../packages/core/src/portfolio/institution-presets';
import { type PortfolioAssetCategory } from '../../../packages/core/src/portfolio/types';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const DEMO_EMAIL = 'demo@aurum.local';
const DEMO_PASSWORD = 'password123';
const DEV_FULL_ACCESS_FEATURES = [
  AIEntitlementFeatureKey.AI_QUICK_CHAT,
  AIEntitlementFeatureKey.AI_CONVERSATIONS_SAVE,
  AIEntitlementFeatureKey.AI_CONVERSATIONS_REPLY,
  AIEntitlementFeatureKey.AI_REPORT_SNAPSHOT_PORTFOLIO_REPORT,
  AIEntitlementFeatureKey.AI_REPORT_MONTHLY_FINANCIAL_REVIEW,
  AIEntitlementFeatureKey.AI_REPORT_DAILY_MARKET_BRIEF,
  AIEntitlementFeatureKey.AI_ANALYSIS_FINANCIAL_HEALTH_SCORE,
  AIEntitlementFeatureKey.AI_ANALYSIS_PORTFOLIO_ANALYSIS,
  AIEntitlementFeatureKey.AI_PLANNING_BUDGET,
  AIEntitlementFeatureKey.AI_PLANNING_GOALS,
] as const;

const DEMO_SNAPSHOT_DATES = {
  previous: new Date('2026-05-14T00:00:00.000Z'),
  current: new Date('2026-05-21T00:00:00.000Z'),
};

function toPrismaAssetType(
  assetType: PortfolioAssetCategory,
): PortfolioAssetCategoryType {
  switch (assetType) {
    case 'cash':
      return PortfolioAssetCategoryType.CASH;
    case 'equity':
      return PortfolioAssetCategoryType.EQUITY;
    case 'etf':
      return PortfolioAssetCategoryType.ETF;
    case 'crypto':
      return PortfolioAssetCategoryType.CRYPTO;
    case 'fund':
      return PortfolioAssetCategoryType.FUND;
    case 'other':
    default:
      return PortfolioAssetCategoryType.OTHER;
  }
}

function getJsonString(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate[key] === 'string' ? candidate[key] : undefined;
}

function getDemoValue(
  accountKey: string,
  institutionKey: string,
  current: boolean,
) {
  const values: Record<
    string,
    { previous: number; current: number; symbol?: string; name: string }
  > = {
    'wells_fargo:checking': {
      previous: 5200,
      current: 6400,
      name: 'Checking Cash',
    },
    'wells_fargo:saving': {
      previous: 18000,
      current: 18500,
      name: 'Savings Cash',
    },
    'sofi:cash': { previous: 9500, current: 10200, name: 'SoFi Cash' },
    'webull:cash': { previous: 1400, current: 1800, name: 'Webull Cash' },
    'webull:stock': {
      previous: 12200,
      current: 13800,
      symbol: 'AAPL',
      name: 'Apple Inc.',
    },
    'tiger_brokers:cash': { previous: 900, current: 750, name: 'Tiger Cash' },
    'tiger_brokers:stock': {
      previous: 8700,
      current: 9300,
      symbol: 'TSM',
      name: 'Taiwan Semiconductor',
    },
    'fidelity:cash': { previous: 4200, current: 4600, name: 'Fidelity Cash' },
    'fidelity:shares': {
      previous: 43000,
      current: 47200,
      symbol: 'VOO',
      name: 'Vanguard S&P 500 ETF',
    },
    'fidelity:401k': {
      previous: 128000,
      current: 132500,
      symbol: 'FXAIX',
      name: 'Fidelity 500 Index Fund',
    },
    'coinbase:usdc': {
      previous: 2500,
      current: 2600,
      symbol: 'USDC',
      name: 'USD Coin',
    },
    'coinbase:crypto': {
      previous: 15500,
      current: 17100,
      symbol: 'BTC',
      name: 'Bitcoin',
    },
    'rsu:rsu': {
      previous: 54000,
      current: 61200,
      symbol: 'DEMO-RSU',
      name: 'Employer RSU',
    },
  };
  const value = values[`${institutionKey}:${accountKey}`];
  if (!value) {
    return { marketValue: 0, name: 'Demo Holding' };
  }

  return {
    marketValue: current ? value.current : value.previous,
    symbol: value.symbol,
    name: value.name,
  };
}

function getDemoAssetCategory(
  accountKey: string,
  institutionKey: string,
  fallback: PortfolioAssetCategory,
): PortfolioAssetCategoryType {
  if (institutionKey === 'fidelity' && accountKey === 'shares') {
    return PortfolioAssetCategoryType.ETF;
  }

  return toPrismaAssetType(fallback);
}

async function seedDemoConnectedFinance(userId: string) {
  const seededPositions: Array<{
    institutionKey: string;
    sourceId: string;
    sourceLabel: string;
    sourceAccountId: string;
    assetKey: string;
    symbol?: string;
    name: string;
    previousMarketValue: number;
    currentMarketValue: number;
    category: PortfolioAssetCategoryType;
  }> = [];

  const existingSources = await prisma.connectedSourceRecord.findMany({
    where: {
      userId,
      kind: 'MANUAL_STATIC',
    },
  });

  for (const preset of manualInstitutionPresets) {
    const existingSource = existingSources.find(
      (source) =>
        getJsonString(source.metadata, 'institutionKey') ===
        preset.institutionKey,
    );
    const source =
      existingSource ??
      (await prisma.connectedSourceRecord.create({
        data: {
          userId,
          kind: 'MANUAL_STATIC',
          displayName: preset.displayName,
          status: 'ACTIVE',
          institutionName: preset.displayName,
          baseCurrency: preset.baseCurrency,
          lastSuccessfulSyncAt: new Date(),
          metadata: {
            institutionKey: preset.institutionKey,
            seededFor: DEMO_EMAIL,
            presetVersion: 'manual-institution-presets@1.0.0',
          },
        },
      }));

    if (!existingSource) {
      existingSources.push(source);
    } else {
      await prisma.connectedSourceRecord.update({
        where: { id: source.id },
        data: {
          displayName: preset.displayName,
          institutionName: preset.displayName,
          lastSuccessfulSyncAt: new Date(),
        },
      });
    }

    const existingAccounts = await prisma.connectedSourceAccountRecord.findMany(
      {
        where: { sourceId: source.id },
      },
    );

    for (const accountPreset of preset.accounts) {
      const existingAccount = existingAccounts.find(
        (account) =>
          getJsonString(account.metadata, 'accountKey') ===
          accountPreset.accountKey,
      );
      const accountAssetCategory = getDemoAssetCategory(
        accountPreset.accountKey,
        preset.institutionKey,
        accountPreset.assetType,
      );
      const accountData = {
        displayName: accountPreset.displayName,
        accountType: accountPreset.accountType,
        currency: accountPreset.currency,
        assetType: accountAssetCategory,
        assetSubType: accountPreset.assetSubType,
        institutionOrIssuer: preset.displayName,
        isActive: true,
        metadata: {
          ...('metadata' in accountPreset ? accountPreset.metadata : {}),
          institutionKey: preset.institutionKey,
          accountKey: accountPreset.accountKey,
          seededFor: DEMO_EMAIL,
        },
      };
      const account =
        existingAccount ??
        (await prisma.connectedSourceAccountRecord.create({
          data: {
            sourceId: source.id,
            ...accountData,
          },
        }));

      if (existingAccount) {
        await prisma.connectedSourceAccountRecord.update({
          where: { id: existingAccount.id },
          data: accountData,
        });
      }

      for (const current of [false, true]) {
        const value = getDemoValue(
          accountPreset.accountKey,
          preset.institutionKey,
          current,
        );
        const valuationDate = current
          ? DEMO_SNAPSHOT_DATES.current
          : DEMO_SNAPSHOT_DATES.previous;
        const existingValuation =
          await prisma.manualStaticValuationRecord.findFirst({
            where: {
              userId,
              sourceId: source.id,
              sourceAccountId: account.id,
              valuationDate,
              metadata: {
                path: ['seedKey'],
                equals: `milestone15:${preset.institutionKey}:${accountPreset.accountKey}:${current ? 'current' : 'previous'}`,
              },
            },
          });

        if (!existingValuation) {
          await prisma.manualStaticValuationRecord.create({
            data: buildDemoValuationData({
              userId,
              sourceId: source.id,
              sourceAccountId: account.id,
              valuationDate,
              currency: accountPreset.currency,
              value,
              isCash: accountAssetCategory === PortfolioAssetCategoryType.CASH,
              seedKey: `milestone15:${preset.institutionKey}:${accountPreset.accountKey}:${current ? 'current' : 'previous'}`,
            }),
          });
        } else {
          await prisma.manualStaticValuationRecord.update({
            where: { id: existingValuation.id },
            data: buildDemoValuationData({
              userId,
              sourceId: source.id,
              sourceAccountId: account.id,
              valuationDate,
              currency: accountPreset.currency,
              value,
              isCash: accountAssetCategory === PortfolioAssetCategoryType.CASH,
              seedKey: `milestone15:${preset.institutionKey}:${accountPreset.accountKey}:${current ? 'current' : 'previous'}`,
            }),
          });
        }
      }

      const previousValue = getDemoValue(
        accountPreset.accountKey,
        preset.institutionKey,
        false,
      );
      const currentValue = getDemoValue(
        accountPreset.accountKey,
        preset.institutionKey,
        true,
      );
      seededPositions.push({
        institutionKey: preset.institutionKey,
        sourceId: source.id,
        sourceLabel: preset.displayName,
        sourceAccountId: account.id,
        assetKey: `demo:${preset.institutionKey}:${accountPreset.accountKey}`,
        symbol: currentValue.symbol,
        name: currentValue.name,
        previousMarketValue: previousValue.marketValue,
        currentMarketValue: currentValue.marketValue,
        category: accountAssetCategory,
      });
    }
  }

  await seedDemoSnapshots(userId, seededPositions);
}

function buildDemoValuationData(input: {
  userId: string;
  sourceId: string;
  sourceAccountId: string;
  valuationDate: Date;
  currency: string;
  value: { marketValue: number; symbol?: string; name: string };
  isCash: boolean;
  seedKey: string;
}) {
  return {
    userId: input.userId,
    sourceId: input.sourceId,
    sourceAccountId: input.sourceAccountId,
    valuationDate: input.valuationDate,
    currency: input.currency,
    marketValue: input.value.marketValue,
    quantity: input.isCash
      ? undefined
      : Math.max(1, Math.round(input.value.marketValue / 100)),
    unitPrice: input.isCash ? undefined : 100,
    symbol: input.value.symbol,
    assetName: input.value.name,
    note: 'Milestone 15 demo valuation',
    metadata: {
      seedKey: input.seedKey,
      seededFor: DEMO_EMAIL,
    },
  };
}

async function seedDemoSnapshots(
  userId: string,
  positions: Array<{
    institutionKey: string;
    sourceId: string;
    sourceLabel: string;
    sourceAccountId: string;
    assetKey: string;
    symbol?: string;
    name: string;
    previousMarketValue: number;
    currentMarketValue: number;
    category: PortfolioAssetCategoryType;
  }>,
) {
  const expectedFingerprints = new Set<string>([
    'milestone15:consolidated:previous',
    'milestone15:consolidated:current',
  ]);
  const positionsBySource = new Map<
    string,
    {
      institutionKey: string;
      sourceLabel: string;
      positions: typeof positions;
    }
  >();
  positions.forEach((position) => {
    const existing = positionsBySource.get(position.sourceId) ?? {
      institutionKey: position.institutionKey,
      sourceLabel: position.sourceLabel,
      positions: [],
    };
    existing.positions.push(position);
    positionsBySource.set(position.sourceId, existing);
  });

  for (const [sourceId, sourceGroup] of positionsBySource.entries()) {
    await createDemoSnapshot({
      userId,
      positions: sourceGroup.positions,
      snapshotDate: DEMO_SNAPSHOT_DATES.previous,
      sourceId,
      sourceLabel: sourceGroup.sourceLabel,
      fingerprint: `milestone15:${sourceGroup.institutionKey}:previous`,
      current: false,
    });
    expectedFingerprints.add(
      `milestone15:${sourceGroup.institutionKey}:previous`,
    );
    await createDemoSnapshot({
      userId,
      positions: sourceGroup.positions,
      snapshotDate: DEMO_SNAPSHOT_DATES.current,
      sourceId,
      sourceLabel: sourceGroup.sourceLabel,
      fingerprint: `milestone15:${sourceGroup.institutionKey}:current`,
      current: true,
    });
    expectedFingerprints.add(
      `milestone15:${sourceGroup.institutionKey}:current`,
    );
  }

  await createDemoSnapshot({
    userId,
    positions,
    snapshotDate: DEMO_SNAPSHOT_DATES.previous,
    sourceLabel: 'Demo Milestone 15 Portfolio',
    fingerprint: 'milestone15:consolidated:previous',
    current: false,
  });
  await createDemoSnapshot({
    userId,
    positions,
    snapshotDate: DEMO_SNAPSHOT_DATES.current,
    sourceLabel: 'Demo Milestone 15 Portfolio',
    fingerprint: 'milestone15:consolidated:current',
    current: true,
  });

  await deleteObsoleteDemoSnapshots(userId, expectedFingerprints);
}

async function deleteObsoleteDemoSnapshots(
  userId: string,
  expectedFingerprints: Set<string>,
) {
  const existingDemoSnapshots = await prisma.portfolioSnapshotRecord.findMany({
    where: {
      userId,
      sourceFingerprint: {
        startsWith: 'milestone15:',
      },
    },
    select: {
      id: true,
      sourceFingerprint: true,
    },
  });
  const obsoleteSnapshots = existingDemoSnapshots.filter(
    (snapshot) =>
      snapshot.sourceFingerprint &&
      !expectedFingerprints.has(snapshot.sourceFingerprint),
  );

  for (const snapshot of obsoleteSnapshots) {
    await prisma.$transaction([
      prisma.portfolioPositionRecord.deleteMany({
        where: { snapshotId: snapshot.id },
      }),
      prisma.portfolioSnapshotRecord.delete({
        where: { id: snapshot.id },
      }),
    ]);
  }
}

async function createDemoSnapshot(input: {
  userId: string;
  positions: Array<{
    sourceAccountId: string;
    assetKey: string;
    symbol?: string;
    name: string;
    previousMarketValue: number;
    currentMarketValue: number;
    category: PortfolioAssetCategoryType;
  }>;
  snapshotDate: Date;
  sourceId?: string;
  sourceLabel: string;
  fingerprint: string;
  current: boolean;
}) {
  const existing = await prisma.portfolioSnapshotRecord.findFirst({
    where: {
      userId: input.userId,
      sourceFingerprint: input.fingerprint,
    },
    select: { id: true },
  });

  const totalValue = input.positions.reduce(
    (sum, position) =>
      sum +
      (input.current
        ? position.currentMarketValue
        : position.previousMarketValue),
    0,
  );
  const cashValue = input.positions
    .filter((position) => position.category === PortfolioAssetCategoryType.CASH)
    .reduce(
      (sum, position) =>
        sum +
        (input.current
          ? position.currentMarketValue
          : position.previousMarketValue),
      0,
    );

  const positionsToCreate = input.positions.map((position) => {
    const marketValue = input.current
      ? position.currentMarketValue
      : position.previousMarketValue;

    return {
      assetKey: position.assetKey,
      symbol: position.symbol,
      name: position.name,
      quantity:
        position.category === PortfolioAssetCategoryType.CASH
          ? undefined
          : Math.max(1, Math.round(marketValue / 100)),
      marketValue,
      portfolioWeight: totalValue > 0 ? marketValue / totalValue : 0,
      category: position.category,
      sourceAccountId: position.sourceAccountId,
      notes: 'Milestone 15 demo position',
    };
  });
  const snapshotData = {
    userId: input.userId,
    sourceId: input.sourceId ?? null,
    ingestionMode: PortfolioSnapshotIngestionMode.MANUAL_STATIC,
    normalizationVersion: 'manual-static-source-adapter@1.0.0',
    sourceFingerprint: input.fingerprint,
    portfolioName: input.sourceLabel,
    sourceType: PortfolioSnapshotSourceType.MANUAL,
    sourceLabel: input.sourceLabel,
    snapshotDate: input.snapshotDate,
    valuationCurrency: 'USD',
    totalValue,
    cashValue,
  };

  if (existing) {
    await prisma.$transaction([
      prisma.portfolioPositionRecord.deleteMany({
        where: { snapshotId: existing.id },
      }),
      prisma.portfolioSnapshotRecord.update({
        where: { id: existing.id },
        data: {
          ...snapshotData,
          positions: {
            create: positionsToCreate,
          },
        },
      }),
    ]);
    return;
  }

  await prisma.portfolioSnapshotRecord.create({
    data: {
      ...snapshotData,
      positions: {
        create: positionsToCreate,
      },
    },
  });
}

async function main() {
  const demoSecretHash = await hash(DEMO_PASSWORD, 12);
  const identity = await prisma.authIdentity.findUnique({
    where: {
      provider_identifier: {
        provider: AuthProvider.EMAIL,
        identifier: DEMO_EMAIL,
      },
    },
    select: {
      id: true,
      userId: true,
    },
  });

  const user =
    identity?.userId != null
      ? { id: identity.userId }
      : await prisma.user.create({
          data: {
            identities: {
              create: {
                provider: AuthProvider.EMAIL,
                identifier: DEMO_EMAIL,
                secretHash: demoSecretHash,
              },
            },
          },
          select: { id: true },
        });

  if (identity) {
    await prisma.authIdentity.update({
      where: { id: identity.id },
      data: {
        secretHash: demoSecretHash,
      },
    });
  }

  const food = await prisma.category.upsert({
    where: {
      userId_name: {
        userId: user.id,
        name: 'Food',
      },
    },
    create: {
      userId: user.id,
      name: 'Food',
    },
    update: {},
  });

  await prisma.category.upsert({
    where: {
      userId_name: {
        userId: user.id,
        name: 'Groceries',
      },
    },
    create: {
      userId: user.id,
      name: 'Groceries',
      parentId: food.id,
    },
    update: {
      parentId: food.id,
    },
  });

  await prisma.category.upsert({
    where: {
      userId_name: {
        userId: user.id,
        name: 'Dining',
      },
    },
    create: {
      userId: user.id,
      name: 'Dining',
      parentId: food.id,
    },
    update: {
      parentId: food.id,
    },
  });

  const existingAccount = await prisma.account.findFirst({
    where: {
      userId: user.id,
      name: 'Cash',
    },
    select: {
      id: true,
    },
  });

  const account = existingAccount
    ? existingAccount
    : await prisma.account.create({
        data: {
          userId: user.id,
          name: 'Cash',
          currency: 'USD',
        },
        select: {
          id: true,
        },
      });

  const existingTransaction = await prisma.transaction.findFirst({
    where: {
      userId: user.id,
      accountId: account.id,
      type: TransactionType.EXPENSE,
      amountCents: 1299,
      currency: 'USD',
      merchant: 'Whole Foods',
      note: 'Demo transaction',
    },
    select: {
      id: true,
    },
  });

  if (!existingTransaction) {
    await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: account.id,
        type: TransactionType.EXPENSE,
        amountCents: 1299,
        currency: 'USD',
        occurredAt: new Date(),
        merchant: 'Whole Foods',
        note: 'Demo transaction',
        categoryId: food.id,
      },
    });
  }

  await prisma.aIEntitlementRecord.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      planKey: 'dev_full_access',
      status: AIEntitlementStatus.ACTIVE,
      featureKeys: [...DEV_FULL_ACCESS_FEATURES],
    },
    update: {
      planKey: 'dev_full_access',
      status: AIEntitlementStatus.ACTIVE,
      featureKeys: [...DEV_FULL_ACCESS_FEATURES],
    },
  });

  await seedDemoConnectedFinance(user.id);

  console.log(`Seed complete. Demo login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
