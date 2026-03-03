import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetMonthlySummaryQueryDto } from '../analytics/dto/get-monthly-summary-query.dto';
import { AiService } from './ai.service';

@Controller('v1/ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('monthly-report')
  async getMonthlyReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetMonthlySummaryQueryDto,
  ) {
    return this.aiService.getMonthlyReport(
      user.userId,
      query.year,
      query.month,
    );
  }
}
