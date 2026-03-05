import { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-[var(--aurum-radius-md)] bg-[var(--aurum-surface-alt)]',
        className,
      )}
      {...props}
    />
  );
}
