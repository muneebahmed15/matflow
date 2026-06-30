import { NextResponse, type NextRequest } from 'next/server';
import { applyRateLimit } from '@/lib/rate-limit';
import { createServerClient } from '@supabase/ssr';
import { ADMIN_ONLY_ROUTES } from '@/lib/permissions';

async function resolveStaffRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<'admin' | 'coach' | null> {
  const { data: staffRole } = await supabase
    .from('staff_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (staffRole?.role === 'admin' || staffRole?.role === 'coach') {
    return staffRole.role;
  }

  const { data: gym } = await supabase
    .from('gyms')
    .select('id')
    .eq('owner_id', userId)
    .maybeSingle();

  return gym ? 'admin' : null;
}

export async function handleProxy(request: NextRequest) {
  const rateLimited = applyRateLimit(request);
  if (rateLimited) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(
            Math.max(1, Math.ceil((rateLimited.resetAt - Date.now()) / 1000))
          ),
        },
      }
    );
  }

  return updateSession(request);
}

async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl ?? 'http://127.0.0.1:54321',
    supabaseAnonKey ?? 'missing-anon-key',
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
  const isPortal = pathname.startsWith('/portal');

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

  if (user && isDashboard) {
    const role = await resolveStaffRole(supabase, user.id);
    if (
      role === 'coach' &&
      ADMIN_ONLY_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
      )
    ) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
