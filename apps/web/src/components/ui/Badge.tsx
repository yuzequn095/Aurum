import { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type BadgeVariant = 'neutral' | 'info' | 'warn' | 'good' | 'error';

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variantClasses: Record<BadgeVariant, string> = {
  neutral:
    'border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] text-[var(--aurum-text-muted)]',
  info: 'border-[color:rgba(59,130,246,0.16)] bg-[color:rgba(59,130,246,0.1)] text-[color:#1D4ED8]',
  warn: 'border-[color:rgba(185,133,25,0.18)] bg-[color:rgba(185,133,25,0.12)] text-[var(--aurum-warning)]',
  good: 'border-[color:rgba(27,156,100,0.16)] bg-[color:rgba(27,156,100,0.12)] text-[var(--aurum-success)]',
  error: 'border-[color:rgba(210,75,75,0.16)] bg-[color:rgba(210,75,75,0.12)] text-[var(--aurum-danger)]',
};

export function Badge({ className, variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none tracking-[0.01em]',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
