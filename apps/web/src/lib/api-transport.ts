function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function resolveDirectApiBase(): string | null {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!configured) return null;

  if (typeof window === 'undefined') {
    return configured.replace(/\/$/, '');
  }

  try {
    const url = new URL(configured);
    if (isLoopbackHost(url.hostname) && isLoopbackHost(window.location.hostname)) {
      url.hostname = window.location.hostname;
    }
    return url.toString().replace(/\/$/, '');
  } catch {
    return configured.replace(/\/$/, '');
  }
}

function resolveApiBase(): string {
  const directOverride = process.env.NEXT_PUBLIC_DIRECT_API_BASE_URL?.trim();
  return directOverride ? directOverride.replace(/\/$/, '') : '/api';
}

export const API_BASE = resolveApiBase();
const DIRECT_API_BASE = resolveDirectApiBase();

function buildApiBases(): string[] {
  if (!DIRECT_API_BASE || DIRECT_API_BASE === API_BASE) return [API_BASE];
  return [API_BASE, DIRECT_API_BASE];
}

export async function fetchWithFallback(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const bases = buildApiBases();
  let lastError: unknown;
  let lastResponse: Response | null = null;

  for (let index = 0; index < bases.length; index += 1) {
    const base = bases[index];
    const isLast = index === bases.length - 1;

    try {
      const response = await fetch(`${base}${path}`, init);
      if (isLast || response.status < 500) return response;
      lastResponse = response;
    } catch (error) {
      if (isLast) throw error;
      lastError = error;
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError instanceof Error ? lastError : new Error('Network request failed');
}
