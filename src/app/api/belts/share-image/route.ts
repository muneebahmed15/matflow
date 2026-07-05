import { NextRequest, NextResponse } from 'next/server';
import { isErrorResponse, requireStaffAuth } from '@/lib/auth/api';
import { buildBeltSharePng } from '@/lib/belt-share-image';
import { handleRouteError } from '@/lib/api-error';

export async function GET(req: NextRequest) {
  const auth = await requireStaffAuth();
  if (isErrorResponse(auth)) return auth;

  const params = req.nextUrl.searchParams;
  const memberName = params.get('member_name');
  const fromBelt = params.get('from_belt');
  const toBelt = params.get('to_belt');
  const promotedAt = params.get('promoted_at') ?? new Date().toISOString();
  const gymName = params.get('gym_name') ?? 'Gym';

  if (!memberName || !fromBelt || !toBelt) {
    return NextResponse.json({ error: 'member_name, from_belt, to_belt required' }, { status: 400 });
  }

  try {
    const png = await buildBeltSharePng({
      gymName,
      memberName,
      fromBelt,
      toBelt,
      promotedAt,
    });

    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="promotion-${memberName.replace(/\s+/g, '-')}.png"`,
      },
    });
  } catch (err: unknown) {
    return handleRouteError(err, {
      fallbackMessage: 'Share image generation failed',
      logMessage: 'belt-share-image failed',
    });
  }
}
