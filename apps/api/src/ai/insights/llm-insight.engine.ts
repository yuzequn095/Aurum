import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InsightEngine } from './insight-engine.interface';
import type { Insight, MonthlyReportContext } from './types';
import { OpenAiCompatibleLlmClient } from './llm/llm-client';

@Injectable()
export class LLMInsightEngine implements InsightEngine {
  private readonly logger = new Logger(LLMInsightEngine.name);

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
    } catch (err) {
      const reason = this.getSafeReason(err);
      const mode = (this.config.get<string>('AURUM_INSIGHTS_MODE') ?? 'rules')
        .toLowerCase()
        .trim();

      this.logger.warn(`LLM insights failed: ${reason}`);

      return [
        {
          id: 'llm-unavailable',
          title: 'AI Insights unavailable',
          body: 'Falling back to rule-based insights.',
          severity: 'warn' as const,
          meta: { reason, mode },
        },
      ];
    }
  }

  private getSafeReason(error: unknown): string {
    if (error instanceof Error) {
      return error.message.slice(0, 160);
    }
    return 'unknown-error';
  }
}
