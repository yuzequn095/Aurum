import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InsightEngine } from './insight-engine.interface';
import type { Insight, MonthlyReportContext } from './types';
import { OpenAiCompatibleLlmClient } from './llm/llm-client';

@Injectable()
export class LLMInsightEngine implements InsightEngine {
  constructor(
    private readonly config: ConfigService,
    private readonly llmClient: OpenAiCompatibleLlmClient,
  ) {}

  async generate(context: MonthlyReportContext): Promise<Insight[]> {
    const enabled =
      (this.config.get<string>('AURUM_LLM_ENABLED') ?? 'false') === 'true';
    if (!enabled) {
      return [];
    }

    try {
      return await this.llmClient.generateInsights(context);
    } catch {
      return [
        {
          id: 'llm-unavailable',
          title: 'AI Insights unavailable',
          body: 'Falling back to rule-based insights.',
          severity: 'warn' as const,
        },
      ];
    }
  }
}
