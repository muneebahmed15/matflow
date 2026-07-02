import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { PERSONA_COOKIE } from '@/lib/auth/resolve-persona';
import { parseJsonBody } from '@/lib/api-validate';

const schema = z.object({
  surface: z.enum(['staff', 'member']),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = await parseJsonBody(req, schema);
  if (!parsed.success) return parsed.response;

  const response = NextResponse.json({ success: true });
  response.cookies.set(PERSONA_COOKIE, parsed.data.surface, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
