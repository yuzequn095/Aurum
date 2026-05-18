'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthSpinner } from '@/components/auth/AuthSpinner';
import { PrimaryButton } from '@/components/auth/PrimaryButton';
import { useToast } from '@/components/toast/ToastProvider';
import { useAuthSession } from '@/lib/auth/session';
import { apiPublicPost } from '@/lib/api';
import { setAuthSessionTokens } from '@/lib/auth/tokens';

type AuthResponse = {
  user: { id: string; email: string };
  accessToken: string;
  refreshToken: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const toast = useToast();
  const { isHydrated, isAuthenticated } = useAuthSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isHydrated && isAuthenticated && !redirecting) {
      setRedirecting(true);
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isHydrated, redirecting, router]);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.prefetch('/dashboard');
    }
  }, [isAuthenticated, isHydrated, router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      setSubmitting(true);
      const payload = await apiPublicPost<AuthResponse>('/v1/auth/register', {
        email,
        password,
      });
      setAuthSessionTokens({
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
        userEmail: payload.user.email,
      });
      toast.success('Account created successfully.');
      setRedirecting(true);
      router.replace('/dashboard');
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      setRedirecting(false);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell mode='register' heading='Create Account' subheading='Set up your private suite.'>
      {!isHydrated ? (
        <div className='rounded-aurum border border-aurum-border bg-white/85 p-4 text-sm text-aurum-muted'>
          Preparing secure session...
        </div>
      ) : isAuthenticated || redirecting ? (
        <div className='flex items-center gap-3 rounded-aurum border border-aurum-border bg-white/85 p-4'>
          <AuthSpinner />
          <span className='text-sm text-aurum-muted'>Opening dashboard...</span>
        </div>
      ) : (
        <form onSubmit={onSubmit} className='space-y-7'>
          <div className='space-y-2'>
            <label
              htmlFor='register-email'
              className='text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--aurum-auth-muted)]'
            >
              Identity
            </label>
            <input
              id='register-email'
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
              htmlFor='register-password'
              className='text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--aurum-auth-muted)]'
            >
              Credential
            </label>
            <input
              id='register-password'
              name='password'
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder='At least 8 characters'
              className='h-12 w-full border-0 border-b border-[color:var(--aurum-auth-border)] bg-transparent px-0 text-sm font-light text-[color:var(--aurum-auth-text)] outline-none transition placeholder:text-[color:var(--aurum-auth-muted)]/30 focus:border-[color:var(--aurum-auth-primary)]'
              minLength={8}
              autoComplete='new-password'
              required
            />
          </div>

          <p className='text-sm text-[color:var(--aurum-auth-muted)]'>
            Already have access?{' '}
            <Link
              href='/login'
              className='font-medium text-[color:var(--aurum-auth-text)] underline underline-offset-4'
            >
              Sign In
            </Link>
          </p>

          {error ? <p className='text-sm text-red-600'>{error}</p> : null}

          <PrimaryButton type='submit' disabled={submitting}>
            {submitting ? 'Creating account...' : 'Enter Suite'}
          </PrimaryButton>
        </form>
      )}
    </AuthShell>
  );
}
