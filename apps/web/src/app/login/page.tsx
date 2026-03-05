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
    <AuthShell mode='login' heading='Sign In' subheading='Access your private wealth suite.'>
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
        <form onSubmit={onSubmit} className='space-y-5'>
          <div className='space-y-1.5'>
            <label htmlFor='email' className='text-sm font-medium text-aurum-text'>
              Email
            </label>
            <input
              id='email'
              name='email'
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className='h-12 w-full rounded-aurum border border-aurum-border bg-white px-4 text-base text-aurum-text outline-none transition focus:border-aurum-primaryHover focus:ring-2 focus:ring-aurum-primarySoft'
              autoComplete='email'
              required
            />
          </div>

          <div className='space-y-1.5'>
            <label htmlFor='password' className='text-sm font-medium text-aurum-text'>
              Password
            </label>
            <input
              id='password'
              name='password'
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className='h-12 w-full rounded-aurum border border-aurum-border bg-white px-4 text-base text-aurum-text outline-none transition focus:border-aurum-primaryHover focus:ring-2 focus:ring-aurum-primarySoft'
              autoComplete='current-password'
              required
            />
          </div>

          <div className='flex items-center justify-between text-sm'>
            <Link href='/register' className='text-aurum-muted transition hover:text-aurum-text'>
              Create account
            </Link>
            <button
              type='button'
              className='text-aurum-muted transition hover:text-aurum-text'
              aria-label='Recover password (coming soon)'
            >
              Forgot password?
            </button>
          </div>

          {error ? <p className='text-sm text-red-600'>{error}</p> : null}

          <PrimaryButton type='submit' disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign In'}
          </PrimaryButton>
        </form>
      )}
    </AuthShell>
  );
}
