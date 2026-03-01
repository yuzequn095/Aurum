import type { Insight } from './types';
import { mergeInsights } from './hybrid-insight.engine';

describe('mergeInsights', () => {
  it('keeps rule insight when id conflicts with llm insight', () => {
    const ruleInsights: Insight[] = [
      {
        id: 'shared-id',
        title: 'Rule Title',
        body: 'Rule Body',
        severity: 'warn',
      },
    ];
    const llmInsights: Insight[] = [
      {
        id: 'shared-id',
        title: 'LLM Title',
        body: 'LLM Body',
        severity: 'error',
      },
      {
        id: 'llm:new',
        title: 'LLM New',
        body: 'LLM New Body',
        severity: 'info',
      },
    ];

    const merged = mergeInsights(ruleInsights, llmInsights, {
      maxInsights: 10,
    });

    expect(merged).toHaveLength(2);
    expect(merged[0].title).toBe('Rule Title');
    expect(merged[1].id).toBe('llm:new');
  });

  it('deduplicates within llm insights by id', () => {
    const llmInsights: Insight[] = [
      { id: 'llm:a', title: 'A1', body: 'A1', severity: 'info' },
      { id: 'llm:a', title: 'A2', body: 'A2', severity: 'warn' },
    ];

    const merged = mergeInsights([], llmInsights, { maxInsights: 10 });

    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('llm:a');
  });

  it('applies maxInsights limit without removing rule insights first', () => {
    const ruleInsights: Insight[] = [
      { id: 'rule:1', title: 'r1', body: 'r1', severity: 'info' },
      { id: 'rule:2', title: 'r2', body: 'r2', severity: 'warn' },
      { id: 'rule:3', title: 'r3', body: 'r3', severity: 'good' },
    ];
    const llmInsights: Insight[] = [
      {
        id: 'llm-unavailable',
        title: 'fallback',
        body: 'fallback',
        severity: 'warn',
      },
    ];

    const merged = mergeInsights(ruleInsights, llmInsights, { maxInsights: 3 });

    expect(merged.map((item) => item.id)).toEqual([
      'rule:2',
      'rule:3',
      'rule:1',
    ]);
  });

  it('keeps deterministic order by severity inside each group', () => {
    const ruleInsights: Insight[] = [
      { id: 'rule:low', title: 'low', body: 'low', severity: 'info' },
      { id: 'rule:high', title: 'high', body: 'high', severity: 'error' },
      { id: 'rule:mid', title: 'mid', body: 'mid', severity: 'warn' },
    ];
    const llmInsights: Insight[] = [
      { id: 'llm:i', title: 'i', body: 'i', severity: 'info' },
      { id: 'llm:w', title: 'w', body: 'w', severity: 'warn' },
      { id: 'llm:g', title: 'g', body: 'g', severity: 'good' },
    ];

    const merged = mergeInsights(ruleInsights, llmInsights, {
      maxInsights: 10,
    });

    expect(merged.map((item) => item.id)).toEqual([
      'rule:high',
      'rule:mid',
      'rule:low',
      'llm:w',
      'llm:g',
      'llm:i',
    ]);
  });

  it('attaches source meta when missing and preserves existing source', () => {
    const ruleInsights: Insight[] = [
      {
        id: 'rule:keep-meta',
        title: 'keep',
        body: 'keep',
        severity: 'info',
        meta: { source: 'custom', note: 'x' },
      },
      {
        id: 'rule:add-meta',
        title: 'add',
        body: 'add',
        severity: 'info',
      },
    ];
    const llmInsights: Insight[] = [
      { id: 'llm:add-meta', title: 'llm', body: 'llm', severity: 'info' },
    ];

    const merged = mergeInsights(ruleInsights, llmInsights, {
      maxInsights: 10,
    });

    expect(merged.find((item) => item.id === 'rule:keep-meta')?.meta).toEqual({
      source: 'custom',
      note: 'x',
    });
    expect(merged.find((item) => item.id === 'rule:add-meta')?.meta).toEqual({
      source: 'rule',
    });
    expect(merged.find((item) => item.id === 'llm:add-meta')?.meta).toEqual({
      source: 'llm',
    });
  });
});
