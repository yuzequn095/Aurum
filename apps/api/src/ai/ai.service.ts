import { Injectable } from '@nestjs/common';
import { AnalyticsService } from '../analytics/analytics.service';
import { RuleInsightEngine } from '../modules/ai/insights/rule-insight.engine';
import { MonthlyReportContext } from '../modules/ai/insights/types';

@Injectable()
export class AiService {
  constructor(private readonly analyticsService: AnalyticsService) {}

  async getMonthlyReport(year: number, month: number) {
    const [summary, categoryBreakdown] = await Promise.all([
      this.analyticsService.getMonthlySummary(year, month),
      this.analyticsService.getCategoryBreakdown(year, month),
    ]);
    const context: MonthlyReportContext = {
      summary,
      categoryBreakdown,
    };
    const engine = new RuleInsightEngine();
    const insights = await engine.generate(context);

    return {
      year,
      month,
      summary,
      categoryBreakdown,
      insights,
    };
  }
}
