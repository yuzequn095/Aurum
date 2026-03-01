import { Inject, Injectable } from '@nestjs/common';
import { AnalyticsService } from '../analytics/analytics.service';
import type { InsightEngine } from './insights/insight-engine.interface';
import { INSIGHT_ENGINE } from './insights/insight-engine.token';
import type {
  MonthlyReportContext,
  MonthlyReportResponse,
} from './insights/types';

@Injectable()
export class AiService {
  constructor(
    private readonly analyticsService: AnalyticsService,
    @Inject(INSIGHT_ENGINE) private readonly insightEngine: InsightEngine,
  ) {}

  async getMonthlyReport(
    year: number,
    month: number,
  ): Promise<MonthlyReportResponse> {
    const [summary, categoryBreakdown] = await Promise.all([
      this.analyticsService.getMonthlySummary(year, month),
      this.analyticsService.getCategoryBreakdown(year, month),
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
}
