import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeNextPath } from '@/lib/auth/safe-next-path';
import { linkMemberAuthUserServer } from '@/lib/auth/link-member-server';
import { resolveUserPersonasWithClient } from '@/lib/auth/resolve-persona';
import { getPublicEnv } from '@/lib/env';

async function staffNeedsSetup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  gymId: string | null
): Promise<boolean> {
  if (!gymId) return true;
  const { data: gym } = await supabase
    .from('gyms')
    .select('setup_completed_at')
    .eq('id', gymId)
    .maybeSingle();
  return !gym?.setup_completed_at;
}

function postAuthRedirect(
  personas: Awaited<ReturnType<typeof resolveUserPersonasWithClient>>,
  explicitNext: string | null,
  staffSetupIncomplete: boolean
): NextResponse {
  const { NEXT_PUBLIC_APP_URL } = getPublicEnv();
  const base = NEXT_PUBLIC_APP_URL.replace(/\/$/, '');

  const next = explicitNext ? safeNextPath(explicitNext, '') : '';
  if (next) {
    return NextResponse.redirect(`${base}${next}`);
  }

  if (personas.hasStaff && personas.hasMember) {
    return NextResponse.redirect(`${base}/select-persona`);
  }
  if (personas.hasMember && !personas.hasStaff) {
    return NextResponse.redirect(`${base}/portal`);
  }
  if (personas.hasStaff) {
    if (staffSetupIncomplete) {
      return NextResponse.redirect(`${base}/setup`);
    }
    return NextResponse.redirect(`${base}/dashboard`);
  }

  return NextResponse.redirect(`${base}/onboarding`);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const nextParam = searchParams.get('next');
  const { NEXT_PUBLIC_APP_URL } = getPublicEnv();
  const base = NEXT_PUBLIC_APP_URL.replace(/\/$/, '');

  if (!code) {
    return NextResponse.redirect(
      `${base}/login?error=${encodeURIComponent('Missing confirmation code')}`
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${base}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${base}/login?error=auth_callback_failed`);
  }

  if (user.email) {
    await linkMemberAuthUserServer(user.email, user.id);
  }

  const personas = await resolveUserPersonasWithClient(supabase, user);
  const staffSetupIncomplete =
    personas.hasStaff && (await staffNeedsSetup(supabase, personas.gymId));
  return postAuthRedirect(personas, nextParam, staffSetupIncomplete);
}
