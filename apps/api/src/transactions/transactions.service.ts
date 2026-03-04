import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { formatDateOnly, parseDateOnly } from '../common/date-only';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { GetTransactionsQueryDto } from './dto/get-transactions-query.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateTransactionDto) {
    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, userId },
      select: { id: true },
    });
    if (!account) throw new NotFoundException('Account not found');

    await this.validateCategoryAndSubcategoryForType(
      userId,
      dto.type,
      dto.categoryId,
      dto.subcategoryId,
    );

    const created = await this.prisma.transaction.create({
      data: {
        userId,
        accountId: dto.accountId,
        type: dto.type,
        amountCents: dto.amountCents,
        currency: dto.currency ?? 'USD',
        occurredAt: parseDateOnly(dto.occurredAt),
        categoryId: dto.categoryId,
        subcategoryId: dto.subcategoryId,
        merchant: dto.merchant,
        note: dto.note,
        transferId: dto.transferId,
      },
      select: this.transactionSelect(false),
    });

    if (!created.id) {
      throw new BadRequestException('Failed to create transaction');
    }

    return this.mapTransactionDate(created);
  }

  async list(userId: string, query: GetTransactionsQueryDto) {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const includeRefs = query.include === 'refs';
    const where: Prisma.TransactionWhereInput = { userId };

    if (query.year && query.month) {
      const start = new Date(
        Date.UTC(query.year, query.month - 1, 1, 0, 0, 0, 0),
      );
      const end = new Date(Date.UTC(query.year, query.month, 1, 0, 0, 0, 0));
      where.occurredAt = { gte: start, lt: end };
    } else if (query.from || query.to) {
      where.occurredAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    if (query.accountId) where.accountId = query.accountId;
    if (query.categoryId) where.categoryId = query.categoryId;
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
      skip: offset,
      take: limit,
      select: this.transactionSelect(includeRefs),
    });

    return rows.map((row) => this.mapTransactionDate(row));
  }

  async getById(userId: string, id: string) {
    const row = await this.prisma.transaction.findFirst({
      where: { id, userId },
      select: this.transactionSelect(false),
    });
    return row ? this.mapTransactionDate(row) : null;
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    const existing = await this.prisma.transaction.findFirst({
      where: { id, userId },
      select: {
        id: true,
        type: true,
        categoryId: true,
        subcategoryId: true,
      },
    });

    if (!existing) {
      return null;
    }

    if (dto.accountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: dto.accountId, userId },
        select: { id: true },
      });
      if (!account) return null;
    }

    const nextType = dto.type ?? existing.type;
    const nextCategoryId = dto.categoryId ?? existing.categoryId ?? undefined;
    const nextSubcategoryId =
      dto.subcategoryId ?? existing.subcategoryId ?? undefined;

    await this.validateCategoryAndSubcategoryForType(
      userId,
      nextType,
      nextCategoryId,
      nextSubcategoryId,
    );

    const result = await this.prisma.transaction.updateMany({
      where: { id, userId },
      data: {
        accountId: dto.accountId,
        type: dto.type,
        amountCents: dto.amountCents,
        currency: dto.currency,
        occurredAt: dto.occurredAt ? parseDateOnly(dto.occurredAt) : undefined,
        categoryId: dto.categoryId,
        subcategoryId: dto.subcategoryId,
        merchant: dto.merchant,
        note: dto.note,
        transferId: dto.transferId,
      },
    });

    if (result.count === 0) return null;

    return this.getById(userId, id);
  }

  async remove(userId: string, id: string) {
    const result = await this.prisma.transaction.deleteMany({
      where: { id, userId },
    });
    return result.count > 0;
  }

  private async validateCategoryAndSubcategoryForType(
    userId: string,
    type: TransactionType,
    categoryId?: string,
    subcategoryId?: string,
  ) {
    if (type !== TransactionType.INCOME && type !== TransactionType.EXPENSE) {
      return;
    }

    if (!categoryId || !subcategoryId) {
      throw new BadRequestException(
        'categoryId and subcategoryId are required for income/expense transactions',
      );
    }

    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, userId },
      select: { id: true },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const subcategory = await this.prisma.subcategory.findFirst({
      where: { id: subcategoryId, userId },
      select: { id: true, categoryId: true },
    });
    if (!subcategory) {
      throw new NotFoundException('Subcategory not found');
    }

    if (subcategory.categoryId !== categoryId) {
      throw new BadRequestException('Invalid category/subcategory combination');
    }
  }

  private transactionSelect(includeRefs: boolean): Prisma.TransactionSelect {
    const baseSelect: Prisma.TransactionSelect = {
      id: true,
      userId: true,
      accountId: true,
      type: true,
      amountCents: true,
      currency: true,
      occurredAt: true,
      categoryId: true,
      subcategoryId: true,
      merchant: true,
      note: true,
      transferId: true,
      createdAt: true,
      updatedAt: true,
    };

    if (!includeRefs) {
      return baseSelect;
    }

    return {
      ...baseSelect,
      account: {
        select: {
          id: true,
          name: true,
          currency: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          parentId: true,
        },
      },
      subcategory: {
        select: {
          id: true,
          name: true,
          categoryId: true,
        },
      },
    };
  }

  private mapTransactionDate<T extends { occurredAt: Date }>(
    tx: T,
  ): Omit<T, 'occurredAt'> & { occurredAt: string } {
    return {
      ...tx,
      occurredAt: formatDateOnly(tx.occurredAt),
    };
  }
}
