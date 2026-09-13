'use client';

import { API_BASE } from '@/lib/api-transport';
import { getAuthSessionManager } from '@/lib/auth/session';

async function endSession(allDevices: boolean): Promise<void> {
  const session = getAuthSessionManager();
  const credentials = session.beginLogout();

  try {
    if (allDevices && credentials.accessToken) {
      await fetch(`${API_BASE}/v1/auth/logout-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
        credentials: 'include',
      });
    } else if (!allDevices && credentials.refreshToken) {
      await fetch(`${API_BASE}/v1/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ refreshToken: credentials.refreshToken }),
      });
    }
  } catch {
    // Local logout is authoritative when the network is unavailable.
  } finally {
    if (typeof window !== 'undefined') window.location.href = '/login';
  }
}

export function logout(): Promise<void> {
  return endSession(false);
}

export function logoutAll(): Promise<void> {
  return endSession(true);
}
