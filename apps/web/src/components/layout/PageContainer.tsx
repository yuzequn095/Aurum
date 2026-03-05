import { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type PageContainerProps = HTMLAttributes<HTMLDivElement>;

export function PageContainer({ className, ...props }: PageContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-[1360px] px-4 py-6 sm:px-6 lg:px-8 xl:px-10',
        className,
      )}
      {...props}
    />
  );
}
