import type {
  AIReportArtifact,
  FinancialHealthGrade,
  FinancialHealthScoreArtifact,
  PortfolioSnapshot,
} from '@aurum/core';
import type { BadgeProps } from '@/components/ui/Badge';
import { formatMoney } from '@/lib/format';

export const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function formatMoneyFromDollars(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return 'N/A';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

export function formatDateLabel(value: string | null | undefined): string {
  if (!value) {
    return 'No date yet';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatMonthLabel(year: number, month: number): string {
  return `${monthNames[month - 1] ?? 'Month'} ${year}`;
}

export function getGreetingForTime(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) {
    return 'Good morning';
  }
  if (hour < 18) {
    return 'Good afternoon';
  }
  return 'Good evening';
}

export function getDisplayNameFromEmail(email: string | null | undefined): string {
  if (!email) {
    return 'there';
  }

  const localPart = email.split('@')[0] ?? '';
  const normalized = localPart
    .split(/[._-]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

  return normalized || 'there';
}

export function stripMarkdownToPreview(value: string, maxLength = 240): string {
  const normalized = value
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/\n{2,}/g, '\n')
    .trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function formatDeltaLabel(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return 'No prior month comparison';
  }

  if (value === 0) {
    return 'Flat vs last month';
  }

  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}% vs last month`;
}

export function getDeltaVariant(value: number | null | undefined): BadgeProps['variant'] {
  if (value == null || Number.isNaN(value) || value === 0) {
    return 'neutral';
  }
  return value > 0 ? 'good' : 'error';
}

export function getHealthVariant(
  grade: FinancialHealthGrade | null | undefined,
): BadgeProps['variant'] {
  switch (grade) {
    case 'excellent':
      return 'good';
    case 'good':
      return 'info';
    case 'fair':
      return 'warn';
    case 'needs_attention':
      return 'error';
    default:
      return 'neutral';
  }
}

export function getHealthLabel(score: FinancialHealthScoreArtifact | null): string {
  if (!score) {
    return 'No score yet';
  }

  return `${score.result.totalScore}/${score.result.maxScore}`;
}

export function getTopPortfolioCategories(snapshot: PortfolioSnapshot | null): string[] {
  if (!snapshot) {
    return [];
  }

  const grouped = snapshot.positions.reduce<Record<string, number>>((accumulator, position) => {
    const key = position.category ?? 'other';
    accumulator[key] = (accumulator[key] ?? 0) + position.marketValue;
    return accumulator;
  }, {});

  return Object.entries(grouped)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([label]) => label.replace('_', ' '));
}

export function getSnapshotHeadline(snapshot: PortfolioSnapshot | null): string {
  if (!snapshot) {
    return 'No portfolio snapshot yet';
  }

  return snapshot.metadata.portfolioName ?? 'Latest portfolio snapshot';
}

export function getReportPreview(report: AIReportArtifact | null): string {
  if (!report) {
    return 'No executive brief has been generated yet. Use AI Insights when you want a persisted Monthly Financial Review or Daily Market Brief.';
  }

  return stripMarkdownToPreview(report.contentMarkdown, 260);
}

export function centsFromDollars(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) {
    return null;
  }

  return Math.round(value * 100);
}

export function formatMoneyFromOptionalCents(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return 'N/A';
  }

  return formatMoney(value);
}
