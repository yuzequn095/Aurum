'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type IncomeExpensePoint = {
  label: string;
  income: number;
  expense: number;
};

type CategoryPoint = {
  name: string;
  value: number;
};

function formatDollars(dollars: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

function asNumber(value: unknown) {
  return typeof value === 'number' ? value : 0;
}

export function IncomeExpenseBarChart({ data }: { data: IncomeExpensePoint[] }) {
  const chartData = data.map((item) => ({
    label: item.label,
    income: item.income / 100,
    expense: item.expense / 100,
  }));

  return (
    <ResponsiveContainer width='100%' height='100%'>
      <BarChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke='#E2E8F0' strokeDasharray='3 3' />
        <XAxis dataKey='label' stroke='#64748B' tickLine={false} axisLine={false} />
        <YAxis
          stroke='#64748B'
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => `$${Math.round(value)}`}
        />
        <Tooltip
          formatter={(value: unknown, name: unknown) => [
            formatDollars(asNumber(value)),
            typeof name === 'string' ? name : '',
          ]}
          contentStyle={{
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            backgroundColor: '#FFFFFF',
          }}
        />
        <Bar dataKey='income' fill='#16A34A' radius={[6, 6, 0, 0]} />
        <Bar dataKey='expense' fill='#DC2626' radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const PIE_COLORS = ['#F5C542', '#E3B233', '#FDF3D1', '#64748B'];

export function CategoryBreakdownPieChart({ data }: { data: CategoryPoint[] }) {
  return (
    <ResponsiveContainer width='100%' height='100%'>
      <PieChart>
        <Tooltip
          formatter={(value: unknown) => [`${asNumber(value)}%`, 'Share']}
          contentStyle={{
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            backgroundColor: '#FFFFFF',
          }}
        />
        <Pie
          data={data}
          dataKey='value'
          nameKey='name'
          cx='50%'
          cy='50%'
          innerRadius={52}
          outerRadius={78}
          paddingAngle={2}
        >
          {data.map((entry, index) => (
            <Cell key={`${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
