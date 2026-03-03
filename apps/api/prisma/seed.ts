import 'dotenv/config';
import { AuthProvider, PrismaClient, TransactionType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const demoEmail = 'demo@aurum.local';
  const identity = await prisma.authIdentity.findUnique({
    where: {
      provider_identifier: {
        provider: AuthProvider.EMAIL,
        identifier: demoEmail,
      },
    },
    select: { userId: true },
  });
  const user =
    identity?.userId != null
      ? { id: identity.userId }
      : await prisma.user.create({
          data: {
            identities: {
              create: {
                provider: AuthProvider.EMAIL,
                identifier: demoEmail,
              },
            },
          },
          select: { id: true },
        });

  const food = await prisma.category.create({
    data: { userId: user.id, name: 'Food' },
  });

  await prisma.category.createMany({
    data: [
      { userId: user.id, name: 'Groceries', parentId: food.id },
      { userId: user.id, name: 'Dining', parentId: food.id },
    ],
    skipDuplicates: true,
  });

  const account = await prisma.account.create({
    data: { userId: user.id, name: 'Cash', currency: 'USD' },
  });

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

  console.log('Seed complete 🌱');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
