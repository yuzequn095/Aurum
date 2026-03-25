import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetMonthlySummaryQueryDto } from '../analytics/dto/get-monthly-summary-query.dto';
import { AiService } from './ai.service';
import { CreateMonthlyFinancialReviewDto } from './monthly-financial-review/dto/create-monthly-financial-review.dto';
import { QuickChatRequestDto } from './quick-chat/dto/quick-chat.dto';
import type { QuickChatResponseView } from './quick-chat/quick-chat.types';

@Controller('v1/ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('quick-chat')
  async quickChat(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: QuickChatRequestDto,
  ): Promise<QuickChatResponseView> {
    return this.aiService.runQuickChat(user.userId, body);
  }

  @Post('monthly-financial-review')
  async createMonthlyFinancialReview(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateMonthlyFinancialReviewDto,
  ) {
    return this.aiService.createMonthlyFinancialReview(user.userId, body);
  }

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
