import { NextResponse, type NextRequest } from 'next/server';
import { applyRateLimit } from '@/lib/rate-limit';
import { createServerClient } from '@supabase/ssr';
import { canAccessRoute } from '@/lib/permissions/capabilities';
import type { StaffRole } from '@/lib/permissions/capabilities';
import {
  PERSONA_COOKIE,
  parsePersonaCookie,
  resolveUserPersonasWithClient,
} from '@/lib/auth/resolve-persona';

async function resolveStaffRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<StaffRole | null> {
  const { data: staffRole } = await supabase
    .from('staff_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (
    staffRole?.role === 'admin' ||
    staffRole?.role === 'supervisor' ||
    staffRole?.role === 'coach'
  ) {
    return staffRole.role as StaffRole;
  }

  const { data: gym } = await supabase
    .from('gyms')
    .select('id')
    .eq('owner_id', userId)
    .maybeSingle();

  return gym ? 'admin' : null;
}

async function resolveCustomDomainGymSlug(
  supabase: ReturnType<typeof createServerClient>,
  host: string
): Promise<string | null> {
  const normalized = host.toLowerCase().split(':')[0];
  if (
    !normalized ||
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    normalized.includes('127.0.0.1')
  ) {
    return null;
  }

  const { data: gym } = await supabase
    .from('gyms')
    .select('slug')
    .eq('custom_domain', normalized)
    .eq('website_enabled', true)
    .maybeSingle();

  return gym?.slug ?? null;
}

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url);
}

export async function handleProxy(request: NextRequest) {
  const rateLimited = await applyRateLimit(request);
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

  const host = request.headers.get('host') ?? '';
  const gymSlugFromDomain = await resolveCustomDomainGymSlug(supabase, host);
  if (
    gymSlugFromDomain &&
    !pathname.startsWith('/g/') &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/_next') &&
    !pathname.startsWith('/portal') &&
    !pathname.startsWith('/login') &&
    !pathname.startsWith('/dashboard') &&
    !pathname.startsWith('/kiosk') &&
    !pathname.startsWith('/select-persona')
  ) {
    const url = request.nextUrl.clone();
    const suffix = pathname === '/' ? '' : pathname;
    url.pathname = `/g/${gymSlugFromDomain}${suffix}`;
    return NextResponse.rewrite(url);
  }

  const portalPublic = pathname === '/portal/login' || pathname === '/portal/signup';
  const authPublic = pathname === '/login' || pathname === '/signup';
  const isSelectPersona = pathname === '/select-persona';

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
    '/migration',
    '/marketing',
    '/shop',
    '/insights',
    '/website-content',
    '/audit',
    '/families',
    '/ai-desk',
    '/inbox',
  ];
  const isDashboard = dashboardPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const isPortal = pathname.startsWith('/portal');

  if (!user && isPortal && !portalPublic) {
    return redirectTo(request, '/portal/login');
  }

  if (!user && isDashboard) {
    return redirectTo(request, '/login');
  }

  if (!user && isSelectPersona) {
    return redirectTo(request, '/login');
  }

  if (user) {
    const personas = await resolveUserPersonasWithClient(supabase, user);
    const persona = parsePersonaCookie(request.cookies.get(PERSONA_COOKIE)?.value);
    const dualRole = personas.hasStaff && personas.hasMember;

    if (authPublic) {
      if (dualRole) return redirectTo(request, '/select-persona');
      if (personas.hasStaff) return redirectTo(request, '/dashboard');
      if (personas.hasMember) return redirectTo(request, '/portal');
      return redirectTo(request, '/dashboard');
    }

    if (portalPublic) {
      if (dualRole && persona !== 'member') return redirectTo(request, '/select-persona');
      if (!personas.hasMember && personas.hasStaff) return redirectTo(request, '/dashboard');
      return redirectTo(request, '/portal');
    }

    if (dualRole && !persona && !isSelectPersona) {
      return redirectTo(request, '/select-persona');
    }

    if (isDashboard) {
      if (!personas.hasStaff) {
        if (personas.hasMember) return redirectTo(request, '/portal');
        return redirectTo(request, '/login');
      }
      if (dualRole && persona === 'member') {
        return redirectTo(request, '/portal');
      }

      const role = await resolveStaffRole(supabase, user.id);
      if (role && !canAccessRoute(role, pathname)) {
        return redirectTo(request, '/dashboard');
      }
    }

    if (isPortal && !portalPublic) {
      if (!personas.hasMember) {
        if (personas.hasStaff) return redirectTo(request, '/dashboard');
        return redirectTo(request, '/portal/login');
      }
      if (dualRole && persona === 'staff') {
        return redirectTo(request, '/dashboard');
      }
    }
  }

  return supabaseResponse;
}
