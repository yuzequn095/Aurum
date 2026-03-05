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
    <main className='relative min-h-screen w-full overflow-hidden bg-aurum-bg px-4 py-8 sm:px-6 lg:px-10'>
      <div className='absolute inset-0 aurum-auth-bg' />
      <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,197,66,0.12),transparent_58%)]' />

      <div className='relative mx-auto flex w-full max-w-[1180px] flex-col items-center gap-6'>
        <div className='flex flex-col items-center gap-3 pt-2'>
          <Image
            src='/brand/aurum-mark.png'
            alt='Aurum mark'
            width={74}
            height={74}
            priority
            className='h-[74px] w-[74px] object-contain'
          />
          <p className='text-xs font-semibold uppercase tracking-[0.18em] text-aurum-muted'>Aurum</p>
        </div>

        <AuthCard className='w-full max-w-[1080px]'>
          <div className='grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10'>
            <div className='space-y-6'>
              <SegmentedTabs items={tabs} activeKey={mode} />
              <header className='space-y-2'>
                <h1 className='text-3xl font-semibold tracking-tight text-aurum-text'>{heading}</h1>
                <p className='text-sm text-aurum-muted'>{subheading}</p>
              </header>
              {children}
            </div>

            <aside className='rounded-[20px] border border-aurum-border bg-gradient-to-b from-[#FFFDF5] to-[#F8F0DB] p-5 shadow-aurumSm'>
              <p className='text-xs font-semibold uppercase tracking-[0.16em] text-aurum-muted'>Private Management.</p>
              <p className='mt-3 text-lg font-semibold text-aurum-text'>
                Your financial life, curated in one private operating suite.
              </p>
              <p className='mt-3 text-sm leading-6 text-aurum-muted'>
                Track cash flow, monitor assets, and unlock intelligent guidance with a luxury-grade
                interface built for clarity.
              </p>

              <div className='mt-6 rounded-[16px] border border-aurum-primary/35 bg-white/80 p-4'>
                <p className='text-sm font-semibold text-aurum-text'>Request Access</p>
                <p className='mt-1 text-xs text-aurum-muted'>
                  Need institutional onboarding or a tailored setup?
                </p>
                <Link
                  href='mailto:hello@aurum.local'
                  className='mt-4 inline-flex rounded-aurum border border-aurum-border bg-white px-3 py-2 text-xs font-medium text-aurum-text transition hover:border-aurum-primaryHover hover:bg-aurum-primarySoft'
                >
                  Contact Concierge
                </Link>
              </div>
            </aside>
          </div>
        </AuthCard>
      </div>
    </main>
  );
}
