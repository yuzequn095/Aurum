'use client';

import { useMemo, useState } from 'react';
import { CategoryBreakdownDonut } from '@/components/dashboard/CategoryBreakdownDonut';
import { IncomeExpenseTrendChart } from '@/components/dashboard/IncomeExpenseTrendChart';
import { HomeAiBriefCard } from '@/components/home/HomeAiBriefCard';
import { HomeHero } from '@/components/home/HomeHero';
import { HomeMonthlyFocusCard } from '@/components/home/HomeMonthlyFocusCard';
import { HomePortfolioPulseCard } from '@/components/home/HomePortfolioPulseCard';
import { HomeSummaryGrid, type HomeSummaryItem } from '@/components/home/HomeSummaryGrid';
import {
  centsFromDollars,
  formatDateLabel,
  formatDeltaLabel,
  formatMoneyFromDollars,
  formatMoneyFromOptionalCents,
  formatMonthLabel,
  getDeltaVariant,
  getDisplayNameFromEmail,
  getGreetingForTime,
  getHealthLabel,
  getHealthVariant,
} from '@/components/home/format';
import { useAuthSession } from '@/lib/auth/session';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useHomeOverview } from '@/hooks/useHomeOverview';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';

export default function DashboardPage() {
  const now = new Date();
  const { userEmail } = useAuthSession();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const { summary, categoryBreakdown, summarySeries, loading, error } = useDashboardData(year, month);
  const homeOverview = useHomeOverview();
  const yearOptions = useMemo(() => [year, year - 1, year - 2], [year]);

  const delta = summary?.deltaPercent ?? summary?.delta ?? {};
  const incomeCents = summary?.totals.incomeCents ?? 0;
  const expenseCents = summary?.totals.expenseCents ?? 0;
  const netCents = summary?.totals.netCents ?? 0;
  const latestSnapshot = homeOverview.latestSnapshot;
  const latestScore = homeOverview.latestScore;
  const selectedMonthLabel = formatMonthLabel(year, month);
  const greeting = getGreetingForTime();
  const displayName = getDisplayNameFromEmail(userEmail);
  const snapshotValueCents = centsFromDollars(latestSnapshot?.totalValue);
  const liquidValueCents = centsFromDollars(latestSnapshot?.cashValue);
  const summaryItems: HomeSummaryItem[] = [
    {
      eyebrow: 'Wealth State',
      value: latestSnapshot ? formatMoneyFromDollars(latestSnapshot.totalValue) : 'No snapshot',
      title: 'Latest portfolio value',
      detail: latestSnapshot
        ? `Anchored to ${formatDateLabel(latestSnapshot.metadata.snapshotDate)}.`
        : 'Portfolio Home comes fully alive once a snapshot exists.',
      badgeText: latestSnapshot ? 'Portfolio aware' : 'Waiting for snapshot',
      badgeVariant: latestSnapshot ? 'info' : 'neutral',
    },
    {
      eyebrow: 'Liquidity',
      value:
        latestSnapshot?.cashValue != null
          ? formatMoneyFromDollars(latestSnapshot.cashValue)
          : 'Not tracked',
      title: 'Liquid reserve',
      detail:
        latestSnapshot?.cashValue != null
          ? 'Cash surfaced from the latest snapshot model.'
          : 'Some providers do not expose a clean cash line yet.',
      badgeText: latestSnapshot?.cashValue != null ? 'Snapshot cash' : 'Portfolio gap',
      badgeVariant: latestSnapshot?.cashValue != null ? 'neutral' : 'warn',
    },
    {
      eyebrow: 'Cash Flow',
      value: formatMoneyFromOptionalCents(netCents),
      title: 'Monthly net flow',
      detail: `${selectedMonthLabel} selected on Home.`,
      badgeText: formatDeltaLabel(delta.net),
      badgeVariant: getDeltaVariant(delta.net),
    },
    {
      eyebrow: 'Financial Health',
      value: getHealthLabel(latestScore),
      title: latestScore ? 'Latest health score' : 'AI score status',
      detail: latestScore
        ? latestScore.insight.headline
        : 'Generate a score in AI Insights when you want a fuller top-level posture.',
      badgeText: latestScore
        ? latestScore.result.grade.replace('_', ' ')
        : homeOverview.entitlements?.status === 'active'
          ? 'AI ready'
          : 'Historical read',
      badgeVariant: latestScore
        ? getHealthVariant(latestScore.result.grade)
        : homeOverview.entitlements?.status === 'active'
          ? 'good'
          : 'neutral',
    },
  ];

  return (
    <PageContainer className='space-y-8 pb-8 md:space-y-10 md:pb-10'>
      {error ? (
        <div className='rounded-[18px] border border-aurum-danger/25 bg-[rgba(210,75,75,0.08)] px-4 py-3 text-sm text-aurum-danger'>
          Home cash flow data failed to load: {error}
        </div>
      ) : null}

      {homeOverview.errors.length > 0 ? (
        <div className='rounded-[18px] border border-[var(--aurum-border)] bg-[rgba(255,255,255,0.72)] px-4 py-3 text-sm text-[var(--aurum-text-muted)]'>
          Some portfolio or AI surfaces are temporarily unavailable. Home will keep the layout
          stable and fill those sections again once the data becomes reachable.
        </div>
      ) : null}

      <HomeHero
        greeting={greeting}
        name={displayName}
        year={year}
        month={month}
        yearOptions={yearOptions}
        onYearChange={setYear}
        onMonthChange={setMonth}
        latestSnapshot={latestSnapshot}
        latestScore={latestScore}
        netCents={netCents}
        loading={loading || homeOverview.loading}
      />

      <HomeSummaryGrid items={summaryItems} loading={loading || homeOverview.loading} />

      <section className='grid grid-cols-1 gap-6 xl:grid-cols-[1.12fr_0.88fr]'>
        <HomePortfolioPulseCard snapshot={latestSnapshot} loading={homeOverview.loading} />
        <HomeAiBriefCard
          latestReport={homeOverview.latestReport}
          latestScore={latestScore}
          entitlements={homeOverview.entitlements}
          loading={homeOverview.loading}
        />
      </section>

      <section className='space-y-4'>
        <div className='space-y-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aurum-text-muted)]'>
              Secondary Signals
            </p>
            {snapshotValueCents != null ? <Badge variant='info'>Portfolio on Home</Badge> : null}
            {liquidValueCents != null ? <Badge variant='neutral'>Liquidity visible</Badge> : null}
          </div>
          <h2 className='text-2xl font-semibold tracking-tight text-[var(--aurum-text)]'>
            Trends and monthly pressure points
          </h2>
          <p className='text-sm leading-7 text-[var(--aurum-text-muted)]'>
            Keep the analytics layer nearby for pattern recognition, but let it support the broader
            wealth operating picture.
          </p>
        </div>

        <section className='grid grid-cols-1 gap-6 xl:grid-cols-[0.86fr_1.14fr]'>
          <HomeMonthlyFocusCard
            monthLabel={selectedMonthLabel}
            incomeCents={incomeCents}
            expenseCents={expenseCents}
            netCents={netCents}
            delta={delta}
            categoryBreakdown={categoryBreakdown}
            loading={loading}
          />
          <IncomeExpenseTrendChart data={summarySeries?.series ?? []} loading={loading} />
        </section>

        <section className='grid grid-cols-1 gap-6 xl:grid-cols-[0.98fr_1.02fr]'>
          <CategoryBreakdownDonut totals={categoryBreakdown?.totals ?? []} loading={loading} />
          <Card className='bg-[rgba(255,255,255,0.9)]'>
            <CardContent className='space-y-5 pt-5'>
              <div className='space-y-2'>
                <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aurum-text-muted)]'>
                  Home Readout
                </p>
                <h3 className='text-2xl font-semibold tracking-tight text-[var(--aurum-text)]'>
                  Today&apos;s operating summary
                </h3>
              </div>

              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <div className='rounded-[22px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] p-4'>
                  <p className='text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aurum-text-muted)]'>
                    Portfolio coverage
                  </p>
                  <p className='mt-2 text-lg font-semibold text-[var(--aurum-text)]'>
                    {latestSnapshot
                      ? `${latestSnapshot.positions.length} positions across the latest snapshot`
                      : 'No snapshot persisted yet'}
                  </p>
                  <p className='mt-2 text-sm leading-6 text-[var(--aurum-text-muted)]'>
                    {latestSnapshot
                      ? `Latest anchor: ${formatDateLabel(latestSnapshot.metadata.snapshotDate)}.`
                      : 'Connect or materialize a source in Portfolio to bring Home beyond ledger-only context.'}
                  </p>
                </div>

                <div className='rounded-[22px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] p-4'>
                  <p className='text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aurum-text-muted)]'>
                    AI artifact history
                  </p>
                  <p className='mt-2 text-lg font-semibold text-[var(--aurum-text)]'>
                    {homeOverview.reports.length} reports / {homeOverview.scores.length} scores
                  </p>
                  <p className='mt-2 text-sm leading-6 text-[var(--aurum-text-muted)]'>
                    {homeOverview.latestReport
                      ? `Latest brief: ${homeOverview.latestReport.title}.`
                      : 'No persisted brief yet. AI Insights remains available for on-demand analysis.'}
                  </p>
                </div>
              </div>

              <div className='rounded-[24px] border border-[var(--aurum-border)] bg-white p-5'>
                <p className='text-sm leading-7 text-[var(--aurum-text-muted)]'>
                  Aurum Home now starts with wealth state first, keeps monthly operating context
                  close, and makes AI and portfolio surfaces visible even when they are still in a
                  graceful empty state.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </section>
    </PageContainer>
  );
}
