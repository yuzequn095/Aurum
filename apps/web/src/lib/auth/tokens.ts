const ACCESS_TOKEN_KEY = 'aurum.accessToken';
const REFRESH_TOKEN_KEY = 'aurum.refreshToken';

function isBrowser() {
  return typeof window !== 'undefined';
}

function read(key: string): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(key);
}

function write(key: string, value: string | null) {
  if (!isBrowser()) return;
  if (value == null) {
    window.localStorage.removeItem(key);
  } else {
    window.localStorage.setItem(key, value);
  }
}

function setCookie(name: string, value: string | null) {
  if (!isBrowser()) return;

  if (value == null) {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }

  const encoded = encodeURIComponent(value);
  document.cookie = `${name}=${encoded}; Path=/; Max-Age=2592000; SameSite=Lax`;
}

export function getAccessToken(): string | null {
  return read(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string | null): void {
  write(ACCESS_TOKEN_KEY, token);
  setCookie('aurum_access_token', token);
}

export function getRefreshToken(): string | null {
  return read(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string | null): void {
  write(REFRESH_TOKEN_KEY, token);
  setCookie('aurum_refresh_token', token);
}

export function clearTokens(): void {
  setAccessToken(null);
  setRefreshToken(null);
}
