import { Module } from '@nestjs/common';
import { AIReportsService } from './ai-reports.service';

@Module({
  providers: [AIReportsService],
  exports: [AIReportsService],
})
export class AIReportsModule {}
