'use client';

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartCard } from '@/components/charts/ChartCard';
import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { chartTheme } from '@/components/charts/chartTheme';
import { SummarySeriesResponse } from '@/lib/api/analytics';
import { formatMoney } from '@/lib/format';
import { Skeleton } from '@/components/ui/Skeleton';

type IncomeExpenseTrendChartProps = {
  data: SummarySeriesResponse['series'];
  loading?: boolean;
};

const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function IncomeExpenseTrendChart({ data, loading }: IncomeExpenseTrendChartProps) {
  const chartData = data.map((item) => ({
    label: `${monthShort[item.month - 1]} ${String(item.year).slice(-2)}`,
    income: item.totals.incomeCents / 100,
    expense: item.totals.expenseCents / 100,
    net: item.totals.netCents / 100,
  }));
  const isEmpty =
    chartData.length === 0 ||
    chartData.every(
      (point) => point.income === 0 && point.expense === 0 && point.net === 0,
    );

  return (
    <ChartCard title='Income vs Expense Trend' subtitle='Last 6 months performance'>
      <div className='h-[320px]'>
        {loading ? (
          <Skeleton className='h-full rounded-[var(--aurum-radius-lg)]' />
        ) : isEmpty ? (
          <div className='flex h-full items-center justify-center rounded-[var(--aurum-radius-lg)] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-4 text-sm text-[var(--aurum-text-muted)]'>
            No trend data available for the selected range.
          </div>
        ) : (
          <ResponsiveContainer width='100%' height='100%'>
            <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid
                stroke={chartTheme.gridStroke}
                strokeDasharray='3 4'
                vertical={false}
              />
              <XAxis
                dataKey='label'
                tick={{ fill: chartTheme.axisTick, fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: chartTheme.axisStroke }}
              />
              <YAxis
                tick={{ fill: chartTheme.axisTick, fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={54}
                tickFormatter={(value: number) => `$${Math.round(value)}`}
              />
              <Tooltip
                cursor={{ fill: 'rgba(197,160,89,0.06)' }}
                content={({ active, label, payload }) => (
                  <ChartTooltip
                    active={active}
                    label={typeof label === 'string' ? label : undefined}
                    items={(payload ?? []).map((item, index) => ({
                      key: `${item.dataKey ?? index}`,
                      label:
                        item.dataKey === 'income'
                          ? 'Income'
                          : item.dataKey === 'expense'
                            ? 'Expense'
                            : 'Net',
                      value: formatMoney(Number(item.value ?? 0) * 100),
                      color: String(item.color ?? chartTheme.accent),
                    }))}
                  />
                )}
              />
              <Bar dataKey='income' fill={chartTheme.incomeBar} radius={[6, 6, 0, 0]} maxBarSize={20} />
              <Bar dataKey='expense' fill={chartTheme.expenseBar} radius={[6, 6, 0, 0]} maxBarSize={20} />
              <Line
                type='monotone'
                dataKey='net'
                stroke={chartTheme.accent}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: chartTheme.accent }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </ChartCard>
  );
}
