import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { GetMonthlySummaryQueryDto } from './dto/get-monthly-summary-query.dto';

@Controller('v1/analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('monthly-summary')
  async getMonthlySummary(@Query() query: GetMonthlySummaryQueryDto) {
    return this.service.getMonthlySummary(query.year, query.month);
  }

  @Get('category-breakdown')
  async getCategoryBreakdown(@Query() query: GetMonthlySummaryQueryDto) {
    return this.service.getCategoryBreakdown(query.year, query.month);
  }
}
