import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const EMBED_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors *",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (request.nextUrl.pathname.startsWith('/embed/')) {
    response.headers.set('Content-Security-Policy', EMBED_CSP);
    response.headers.delete('X-Frame-Options');
    response.headers.delete('Cross-Origin-Resource-Policy');
  }

  return response;
}

export const config = {
  matcher: '/embed/:path*',
};
