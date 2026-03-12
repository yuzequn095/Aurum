import { Module } from '@nestjs/common';
import { AIReportsController } from './ai-reports.controller';
import { AIReportsService } from './ai-reports.service';

@Module({
  controllers: [AIReportsController],
  providers: [AIReportsService],
  exports: [AIReportsService],
})
export class AIReportsModule {}
