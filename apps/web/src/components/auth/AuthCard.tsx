import { PropsWithChildren } from 'react';
import { cn } from '@/lib/cn';

type AuthCardProps = PropsWithChildren<{
  className?: string;
}>;

export function AuthCard({ className, children }: AuthCardProps) {
  return (
    <section
      className={cn(
        'rounded-[26px] border border-[color:var(--aurum-card-border)] bg-[color:var(--aurum-card-bg)] p-6 shadow-aurum backdrop-blur md:p-8',
        className,
      )}
    >
      {children}
    </section>
  );
}
