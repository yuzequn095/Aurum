import { isSessionRefreshError } from './session-manager';

type AuthSessionClient = {
  getAccessToken(): string | null;
  refreshAccessToken(): Promise<string>;
  invalidateSession(): void;
};

type FetchTransport = (path: string, init?: RequestInit) => Promise<Response>;

export async function authenticatedFetch(
  transport: FetchTransport,
  session: AuthSessionClient,
  path: string,
  init: RequestInit = {},
  onUnauthenticated?: () => void,
): Promise<Response> {
  const initialAccessToken = session.getAccessToken();
  const headers = new Headers(init.headers);
  if (initialAccessToken) headers.set('Authorization', `Bearer ${initialAccessToken}`);

  const response = await transport(path, { ...init, headers, credentials: 'include' });
  if (response.status !== 401 || path === '/v1/auth/refresh') return response;

  let nextAccessToken = session.getAccessToken();
  if (!nextAccessToken || nextAccessToken === initialAccessToken) {
    try {
      nextAccessToken = await session.refreshAccessToken();
    } catch (error) {
      if (isSessionRefreshError(error, 'invalid')) onUnauthenticated?.();
      throw error;
    }
  }

  const retryHeaders = new Headers(init.headers);
  retryHeaders.set('Authorization', `Bearer ${nextAccessToken}`);
  const retryResponse = await transport(path, {
    ...init,
    headers: retryHeaders,
    credentials: 'include',
  });

  if (retryResponse.status === 401) {
    session.invalidateSession();
    onUnauthenticated?.();
  }

  return retryResponse;
}
