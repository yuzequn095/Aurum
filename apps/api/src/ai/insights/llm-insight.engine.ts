import { InsightEngine } from './insight-engine.interface';
import { MonthlyReportContext } from './types';

export class LLMInsightEngine implements InsightEngine {
  constructor(private readonly placeholderEnabled = false) {}

  generate(context: MonthlyReportContext) {
    void context;
    if (!this.placeholderEnabled) return Promise.resolve([]);

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
