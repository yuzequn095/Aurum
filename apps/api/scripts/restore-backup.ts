import 'dotenv/config';
import { PrismaClient, TransactionType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseDateOnly } from '../src/common/date-only';

type RestoreMode = 'wipe' | 'append';

type BackupAccount = {
  id: string;
  name: string;
  currency: string;
};

type BackupCategory = {
  id: string;
  name: string;
  parentId: string | null;
};

type BackupSubcategory = {
  id: string;
  categoryId: string;
  name: string;
};

type BackupTransaction = {
  id: string;
  accountId: string;
  categoryId: string | null;
  subcategoryId: string | null;
  type: TransactionType;
  amountCents: number;
  currency: string;
  occurredAt: string;
  merchant: string | null;
  note: string | null;
  transferId: string | null;
};

type BackupPayload = {
  version: number;
  userId: string;
  accounts: BackupAccount[];
  categories: BackupCategory[];
  subcategories: BackupSubcategory[];
  transactions: BackupTransaction[];
};

function parseArgs(argv: string[]) {
  const args = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      args.set(key, '');
      continue;
    }
    args.set(key, value);
    i += 1;
  }

  const file = args.get('file') ?? '';
  const mode = (args.get('mode') ?? '') as RestoreMode;
  const userId = args.get('userId') ?? undefined;

  if (!file || (mode !== 'wipe' && mode !== 'append')) {
    throw new Error(
      'Usage: pnpm --filter api restore -- --file <path> --mode wipe|append [--userId <id>]',
    );
  }

  return { file, mode, userId };
}

function validateBackupJson(raw: unknown): BackupPayload {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid backup file');
  }
  const data = raw as Partial<BackupPayload>;
  if (data.version !== 1) {
    throw new Error(`Unsupported backup version: ${String(data.version)}`);
  }
  if (!data.userId || typeof data.userId !== 'string') {
    throw new Error('backup.userId is required');
  }
  if (
    !Array.isArray(data.accounts) ||
    !Array.isArray(data.categories) ||
    !Array.isArray(data.subcategories) ||
    !Array.isArray(data.transactions)
  ) {
    throw new Error('backup arrays are missing');
  }
  return data as BackupPayload;
}

async function main() {
  const { file, mode, userId } = parseArgs(process.argv.slice(2));
  const fullPath = resolve(process.cwd(), file);
  const contents = readFileSync(fullPath, 'utf-8');
  const backup = validateBackupJson(JSON.parse(contents) as unknown);
  const targetUserId = userId ?? backup.userId;

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.upsert({
        where: { id: targetUserId },
        create: { id: targetUserId },
        update: {},
      });

      if (mode === 'wipe') {
        await tx.transaction.deleteMany({ where: { userId: targetUserId } });
        await tx.subcategory.deleteMany({ where: { userId: targetUserId } });
        await tx.category.deleteMany({ where: { userId: targetUserId } });
        await tx.account.deleteMany({ where: { userId: targetUserId } });
        await tx.importLog.deleteMany({ where: { userId: targetUserId } });
      }

      for (const account of backup.accounts) {
        await tx.account.upsert({
          where: { id: account.id },
          create: {
            id: account.id,
            userId: targetUserId,
            name: account.name,
            currency: account.currency || 'USD',
          },
          update: {
            userId: targetUserId,
            name: account.name,
            currency: account.currency || 'USD',
          },
        });
      }

      for (const category of backup.categories) {
        await tx.category.upsert({
          where: { id: category.id },
          create: {
            id: category.id,
            userId: targetUserId,
            name: category.name,
            parentId: null,
          },
          update: {
            userId: targetUserId,
            name: category.name,
            parentId: null,
          },
        });
      }

      for (const category of backup.categories) {
        await tx.category.update({
          where: { id: category.id },
          data: { parentId: category.parentId ?? null },
        });
      }

      for (const subcategory of backup.subcategories) {
        await tx.subcategory.upsert({
          where: { id: subcategory.id },
          create: {
            id: subcategory.id,
            userId: targetUserId,
            categoryId: subcategory.categoryId,
            name: subcategory.name,
          },
          update: {
            userId: targetUserId,
            categoryId: subcategory.categoryId,
            name: subcategory.name,
          },
        });
      }

      for (const transaction of backup.transactions) {
        await tx.transaction.upsert({
          where: { id: transaction.id },
          create: {
            id: transaction.id,
            userId: targetUserId,
            accountId: transaction.accountId,
            categoryId: transaction.categoryId,
            subcategoryId: transaction.subcategoryId,
            type: transaction.type,
            amountCents: transaction.amountCents,
            currency: transaction.currency || 'USD',
            occurredAt: parseDateOnly(transaction.occurredAt),
            merchant: transaction.merchant,
            note: transaction.note,
            transferId: transaction.transferId,
          },
          update: {
            userId: targetUserId,
            accountId: transaction.accountId,
            categoryId: transaction.categoryId,
            subcategoryId: transaction.subcategoryId,
            type: transaction.type,
            amountCents: transaction.amountCents,
            currency: transaction.currency || 'USD',
            occurredAt: parseDateOnly(transaction.occurredAt),
            merchant: transaction.merchant,
            note: transaction.note,
            transferId: transaction.transferId,
          },
        });
      }
    });

    console.log(
      `Restore complete for user=${targetUserId} mode=${mode} file=${fullPath}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
