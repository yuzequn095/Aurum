import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InsightEngine } from './insight-engine.interface';
import type { Insight, MonthlyReportContext } from './types';
import { LLMInsightEngine } from './llm-insight.engine';
import { RuleInsightEngine } from './rule-insight.engine';

type MergeInsightsOptions = {
  maxInsights?: number;
};

const DEFAULT_MAX_INSIGHTS = 10;
const SEVERITY_PRIORITY: Record<Insight['severity'], number> = {
  error: 4,
  warn: 3,
  good: 2,
  info: 1,
};

function withSource(insight: Insight, source: 'rule' | 'llm'): Insight {
  if (insight.meta?.source != null) {
    return insight;
  }
  return {
    ...insight,
    meta: {
      ...(insight.meta ?? {}),
      source,
    },
  };
}

function sortBySeverityStable(insights: Insight[]): Insight[] {
  return insights
    .map((insight, index) => ({ insight, index }))
    .sort((a, b) => {
      const severityDiff =
        SEVERITY_PRIORITY[b.insight.severity] -
        SEVERITY_PRIORITY[a.insight.severity];
      if (severityDiff !== 0) return severityDiff;
      return a.index - b.index;
    })
    .map(({ insight }) => insight);
}

export function mergeInsights(
  ruleInsights: Insight[],
  llmInsights: Insight[],
  options: MergeInsightsOptions = {},
): Insight[] {
  const maxInsightsRaw = options.maxInsights ?? DEFAULT_MAX_INSIGHTS;
  const maxInsights = Number.isFinite(maxInsightsRaw)
    ? Math.max(1, Math.floor(maxInsightsRaw))
    : DEFAULT_MAX_INSIGHTS;

  const normalizedRuleInsights = sortBySeverityStable(
    ruleInsights.map((insight) => withSource(insight, 'rule')),
  );
  const normalizedLlmInsights = sortBySeverityStable(
    llmInsights.map((insight) => withSource(insight, 'llm')),
  );

  const merged: Insight[] = [];
  const seen = new Set<string>();

  for (const insight of normalizedRuleInsights) {
    if (seen.has(insight.id)) continue;
    seen.add(insight.id);
    merged.push(insight);
  }

  for (const insight of normalizedLlmInsights) {
    if (seen.has(insight.id)) continue;
    seen.add(insight.id);
    merged.push(insight);
  }

  return merged.slice(0, maxInsights);
}

@Injectable()
export class HybridInsightEngine implements InsightEngine {
  constructor(
    private readonly ruleEngine: RuleInsightEngine,
    private readonly llmEngine: LLMInsightEngine,
    private readonly config: ConfigService,
  ) {}

  async generate(context: MonthlyReportContext): Promise<Insight[]> {
    const maxInsightsRaw = Number(
      this.config.get<string>('AURUM_INSIGHTS_MAX') ?? '10',
    );
    const maxInsights = Number.isFinite(maxInsightsRaw)
      ? Math.max(1, Math.floor(maxInsightsRaw))
      : 10;
    const llmEnabled =
      (this.config.get<string>('AURUM_LLM_ENABLED') ?? 'false') === 'true';

    const ruleInsights = await this.ruleEngine.generate(context);
    const llmInsights = llmEnabled
      ? await this.llmEngine.generate(context)
      : [];

    return mergeInsights(ruleInsights, llmInsights, { maxInsights });
  }
}
