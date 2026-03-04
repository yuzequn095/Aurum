import { Injectable } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { formatDateOnly } from '../common/date-only';
import { PrismaService } from '../prisma/prisma.service';
import { ExportTransactionsQueryDto } from './dto/export-transactions-query.dto';
import { CSV_COLUMNS } from '../import-export/csv/types';

type ExportRow = {
  occurredAt: string;
  type: TransactionType;
  amount: string;
  currency: string;
  account: string;
  category: string;
  subcategory: string;
  merchant: string;
  note: string;
};

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsv(rows: ExportRow[]): string {
  const lines: string[] = [];
  lines.push(CSV_COLUMNS.join(','));
  rows.forEach((row) => {
    const values = CSV_COLUMNS.map((column) =>
      escapeCsv(String(row[column] ?? '')),
    );
    lines.push(values.join(','));
  });
  return `\uFEFF${lines.join('\n')}`;
}

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportTransactionsCsv(
    userId: string,
    query: ExportTransactionsQueryDto,
  ): Promise<string> {
    const where: Prisma.TransactionWhereInput = { userId };

    if (query.year && query.month) {
      const start = new Date(
        Date.UTC(query.year, query.month - 1, 1, 0, 0, 0, 0),
      );
      const end = new Date(Date.UTC(query.year, query.month, 1, 0, 0, 0, 0));
      where.occurredAt = { gte: start, lt: end };
    }

    if (query.accountId) where.accountId = query.accountId;
    if (query.type) where.type = query.type;
    if (query.q) {
      where.OR = [
        { merchant: { contains: query.q, mode: 'insensitive' } },
        { note: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.transaction.findMany({
      where,
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        occurredAt: true,
        type: true,
        amountCents: true,
        currency: true,
        merchant: true,
        note: true,
        account: { select: { name: true } },
        category: { select: { name: true } },
        subcategory: { select: { name: true } },
      },
    });

    const mapped: ExportRow[] = rows.map((row) => ({
      occurredAt: formatDateOnly(row.occurredAt),
      type: row.type,
      amount: (row.amountCents / 100).toFixed(2),
      currency: row.currency,
      account: row.account.name,
      category: row.category?.name ?? '',
      subcategory: row.subcategory?.name ?? '',
      merchant: row.merchant ?? '',
      note: row.note ?? '',
    }));

    return toCsv(mapped);
  }

  async exportBackupJson(userId: string) {
    const [accounts, categories, subcategories, transactions] =
      await Promise.all([
        this.prisma.account.findMany({
          where: { userId },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            name: true,
            currency: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        this.prisma.category.findMany({
          where: { userId },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            name: true,
            parentId: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        this.prisma.subcategory.findMany({
          where: { userId },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            categoryId: true,
            name: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        this.prisma.transaction.findMany({
          where: { userId },
          orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            accountId: true,
            categoryId: true,
            subcategoryId: true,
            type: true,
            amountCents: true,
            currency: true,
            occurredAt: true,
            merchant: true,
            note: true,
            transferId: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
      ]);

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      userId,
      accounts,
      categories,
      subcategories,
      transactions: transactions.map((tx) => ({
        ...tx,
        occurredAt: formatDateOnly(tx.occurredAt),
      })),
    };
  }
}
