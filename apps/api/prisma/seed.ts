import 'dotenv/config';
import {
  AIEntitlementFeatureKey,
  AIEntitlementStatus,
  AuthProvider,
  PrismaClient,
  TransactionType,
} from '@prisma/client';
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
