import { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Container({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mx-auto w-full max-w-5xl px-4 sm:px-6', className)} {...props} />;
}

type SectionProps = HTMLAttributes<HTMLElement> & {
  title?: string;
};

export function Section({ className, title, children, ...props }: SectionProps) {
  return (
    <section className={cn('space-y-3', className)} {...props}>
      {title ? <h2 className='text-xl font-semibold tracking-tight text-aurum-text'>{title}</h2> : null}
      {children}
    </section>
  );
}
