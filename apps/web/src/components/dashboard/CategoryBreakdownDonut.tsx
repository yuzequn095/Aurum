'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartCard } from '@/components/charts/ChartCard';
import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { chartTheme } from '@/components/charts/chartTheme';
import { Skeleton } from '@/components/ui/Skeleton';
import { CategoryBreakdownResponse } from '@/lib/api/analytics';
import { formatMoney } from '@/lib/format';

type CategoryBreakdownDonutProps = {
  totals: CategoryBreakdownResponse['totals'];
  loading?: boolean;
};

export function CategoryBreakdownDonut({ totals, loading }: CategoryBreakdownDonutProps) {
  if (loading) {
    return (
      <ChartCard title='Category Breakdown' subtitle='Selected month expenses'>
        <Skeleton className='h-[320px] rounded-[var(--aurum-radius-lg)]' />
      </ChartCard>
    );
  }

  if (totals.length === 0) {
    return (
      <ChartCard title='Category Breakdown' subtitle='Selected month expenses'>
        <div className='flex h-[320px] items-center justify-center rounded-[var(--aurum-radius-lg)] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] p-4 text-sm text-[var(--aurum-text-muted)]'>
          No expenses recorded for this month.
        </div>
      </ChartCard>
    );
  }

  const data = totals.map((item) => ({
    name: item.categoryName || 'Uncategorized',
    value: item.expenseCents / 100,
    expenseCents: item.expenseCents,
  }));

  return (
    <ChartCard title='Category Breakdown' subtitle='Selected month expenses'>
      <div className='grid grid-cols-1 gap-4 xl:grid-cols-[230px_minmax(0,1fr)]'>
        <div className='h-[230px]'>
          <ResponsiveContainer width='100%' height='100%'>
            <PieChart>
              <Tooltip
                content={({ active, label, payload }) => (
                  <ChartTooltip
                    active={active}
                    label={typeof label === 'string' ? label : undefined}
                    items={(payload ?? []).map((item, index) => ({
                      key: `${item.name ?? index}`,
                      label: String(item.name ?? 'Expense'),
                      value: formatMoney(Number(item.value ?? 0) * 100),
                      color: String(item.color ?? chartTheme.accent),
                    }))}
                  />
                )}
              />
              <Pie
                data={data}
                dataKey='value'
                nameKey='name'
                innerRadius={58}
                outerRadius={92}
                paddingAngle={2}
                stroke='none'
              >
                {data.map((entry, idx) => (
                  <Cell key={`${entry.name}-${idx}`} fill={chartTheme.donutPalette[idx % chartTheme.donutPalette.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className='max-h-[230px] space-y-2 overflow-auto pr-1'>
          {totals.map((item, idx) => (
            <div
              key={item.categoryId ?? item.categoryName ?? idx}
              className='flex items-center justify-between rounded-[var(--aurum-radius-md)] border border-[var(--aurum-border)] bg-[var(--aurum-surface)] px-3 py-2'
            >
              <span className='inline-flex items-center gap-2 text-sm text-[var(--aurum-text)]'>
                <span
                  aria-hidden='true'
                  className='h-2.5 w-2.5 rounded-full'
                  style={{ backgroundColor: chartTheme.donutPalette[idx % chartTheme.donutPalette.length] }}
                />
                {item.categoryName || 'Uncategorized'}
              </span>
              <span className='text-sm font-medium text-[var(--aurum-text)]'>
                {formatMoney(item.expenseCents)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}
