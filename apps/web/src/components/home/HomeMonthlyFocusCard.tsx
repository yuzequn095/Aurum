import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import type {
  CategoryBreakdownResponse,
  DashboardDeltaMap,
} from '@/lib/api/analytics';
import { formatMoney } from '@/lib/format';
import {
  formatDeltaLabel,
  getDeltaVariant,
} from '@/components/home/format';

type HomeMonthlyFocusCardProps = {
  monthLabel: string;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  delta: DashboardDeltaMap;
  categoryBreakdown: CategoryBreakdownResponse | null;
  loading?: boolean;
};

export function HomeMonthlyFocusCard({
  monthLabel,
  incomeCents,
  expenseCents,
  netCents,
  delta,
  categoryBreakdown,
  loading,
}: HomeMonthlyFocusCardProps) {
  const topCategory = [...(categoryBreakdown?.totals ?? [])].sort(
    (left, right) => right.expenseCents - left.expenseCents,
  )[0];
  const savingsRate =
    incomeCents > 0 ? Math.round((netCents / incomeCents) * 1000) / 10 : null;

  return (
    <Card className='h-full bg-[rgba(255,255,255,0.9)]'>
      <CardHeader className='space-y-3'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div className='space-y-1'>
            <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aurum-text-muted)]'>
              Cash Flow Layer
            </p>
            <CardTitle>Monthly focus</CardTitle>
            <CardDescription>
              The finance system of record still matters, but now it supports a broader Home
              experience.
            </CardDescription>
          </div>
          <Badge variant='neutral'>{monthLabel}</Badge>
        </div>
      </CardHeader>

      <CardContent className='space-y-5'>
        {loading ? (
          <>
            <Skeleton className='h-28 rounded-[24px]' />
            <Skeleton className='h-28 rounded-[24px]' />
          </>
        ) : (
          <>
            <div className='rounded-[24px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] p-5'>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div className='space-y-2'>
                  <p className='text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aurum-text-muted)]'>
                    Monthly Net Flow
                  </p>
                  <p className='text-[34px] leading-none font-semibold tracking-tight text-[var(--aurum-text)]'>
                    {formatMoney(netCents)}
                  </p>
                </div>
                <Badge variant={getDeltaVariant(delta.net)}>{formatDeltaLabel(delta.net)}</Badge>
              </div>
              <div className='mt-5 grid grid-cols-2 gap-4'>
                <div className='rounded-[18px] border border-[var(--aurum-border)] bg-white p-4'>
                  <p className='text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aurum-text-muted)]'>
                    Income
                  </p>
                  <p className='mt-2 text-xl font-semibold text-[var(--aurum-text)]'>
                    {formatMoney(incomeCents)}
                  </p>
                </div>
                <div className='rounded-[18px] border border-[var(--aurum-border)] bg-white p-4'>
                  <p className='text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aurum-text-muted)]'>
                    Expense
                  </p>
                  <p className='mt-2 text-xl font-semibold text-[var(--aurum-text)]'>
                    {formatMoney(expenseCents)}
                  </p>
                </div>
              </div>
            </div>

            <div className='rounded-[24px] border border-[var(--aurum-border)] bg-white p-5'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div className='space-y-1'>
                  <p className='text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aurum-text-muted)]'>
                    Primary spending pressure
                  </p>
                  <p className='text-lg font-semibold text-[var(--aurum-text)]'>
                    {topCategory?.categoryName ?? 'No expense category yet'}
                  </p>
                </div>
                {topCategory ? (
                  <Badge variant='warn'>{formatMoney(topCategory.expenseCents)}</Badge>
                ) : null}
              </div>

              <div className='mt-4 space-y-3 text-sm leading-7 text-[var(--aurum-text-muted)]'>
                <p>
                  {topCategory
                    ? `${topCategory.categoryName ?? 'This category'} is currently your largest expense concentration for ${monthLabel}.`
                    : `No expense concentration yet for ${monthLabel}. Add transactions to unlock richer operating context.`}
                </p>
                <p>
                  {savingsRate == null
                    ? 'Savings rate becomes visible once income is present in the selected month.'
                    : `Savings rate is ${savingsRate.toFixed(1)}% for the selected month.`}
                </p>
              </div>
            </div>

            <Link
              href='/transactions'
              className='inline-flex h-10 items-center justify-center rounded-full border border-[var(--aurum-border)] bg-[var(--aurum-surface)] px-4 text-sm font-medium text-[var(--aurum-text)] transition hover:border-[var(--aurum-accent)]/35 hover:bg-[var(--aurum-surface-alt)]'
            >
              Review transactions
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
