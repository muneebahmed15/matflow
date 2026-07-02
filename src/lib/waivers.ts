import { supabase } from './supabase';

export type Waiver = {
  id: string;
  gym_id: string;
  title: string;
  body: string;
  is_active: boolean;
  created_at: string;
};

export type WaiverSignature = {
  id: string;
  waiver_id: string;
  member_id: string;
  gym_id: string;
  signed_name: string;
  signed_at: string;
  expires_at?: string | null;
  ip_address?: string;
};

export type WaiverSignatureStatus = 'pending' | 'signed' | 'expired';

export function isSignatureValid(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt) > new Date();
}

export function waiverStatusFromSignature(
  signature: Pick<WaiverSignature, 'expires_at'> | null | undefined
): WaiverSignatureStatus {
  if (!signature) return 'pending';
  return isSignatureValid(signature.expires_at) ? 'signed' : 'expired';
}

export function latestSignatureByWaiverId<T extends { waiver_id: string; signed_at: string }>(
  signatures: T[]
): Map<string, T> {
  const map = new Map<string, T>();
  for (const sig of signatures) {
    const existing = map.get(sig.waiver_id);
    if (!existing || new Date(sig.signed_at) > new Date(existing.signed_at)) {
      map.set(sig.waiver_id, sig);
    }
  }
  return map;
}

export function countUnsignedActiveWaivers(
  activeWaivers: { id: string }[],
  signatures: Pick<WaiverSignature, 'waiver_id' | 'expires_at' | 'signed_at'>[]
): number {
  const latest = latestSignatureByWaiverId(signatures);
  return activeWaivers.filter((w) => waiverStatusFromSignature(latest.get(w.id)) !== 'signed').length;
}

export async function getWaivers(gym_id: string): Promise<Waiver[]> {
  const { data, error } = await supabase
    .from('waivers')
    .select('*')
    .eq('gym_id', gym_id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getWaiverById(id: string): Promise<Waiver | null> {
  const { data, error } = await supabase
    .from('waivers')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createWaiver(
  gym_id: string,
  title: string,
  body: string
): Promise<Waiver> {
  const { data, error } = await supabase
    .from('waivers')
    .insert({ gym_id, title, body })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleWaiverStatus(id: string, is_active: boolean): Promise<void> {
  const { error } = await supabase
    .from('waivers')
    .update({ is_active })
    .eq('id', id);
  if (error) throw error;
}

export async function getSignaturesForWaiver(waiver_id: string) {
  const { data, error } = await supabase
    .from('waiver_signatures')
    .select('*, members(first_name, last_name, email)')
    .eq('waiver_id', waiver_id)
    .order('signed_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getMemberSignatures(member_id: string) {
  const { data, error } = await supabase
    .from('waiver_signatures')
    .select('*, waivers(title)')
    .eq('member_id', member_id)
    .order('signed_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function signWaiver(
  waiver_id: string,
  member_id: string,
  gym_id: string,
  signed_name: string
): Promise<WaiverSignature> {
  const { data, error } = await supabase
    .from('waiver_signatures')
    .insert({ waiver_id, member_id, gym_id, signed_name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function hasSignedWaiver(waiver_id: string, member_id: string): Promise<boolean> {
  const { data } = await supabase
    .from('waiver_signatures')
    .select('id, expires_at, signed_at')
    .eq('waiver_id', waiver_id)
    .eq('member_id', member_id)
    .order('signed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return waiverStatusFromSignature(data) === 'signed';
}
