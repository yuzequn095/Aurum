'use client';

import { API_BASE } from '@/lib/api';
import { clearTokens, getRefreshToken } from '@/lib/auth/tokens';

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();

  try {
    if (refreshToken) {
      await fetch(`${API_BASE}/v1/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ refreshToken }),
      });
    }
  } catch {
    // Ignore network/API failures; local logout must still succeed.
  } finally {
    clearTokens();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
}
