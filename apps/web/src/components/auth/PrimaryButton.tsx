import { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function PrimaryButton({ className, type = 'button', ...props }: PrimaryButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex h-11 items-center justify-center rounded-full border border-transparent bg-[linear-gradient(135deg,var(--aurum-auth-primary-strong)_0%,var(--aurum-auth-primary)_100%)] px-9 text-[10px] font-bold tracking-[0.3em] uppercase text-white shadow-[0_10px_30px_-10px_rgba(197,160,89,0.3)] transition hover:-translate-y-[1px] hover:shadow-[0_12px_24px_-10px_rgba(197,160,89,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--aurum-auth-primary)]/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
}
