'use client';

import { useMemo, useState } from 'react';
import { CategoryBreakdownDonut } from '@/components/dashboard/CategoryBreakdownDonut';
import { IncomeExpenseTrendChart } from '@/components/dashboard/IncomeExpenseTrendChart';
import { KpiSection } from '@/components/dashboard/KpiSection';
import { useDashboardData } from '@/hooks/useDashboardData';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Section } from '@/components/ui/layout';

const monthNames = [
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

export default function DashboardPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const { summary, categoryBreakdown, summarySeries, loading, error } = useDashboardData(year, month);
  const yearOptions = useMemo(() => [year, year - 1, year - 2], [year]);

  const delta = summary?.deltaPercent ?? summary?.delta ?? {};
  const incomeCents = summary?.totals.incomeCents ?? 0;
  const expenseCents = summary?.totals.expenseCents ?? 0;
  const netCents = summary?.totals.netCents ?? 0;
  const prevIncomeCents = summary?.previousMonth?.totals?.incomeCents;
  const prevExpenseCents = summary?.previousMonth?.totals?.expenseCents;
  const prevNetCents = summary?.previousMonth?.totals?.netCents;
  const hasNoCurrentMonthData =
    incomeCents === 0 &&
    expenseCents === 0 &&
    netCents === 0 &&
    (categoryBreakdown?.totals.length ?? 0) === 0;

  return (
    <PageContainer className='space-y-10'>
      <header className='space-y-2'>
        <h1 className='text-3xl font-semibold tracking-tight text-aurum-text'>
          Dashboard
        </h1>
        <p className='text-sm text-aurum-muted'>
          Monitor cashflow trends and monthly performance at a glance.
        </p>
      </header>

      {error ? (
        <div className='rounded-[14px] border border-aurum-danger/30 bg-aurum-card px-3 py-2 text-xs text-aurum-danger'>
          Dashboard data failed to load: {error}
        </div>
      ) : null}

      <Section title='Period'>
        <Card className='rounded-[14px] shadow-aurumSm'>
          <CardContent className='pt-4'>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <label className='space-y-2 text-sm text-aurum-muted'>
                Year
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className='w-full rounded-[14px] border border-aurum-border bg-aurum-card px-3 py-2 text-aurum-text'
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>

              <label className='space-y-2 text-sm text-aurum-muted'>
                Month
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className='w-full rounded-[14px] border border-aurum-border bg-aurum-card px-3 py-2 text-aurum-text'
                >
                  {monthNames.map((name, index) => (
                    <option key={name} value={index + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </CardContent>
        </Card>
      </Section>

      <KpiSection
        loading={loading}
        incomeCents={incomeCents}
        expenseCents={expenseCents}
        netCents={netCents}
        prevIncomeCents={prevIncomeCents}
        prevExpenseCents={prevExpenseCents}
        prevNetCents={prevNetCents}
        delta={delta}
      />

      {hasNoCurrentMonthData && !loading ? (
        <Card>
          <CardContent className='py-10 text-center text-sm text-[var(--aurum-text-muted)]'>
            No transactions found for this month yet. Add data to unlock trend and category insights.
          </CardContent>
        </Card>
      ) : null}

      <section className='grid grid-cols-1 gap-6 md:grid-cols-2'>
        <IncomeExpenseTrendChart data={summarySeries?.series ?? []} loading={loading} />
        <CategoryBreakdownDonut totals={categoryBreakdown?.totals ?? []} loading={loading} />
      </section>
    </PageContainer>
  );
}
