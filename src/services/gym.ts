import { getAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/database';
import { ServiceError } from '@/services/errors';
import { logAuditEvent } from '@/services/audit';

type GymRow = Database['public']['Tables']['gyms']['Row'];

export type GymSettings = Pick<GymRow, 'id' | 'name' | 'slug' | 'kiosk_enabled'> & {
  website_enabled: boolean;
  store_enabled: boolean;
  ai_front_desk_enabled: boolean;
  daily_digest_enabled: boolean;
  logo_url: string | null;
  primary_color: string | null;
  tagline: string | null;
  about_text: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address_line1: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  custom_domain: string | null;
  white_label_enabled: boolean;
  store_return_policy: string | null;
  ga4_measurement_id: string | null;
  meta_pixel_id: string | null;
  google_place_id: string | null;
  review_checkin_threshold: number;
  require_waiver_for_checkin: boolean;
  timezone: string;
  belt_system: string;
  booking_cancel_hours: number;
};

const GYM_SETTINGS_COLUMNS =
  'id, name, slug, kiosk_enabled, website_enabled, store_enabled, ai_front_desk_enabled, daily_digest_enabled, logo_url, primary_color, tagline, about_text, contact_email, contact_phone, address_line1, address_city, address_state, address_zip, custom_domain, white_label_enabled, store_return_policy, ga4_measurement_id, meta_pixel_id, google_place_id, review_checkin_threshold, require_waiver_for_checkin, timezone, belt_system, booking_cancel_hours';

export async function getGymSettings(gymId: string): Promise<GymSettings> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('gyms')
    .select(GYM_SETTINGS_COLUMNS)
    .eq('id', gymId)
    .single();

  if (error || !data) throw new ServiceError(404, 'Gym not found');
  return data as GymSettings;
}

export type UpdateGymSettingsInput = {
  name: string;
  slug: string;
  kioskEnabled: boolean;
  websiteEnabled?: boolean;
  storeEnabled?: boolean;
  aiFrontDeskEnabled?: boolean;
  dailyDigestEnabled?: boolean;
  logoUrl?: string | null;
  primaryColor?: string | null;
  tagline?: string | null;
  aboutText?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  addressLine1?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZip?: string | null;
  customDomain?: string | null;
  whiteLabelEnabled?: boolean;
  storeReturnPolicy?: string | null;
  ga4MeasurementId?: string | null;
  metaPixelId?: string | null;
  googlePlaceId?: string | null;
  reviewCheckinThreshold?: number;
  requireWaiverForCheckin?: boolean;
  timezone?: string;
  beltSystem?: string;
  bookingCancelHours?: number;
};

export async function updateGymSettings(
  gymId: string,
  input: UpdateGymSettingsInput
): Promise<GymSettings> {
  const admin = getAdminClient();
  const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
  if (!input.name.trim()) throw new ServiceError(400, 'Gym name is required.');
  if (!slug) throw new ServiceError(400, 'Gym slug is required.');

  const primaryColor = input.primaryColor?.trim();
  if (primaryColor && !/^#[0-9A-Fa-f]{6}$/.test(primaryColor)) {
    throw new ServiceError(400, 'Primary color must be a valid hex code (e.g. #2563eb).');
  }

  const { data: slugConflict } = await admin
    .from('gyms')
    .select('id')
    .eq('slug', slug)
    .neq('id', gymId)
    .maybeSingle();

  if (slugConflict) {
    throw new ServiceError(409, 'This slug is already taken. Choose another.');
  }

  const customDomain = input.customDomain?.trim().toLowerCase() || null;
  if (customDomain) {
    const { data: domainConflict } = await admin
      .from('gyms')
      .select('id')
      .eq('custom_domain', customDomain)
      .neq('id', gymId)
      .maybeSingle();

    if (domainConflict) {
      throw new ServiceError(409, 'This custom domain is already in use.');
    }
  }

  const { data, error } = await admin
    .from('gyms')
    .update({
      name: input.name.trim(),
      slug,
      kiosk_enabled: input.kioskEnabled,
      website_enabled: input.websiteEnabled ?? false,
      store_enabled: input.storeEnabled ?? false,
      ai_front_desk_enabled: input.aiFrontDeskEnabled ?? false,
      daily_digest_enabled: input.dailyDigestEnabled ?? true,
      logo_url: input.logoUrl?.trim() || null,
      primary_color: primaryColor || '#2563eb',
      tagline: input.tagline?.trim() || null,
      about_text: input.aboutText?.trim() || null,
      contact_email: input.contactEmail?.trim() || null,
      contact_phone: input.contactPhone?.trim() || null,
      address_line1: input.addressLine1?.trim() || null,
      address_city: input.addressCity?.trim() || null,
      address_state: input.addressState?.trim() || null,
      address_zip: input.addressZip?.trim() || null,
      custom_domain: customDomain,
      white_label_enabled: input.whiteLabelEnabled ?? false,
      store_return_policy: input.storeReturnPolicy?.trim() || null,
      ga4_measurement_id: input.ga4MeasurementId?.trim() || null,
      meta_pixel_id: input.metaPixelId?.trim() || null,
      google_place_id: input.googlePlaceId?.trim() || null,
      review_checkin_threshold: input.reviewCheckinThreshold ?? 5,
      require_waiver_for_checkin: input.requireWaiverForCheckin ?? true,
      timezone: input.timezone?.trim() || 'America/New_York',
      belt_system: input.beltSystem?.trim() || 'bjj_adult',
      booking_cancel_hours: Math.max(0, input.bookingCancelHours ?? 2),
    })
    .eq('id', gymId)
    .select(GYM_SETTINGS_COLUMNS)
    .single();

  if (error) throw new ServiceError(500, error.message);

  try {
    await logAuditEvent({
      gymId,
      action: 'settings.updated',
      entityType: 'gym',
      entityId: gymId,
      payload: { name: input.name.trim(), slug },
    });
  } catch {
    // Audit is best-effort
  }

  return data as GymSettings;
}

export async function getGymName(gymId: string): Promise<string | null> {
  const admin = getAdminClient();
  const { data } = await admin.from('gyms').select('name').eq('id', gymId).maybeSingle();
  return data?.name ?? null;
}
