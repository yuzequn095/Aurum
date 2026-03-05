import { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function PrimaryButton({ className, type = 'button', ...props }: PrimaryButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex h-11 w-full items-center justify-center rounded-aurum border border-aurum-primaryHover bg-aurum-primary px-5 text-sm font-semibold tracking-wide text-black shadow-aurumSm transition hover:bg-aurum-primaryHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aurum-primaryHover/70 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
}
