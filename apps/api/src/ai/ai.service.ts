import { Inject, Injectable } from '@nestjs/common';
import { AnalyticsService } from '../analytics/analytics.service';
import { DailyMarketBriefPreferencesService } from './daily-market-brief/daily-market-brief-preferences.service';
import { DailyMarketBriefService } from './daily-market-brief/daily-market-brief.service';
import { CreateDailyMarketBriefDto } from './daily-market-brief/dto/create-daily-market-brief.dto';
import { UpdateDailyMarketBriefPreferencesDto } from './daily-market-brief/dto/update-daily-market-brief-preferences.dto';
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
    private readonly dailyMarketBriefService: DailyMarketBriefService,
    private readonly dailyMarketBriefPreferencesService: DailyMarketBriefPreferencesService,
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

  async createDailyMarketBrief(userId: string, dto: CreateDailyMarketBriefDto) {
    return this.dailyMarketBriefService.createDailyMarketBrief(userId, dto);
  }

  async getDailyMarketBriefPreferences(userId: string) {
    return this.dailyMarketBriefPreferencesService.getPreferences(userId);
  }

  async updateDailyMarketBriefPreferences(
    userId: string,
    dto: UpdateDailyMarketBriefPreferencesDto,
  ) {
    return this.dailyMarketBriefPreferencesService.updatePreferences(
      userId,
      dto,
    );
  }
}
