import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { verifyUnsubscribeToken } from '@/lib/unsubscribe';

/** One-click marketing unsubscribe (CAN-SPAM). Marks both member and lead records. */
export async function GET(req: NextRequest) {
  const gymId = req.nextUrl.searchParams.get('gym');
  const email = req.nextUrl.searchParams.get('email');
  const token = req.nextUrl.searchParams.get('token');

  if (!gymId || !email || !token || !verifyUnsubscribeToken(gymId, email, token)) {
    return new NextResponse('Invalid unsubscribe link.', { status: 400 });
  }

  const admin = getAdminClient();
  const normalized = email.toLowerCase().trim();

  await Promise.all([
    admin
      .from('members')
      .update({ email_opt_out: true })
      .eq('gym_id', gymId)
      .ilike('email', normalized),
    admin
      .from('leads')
      .update({ email_opt_out: true })
      .eq('gym_id', gymId)
      .ilike('email', normalized),
  ]);

  return new NextResponse(
    `<!doctype html><html><body style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center">
      <h2>You're unsubscribed</h2>
      <p>${normalized} will no longer receive marketing emails from this gym.</p>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}
