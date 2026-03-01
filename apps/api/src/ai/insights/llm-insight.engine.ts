import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InsightEngine } from './insight-engine.interface';
import { MonthlyReportContext } from './types';

@Injectable()
export class LLMInsightEngine implements InsightEngine {
  constructor(private readonly config: ConfigService) {}

  generate(context: MonthlyReportContext) {
    void context;
    const placeholderEnabled =
      this.config.get<string>('AURUM_LLM_PLACEHOLDER') === 'true';
    if (!placeholderEnabled) return Promise.resolve([]);

    return Promise.resolve([
      {
        id: 'llm-placeholder',
        title: 'LLM Insight Placeholder',
        body: 'LLM insight generation scaffold is in place but not enabled yet.',
        severity: 'info' as const,
        meta: { source: 'llm-placeholder' },
      },
    ]);
  }
}
