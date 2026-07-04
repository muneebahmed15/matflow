import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
  }

  const { data: member } = await supabase
    .from('members')
    .select('id, gym_id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  const admin = getAdminClient();
  const { error } = await admin.from('push_subscriptions').upsert(
    {
      gym_id: member.gym_id,
      member_id: member.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    },
    { onConflict: 'member_id,endpoint' }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const endpoint = request.nextUrl.searchParams.get('endpoint');
  if (!endpoint) {
    return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
  }

  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  const admin = getAdminClient();
  await admin.from('push_subscriptions').delete().eq('member_id', member.id).eq('endpoint', endpoint);

  return NextResponse.json({ ok: true });
}
