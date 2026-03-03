import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { GetTransactionsQueryDto } from './dto/get-transactions-query.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateTransactionDto) {
    // TODO(M7.3): tighten full userId isolation invariants across all transaction operations.
    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, userId },
      select: { id: true },
    });
    if (!account) throw new NotFoundException('Account not found');

    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, userId },
        select: { id: true },
      });
      if (!category) throw new NotFoundException('Category not found');
    }

    const created = await this.prisma.transaction.create({
      data: {
        userId,
        accountId: dto.accountId,
        type: dto.type,
        amountCents: dto.amountCents,
        currency: dto.currency ?? 'USD',
        occurredAt: new Date(dto.occurredAt),
        categoryId: dto.categoryId,
        merchant: dto.merchant,
        note: dto.note,
        transferId: dto.transferId,
      },
      select: {
        id: true,
        userId: true,
        accountId: true,
        type: true,
        amountCents: true,
        currency: true,
        occurredAt: true,
        categoryId: true,
        merchant: true,
        note: true,
        transferId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!created.id) {
      throw new BadRequestException('Failed to create transaction');
    }

    return created;
  }

  async list(userId: string, query: GetTransactionsQueryDto) {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const includeRefs = query.include === 'refs';

    const occurredAt: { gte?: Date; lte?: Date } = {};
    if (query.from) occurredAt.gte = new Date(query.from);
    if (query.to) occurredAt.lte = new Date(query.to);

    const baseSelect: Prisma.TransactionSelect = {
      id: true,
      accountId: true,
      type: true,
      amountCents: true,
      currency: true,
      occurredAt: true,
      categoryId: true,
      merchant: true,
      note: true,
      transferId: true,
      createdAt: true,
      updatedAt: true,
    };

    const select: Prisma.TransactionSelect = includeRefs
      ? {
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
        }
      : baseSelect;

    return this.prisma.transaction.findMany({
      where: {
        userId,
        ...(query.accountId ? { accountId: query.accountId } : {}),
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(query.from || query.to ? { occurredAt } : {}),
      },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
      skip: offset,
      take: limit,
      select,
    });
  }

  async getById(userId: string, id: string) {
    return this.prisma.transaction.findFirst({
      where: { id, userId },
      select: {
        id: true,
        accountId: true,
        type: true,
        amountCents: true,
        currency: true,
        occurredAt: true,
        categoryId: true,
        merchant: true,
        note: true,
        transferId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    const existing = await this.prisma.transaction.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!existing) return null;

    if (dto.accountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: dto.accountId, userId },
        select: { id: true },
      });
      if (!account) return null;
    }

    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, userId },
        select: { id: true },
      });
      if (!category) return null;
    }

    return this.prisma.transaction.update({
      where: { id },
      data: {
        accountId: dto.accountId,
        type: dto.type,
        amountCents: dto.amountCents,
        currency: dto.currency,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
        categoryId: dto.categoryId,
        merchant: dto.merchant,
        note: dto.note,
        transferId: dto.transferId,
      },
      select: {
        id: true,
        accountId: true,
        type: true,
        amountCents: true,
        currency: true,
        occurredAt: true,
        categoryId: true,
        merchant: true,
        note: true,
        transferId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.transaction.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!existing) return false;

    await this.prisma.transaction.delete({ where: { id } });
    return true;
  }
}
