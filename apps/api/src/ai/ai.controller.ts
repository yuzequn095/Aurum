import { Controller, Get, Query } from '@nestjs/common';
import { GetMonthlySummaryQueryDto } from '../analytics/dto/get-monthly-summary-query.dto';
import { AiService } from './ai.service';

@Controller('v1/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('monthly-report')
  async getMonthlyReport(@Query() query: GetMonthlySummaryQueryDto) {
    return this.aiService.getMonthlyReport(query.year, query.month);
  }
}
