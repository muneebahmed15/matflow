import { type NextRequest } from 'next/server';
import { handleProxy } from '@/lib/supabase/proxy';

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

function applyEmbedHeaders(request: NextRequest, response: Response): Response {
  if (!request.nextUrl.pathname.startsWith('/embed/')) return response;
  const headers = new Headers(response.headers);
  headers.set('Content-Security-Policy', EMBED_CSP);
  headers.delete('X-Frame-Options');
  headers.delete('Cross-Origin-Resource-Policy');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function proxy(request: NextRequest) {
  const response = await handleProxy(request);
  return applyEmbedHeaders(request, response);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
