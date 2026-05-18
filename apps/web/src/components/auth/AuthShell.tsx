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
  const mobileHeading = mode === 'login' ? 'Welcome Back' : 'Create Account';
  const mobileSubheading =
    mode === 'login' ? 'Please sign in to access your portfolio.' : 'Set up your private suite.';

  return (
    <main className='relative flex min-h-screen w-full items-start justify-center overflow-hidden bg-[color:var(--aurum-auth-bg-0)] px-4 py-7 sm:px-6 lg:items-center lg:px-10 lg:py-8'>
      <div className='absolute inset-0 aurum-auth-bg' />
      <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.06),transparent_52%)] lg:bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.04),transparent_55%)]' />
      <div
        aria-hidden='true'
        className='pointer-events-none absolute left-1/2 top-[45%] h-[60vh] w-[60vh] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[color:var(--aurum-auth-text)]/[0.025] lg:top-1/2 lg:h-[72vh] lg:w-[72vh] lg:border-[color:var(--aurum-auth-text)]/[0.03]'
      />

      <div className='relative mx-auto flex w-full max-w-[350px] flex-col items-center gap-4 lg:max-w-[980px] lg:translate-y-4 lg:gap-6'>
        <div className='flex flex-col items-center gap-2 pt-0 lg:gap-3 lg:pt-1'>
          {/* Dev note: keep auth logo on a plain img because Next image handling was part of the unstable dev-only path here. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src='/aurum_logo_thin.svg'
            alt='Aurum'
            className='h-[62px] w-[150px] object-contain lg:h-[70px] lg:w-[180px]'
          />
        </div>

        <AuthCard className='w-full max-w-[350px] rounded-[30px] p-7 lg:max-w-[980px] lg:rounded-[40px] lg:p-10'>
          <div className='grid gap-9 lg:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] lg:gap-10'>
            <div className='space-y-6 lg:space-y-8 lg:px-2'>
              <div className='hidden lg:block'>
                <SegmentedTabs items={tabs} activeKey={mode} />
              </div>
              <header className='space-y-1.5 lg:hidden'>
                <h1 className='text-[25px] leading-tight font-medium tracking-tight text-[color:var(--aurum-auth-text)] [font-family:Georgia,Times_New_Roman,serif]'>
                  {mobileHeading}
                </h1>
                <p className='text-xs leading-5 text-[color:var(--aurum-auth-muted)]'>
                  {mobileSubheading}
                </p>
              </header>
              {heading || subheading ? (
                <header className='hidden space-y-2 lg:block'>
                  {heading ? (
                    <h1 className='text-2xl font-semibold tracking-tight text-[color:var(--aurum-auth-text)]'>
                      {heading}
                    </h1>
                  ) : null}
                  {subheading ? (
                    <p className='text-sm text-[color:var(--aurum-auth-muted)]/90'>{subheading}</p>
                  ) : null}
                </header>
              ) : null}
              {children}
            </div>

            <div className='hidden rounded-full bg-[color:var(--aurum-auth-border)] lg:block' />

            <aside className='hidden space-y-6 lg:block lg:px-2'>
              <h2 className='text-[46px] leading-none font-medium tracking-tight text-[color:var(--aurum-auth-text)] [font-family:Georgia,Times_New_Roman,serif] lg:text-[52px]'>
                Private Management.
              </h2>
              <p className='max-w-[320px] text-[15px] leading-7 text-[color:var(--aurum-auth-muted)]'>
                Aurum is an invitation-only ecosystem for sophisticated financial oversight and
                AI-driven wealth insights.
              </p>

              <div>
                <p className='mb-3 text-[9px] font-bold uppercase tracking-[0.3em] text-[color:var(--aurum-auth-primary)]'>
                  New Prospect
                </p>
                <div className='rounded-2xl border border-[color:var(--aurum-auth-primary)]/20 bg-white/55 p-6'>
                  <Link
                    href='mailto:hello@aurum.local'
                    className='group flex items-center justify-between gap-4 rounded-[10px] text-sm font-medium tracking-wide text-[color:var(--aurum-auth-text)] transition'
                  >
                    <span>Request Access</span>
                    <span className='text-xl text-[color:var(--aurum-auth-primary)] transition group-hover:translate-x-0.5'>
                      {'->'}
                    </span>
                  </Link>
                  <p className='mt-2 text-[11px] font-light text-[color:var(--aurum-auth-muted)]'>
                    Apply for membership in our next cohort.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </AuthCard>

        <div className='hidden w-full max-w-[980px] rounded-b-[18px] border border-t-0 border-[color:var(--aurum-auth-border)] bg-white/35 px-6 py-5 text-center lg:block'>
          <p className='text-[10px] font-light uppercase tracking-[0.4em] text-[color:var(--aurum-auth-muted)]/50'>
            AURUM &#183; MMXXIV &#183; SECURE END-TO-END ENCRYPTION
          </p>
        </div>
      </div>
    </main>
  );
}
