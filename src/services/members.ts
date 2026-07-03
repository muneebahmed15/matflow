import { getAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/database';
import { ServiceError } from '@/services/errors';
import { sendMemberNotification } from '@/services/notifications';

type MemberRow = Database['public']['Tables']['members']['Row'];
type FamilyRow = Database['public']['Tables']['families']['Row'];

export type MemberDetail = MemberRow;

export type MemberSummary = Pick<
  MemberRow,
  'id' | 'first_name' | 'last_name' | 'email' | 'phone' | 'belt_rank' | 'status'
>;

export async function listMembers(gymId: string): Promise<MemberSummary[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('members')
    .select('id, first_name, last_name, email, phone, belt_rank, status')
    .eq('gym_id', gymId)
    .order('first_name');

  if (error) throw new ServiceError(500, error.message);
  return data ?? [];
}

export async function listFamilies(gymId: string): Promise<Pick<FamilyRow, 'id' | 'family_name'>[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('families')
    .select('id, family_name')
    .eq('gym_id', gymId)
    .order('family_name');

  if (error) throw new ServiceError(500, error.message);
  return data ?? [];
}

export type CreateMemberInput = {
  gymId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  beltRank?: string;
  status?: string;
  familyOption: 'none' | 'existing' | 'new';
  existingFamilyId?: string;
  newFamilyName?: string;
  newFamilyEmail?: string;
};

export async function createMember(input: CreateMemberInput): Promise<MemberRow> {
  const admin = getAdminClient();

  const normalizedEmail = input.email?.trim().toLowerCase();
  if (normalizedEmail) {
    const { isValidEmail } = await import('@/lib/contact-validation');
    if (!isValidEmail(normalizedEmail)) {
      throw new ServiceError(400, 'Invalid email address.');
    }
  }
  if (normalizedEmail) {
    const { data: duplicate } = await admin
      .from('members')
      .select('id')
      .eq('gym_id', input.gymId)
      .ilike('email', normalizedEmail)
      .maybeSingle();
    if (duplicate) {
      throw new ServiceError(409, 'A member with this email already exists.');
    }
  }

  let familyId: string | null = null;

  if (input.familyOption === 'new') {
    if (!input.newFamilyName?.trim()) {
      throw new ServiceError(400, 'Family name is required.');
    }
    const { data: newFamily, error: famErr } = await admin
      .from('families')
      .insert({
        gym_id: input.gymId,
        family_name: input.newFamilyName.trim(),
        primary_email: input.newFamilyEmail?.trim() || input.email?.trim() || null,
      })
      .select()
      .single();
    if (famErr) throw new ServiceError(500, famErr.message);
    familyId = newFamily.id;
  } else if (input.familyOption === 'existing') {
    if (!input.existingFamilyId) {
      throw new ServiceError(400, 'Please select a family.');
    }
    familyId = input.existingFamilyId;
  }

  const { normalizePhone } = await import('@/lib/contact-validation');
  const { data, error } = await admin
    .from('members')
    .insert({
      gym_id: input.gymId,
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() ? normalizePhone(input.phone) : null,
      belt_rank: input.beltRank ?? 'white',
      status: input.status ?? 'active',
      family_id: familyId,
    })
    .select()
    .single();

  if (error) throw new ServiceError(500, error.message);

  try {
    await sendMemberNotification({
      gymId: input.gymId,
      memberId: data.id,
      type: 'welcome',
    });
  } catch {
    // Email is best-effort; member creation must succeed.
  }

  return data;
}

export async function getMember(gymId: string, memberId: string): Promise<MemberDetail> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('members')
    .select('*')
    .eq('id', memberId)
    .eq('gym_id', gymId)
    .single();

  if (error || !data) throw new ServiceError(404, 'Member not found');
  return data;
}

export async function updateMember(
  gymId: string,
  memberId: string,
  fields: Partial<Pick<MemberRow, 'first_name' | 'last_name' | 'email' | 'phone' | 'belt_rank' | 'status'>> & {
    date_of_birth?: string | null;
  },
  actorId?: string | null
): Promise<MemberDetail> {
  const admin = getAdminClient();

  if (fields.phone) {
    const { normalizePhone } = await import('@/lib/contact-validation');
    fields.phone = normalizePhone(fields.phone);
  }
  if (fields.email) {
    const { isValidEmail } = await import('@/lib/contact-validation');
    if (!isValidEmail(fields.email)) throw new ServiceError(400, 'Invalid email address.');
    fields.email = fields.email.trim().toLowerCase();
  }

  const { data, error } = await admin
    .from('members')
    .update(fields)
    .eq('id', memberId)
    .eq('gym_id', gymId)
    .select('*')
    .single();

  if (error) throw new ServiceError(500, error.message);

  // PII changes are audit-logged (field names only, not values).
  const piiFields = ['first_name', 'last_name', 'email', 'phone', 'date_of_birth'].filter(
    (f) => f in fields
  );
  if (piiFields.length > 0) {
    try {
      const { logAuditEvent } = await import('@/services/audit');
      await logAuditEvent({
        gymId,
        actorId: actorId ?? null,
        action: 'member.pii_updated',
        entityType: 'member',
        entityId: memberId,
        payload: { fields: piiFields },
      });
    } catch {
      // Audit is best-effort
    }
  }

  return data;
}

export async function deleteMember(gymId: string, memberId: string): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin.from('members').delete().eq('id', memberId).eq('gym_id', gymId);
  if (error) throw new ServiceError(500, error.message);
}

export async function archiveMember(gymId: string, memberId: string): Promise<MemberDetail> {
  return updateMember(gymId, memberId, { status: 'inactive' });
}

export async function exportMembersCsv(gymId: string): Promise<string> {
  const { stringifyCsv } = await import('@/lib/csv');
  const members = await listMembers(gymId);
  const rows = members.map((m) => [
    m.first_name,
    m.last_name,
    m.email ?? '',
    m.phone ?? '',
    m.belt_rank ?? '',
    m.status ?? '',
  ]);
  return stringifyCsv(
    ['first_name', 'last_name', 'email', 'phone', 'belt_rank', 'status'],
    rows
  );
}
