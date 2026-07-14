'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { CashflowChannelFlow } from '@/components/dashboard/CashflowChannelFlow';
import { PortfolioAttentionItems } from '@/components/attention/PortfolioAttentionItems';
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
import { useCashflowChannels } from '@/hooks/useCashflowChannels';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useHomeOverview } from '@/hooks/useHomeOverview';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';

const CategoryBreakdownDonut = dynamic(
  () =>
    import('@/components/dashboard/CategoryBreakdownDonut').then(
      (module) => module.CategoryBreakdownDonut,
    ),
  { ssr: false },
);

const IncomeExpenseTrendChart = dynamic(
  () =>
    import('@/components/dashboard/IncomeExpenseTrendChart').then(
      (module) => module.IncomeExpenseTrendChart,
    ),
  { ssr: false },
);

export default function DashboardPage() {
  const now = new Date();
  const { userEmail } = useAuthSession();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const { summary, categoryBreakdown, summarySeries, loading, error } = useDashboardData(year, month);
  const cashflowChannels = useCashflowChannels(year, month);
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
          : 'History visible',
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
        <div className='rounded-[18px] border border-[var(--aurum-border)] bg-white px-4 py-3 text-sm text-[var(--aurum-text-muted)]'>
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

      <PortfolioAttentionItems
        title='What may need your attention'
        description='Computed from portfolio freshness, changes, and diagnostic state. No background action is taken.'
        limit={4}
      />

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
              Supporting Signals
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

        <div className='space-y-6 rounded-[28px] border border-[var(--aurum-border)] bg-white p-4 sm:p-5'>
          <CashflowChannelFlow
            incomeCents={incomeCents}
            expenseCents={expenseCents}
            netCents={netCents}
            incomeChannels={cashflowChannels.incomeChannels}
            expenseChannels={cashflowChannels.expenseChannels}
            monthLabel={selectedMonthLabel}
            loading={loading || cashflowChannels.loading}
            error={cashflowChannels.error}
          />

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
            <Card>
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
                        : 'No snapshot yet'}
                    </p>
                    <p className='mt-2 text-sm leading-6 text-[var(--aurum-text-muted)]'>
                      {latestSnapshot
                        ? `Latest anchor: ${formatDateLabel(latestSnapshot.metadata.snapshotDate)}.`
                        : 'Connect or materialize a source in Portfolio to bring Home beyond ledger-only context.'}
                    </p>
                  </div>

                  <div className='rounded-[22px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] p-4'>
                    <p className='text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aurum-text-muted)]'>
                      AI history
                    </p>
                    <p className='mt-2 text-lg font-semibold text-[var(--aurum-text)]'>
                      {homeOverview.reports.length} reports / {homeOverview.scores.length} scores
                    </p>
                    <p className='mt-2 text-sm leading-6 text-[var(--aurum-text-muted)]'>
                      {homeOverview.latestReport
                        ? `Latest brief: ${homeOverview.latestReport.title}.`
                        : 'No saved brief yet. AI Insights remains available for on-demand analysis.'}
                    </p>
                  </div>
                </div>

                <div className='rounded-[24px] border border-[var(--aurum-border)] bg-white p-5'>
                  <p className='text-sm leading-7 text-[var(--aurum-text-muted)]'>
                    Home keeps the daily decision path short: check wealth posture, confirm the
                    month&apos;s operating pressure, then continue into Portfolio, Transactions, or
                    AI Insights when a deeper workflow is needed.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className='grid grid-cols-1 gap-6 xl:grid-cols-[1.02fr_0.98fr]'>
            <IncomeExpenseTrendChart data={summarySeries?.series ?? []} loading={loading} />
            <CategoryBreakdownDonut totals={categoryBreakdown?.totals ?? []} loading={loading} />
          </section>
        </div>
      </section>
    </PageContainer>
  );
}
