import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';

export type EmergencyContact = {
  id: string;
  gym_id: string;
  member_id: string;
  full_name: string;
  phone: string;
  relationship: string;
  is_primary: boolean;
  created_at: string;
};

export async function listEmergencyContacts(
  gymId: string,
  memberId: string
): Promise<EmergencyContact[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('emergency_contacts')
    .select('*')
    .eq('gym_id', gymId)
    .eq('member_id', memberId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) throw new ServiceError(500, error.message);
  return (data ?? []) as EmergencyContact[];
}

export type UpsertEmergencyContactInput = {
  gymId: string;
  memberId: string;
  fullName: string;
  phone: string;
  relationship: string;
  isPrimary?: boolean;
};

export async function createEmergencyContact(
  input: UpsertEmergencyContactInput
): Promise<EmergencyContact> {
  const admin = getAdminClient();
  const fullName = input.fullName.trim();
  const phone = input.phone.trim();
  const relationship = input.relationship.trim();

  if (!fullName || !phone || !relationship) {
    throw new ServiceError(400, 'Name, phone, and relationship are required.');
  }

  if (input.isPrimary) {
    await admin
      .from('emergency_contacts')
      .update({ is_primary: false })
      .eq('gym_id', input.gymId)
      .eq('member_id', input.memberId);
  }

  const { data, error } = await admin
    .from('emergency_contacts')
    .insert({
      gym_id: input.gymId,
      member_id: input.memberId,
      full_name: fullName,
      phone,
      relationship,
      is_primary: input.isPrimary ?? false,
    })
    .select('*')
    .single();

  if (error) throw new ServiceError(500, error.message);
  return data as EmergencyContact;
}

export async function deleteEmergencyContact(
  gymId: string,
  contactId: string
): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from('emergency_contacts')
    .delete()
    .eq('id', contactId)
    .eq('gym_id', gymId);

  if (error) throw new ServiceError(500, error.message);
}
