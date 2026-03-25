import { Inject, Injectable } from '@nestjs/common';
import { AnalyticsService } from '../analytics/analytics.service';
import type { InsightEngine } from './insights/insight-engine.interface';
import { INSIGHT_ENGINE } from './insights/insight-engine.token';
import type {
  MonthlyReportContext,
  MonthlyReportResponse,
} from './insights/types';
import { CreateMonthlyFinancialReviewDto } from './monthly-financial-review/dto/create-monthly-financial-review.dto';
import { MonthlyFinancialReviewService } from './monthly-financial-review/monthly-financial-review.service';
import { QuickChatRequestDto } from './quick-chat/dto/quick-chat.dto';
import { QuickChatService } from './quick-chat/quick-chat.service';
import type { QuickChatResponseView } from './quick-chat/quick-chat.types';

@Injectable()
export class AiService {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly quickChatService: QuickChatService,
    private readonly monthlyFinancialReviewService: MonthlyFinancialReviewService,
    @Inject(INSIGHT_ENGINE) private readonly insightEngine: InsightEngine,
  ) {}

  async runQuickChat(
    userId: string,
    dto: QuickChatRequestDto,
  ): Promise<QuickChatResponseView> {
    return this.quickChatService.runQuickChat(userId, dto);
  }

  async getMonthlyReport(
    userId: string,
    year: number,
    month: number,
  ): Promise<MonthlyReportResponse> {
    const [summary, categoryBreakdown] = await Promise.all([
      this.analyticsService.getMonthlySummary(userId, year, month),
      this.analyticsService.getCategoryBreakdown(userId, year, month),
    ]);
    const context: MonthlyReportContext = {
      summary,
      categoryBreakdown,
    };
    const insights = await this.insightEngine.generate(context);

    return {
      year,
      month,
      summary,
      categoryBreakdown,
      insights,
    };
  }

  async createMonthlyFinancialReview(
    userId: string,
    dto: CreateMonthlyFinancialReviewDto,
  ) {
    return this.monthlyFinancialReviewService.createMonthlyFinancialReview(
      userId,
      dto,
    );
  }
}
