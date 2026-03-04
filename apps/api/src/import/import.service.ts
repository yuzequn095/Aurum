import { BadRequestException, Injectable } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { parseDateOnly } from '../common/date-only';
import { parseCsv } from '../import-export/csv/parse';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ImportService {
  constructor(private readonly prisma: PrismaService) {}

  dryRunTransactions(fileBuffer: Buffer) {
    const parsed = parseCsv(fileBuffer);
    const previewRows = parsed.rows.slice(0, 20);
    const uniqueErrorLines = new Set(parsed.errors.map((error) => error.line));
    const totalRows = new Set([
      ...parsed.rows.map((row) => row.line),
      ...uniqueErrorLines.values(),
    ]).size;

    return {
      previewRows,
      errors: parsed.errors,
      summary: {
        totalRows,
        validRows: parsed.rows.length,
        errorCount: parsed.errors.length,
      },
    };
  }

  async importTransactions(userId: string, fileBuffer: Buffer) {
    const parsed = parseCsv(fileBuffer);
    if (parsed.errors.length > 0) {
      throw new BadRequestException({
        message: 'CSV validation failed',
        errors: parsed.errors,
      });
    }

    return this.importWithAutoCreate(userId, parsed.rows);
  }

  private async importWithAutoCreate(
    userId: string,
    rows: ReturnType<typeof parseCsv>['rows'],
  ) {
    return this.prisma.$transaction(async (tx) => {
      const accounts = await tx.account.findMany({
        where: { userId },
        select: { id: true, name: true },
      });
      const categories = await tx.category.findMany({
        where: { userId },
        select: { id: true, name: true },
      });
      const subcategories = await tx.subcategory.findMany({
        where: { userId },
        select: { id: true, name: true, categoryId: true },
      });

      const accountByName = new Map(
        accounts.map((acc) => [this.key(acc.name), acc.id]),
      );
      const categoryByName = new Map(
        categories.map((cat) => [this.key(cat.name), cat.id]),
      );
      const subcategoryByKey = new Map(
        subcategories.map((sub) => [
          this.subcategoryKey(sub.categoryId, sub.name),
          sub.id,
        ]),
      );

      let createdAccounts = 0;
      let createdCategories = 0;
      let createdSubcategories = 0;

      for (const row of rows) {
        const currency = row.currency || 'USD';
        const accountName = row.account.trim();
        let accountId = accountByName.get(this.key(accountName));
        if (!accountId) {
          const created = await tx.account.create({
            data: {
              userId,
              name: accountName,
              currency,
            },
            select: { id: true, name: true },
          });
          accountId = created.id;
          accountByName.set(this.key(created.name), created.id);
          createdAccounts += 1;
        }

        let categoryId: string | null = null;
        let subcategoryId: string | null = null;
        if (
          row.type === TransactionType.INCOME ||
          row.type === TransactionType.EXPENSE
        ) {
          const categoryName = row.category.trim();
          const categoryLookup = this.key(categoryName);
          categoryId = categoryByName.get(categoryLookup) ?? null;

          if (!categoryId) {
            const createdCategory = await tx.category.create({
              data: { userId, name: categoryName },
              select: { id: true, name: true },
            });
            categoryId = createdCategory.id;
            categoryByName.set(this.key(createdCategory.name), categoryId);
            createdCategories += 1;
          }

          const subName = row.subcategory.trim();
          const subKey = this.subcategoryKey(categoryId, subName);
          subcategoryId = subcategoryByKey.get(subKey) ?? null;
          if (!subcategoryId) {
            const createdSubcategory = await tx.subcategory.create({
              data: { userId, categoryId, name: subName },
              select: { id: true },
            });
            subcategoryId = createdSubcategory.id;
            subcategoryByKey.set(subKey, subcategoryId);
            createdSubcategories += 1;
          }
        }

        await tx.transaction.create({
          data: {
            userId,
            accountId,
            type: row.type,
            amountCents: row.amountCents,
            currency,
            occurredAt: parseDateOnly(row.occurredAt),
            categoryId,
            subcategoryId,
            merchant: row.merchant || null,
            note: row.note || null,
          },
        });
      }

      return {
        importedCount: rows.length,
        createdAccounts,
        createdCategories,
        createdSubcategories,
      };
    });
  }

  private key(value: string): string {
    return value.trim().toLowerCase();
  }

  private subcategoryKey(categoryId: string, name: string): string {
    return `${categoryId}::${this.key(name)}`;
  }
}
