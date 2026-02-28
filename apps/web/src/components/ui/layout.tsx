import { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Container({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mx-auto w-full max-w-5xl px-4 sm:px-6', className)} {...props} />;
}

export function Section({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn('py-4', className)} {...props} />;
}
