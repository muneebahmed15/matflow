import { getAdminClient } from '@/lib/supabase/admin';
import { getPublicEnv } from '@/lib/env';
import { sendTransactionalEmail, memberPortalInviteEmail } from '@/lib/email/resend';
import { ServiceError } from '@/services/errors';

export async function inviteMemberToPortal(input: {
  gymId: string;
  memberId: string;
}): Promise<void> {
  const admin = getAdminClient();
  const { NEXT_PUBLIC_APP_URL } = getPublicEnv();

  const { data: member, error: memberErr } = await admin
    .from('members')
    .select('id, email, first_name, last_name, gym_id, auth_user_id')
    .eq('id', input.memberId)
    .eq('gym_id', input.gymId)
    .maybeSingle();

  if (memberErr) throw new ServiceError(500, memberErr.message);
  if (!member?.email) throw new ServiceError(400, 'Member must have an email to invite.');

  const email = member.email.trim().toLowerCase();
  const portalUrl = `${NEXT_PUBLIC_APP_URL}/portal/login`;

  const { data: gym } = await admin
    .from('gyms')
    .select('name')
    .eq('id', input.gymId)
    .maybeSingle();
  const gymName = gym?.name ?? 'your gym';

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: portalUrl },
  });

  if (linkErr) throw new ServiceError(500, linkErr.message);

  const actionLink = linkData.properties?.action_link ?? portalUrl;
  const fullName = `${member.first_name} ${member.last_name}`.trim();

  const template = memberPortalInviteEmail({
    fullName,
    gymName,
    actionLink,
  });
  await sendTransactionalEmail({ ...template, to: email });

  if (!member.auth_user_id && linkData.user?.id) {
    await admin
      .from('members')
      .update({ auth_user_id: linkData.user.id })
      .eq('id', member.id)
      .is('auth_user_id', null);
  }
}
