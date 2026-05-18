import { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border border-transparent bg-[linear-gradient(135deg,var(--aurum-accent),var(--aurum-gold-strong))] text-white hover:brightness-95',
  secondary:
    'border border-[var(--aurum-border)] bg-[rgba(255,254,250,0.92)] text-[var(--aurum-text)] hover:border-[var(--aurum-accent)]/35 hover:bg-white',
  ghost:
    'border border-transparent bg-transparent text-[var(--aurum-text-muted)] hover:bg-[var(--aurum-surface)] hover:text-[var(--aurum-text)]',
  danger:
    'border border-transparent bg-[var(--aurum-danger)] text-white hover:brightness-95',
  destructive:
    'border border-transparent bg-[var(--aurum-danger)] text-white hover:brightness-95',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-9 rounded-[var(--aurum-radius-sm)] px-3 text-xs',
  md: 'min-h-11 rounded-[var(--aurum-radius-md)] px-4 text-sm',
  lg: 'min-h-12 rounded-[var(--aurum-radius-lg)] px-5 text-sm',
};

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex max-w-full items-center justify-center text-center font-medium leading-snug shadow-[var(--aurum-shadow)] transition active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aurum-accent)]/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-55',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
