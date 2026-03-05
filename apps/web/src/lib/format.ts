export function formatMoney(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }

  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}
