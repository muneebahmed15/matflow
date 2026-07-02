import { NextRequest, NextResponse } from 'next/server';
import { createReview } from '@/services/gym-content';
import { getAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const gymId = body.gym_id as string;
  const authorName = (body.author_name as string)?.trim();
  const rating = Number(body.rating);
  const reviewBody = (body.body as string)?.trim();

  if (!gymId || !authorName) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data: gym } = await admin
    .from('gyms')
    .select('id, website_enabled')
    .eq('id', gymId)
    .single();

  if (!gym?.website_enabled) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await createReview({ gymId, authorName, rating, body: reviewBody });
  return NextResponse.json({ ok: true });
}
