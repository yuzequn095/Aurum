import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';
import { GetMonthlySummaryQueryDto } from './dto/get-monthly-summary-query.dto';
import { GetSummarySeriesQueryDto } from './dto/get-summary-series-query.dto';

@Controller('v1/analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('monthly-summary')
  async getMonthlySummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetMonthlySummaryQueryDto,
  ) {
    return this.service.getMonthlySummary(user.userId, query.year, query.month);
  }

  @Get('category-breakdown')
  async getCategoryBreakdown(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetMonthlySummaryQueryDto,
  ) {
    return this.service.getCategoryBreakdown(
      user.userId,
      query.year,
      query.month,
    );
  }

  @Get('summary-series')
  async getSummarySeries(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetSummarySeriesQueryDto,
  ) {
    return this.service.getSummarySeries(
      user.userId,
      query.months,
      query.endYear,
      query.endMonth,
    );
  }
}
