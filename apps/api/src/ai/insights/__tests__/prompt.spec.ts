import { parseAndValidateLlmOutput } from '../llm/prompt';

describe('parseAndValidateLlmOutput', () => {
  it('applies default confidence when missing', () => {
    const output = parseAndValidateLlmOutput(
      JSON.stringify({
        insights: [
          {
            id: 'alpha',
            title: 'A',
            body: 'Insight body',
            severity: 'info',
            meta: { evidence: { key: 1 } },
          },
        ],
      }),
    );

    expect(output[0]?.meta).toMatchObject({
      confidence: 0.6,
      evidence: { key: 1 },
    });
  });

  it('clamps confidence to [0,1]', () => {
    const output = parseAndValidateLlmOutput(
      JSON.stringify({
        insights: [
          {
            id: 'above',
            title: 'High',
            body: 'Body',
            severity: 'warn',
            meta: { confidence: 3 },
          },
          {
            id: 'below',
            title: 'Low',
            body: 'Body',
            severity: 'good',
            meta: { confidence: -2 },
          },
        ],
      }),
    );

    expect(output[0]?.meta).toMatchObject({ confidence: 1 });
    expect(output[1]?.meta).toMatchObject({ confidence: 0 });
  });
});
