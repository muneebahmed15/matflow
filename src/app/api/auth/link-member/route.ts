import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { linkMemberAuthUserServer } from '@/lib/auth/link-member-server';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await linkMemberAuthUserServer(user.email, user.id);
  if (!result.linked) {
    return NextResponse.json({ error: 'No member profile found for this email' }, { status: 403 });
  }

  return NextResponse.json({ success: true, memberId: result.memberId });
}
