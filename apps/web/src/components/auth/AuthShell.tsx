import Image from 'next/image';
import Link from 'next/link';
import { PropsWithChildren } from 'react';
import { AuthCard } from '@/components/auth/AuthCard';
import { SegmentedTabs } from '@/components/auth/SegmentedTabs';

type AuthShellProps = PropsWithChildren<{
  mode: 'login' | 'register';
  heading: string;
  subheading: string;
}>;

const tabs = [
  { key: 'login', label: 'Sign In', href: '/login' },
  { key: 'register', label: 'Create Account', href: '/register' },
];

export function AuthShell({ mode, heading, subheading, children }: AuthShellProps) {
  return (
    <main className='relative min-h-screen w-full overflow-hidden bg-aurum-bg px-4 py-10 sm:px-6 lg:px-10'>
      <div className='absolute inset-0 aurum-auth-bg' />
      <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,197,66,0.08),transparent_55%)]' />

      <div className='relative mx-auto flex w-full max-w-[980px] flex-col items-center gap-6'>
        <div className='flex flex-col items-center gap-3 pt-1'>
          <Image
            src='/brand/aurum-mark.png'
            alt='Aurum mark'
            width={34}
            height={34}
            priority
            className='h-[34px] w-[34px] object-contain'
          />
        </div>

        <AuthCard className='w-full max-w-[980px]'>
          <div className='grid gap-8 lg:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] lg:gap-10'>
            <div className='space-y-8 px-2'>
              <SegmentedTabs items={tabs} activeKey={mode} />
              {heading || subheading ? (
                <header className='space-y-2'>
                  {heading ? (
                    <h1 className='text-2xl font-semibold tracking-tight text-aurum-text'>
                      {heading}
                    </h1>
                  ) : null}
                  {subheading ? (
                    <p className='text-sm text-aurum-muted/90'>{subheading}</p>
                  ) : null}
                </header>
              ) : null}
              {children}
            </div>

            <div className='hidden rounded-full bg-aurum-border/80 lg:block' />

            <aside className='space-y-6 px-2'>
              <h2 className='text-[42px] leading-none font-medium tracking-tight text-aurum-text [font-family:Georgia,Times_New_Roman,serif]'>
                Private Management.
              </h2>
              <p className='max-w-[320px] text-[15px] leading-7 text-aurum-muted'>
                Aurum is an invitation-only ecosystem for sophisticated financial oversight and
                AI-driven wealth insights.
              </p>

              <div>
                <p className='mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-aurum-primaryHover/90'>
                  New Prospect
                </p>
                <div className='rounded-[16px] border border-aurum-border bg-white/70 p-4'>
                  <Link
                    href='mailto:hello@aurum.local'
                    className='group flex items-center justify-between gap-4 rounded-[10px] text-sm font-semibold text-aurum-text transition'
                  >
                    <span>Request Access</span>
                    <span className='text-xl text-aurum-primaryHover transition group-hover:translate-x-0.5'>
                      {'->'}
                    </span>
                  </Link>
                  <p className='mt-2 text-xs text-aurum-muted'>
                    Apply for membership in our next cohort.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </AuthCard>

        <div className='w-full max-w-[980px] rounded-b-[18px] border border-t-0 border-aurum-border/70 bg-white/40 px-6 py-5 text-center'>
          <p className='text-[10px] uppercase tracking-[0.26em] text-aurum-muted/90'>
            AURUM &#183; MMXXIV &#183; SECURE END-TO-END ENCRYPTION
          </p>
        </div>
      </div>
    </main>
  );
}
