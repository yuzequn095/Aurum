import Link from 'next/link';
import type { PortfolioSnapshot } from '@aurum/core';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  formatDateLabel,
  formatMoneyFromDollars,
  getSnapshotHeadline,
  getTopPortfolioCategories,
} from '@/components/home/format';

type HomePortfolioPulseCardProps = {
  snapshot: PortfolioSnapshot | null;
  loading?: boolean;
};

export function HomePortfolioPulseCard({
  snapshot,
  loading,
}: HomePortfolioPulseCardProps) {
  const topCategories = getTopPortfolioCategories(snapshot);

  return (
    <Card className='bg-[rgba(255,255,255,0.9)]'>
      <CardHeader className='space-y-3'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div className='space-y-1'>
            <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aurum-text-muted)]'>
              Portfolio Pulse
            </p>
            <CardTitle>Snapshot-aware wealth state</CardTitle>
            <CardDescription>
              Home should understand your portfolio posture, not only this month&apos;s ledger.
            </CardDescription>
          </div>
          <Link
            href='/portfolio'
            className='inline-flex h-10 items-center justify-center rounded-full border border-[var(--aurum-border)] bg-[var(--aurum-surface)] px-4 text-sm font-medium text-[var(--aurum-text)] transition hover:border-[var(--aurum-accent)]/35 hover:bg-[var(--aurum-surface-alt)]'
          >
            Open Portfolio
          </Link>
        </div>
      </CardHeader>

      <CardContent className='space-y-5'>
        {loading ? (
          <>
            <Skeleton className='h-8 w-56 rounded-[10px]' />
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
              <Skeleton className='h-28 rounded-[20px]' />
              <Skeleton className='h-28 rounded-[20px]' />
              <Skeleton className='h-28 rounded-[20px]' />
            </div>
          </>
        ) : snapshot ? (
          <>
            <div className='space-y-2 rounded-[24px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] p-5'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div className='space-y-1'>
                  <p className='text-xl font-semibold text-[var(--aurum-text)]'>
                    {getSnapshotHeadline(snapshot)}
                  </p>
                  <p className='text-sm text-[var(--aurum-text-muted)]'>
                    Anchored to {formatDateLabel(snapshot.metadata.snapshotDate)}
                  </p>
                </div>
                <Badge variant='info'>
                  {snapshot.metadata.ingestionMode?.replaceAll('_', ' ') ??
                    snapshot.metadata.sourceType?.replaceAll('_', ' ') ??
                    'snapshot'}
                </Badge>
              </div>
            </div>

            <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
              <div className='rounded-[22px] border border-[var(--aurum-border)] bg-white p-4'>
                <p className='text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aurum-text-muted)]'>
                  Total Value
                </p>
                <p className='mt-3 text-2xl font-semibold text-[var(--aurum-text)]'>
                  {formatMoneyFromDollars(snapshot.totalValue)}
                </p>
                <p className='mt-2 text-sm text-[var(--aurum-text-muted)]'>
                  Whole-portfolio valuation from the latest persisted snapshot.
                </p>
              </div>

              <div className='rounded-[22px] border border-[var(--aurum-border)] bg-white p-4'>
                <p className='text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aurum-text-muted)]'>
                  Liquid Reserve
                </p>
                <p className='mt-3 text-2xl font-semibold text-[var(--aurum-text)]'>
                  {snapshot.cashValue != null
                    ? formatMoneyFromDollars(snapshot.cashValue)
                    : 'Not tracked'}
                </p>
                <p className='mt-2 text-sm text-[var(--aurum-text-muted)]'>
                  Cash in the snapshot model, when the source exposes it cleanly.
                </p>
              </div>

              <div className='rounded-[22px] border border-[var(--aurum-border)] bg-white p-4'>
                <p className='text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aurum-text-muted)]'>
                  Positions
                </p>
                <p className='mt-3 text-2xl font-semibold text-[var(--aurum-text)]'>
                  {snapshot.positions.length}
                </p>
                <p className='mt-2 text-sm text-[var(--aurum-text-muted)]'>
                  Source {snapshot.metadata.sourceLabel ?? 'not labeled yet'}.
                </p>
              </div>
            </div>

            <div className='space-y-3'>
              <p className='text-sm font-medium text-[var(--aurum-text)]'>Largest asset mix</p>
              {topCategories.length > 0 ? (
                <div className='flex flex-wrap gap-2'>
                  {topCategories.map((category) => (
                    <Badge key={category} variant='neutral' className='bg-[var(--aurum-surface-alt)]'>
                      {category}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className='text-sm text-[var(--aurum-text-muted)]'>
                  Asset category mix will appear here as snapshot positions accumulate.
                </p>
              )}
            </div>
          </>
        ) : (
          <div className='rounded-[24px] border border-dashed border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] p-6 text-sm leading-7 text-[var(--aurum-text-muted)]'>
            Aurum Home is ready for portfolio-aware summaries as soon as your first snapshot is
            synced or materialized. Use Portfolio to connect sources or create a manual static
            snapshot foundation.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
