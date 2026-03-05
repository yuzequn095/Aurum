import { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type BadgeVariant = 'neutral' | 'info' | 'warn' | 'good' | 'error';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'bg-[var(--aurum-surface-alt)] text-[var(--aurum-text-muted)]',
  info: 'bg-[color:rgba(59,130,246,0.12)] text-[color:#1D4ED8]',
  warn: 'bg-[color:rgba(185,133,25,0.14)] text-[var(--aurum-warning)]',
  good: 'bg-[color:rgba(27,156,100,0.14)] text-[var(--aurum-success)]',
  error: 'bg-[color:rgba(210,75,75,0.14)] text-[var(--aurum-danger)]',
};

export function Badge({ className, variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
