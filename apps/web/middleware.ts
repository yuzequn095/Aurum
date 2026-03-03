import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function hasToken(request: NextRequest, cookieName: string): boolean {
  const value = request.cookies.get(cookieName)?.value;
  return typeof value === 'string' && value.length > 0;
}

export function middleware(request: NextRequest) {
  const hasAccessToken = hasToken(request, 'aurum_access_token');
  const hasRefreshToken = hasToken(request, 'aurum_refresh_token');

  if (!hasAccessToken && !hasRefreshToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/transactions/:path*', '/reports/:path*', '/ai-report/:path*'],
};
