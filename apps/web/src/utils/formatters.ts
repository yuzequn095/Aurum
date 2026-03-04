export function formatMoney(cents: number, currency = 'USD'): string {
  const amount = Math.abs(cents) / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatSignedAmount(
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER',
  cents: number,
  currency = 'USD',
): string {
  const sign = type === 'INCOME' ? '+' : type === 'EXPENSE' ? '-' : '';
  return `${sign}${formatMoney(cents, currency)}`;
}
