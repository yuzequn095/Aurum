'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { PrimaryButton } from '@/components/auth/PrimaryButton';
import { useToast } from '@/components/toast/ToastProvider';
import { useAuthSession } from '@/lib/auth/session';
import { apiPublicPost } from '@/lib/api';
import { setAccessToken, setRefreshToken } from '@/lib/auth/tokens';
import { useEffect } from 'react';

type AuthResponse = {
  user: { id: string; email: string };
  accessToken: string;
  refreshToken: string;
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { isHydrated, isAuthenticated } = useAuthSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = searchParams.get('next') || '/dashboard';

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.replace(next);
    }
  }, [isAuthenticated, isHydrated, next, router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      setSubmitting(true);
      const payload = await apiPublicPost<AuthResponse>('/v1/auth/login', {
        email,
        password,
      });
      setAccessToken(payload.accessToken);
      setRefreshToken(payload.refreshToken);
      toast.success('Logged in successfully.');
      router.push(next);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell mode='login' heading='' subheading=''>
      {!isHydrated ? (
        <div className='rounded-aurum border border-aurum-border bg-white/85 p-4 text-sm text-aurum-muted'>
          Preparing secure session...
        </div>
      ) : isAuthenticated ? (
        <div className='flex items-center gap-3 rounded-aurum border border-aurum-border bg-white/85 p-4'>
          <span className='h-4 w-4 animate-spin rounded-full border-2 border-aurum-primary border-t-aurum-primaryHover' />
          <span className='text-sm text-aurum-muted'>Entering your suite...</span>
        </div>
      ) : (
        <form onSubmit={onSubmit} className='space-y-7'>
          <div className='space-y-2'>
            <label
              htmlFor='email'
              className='text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--aurum-auth-muted)]'
            >
              Identity
            </label>
            <input
              id='email'
              name='email'
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='email@aurum.exclusive'
              className='h-12 w-full border-0 border-b border-[color:var(--aurum-auth-border)] bg-transparent px-0 text-sm font-light text-[color:var(--aurum-auth-text)] outline-none transition placeholder:text-[color:var(--aurum-auth-muted)]/30 focus:border-[color:var(--aurum-auth-primary)]'
              autoComplete='email'
              required
            />
          </div>

          <div className='space-y-2'>
            <label
              htmlFor='password'
              className='text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--aurum-auth-muted)]'
            >
              Credential
            </label>
            <input
              id='password'
              name='password'
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder='••••••••'
              className='h-12 w-full border-0 border-b border-[color:var(--aurum-auth-border)] bg-transparent px-0 text-sm font-light text-[color:var(--aurum-auth-text)] outline-none transition placeholder:text-[color:var(--aurum-auth-muted)]/30 focus:border-[color:var(--aurum-auth-primary)]'
              autoComplete='current-password'
              required
            />
          </div>

          {error ? <p className='text-sm text-red-600'>{error}</p> : null}

          <div className='flex items-center gap-7 pt-2'>
            <PrimaryButton type='submit' disabled={submitting}>
              {submitting ? 'Entering...' : 'Enter Suite'}
            </PrimaryButton>

            <button
              type='button'
              className='text-[10px] font-medium uppercase tracking-[0.3em] text-[color:var(--aurum-auth-muted)] transition hover:text-[color:var(--aurum-auth-text)]'
              aria-label='Recover password (coming soon)'
            >
              Recover
            </button>
          </div>

          <p className='text-sm text-[color:var(--aurum-auth-muted)]'>
            New to Aurum?{' '}
            <Link
              href='/register'
              className='font-medium text-[color:var(--aurum-auth-text)] underline underline-offset-4'
            >
              Create Account
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
