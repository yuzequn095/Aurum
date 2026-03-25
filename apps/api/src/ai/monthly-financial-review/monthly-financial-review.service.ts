import type {
  AIReportArtifact,
  FinancialHealthScoreArtifact,
  PortfolioSnapshot,
} from '@aurum/core';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AIReportsService } from '../../ai-reports/ai-reports.service';
import { AnalyticsService } from '../../analytics/analytics.service';
import { FinancialHealthScoresService } from '../../financial-health-scores/financial-health-scores.service';
import { PortfolioSnapshotsService } from '../../portfolio-snapshots/portfolio-snapshots.service';
import type { InsightEngine } from '../insights/insight-engine.interface';
import { INSIGHT_ENGINE } from '../insights/insight-engine.token';
import type { Insight, MonthlyReportContext } from '../insights/types';
import type { CreateMonthlyFinancialReviewDto } from './dto/create-monthly-financial-review.dto';

type SnapshotSelectionStrategy =
  | 'explicit_snapshot_override'
  | 'latest_snapshot_on_or_before_month_end'
  | 'latest_available_snapshot_fallback';

type ReviewPeriod = {
  year: number;
  month: number;
};

type SelectedSnapshotContext = {
  snapshot: PortfolioSnapshot;
  strategy: SnapshotSelectionStrategy;
};

const MONTHLY_REVIEW_PROMPT_VERSION = '1.0.0';

function formatMonthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function formatMoneyFromCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function formatPercent(value: number | null | undefined): string {
  if (value == null) {
    return 'N/A';
  }

  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function getMonthEndDate(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function getLatestCompletedMonth(referenceDate = new Date()): ReviewPeriod {
  const year = referenceDate.getUTCFullYear();
  const monthIndex = referenceDate.getUTCMonth();

  if (monthIndex === 0) {
    return {
      year: year - 1,
      month: 12,
    };
  }

  return {
    year,
    month: monthIndex,
  };
}

function requireSnapshotId(snapshot: PortfolioSnapshot): string {
  if (!snapshot.id?.trim()) {
    throw new BadRequestException(
      'Monthly financial review requires a persisted portfolio snapshot id.',
    );
  }

  return snapshot.id;
}

function buildMonthlyReviewContent(input: {
  reviewYear: number;
  reviewMonth: number;
  snapshot: PortfolioSnapshot;
  selectionStrategy: SnapshotSelectionStrategy;
  summary: MonthlyReportContext['summary'];
  categoryBreakdown: MonthlyReportContext['categoryBreakdown'];
  insights: Insight[];
  latestScore?: FinancialHealthScoreArtifact;
}): string {
  const monthLabel = formatMonthLabel(input.reviewYear, input.reviewMonth);
  const portfolioName =
    input.snapshot.metadata.portfolioName?.trim() || 'Untitled Portfolio';
  const topCategories = input.categoryBreakdown.totals.slice(0, 5);
  const topPositions = [...input.snapshot.positions]
    .sort((left, right) => right.marketValue - left.marketValue)
    .slice(0, 5);
  const score = input.latestScore?.result;
  const scoreInsight = input.latestScore?.insight;

  const lines: string[] = [
    `# Monthly Financial Review`,
    ``,
    `## Review Window`,
    `- Period: ${monthLabel}`,
    `- Portfolio anchor: ${portfolioName}`,
    `- Snapshot date: ${input.snapshot.metadata.snapshotDate}`,
    `- Snapshot selection strategy: ${input.selectionStrategy}`,
    `- Analytics range: ${input.summary.range.startDate.slice(0, 10)} to ${input.summary.range.endDate.slice(0, 10)}`,
    ``,
    `## Cashflow Summary`,
    `- Income: ${formatMoneyFromCents(input.summary.totals.incomeCents)}`,
    `- Expenses: ${formatMoneyFromCents(input.summary.totals.expenseCents)}`,
    `- Net: ${formatMoneyFromCents(input.summary.totals.netCents)}`,
    `- Month-over-month net change: ${formatPercent(input.summary.deltaPercent?.net)}`,
    ``,
    `## Top Spending Categories`,
  ];

  if (topCategories.length === 0) {
    lines.push(`- No expense categories were recorded for this month.`);
  } else {
    for (const category of topCategories) {
      lines.push(
        `- ${category.categoryName}: ${formatMoneyFromCents(category.expenseCents)}`,
      );
    }
  }

  lines.push(
    ``,
    `## Portfolio Snapshot Context`,
    `- Total value: ${formatMoney(input.snapshot.totalValue)}`,
    `- Cash value: ${formatMoney(input.snapshot.cashValue ?? 0)}`,
    `- Positions tracked: ${input.snapshot.positions.length}`,
  );

  if (topPositions.length > 0) {
    lines.push(`- Largest positions:`);
    for (const position of topPositions) {
      lines.push(
        `  - ${position.name}${position.symbol ? ` (${position.symbol})` : ''}: ${formatMoney(position.marketValue)}`,
      );
    }
  }

  lines.push(``, `## Existing Analysis Context`);
  if (!score || !scoreInsight) {
    lines.push(
      `- No saved Financial Health Score was linked to this snapshot yet.`,
    );
  } else {
    lines.push(
      `- Latest Financial Health Score: ${score.totalScore}/${score.maxScore} (${score.grade.replaceAll('_', ' ')})`,
      `- Headline: ${scoreInsight.headline}`,
      `- Summary: ${scoreInsight.summary}`,
    );
  }

  lines.push(``, `## Key Insights`);
  if (input.insights.length === 0) {
    lines.push(`- No additional monthly insights were generated.`);
  } else {
    for (const insight of input.insights) {
      lines.push(
        `- **${insight.title}** (${insight.severity}): ${insight.body}`,
      );
    }
  }

  return lines.join('\n');
}

@Injectable()
export class MonthlyFinancialReviewService {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly portfolioSnapshotsService: PortfolioSnapshotsService,
    private readonly financialHealthScoresService: FinancialHealthScoresService,
    private readonly aiReportsService: AIReportsService,
    @Inject(INSIGHT_ENGINE) private readonly insightEngine: InsightEngine,
  ) {}

  async createMonthlyFinancialReview(
    userId: string,
    dto: CreateMonthlyFinancialReviewDto,
  ): Promise<AIReportArtifact> {
    const reviewPeriod = this.resolveReviewPeriod(dto);
    const snapshotContext = await this.resolveSnapshotContext(
      userId,
      dto,
      reviewPeriod,
    );
    const sourceSnapshotId = requireSnapshotId(snapshotContext.snapshot);
    const [summary, categoryBreakdown, scoreArtifacts] = await Promise.all([
      this.analyticsService.getMonthlySummary(
        userId,
        reviewPeriod.year,
        reviewPeriod.month,
      ),
      this.analyticsService.getCategoryBreakdown(
        userId,
        reviewPeriod.year,
        reviewPeriod.month,
      ),
      this.financialHealthScoresService.listScoreArtifactsBySourceSnapshotId(
        sourceSnapshotId,
        userId,
      ),
    ]);

    const context: MonthlyReportContext = {
      summary,
      categoryBreakdown,
    };
    const insights = await this.insightEngine.generate(context);
    const latestScore = scoreArtifacts[0];
    const monthLabel = formatMonthLabel(reviewPeriod.year, reviewPeriod.month);
    const portfolioName =
      snapshotContext.snapshot.metadata.portfolioName?.trim() ||
      'Untitled Portfolio';

    return this.aiReportsService.createMonthlyFinancialReviewReport({
      userId,
      sourceSnapshotId,
      title: `${monthLabel} Monthly Financial Review`,
      contentMarkdown: buildMonthlyReviewContent({
        reviewYear: reviewPeriod.year,
        reviewMonth: reviewPeriod.month,
        snapshot: snapshotContext.snapshot,
        selectionStrategy: snapshotContext.strategy,
        summary,
        categoryBreakdown,
        insights,
        latestScore,
      }),
      promptVersion: MONTHLY_REVIEW_PROMPT_VERSION,
      sourceRunId: `monthly-review:${reviewPeriod.year}-${String(reviewPeriod.month).padStart(2, '0')}:${sourceSnapshotId}`,
      metadata: {
        sourceTaskType: 'monthly_financial_review_v1',
        reviewYear: reviewPeriod.year,
        reviewMonth: reviewPeriod.month,
        reviewMonthLabel: monthLabel,
        sourceSnapshotId,
        snapshotDate: snapshotContext.snapshot.metadata.snapshotDate,
        snapshotSelectionStrategy: snapshotContext.strategy,
        portfolioName,
        analyticsRangeStartDate: summary.range.startDate,
        analyticsRangeEndDate: summary.range.endDate,
        linkedFinancialHealthScoreId: latestScore?.id,
        linkedFinancialHealthScoreCreatedAt: latestScore?.createdAt,
        linkedFinancialHealthScoreGrade: latestScore?.result.grade,
        linkedFinancialHealthScoreTotalScore: latestScore?.result.totalScore,
      },
    });
  }

  private resolveReviewPeriod(
    dto: CreateMonthlyFinancialReviewDto,
  ): ReviewPeriod {
    const hasYear = dto.year != null;
    const hasMonth = dto.month != null;

    if (hasYear !== hasMonth) {
      throw new BadRequestException(
        'Monthly financial review requires both year and month when either is provided.',
      );
    }

    if (hasYear && hasMonth) {
      return {
        year: dto.year as number,
        month: dto.month as number,
      };
    }

    return getLatestCompletedMonth();
  }

  private async resolveSnapshotContext(
    userId: string,
    dto: CreateMonthlyFinancialReviewDto,
    reviewPeriod: ReviewPeriod,
  ): Promise<SelectedSnapshotContext> {
    if (dto.sourceSnapshotId?.trim()) {
      const snapshot = await this.portfolioSnapshotsService.getSnapshotById(
        dto.sourceSnapshotId,
        userId,
      );

      if (!snapshot) {
        throw new BadRequestException(
          `Portfolio snapshot not found: ${dto.sourceSnapshotId}`,
        );
      }

      return {
        snapshot,
        strategy: 'explicit_snapshot_override',
      };
    }

    const snapshots =
      await this.portfolioSnapshotsService.listSnapshots(userId);
    if (snapshots.length === 0) {
      throw new BadRequestException(
        'Monthly financial review requires at least one portfolio snapshot.',
      );
    }

    const monthEndDate = getMonthEndDate(reviewPeriod.year, reviewPeriod.month);
    const snapshotOnOrBeforeMonthEnd = snapshots.find(
      (snapshot) => snapshot.metadata.snapshotDate <= monthEndDate,
    );

    if (snapshotOnOrBeforeMonthEnd) {
      return {
        snapshot: snapshotOnOrBeforeMonthEnd,
        strategy: 'latest_snapshot_on_or_before_month_end',
      };
    }

    return {
      snapshot: snapshots[0],
      strategy: 'latest_available_snapshot_fallback',
    };
  }
}
