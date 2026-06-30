import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const portalPublic = pathname === '/portal/login' || pathname === '/portal/signup';
  const authPublic = pathname === '/login' || pathname === '/signup';
  const isPortal = pathname.startsWith('/portal');
  const isKiosk = pathname.startsWith('/kiosk');
  const isApi = pathname.startsWith('/api');
  const isMarketing = pathname === '/';

  const dashboardPrefixes = [
    '/dashboard',
    '/members',
    '/leads',
    '/classes',
    '/attendance',
    '/belts',
    '/waivers',
    '/plans',
    '/subscriptions',
    '/staff',
    '/settings',
  ];
  const isDashboard = dashboardPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!user && isPortal && !portalPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/portal/login';
    return NextResponse.redirect(url);
  }

  if (!user && isDashboard) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && authPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  if (user && portalPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/portal';
    return NextResponse.redirect(url);
  }

  // Allow unauthenticated access to marketing, kiosk, auth pages, and API routes
  // (API routes enforce their own authorization).
  void isKiosk;
  void isApi;
  void isMarketing;

  return supabaseResponse;
}
