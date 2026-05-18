import { cn } from '@/lib/cn';

type AuthSpinnerProps = {
  className?: string;
  size?: 'sm' | 'md';
};

const sizeClasses: Record<NonNullable<AuthSpinnerProps['size']>, string> = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
};

export function AuthSpinner({ className, size = 'sm' }: AuthSpinnerProps) {
  return (
    <svg
      aria-hidden='true'
      viewBox='0 0 24 24'
      className={cn('animate-spin text-[var(--aurum-accent)]', sizeClasses[size], className)}
    >
      <circle
        cx='12'
        cy='12'
        r='9'
        fill='none'
        stroke='currentColor'
        strokeOpacity='0.22'
        strokeWidth='3'
      />
      <path
        d='M21 12a9 9 0 0 0-9-9'
        fill='none'
        stroke='currentColor'
        strokeLinecap='round'
        strokeWidth='3'
      />
    </svg>
  );
}
