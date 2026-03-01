import { Injectable, NotFoundException } from '@nestjs/common';
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

  private async getDemoUserId() {
    const user = await this.prisma.user.findUnique({
      where: { email: 'demo@aurum.local' },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException(
        'Demo user not found. Did you run prisma db seed?',
      );
    }
    return user.id;
  }

  private getMonthRange(year: number, month: number) {
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1));
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
          occurredAt: { gte: startDate, lt: endDate },
        },
        _sum: { amountCents: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: TransactionType.EXPENSE,
          occurredAt: { gte: startDate, lt: endDate },
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

  async getMonthlySummary(year: number, month: number) {
    const userId = await this.getDemoUserId();

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
        endDate: new Date(currentRange.endDate.getTime() - 1).toISOString(),
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

  async getCategoryBreakdown(year: number, month: number) {
    const userId = await this.getDemoUserId();
    const { startDate, endDate } = this.getMonthRange(year, month);

    const grouped = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: TransactionType.EXPENSE,
        categoryId: { not: null },
        occurredAt: { gte: startDate, lt: endDate },
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
