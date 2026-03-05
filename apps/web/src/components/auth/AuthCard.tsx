import { PropsWithChildren } from 'react';
import { cn } from '@/lib/cn';

type AuthCardProps = PropsWithChildren<{
  className?: string;
}>;

export function AuthCard({ className, children }: AuthCardProps) {
  return (
    <section
      className={cn(
        'rounded-[30px] border border-[color:var(--aurum-card-border)] bg-[color:var(--aurum-card-bg)] p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur md:p-10',
        className,
      )}
    >
      {children}
    </section>
  );
}
