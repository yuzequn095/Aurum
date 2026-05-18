import { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'min-w-0 max-w-full rounded-[var(--aurum-radius-xl)] border border-[var(--aurum-border)] bg-white shadow-[var(--aurum-shadow)] transition-colors',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('min-w-0 px-4 pb-3 pt-4 sm:px-5 sm:pb-4 sm:pt-5', className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'text-[var(--aurum-font-size-h2)] leading-[var(--aurum-line-height-tight)] font-semibold text-[var(--aurum-text)]',
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        'mt-1 text-[var(--aurum-font-size-small)] leading-[var(--aurum-line-height-normal)] text-[var(--aurum-text-muted)]',
        className,
      )}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('min-w-0 px-4 pb-4 sm:px-5 sm:pb-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-4 pb-4 pt-1 sm:px-5 sm:pb-5', className)} {...props} />;
}
