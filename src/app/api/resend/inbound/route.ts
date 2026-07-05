import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { handleInboundEmail } from '@/services/ai-front-desk';
import { logger } from '@/lib/logger';

type ResendInbound = {
  from?: string;
  to?: string;
  subject?: string;
  text?: string;
  html?: string;
};

export async function POST(req: NextRequest) {
  let body: ResendInbound;
  try {
    body = (await req.json()) as ResendInbound;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const to = body.to ?? '';
  const from = body.from ?? '';
  const text = body.text ?? body.html ?? body.subject ?? '';

  const admin = getAdminClient();
  const { data: gym } = await admin
    .from('gyms')
    .select('id')
    .eq('inbound_email_address', to)
    .maybeSingle();

  if (!gym?.id) {
    logger.warn({ to }, 'Inbound email: no gym matched');
    return NextResponse.json({ ok: true, skipped: true });
  }

  await handleInboundEmail({
    gymId: gym.id,
    fromEmail: from,
    subject: body.subject ?? '',
    body: text.slice(0, 8000),
  });

  return NextResponse.json({ ok: true });
}
