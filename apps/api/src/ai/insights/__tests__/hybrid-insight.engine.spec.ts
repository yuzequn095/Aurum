import { ConfigService } from '@nestjs/config';
import { HybridInsightEngine } from '../hybrid-insight.engine';
import { OpenAiCompatibleLlmClient } from '../llm/llm-client';
import { LLMInsightEngine } from '../llm-insight.engine';
import { RuleInsightEngine } from '../rule-insight.engine';
import type { Insight, MonthlyReportContext } from '../types';

const baseContext: MonthlyReportContext = {
  summary: {
    year: 2026,
    month: 2,
    range: {
      startDate: '2026-02-01T00:00:00.000Z',
      endDate: '2026-02-28T23:59:59.999Z',
    },
    totals: { incomeCents: 0, expenseCents: 0, netCents: 0 },
    previousMonth: {
      year: 2026,
      month: 1,
      totals: { incomeCents: 0, expenseCents: 0, netCents: 0 },
    },
    deltaPercent: { income: 0, expense: 0, net: 0 },
  },
  categoryBreakdown: {
    year: 2026,
    month: 2,
    totals: [],
  },
};

function createEngine(configValues?: {
  AURUM_INSIGHTS_MAX?: string;
  AURUM_LLM_ENABLED?: string;
}) {
  const config = new ConfigService({
    AURUM_INSIGHTS_MAX: configValues?.AURUM_INSIGHTS_MAX ?? '10',
    AURUM_LLM_ENABLED: configValues?.AURUM_LLM_ENABLED ?? 'true',
  });
  const ruleEngine = new RuleInsightEngine();
  const llmClient = new OpenAiCompatibleLlmClient(config);
  const llmEngine = new LLMInsightEngine(config, llmClient);
  const hybridEngine = new HybridInsightEngine(ruleEngine, llmEngine, config);

  return { hybridEngine, ruleEngine, llmEngine };
}

describe('HybridInsightEngine', () => {
  it('rule wins on duplicate id', async () => {
    const { hybridEngine, ruleEngine, llmEngine } = createEngine();
    jest
      .spyOn(ruleEngine, 'generate')
      .mockResolvedValue([
        { id: 'dup', title: 'rule', body: 'r', severity: 'warn' },
      ]);
    jest.spyOn(llmEngine, 'generate').mockResolvedValue([
      { id: 'dup', title: 'llm', body: 'l', severity: 'error' },
      { id: 'llm:new', title: 'llm2', body: 'l2', severity: 'info' },
    ]);

    const merged = await hybridEngine.generate(baseContext);

    expect(merged.map((item) => item.id)).toEqual(['dup', 'llm:new']);
    expect(merged[0]?.title).toBe('rule');
  });

  it('appends llm-only insights after rule group', async () => {
    const { hybridEngine, ruleEngine, llmEngine } = createEngine();
    jest
      .spyOn(ruleEngine, 'generate')
      .mockResolvedValue([
        { id: 'rule:1', title: 'r1', body: 'r1', severity: 'info' },
      ]);
    jest
      .spyOn(llmEngine, 'generate')
      .mockResolvedValue([
        { id: 'llm:1', title: 'l1', body: 'l1', severity: 'warn' },
      ]);

    const merged = await hybridEngine.generate(baseContext);

    expect(merged.map((item) => item.id)).toEqual(['rule:1', 'llm:1']);
  });

  it('drops llm-unavailable fallback when rules exist', async () => {
    const { hybridEngine, ruleEngine, llmEngine } = createEngine();
    jest
      .spyOn(ruleEngine, 'generate')
      .mockResolvedValue([
        { id: 'rule:1', title: 'r1', body: 'r1', severity: 'warn' },
      ]);
    jest.spyOn(llmEngine, 'generate').mockResolvedValue([
      {
        id: 'llm-unavailable',
        title: 'fallback',
        body: 'fallback',
        severity: 'warn',
      },
    ]);

    const merged = await hybridEngine.generate(baseContext);

    expect(merged.map((item) => item.id)).toEqual(['rule:1']);
  });

  it('sorts by severity deterministically inside each group', async () => {
    const { hybridEngine, ruleEngine, llmEngine } = createEngine();
    jest.spyOn(ruleEngine, 'generate').mockResolvedValue([
      { id: 'rule:i', title: 'i', body: 'i', severity: 'info' },
      { id: 'rule:e', title: 'e', body: 'e', severity: 'error' },
      { id: 'rule:w', title: 'w', body: 'w', severity: 'warn' },
    ]);
    jest.spyOn(llmEngine, 'generate').mockResolvedValue([
      { id: 'llm:g', title: 'g', body: 'g', severity: 'good' },
      { id: 'llm:w', title: 'w', body: 'w', severity: 'warn' },
    ]);

    const merged = await hybridEngine.generate(baseContext);

    expect(merged.map((item) => item.id)).toEqual([
      'rule:e',
      'rule:w',
      'rule:i',
      'llm:w',
      'llm:g',
    ]);
  });

  it('enforces maxInsights limit', async () => {
    const { hybridEngine, ruleEngine, llmEngine } = createEngine({
      AURUM_INSIGHTS_MAX: '2',
    });
    jest.spyOn(ruleEngine, 'generate').mockResolvedValue([
      { id: 'rule:1', title: 'r1', body: 'r1', severity: 'warn' },
      { id: 'rule:2', title: 'r2', body: 'r2', severity: 'info' },
    ]);
    jest
      .spyOn(llmEngine, 'generate')
      .mockResolvedValue([
        { id: 'llm:1', title: 'l1', body: 'l1', severity: 'error' },
      ]);

    const merged = await hybridEngine.generate(baseContext);

    expect(merged).toHaveLength(2);
    expect(merged.map((item) => item.id)).toEqual(['rule:1', 'rule:2']);
  });

  it('attaches source meta and preserves existing meta fields', async () => {
    const { hybridEngine, ruleEngine, llmEngine } = createEngine();
    jest.spyOn(ruleEngine, 'generate').mockResolvedValue([
      {
        id: 'rule:1',
        title: 'rule',
        body: 'rule',
        severity: 'info',
        meta: {
          note: 'existing',
          confidence: 0.93,
          evidence: { metric: 'rule-signal' },
          explain: 'Rule rationale',
        },
      },
    ]);
    jest
      .spyOn(llmEngine, 'generate')
      .mockResolvedValue([
        { id: 'llm:1', title: 'llm', body: 'llm', severity: 'info' },
      ]);

    const merged = await hybridEngine.generate(baseContext);

    expect(merged[0]?.meta).toEqual({
      note: 'existing',
      confidence: 0.93,
      evidence: { metric: 'rule-signal' },
      explain: 'Rule rationale',
      source: 'rule',
    });
    expect(merged[1]?.meta).toEqual({ source: 'llm' });
  });

  it('returns only rule insights when llm is disabled', async () => {
    const { hybridEngine, ruleEngine, llmEngine } = createEngine({
      AURUM_LLM_ENABLED: 'false',
    });
    jest
      .spyOn(ruleEngine, 'generate')
      .mockResolvedValue([
        { id: 'rule:1', title: 'r1', body: 'r1', severity: 'warn' },
      ]);
    const llmSpy = jest
      .spyOn(llmEngine, 'generate')
      .mockResolvedValue([
        { id: 'llm:1', title: 'l1', body: 'l1', severity: 'info' },
      ]);

    const merged = await hybridEngine.generate(baseContext);

    expect(merged).toEqual([
      {
        id: 'rule:1',
        title: 'r1',
        body: 'r1',
        severity: 'warn',
        meta: { source: 'rule' },
      } satisfies Insight,
    ]);
    expect(llmSpy).not.toHaveBeenCalled();
  });
});
