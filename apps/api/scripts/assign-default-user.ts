import 'dotenv/config';
import { AuthProvider, Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function main() {
  const email = normalizeEmail(process.argv[2] ?? '');
  if (!email) {
    throw new Error(
      'Usage: pnpm --filter api run assign-default-user -- <email>',
    );
  }

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    const identity = await prisma.authIdentity.findUnique({
      where: {
        provider_identifier: {
          provider: AuthProvider.EMAIL,
          identifier: email,
        },
      },
      select: { userId: true },
    });

    if (!identity) {
      throw new Error(`No EMAIL identity found for ${email}`);
    }

    const userId = identity.userId;

    // Historical backfill helper: only affects rows with NULL userId.
    const accountUpdated = await prisma.$executeRaw(
      Prisma.sql`UPDATE "Account" SET "userId" = ${userId} WHERE "userId" IS NULL`,
    );
    const categoryUpdated = await prisma.$executeRaw(
      Prisma.sql`UPDATE "Category" SET "userId" = ${userId} WHERE "userId" IS NULL`,
    );
    const transactionUpdated = await prisma.$executeRaw(
      Prisma.sql`UPDATE "Transaction" SET "userId" = ${userId} WHERE "userId" IS NULL`,
    );

    console.log(
      JSON.stringify(
        {
          email,
          userId,
          updated: {
            account: Number(accountUpdated),
            category: Number(categoryUpdated),
            transaction: Number(transactionUpdated),
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
