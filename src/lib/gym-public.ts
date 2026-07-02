import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';

export type PublicGymProfile = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  about_text: string | null;
  logo_url: string | null;
  primary_color: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address_line1: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  website_enabled: boolean;
  store_enabled: boolean;
  white_label_enabled: boolean;
  ai_front_desk_enabled: boolean;
  ga4_measurement_id: string | null;
  meta_pixel_id: string | null;
};

const PUBLIC_GYM_COLUMNS =
  'id, name, slug, tagline, about_text, logo_url, primary_color, contact_email, contact_phone, address_line1, address_city, address_state, address_zip, website_enabled, store_enabled, ai_front_desk_enabled, white_label_enabled, ga4_measurement_id, meta_pixel_id';

/** Load a gym for public website rendering. Returns null if not found or website disabled. */
export async function getPublicGymBySlug(slug: string): Promise<PublicGymProfile | null> {
  const admin = getAdminClient();
  const normalized = slug.trim().toLowerCase();

  const { data, error } = await admin
    .from('gyms')
    .select(PUBLIC_GYM_COLUMNS)
    .eq('slug', normalized)
    .eq('website_enabled', true)
    .maybeSingle();

  if (error) throw new ServiceError(500, error.message);
  return data as PublicGymProfile | null;
}

export function formatGymAddress(gym: Pick<
  PublicGymProfile,
  'address_line1' | 'address_city' | 'address_state' | 'address_zip'
>): string | null {
  const parts = [
    gym.address_line1,
    [gym.address_city, gym.address_state].filter(Boolean).join(', '),
    gym.address_zip,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' · ') : null;
}

export function gymPrimaryColor(color: string | null | undefined): string {
  if (!color) return '#2563eb';
  return /^#[0-9A-Fa-f]{6}$/.test(color) ? color : '#2563eb';
}
