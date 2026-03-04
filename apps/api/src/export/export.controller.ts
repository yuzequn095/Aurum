import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExportTransactionsQueryDto } from './dto/export-transactions-query.dto';
import { ExportService } from './export.service';

@Controller('v1/export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('transactions.csv')
  async exportTransactions(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ExportTransactionsQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.exportService.exportTransactionsCsv(
      user.userId,
      query,
    );
    const monthLabel =
      query.year && query.month
        ? `${query.year}-${String(query.month).padStart(2, '0')}`
        : 'all';
    const filename = `transactions-${monthLabel}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
