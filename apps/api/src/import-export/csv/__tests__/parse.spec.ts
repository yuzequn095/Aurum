import { parseCsv } from '../parse';

describe('parseCsv', () => {
  it('parses valid CSV rows and converts amount to cents', () => {
    const csv = [
      'occurredAt,type,amount,currency,account,category,subcategory,merchant,note',
      '2026-02-10,EXPENSE,12.34,USD,Checking,Food,Dining,"Cafe, Inc","Lunch"',
      '2026-02-11,TRANSFER,100.00,USD,Savings,,,,',
    ].join('\n');

    const result = parseCsv(csv);

    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      line: 2,
      occurredAt: '2026-02-10',
      type: 'EXPENSE',
      amount: '12.34',
      amountCents: 1234,
      account: 'Checking',
      category: 'Food',
      subcategory: 'Dining',
      merchant: 'Cafe, Inc',
      note: 'Lunch',
    });
    expect(result.rows[1]).toMatchObject({
      line: 3,
      type: 'TRANSFER',
      amountCents: 10000,
      currency: 'USD',
    });
  });

  it('returns header errors for missing columns', () => {
    const csv = [
      'occurredAt,type,amount,currency,account,category,merchant,note',
      '2026-02-10,EXPENSE,12.34,USD,Checking,Food,Cafe,Lunch',
    ].join('\n');

    const result = parseCsv(csv);

    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual([
      { line: 1, message: 'Missing required column: subcategory' },
    ]);
  });

  it('reports row-level validation errors with line numbers', () => {
    const csv = [
      'occurredAt,type,amount,currency,account,category,subcategory,merchant,note',
      '2026-13-10,EXPENSE,abc,USD,Checking,Food,,Cafe,Lunch',
      '2026-02-10,unknown,0,USD,,,Cafe,Lunch,',
    ].join('\n');

    const result = parseCsv(csv);

    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual([
      { line: 2, message: 'occurredAt must be YYYY-MM-DD' },
      {
        line: 2,
        message: 'amount must be a positive decimal with up to 2 decimals',
      },
      {
        line: 2,
        message: 'category and subcategory are required for income/expense',
      },
      { line: 3, message: 'account is required' },
      { line: 3, message: 'type must be INCOME, EXPENSE, or TRANSFER' },
      {
        line: 3,
        message: 'amount must be a positive decimal with up to 2 decimals',
      },
      { line: 3, message: 'subcategory requires category' },
    ]);
  });
});
