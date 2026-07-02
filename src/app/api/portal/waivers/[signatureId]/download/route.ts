import { NextRequest, NextResponse } from 'next/server';
import { requireMemberAuth, isErrorResponse } from '@/lib/auth/api';
import { getAdminClient } from '@/lib/supabase/admin';
import { assertPortalMemberAccess } from '@/services/portal-family';
import { buildWaiverPdf } from '@/lib/waiver-pdf';
import { handleRouteError } from '@/lib/api-error';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ signatureId: string }> }
) {
  const auth = await requireMemberAuth();
  if (isErrorResponse(auth)) return auth;

  const { signatureId } = await context.params;
  const admin = getAdminClient();

  try {
    const { data: sig } = await admin
      .from('waiver_signatures')
      .select('*, waivers(title, body), members(id, email, first_name, last_name)')
      .eq('id', signatureId)
      .maybeSingle();

    if (!sig) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await assertPortalMemberAccess(auth.user, sig.member_id);

    if (sig.pdf_storage_path) {
      const { data, error } = await admin.storage
        .from('waiver-signatures')
        .download(sig.pdf_storage_path);
      if (!error && data) {
        const buffer = Buffer.from(await data.arrayBuffer());
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="waiver-${signatureId}.pdf"`,
          },
        });
      }
    }

    const { data: gym } = await admin
      .from('gyms')
      .select('name')
      .eq('id', sig.gym_id)
      .maybeSingle();

    const pdfBytes = await buildWaiverPdf({
      gymName: gym?.name ?? 'Gym',
      waiverTitle: sig.waivers?.title ?? 'Waiver',
      waiverBody: sig.waivers?.body ?? '',
      signedName: sig.signed_name,
      signedAt: sig.signed_at,
      memberEmail: sig.members?.email,
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="waiver-${signatureId}.pdf"`,
      },
    });
  } catch (err: unknown) {
    return handleRouteError(err, {
      fallbackMessage: 'Download failed',
      logMessage: 'Waiver PDF download failed',
    });
  }
}
