import { Injectable } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type RangeSummary = {
  incomeCents: number;
  expenseCents: number;
  netCents: number;
};

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private getMonthRange(year: number, month: number) {
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    return { startDate, endDate };
  }

  private getPreviousMonth(year: number, month: number) {
    if (month === 1) {
      return { year: year - 1, month: 12 };
    }
    return { year, month: month - 1 };
  }

  private calcPercentChange(current: number, previous: number) {
    if (previous === 0) {
      return current === 0 ? 0 : null;
    }
    return Number(
      (((current - previous) / Math.abs(previous)) * 100).toFixed(2),
    );
  }

  private async getRangeSummary(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<RangeSummary> {
    const [incomeAgg, expenseAgg] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: TransactionType.INCOME,
          occurredAt: { gte: startDate, lte: endDate },
        },
        _sum: { amountCents: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: TransactionType.EXPENSE,
          occurredAt: { gte: startDate, lte: endDate },
        },
        _sum: { amountCents: true },
      }),
    ]);

    const incomeCents = incomeAgg._sum.amountCents ?? 0;
    const expenseCents = expenseAgg._sum.amountCents ?? 0;
    return {
      incomeCents,
      expenseCents,
      netCents: incomeCents - expenseCents,
    };
  }

  async getMonthlySummary(userId: string, year: number, month: number) {
    const currentRange = this.getMonthRange(year, month);
    const previousMonth = this.getPreviousMonth(year, month);
    const previousRange = this.getMonthRange(
      previousMonth.year,
      previousMonth.month,
    );

    const [current, previous] = await Promise.all([
      this.getRangeSummary(
        userId,
        currentRange.startDate,
        currentRange.endDate,
      ),
      this.getRangeSummary(
        userId,
        previousRange.startDate,
        previousRange.endDate,
      ),
    ]);

    return {
      year,
      month,
      range: {
        startDate: currentRange.startDate.toISOString(),
        endDate: currentRange.endDate.toISOString(),
      },
      totals: current,
      previousMonth: {
        year: previousMonth.year,
        month: previousMonth.month,
        totals: previous,
      },
      deltaPercent: {
        income: this.calcPercentChange(
          current.incomeCents,
          previous.incomeCents,
        ),
        expense: this.calcPercentChange(
          current.expenseCents,
          previous.expenseCents,
        ),
        net: this.calcPercentChange(current.netCents, previous.netCents),
      },
    };
  }

  async getCategoryBreakdown(userId: string, year: number, month: number) {
    const { startDate, endDate } = this.getMonthRange(year, month);

    const grouped = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: TransactionType.EXPENSE,
        categoryId: { not: null },
        occurredAt: { gte: startDate, lte: endDate },
      },
      _sum: {
        amountCents: true,
      },
    });

    const categoryIds = grouped
      .map((row) => row.categoryId)
      .filter((id): id is string => typeof id === 'string');

    const categories =
      categoryIds.length === 0
        ? []
        : await this.prisma.category.findMany({
            where: {
              userId,
              id: { in: categoryIds },
            },
            select: {
              id: true,
              name: true,
            },
          });

    const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

    const totals = grouped
      .map((row) => {
        if (!row.categoryId) return null;
        return {
          categoryId: row.categoryId,
          categoryName: categoryNameById.get(row.categoryId) ?? 'Unknown',
          expenseCents: row._sum.amountCents ?? 0,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => b.expenseCents - a.expenseCents);

    return {
      year,
      month,
      totals,
    };
  }
}
