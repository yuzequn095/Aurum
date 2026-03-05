'use client';

import { ReactNode } from 'react';

type ChartTooltipItem = {
  key: string;
  label: string;
  value: ReactNode;
  color?: string;
};

type ChartTooltipProps = {
  active?: boolean;
  label?: string;
  items?: ChartTooltipItem[];
};

export function ChartTooltip({ active, label, items }: ChartTooltipProps) {
  if (!active || !items || items.length === 0) return null;

  return (
    <div className='min-w-[170px] rounded-[var(--aurum-radius-md)] border border-[var(--aurum-border)] bg-[var(--aurum-surface)] p-3 shadow-[var(--aurum-shadow)]'>
      {label ? <p className='mb-2 text-xs font-semibold text-[var(--aurum-text)]'>{label}</p> : null}
      <div className='space-y-1.5'>
        {items.map((item) => (
          <div key={item.key} className='flex items-center justify-between gap-3 text-xs'>
            <span className='inline-flex items-center gap-1.5 text-[var(--aurum-text-muted)]'>
              {item.color ? (
                <span
                  aria-hidden='true'
                  className='h-2 w-2 rounded-full'
                  style={{ backgroundColor: item.color }}
                />
              ) : null}
              {item.label}
            </span>
            <span className='font-medium text-[var(--aurum-text)]'>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
