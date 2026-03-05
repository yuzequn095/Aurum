import { PropsWithChildren } from 'react';
import { cn } from '@/lib/cn';

type AuthCardProps = PropsWithChildren<{
  className?: string;
}>;

export function AuthCard({ className, children }: AuthCardProps) {
  return (
    <section
      className={cn(
        'rounded-[40px] border border-[color:var(--aurum-auth-border)] bg-[rgba(255,255,255,0.85)] p-6 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.04)] backdrop-blur md:p-10',
        className,
      )}
    >
      {children}
    </section>
  );
}
