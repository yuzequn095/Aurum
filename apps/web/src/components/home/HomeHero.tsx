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
  {
    label: 'Latest Reports',
    href: '/ai-insights#reports',
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
    <Card className='aurum-elevated-surface relative overflow-hidden border-[var(--aurum-border)]'>
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
                  calm daily command surface. Start with the current posture, then move directly
                  into the workflow that needs attention.
                </p>
              </div>
            </div>

            <div className='grid grid-cols-2 gap-3 sm:flex sm:flex-wrap'>
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className={cn(
                    'inline-flex min-h-11 w-full items-center justify-center rounded-full px-4 text-center text-sm font-medium transition active:translate-y-px sm:w-auto',
                    action.tone === 'primary'
                      ? 'border border-transparent bg-[linear-gradient(135deg,var(--aurum-accent),var(--aurum-gold-strong))] text-white shadow-[var(--aurum-shadow)] hover:brightness-95'
                      : 'border border-[var(--aurum-border)] bg-white/86 text-[var(--aurum-text)] shadow-[var(--aurum-shadow)] hover:border-[var(--aurum-accent)]/35 hover:bg-white',
                  )}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </div>

          <div className='grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1'>
            <div className='rounded-[24px] border border-white/70 bg-white/78 p-4 shadow-[var(--aurum-shadow)] backdrop-blur-[2px]'>
              <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aurum-text-muted)]'>
                Focus Window
              </p>
              <p className='mt-3 text-xl font-semibold text-[var(--aurum-text)]'>
                {selectedMonthLabel}
              </p>
              <p className='mt-1 text-sm text-[var(--aurum-text-muted)]'>{netLabel}</p>
            </div>

            <div className='rounded-[24px] border border-white/70 bg-white/78 p-4 shadow-[var(--aurum-shadow)] backdrop-blur-[2px]'>
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
                  Create or sync a portfolio snapshot to bring your latest wealth state into Home.
                </p>
              )}
            </div>

            <div className='rounded-[24px] border border-white/70 bg-white/78 p-4 shadow-[var(--aurum-shadow)] backdrop-blur-[2px]'>
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
                  Health scores, reports, and Quick Chat appear here once AI Insights has context.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className='flex flex-col gap-3 rounded-[24px] border border-white/70 bg-white/72 p-4 shadow-[0_18px_44px_-36px_rgba(17,24,39,0.45)] backdrop-blur-[2px] sm:flex-row sm:items-end sm:justify-between'>
          <div className='space-y-1'>
            <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aurum-text-muted)]'>
              View Controls
            </p>
            <p className='text-sm text-[var(--aurum-text-muted)]'>
              Choose the month for supporting cash flow analytics below.
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
                className='min-h-11 w-full rounded-[14px] border border-[var(--aurum-border)] bg-white px-3 py-2 text-[var(--aurum-text)] outline-none transition focus:border-[var(--aurum-accent)] focus:ring-2 focus:ring-[var(--aurum-accent)]/15'
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
                className='min-h-11 w-full rounded-[14px] border border-[var(--aurum-border)] bg-white px-3 py-2 text-[var(--aurum-text)] outline-none transition focus:border-[var(--aurum-accent)] focus:ring-2 focus:ring-[var(--aurum-accent)]/15'
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
