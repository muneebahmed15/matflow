import { type NextRequest } from 'next/server';
import { handleProxy } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  return handleProxy(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
