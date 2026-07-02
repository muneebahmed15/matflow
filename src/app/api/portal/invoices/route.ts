import { NextRequest, NextResponse } from 'next/server';
import { isErrorResponse } from '@/lib/auth/api';
import { requirePortalMemberFromRequest } from '@/lib/auth/portal-request';
import { getAdminClient } from '@/lib/supabase/admin';
import { stripe } from '@/lib/stripe';
import { handleRouteError } from '@/lib/api-error';

export async function GET(req: NextRequest) {
  const auth = await requirePortalMemberFromRequest(req);
  if (isErrorResponse(auth)) return auth;

  const admin = getAdminClient();
  const { data: subscription } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('member_id', auth.memberId)
    .not('stripe_customer_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!subscription?.stripe_customer_id) {
    return NextResponse.json({ invoices: [] });
  }

  try {
    const invoices = await stripe.invoices.list({
      customer: subscription.stripe_customer_id,
      limit: 12,
    });

    return NextResponse.json({
      invoices: invoices.data.map((inv) => ({
        id: inv.id,
        number: inv.number,
        status: inv.status,
        amount_cents: inv.amount_paid,
        created: inv.created,
        pdf_url: inv.invoice_pdf,
        hosted_url: inv.hosted_invoice_url,
      })),
    });
  } catch (err: unknown) {
    return handleRouteError(err, {
      fallbackMessage: 'Failed to load invoices',
      logMessage: 'Portal invoice list failed',
    });
  }
}
