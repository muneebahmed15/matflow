import { getAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/database';
import { ServiceError } from '@/services/errors';

type MemberRow = Database['public']['Tables']['members']['Row'];
type FamilyRow = Database['public']['Tables']['families']['Row'];

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

  const { data, error } = await admin
    .from('members')
    .insert({
      gym_id: input.gymId,
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      belt_rank: input.beltRank ?? 'white',
      status: input.status ?? 'active',
      family_id: familyId,
    })
    .select()
    .single();

  if (error) throw new ServiceError(500, error.message);
  return data;
}
