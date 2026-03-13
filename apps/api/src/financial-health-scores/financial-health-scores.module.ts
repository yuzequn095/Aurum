import { Module } from '@nestjs/common';
import { FinancialHealthScoresService } from './financial-health-scores.service';

@Module({
  providers: [FinancialHealthScoresService],
  exports: [FinancialHealthScoresService],
})
export class FinancialHealthScoresModule {}
