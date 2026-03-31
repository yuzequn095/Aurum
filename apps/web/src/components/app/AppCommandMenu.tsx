'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AppIcon } from '@/components/app/AppIcon';
import { APP_COMMAND_ACTIONS } from '@/components/app/nav';
type AppCommandMenuProps = {
  open: boolean;
  onClose: () => void;
};

export function AppCommandMenu({ open, onClose }: AppCommandMenuProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-label='Command menu'
      className='fixed inset-0 z-50 flex items-end bg-[rgba(17,24,39,0.32)] p-3 backdrop-blur-[2px] sm:items-center sm:justify-center sm:p-6'
      onMouseDown={onClose}
    >
      <div
        className='w-full max-w-[560px] rounded-[30px] border border-[var(--aurum-border)] bg-[rgba(255,255,255,0.96)] p-4 shadow-[0_28px_60px_-28px_rgba(17,24,39,0.55)] sm:p-5'
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className='mb-4 flex items-start justify-between gap-4'>
          <div className='space-y-1'>
            <p className='text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--aurum-text-muted)]'>
              Command Surface
            </p>
            <h2 className='text-2xl font-semibold tracking-tight text-[var(--aurum-text)]'>
              Move quickly
            </h2>
            <p className='text-sm text-[var(--aurum-text-muted)]'>
              Common product actions stay one tap away without changing the route foundation.
            </p>
          </div>

          <button
            type='button'
            onClick={onClose}
            aria-label='Close command menu'
            className='flex h-10 w-10 items-center justify-center rounded-full border border-[var(--aurum-border)] bg-[var(--aurum-surface)] text-[var(--aurum-text-muted)] transition hover:border-[var(--aurum-accent)]/35 hover:text-[var(--aurum-text)]'
          >
            <span className='text-lg leading-none'>&times;</span>
          </button>
        </div>

        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
          {APP_COMMAND_ACTIONS.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              onClick={onClose}
              className='group rounded-[24px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] p-4 transition hover:border-[var(--aurum-accent)]/35 hover:bg-[rgba(197,160,89,0.08)]'
            >
              <div className='flex items-start gap-3'>
                <span className='flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border border-[var(--aurum-border)] bg-white text-[var(--aurum-accent)] transition group-hover:border-[var(--aurum-accent)]/25'>
                  <AppIcon name={action.icon} className='h-5 w-5' />
                </span>
                <span className='min-w-0 flex-1'>
                  <span className='block text-sm font-semibold text-[var(--aurum-text)]'>
                    {action.label}
                  </span>
                  <span className='mt-1 block text-sm leading-6 text-[var(--aurum-text-muted)]'>
                    {action.description}
                  </span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
