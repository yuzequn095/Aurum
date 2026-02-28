import { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-aurum-primary text-white hover:bg-aurum-primaryHover',
  secondary: 'border border-aurum-border bg-aurum-card text-aurum-text hover:bg-aurum-bg',
  ghost: 'bg-transparent text-aurum-muted hover:bg-aurum-bg',
  destructive: 'bg-aurum-danger text-white hover:opacity-95',
};

export function Button({ className, variant = 'primary', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-aurum px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
