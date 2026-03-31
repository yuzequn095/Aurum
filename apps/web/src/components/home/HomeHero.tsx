'use client';

import Link from 'next/link';
import type { FinancialHealthScoreArtifact, PortfolioSnapshot } from '@aurum/core';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import {
  formatDateLabel,
  formatMonthLabel,
  formatMoneyFromDollars,
  getHealthVariant,
} from '@/components/home/format';

type HomeHeroProps = {
  greeting: string;
  name: string;
  year: number;
  month: number;
  yearOptions: number[];
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  latestSnapshot: PortfolioSnapshot | null;
  latestScore: FinancialHealthScoreArtifact | null;
  netCents: number;
  loading: boolean;
};

const monthOptions = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const quickActions = [
  {
    label: 'Add Transaction',
    href: '/transactions?action=create',
    tone: 'primary' as const,
  },
  {
    label: 'Open Portfolio',
    href: '/portfolio',
    tone: 'secondary' as const,
  },
  {
    label: 'Ask AI',
    href: '/ai-insights#quick-chat-section',
    tone: 'secondary' as const,
  },
];

export function HomeHero({
  greeting,
  name,
  year,
  month,
  yearOptions,
  onYearChange,
  onMonthChange,
  latestSnapshot,
  latestScore,
  netCents,
  loading,
}: HomeHeroProps) {
  const selectedMonthLabel = formatMonthLabel(year, month);
  const netLabel =
    netCents > 0
      ? 'Cash flow is positive this month.'
      : netCents < 0
        ? 'Spending is currently outpacing income.'
        : 'Cash flow is balanced this month.';

  return (
    <Card className='relative overflow-hidden border-[var(--aurum-border)] bg-[rgba(255,255,255,0.86)]'>
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(197,160,89,0.18),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(17,24,39,0.06),transparent_32%)]' />
      <CardContent className='relative space-y-8 px-5 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8'>
        <div className='grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] xl:items-start'>
          <div className='space-y-5'>
            <div className='space-y-3'>
              <Badge variant='neutral' className='bg-white/80 text-[var(--aurum-text-muted)]'>
                Aurum Home
              </Badge>
              <div className='space-y-3'>
                <h1 className='max-w-3xl text-3xl font-semibold tracking-tight text-[var(--aurum-text)] sm:text-4xl lg:text-[44px]'>
                  {greeting}, {name}.
                </h1>
                <p className='max-w-2xl text-sm leading-7 text-[var(--aurum-text-muted)] sm:text-[15px]'>
                  Aurum brings your cash flow, portfolio state, and financial intelligence into one
                  calm daily command surface. Start with today&apos;s posture, then move directly
                  into action.
                </p>
              </div>
            </div>

            <div className='flex flex-wrap gap-3'>
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className={cn(
                    'inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-medium transition',
                    action.tone === 'primary'
                      ? 'border border-transparent bg-[var(--aurum-accent)] text-white shadow-[var(--aurum-shadow)] hover:brightness-95'
                      : 'border border-[var(--aurum-border)] bg-white/88 text-[var(--aurum-text)] shadow-[var(--aurum-shadow)] hover:border-[var(--aurum-accent)]/35 hover:bg-[var(--aurum-surface-alt)]',
                  )}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </div>

          <div className='grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1'>
            <div className='rounded-[24px] border border-white/70 bg-white/82 p-4 shadow-[var(--aurum-shadow)]'>
              <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aurum-text-muted)]'>
                Focus Window
              </p>
              <p className='mt-3 text-xl font-semibold text-[var(--aurum-text)]'>
                {selectedMonthLabel}
              </p>
              <p className='mt-1 text-sm text-[var(--aurum-text-muted)]'>{netLabel}</p>
            </div>

            <div className='rounded-[24px] border border-white/70 bg-white/82 p-4 shadow-[var(--aurum-shadow)]'>
              <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aurum-text-muted)]'>
                Latest Snapshot
              </p>
              {loading ? (
                <div className='mt-3 space-y-2'>
                  <Skeleton className='h-7 w-28 rounded-[10px]' />
                  <Skeleton className='h-4 w-36 rounded-[10px]' />
                </div>
              ) : latestSnapshot ? (
                <>
                  <p className='mt-3 text-xl font-semibold text-[var(--aurum-text)]'>
                    {formatMoneyFromDollars(latestSnapshot.totalValue)}
                  </p>
                  <p className='mt-1 text-sm text-[var(--aurum-text-muted)]'>
                    {formatDateLabel(latestSnapshot.metadata.snapshotDate)}
                  </p>
                </>
              ) : (
                <p className='mt-3 text-sm leading-6 text-[var(--aurum-text-muted)]'>
                  Create or sync a portfolio snapshot to anchor Home in your latest wealth state.
                </p>
              )}
            </div>

            <div className='rounded-[24px] border border-white/70 bg-white/82 p-4 shadow-[var(--aurum-shadow)]'>
              <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aurum-text-muted)]'>
                AI Posture
              </p>
              {loading ? (
                <div className='mt-3 space-y-2'>
                  <Skeleton className='h-7 w-24 rounded-[10px]' />
                  <Skeleton className='h-4 w-32 rounded-[10px]' />
                </div>
              ) : latestScore ? (
                <>
                  <div className='mt-3 flex flex-wrap items-center gap-2'>
                    <p className='text-xl font-semibold text-[var(--aurum-text)]'>
                      {latestScore.result.totalScore}/{latestScore.result.maxScore}
                    </p>
                    <Badge variant={getHealthVariant(latestScore.result.grade)}>
                      {latestScore.result.grade.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className='mt-2 text-sm text-[var(--aurum-text-muted)]'>
                    {latestScore.insight.headline}
                  </p>
                </>
              ) : (
                <p className='mt-3 text-sm leading-6 text-[var(--aurum-text-muted)]'>
                  AI surfaces are ready when you want a health score, brief, or grounded quick
                  chat.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className='flex flex-col gap-3 rounded-[24px] border border-white/70 bg-white/72 p-4 sm:flex-row sm:items-end sm:justify-between'>
          <div className='space-y-1'>
            <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aurum-text-muted)]'>
              View Controls
            </p>
            <p className='text-sm text-[var(--aurum-text-muted)]'>
              Keep the monthly analytics layer close at hand without letting it dominate the Home
              surface.
            </p>
          </div>

          <div className='grid grid-cols-2 gap-3 sm:min-w-[260px]'>
            <label className='space-y-1 text-sm text-[var(--aurum-text-muted)]'>
              <span className='block text-[11px] font-semibold uppercase tracking-[0.14em]'>
                Year
              </span>
              <select
                value={year}
                onChange={(event) => onYearChange(Number(event.target.value))}
                className='w-full rounded-[14px] border border-[var(--aurum-border)] bg-white px-3 py-2 text-[var(--aurum-text)] outline-none transition focus:border-[var(--aurum-accent)]'
              >
                {yearOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className='space-y-1 text-sm text-[var(--aurum-text-muted)]'>
              <span className='block text-[11px] font-semibold uppercase tracking-[0.14em]'>
                Month
              </span>
              <select
                value={month}
                onChange={(event) => onMonthChange(Number(event.target.value))}
                className='w-full rounded-[14px] border border-[var(--aurum-border)] bg-white px-3 py-2 text-[var(--aurum-text)] outline-none transition focus:border-[var(--aurum-accent)]'
              >
                {monthOptions.map((label, index) => (
                  <option key={label} value={index + 1}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
