import 'dotenv/config';
import { AuthProvider, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function main() {
  const email = normalizeEmail(process.argv[2] ?? '');
  const password = process.argv[3] ?? '';

  if (!email || !password) {
    throw new Error(
      'Usage: pnpm --filter api run reset-password -- <email> <new-password>',
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
      select: {
        id: true,
        userId: true,
      },
    });

    if (!identity) {
      throw new Error(`No EMAIL identity found for ${email}`);
    }

    await prisma.authIdentity.update({
      where: { id: identity.id },
      data: {
        secretHash: await hash(password, 12),
      },
    });

    console.log(
      JSON.stringify(
        {
          email,
          userId: identity.userId,
          passwordReset: true,
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
