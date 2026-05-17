'use client';

import { ReactNode, useEffect } from 'react';
import { cn } from '@/lib/cn';

export function Modal(props: {
  open: boolean;
  title?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const { open, title, children, onClose } = props;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role='dialog'
      aria-modal='true'
      onMouseDown={onClose}
      className='fixed inset-0 z-50 flex items-end bg-[rgba(17,24,39,0.42)] p-3 backdrop-blur-[2px] sm:items-center sm:justify-center sm:p-6'
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={cn(
          'max-h-[calc(100dvh-24px)] w-full max-w-[720px] overflow-y-auto rounded-[28px] border border-[var(--aurum-border)] bg-white p-4 shadow-[0_28px_70px_-28px_rgba(17,24,39,0.7)]',
          'sm:max-h-[calc(100dvh-48px)] sm:p-5',
        )}
      >
        <div className='flex items-start justify-between gap-3'>
          <div className='text-lg font-semibold text-[var(--aurum-text)]'>{title ?? 'Modal'}</div>
          <button
            type='button'
            onClick={onClose}
            className='min-h-10 rounded-full border border-[var(--aurum-border)] bg-[var(--aurum-surface)] px-4 text-sm font-medium text-[var(--aurum-text)] transition hover:bg-[var(--aurum-surface-alt)]'
          >
            Close
          </button>
        </div>

        <div className='mt-4'>{children}</div>
      </div>
    </div>
  );
}
