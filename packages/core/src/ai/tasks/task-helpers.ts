export function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function buildJsonBlock(value: unknown): string {
  return ['```json', JSON.stringify(value, null, 2), '```'].join('\n');
}

export function buildPromptPackUserMessage(parts: string[]): string {
  return parts.filter(Boolean).join('\n');
}

export function joinList(values: string[]): string {
  return values.length > 0 ? values.join(', ') : 'None provided';
}
