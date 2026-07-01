import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { defaultGymName, slugifyGymName } from '@/lib/gym';
import { parseJsonBody } from '@/lib/api-validate';
import { gymOnboardSchema } from '@/lib/api-schemas';
import { logger } from '@/lib/logger';

async function userHasGym(userId: string): Promise<boolean> {
  const admin = getAdminClient();

  const { data: staffRole } = await admin
    .from('staff_roles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (staffRole) return true;

  const { data: ownedGym } = await admin
    .from('gyms')
    .select('id')
    .eq('owner_id', userId)
    .maybeSingle();

  return Boolean(ownedGym);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (await userHasGym(user.id)) {
    return NextResponse.json({ error: 'Gym already exists for this account' }, { status: 409 });
  }

  const parsed = await parseJsonBody(req, gymOnboardSchema);
  if (!parsed.success) return parsed.response;
  const requestedName = parsed.data.name ?? defaultGymName(user.user_metadata);

  const admin = getAdminClient();
  let slug = slugifyGymName(requestedName);
  let suffix = 0;

  while (suffix < 20) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const { data: existing } = await admin
      .from('gyms')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();
    if (!existing) {
      slug = candidate;
      break;
    }
    suffix += 1;
  }

  const { data: gym, error } = await admin
    .from('gyms')
    .insert({
      owner_id: user.id,
      name: requestedName,
      slug,
      kiosk_enabled: false,
    })
    .select('id, name, slug')
    .single();

  if (error) {
    logger.error({ err: error, userId: user.id }, 'Gym onboard failed');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ownerName =
    (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
    user.email?.split('@')[0] ||
    'Owner';

  const { error: staffError } = await admin.from('staff_roles').insert({
    gym_id: gym.id,
    user_id: user.id,
    role: 'admin',
    full_name: ownerName,
  });

  if (staffError) {
    logger.error({ err: staffError, userId: user.id, gymId: gym.id }, 'Staff role onboard failed');
    await admin.from('gyms').delete().eq('id', gym.id);
    return NextResponse.json({ error: staffError.message }, { status: 500 });
  }

  return NextResponse.json({ gym });
}
