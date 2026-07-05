import { getAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/database';
import { ServiceError } from '@/services/errors';
import { logAuditEvent } from '@/services/audit';
import { parseDigestSections } from '@/lib/digest-sections';

type GymRow = Database['public']['Tables']['gyms']['Row'];

export type GymSettings = Pick<GymRow, 'id' | 'name' | 'slug' | 'kiosk_enabled'> & {
  website_enabled: boolean;
  store_enabled: boolean;
  ai_front_desk_enabled: boolean;
  daily_digest_enabled: boolean;
  logo_url: string | null;
  favicon_url: string | null;
  hero_image_url: string | null;
  setup_completed_at: string | null;
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
  google_ads_conversion_id: string | null;
  review_checkin_threshold: number;
  require_waiver_for_checkin: boolean;
  timezone: string;
  belt_system: string;
  belt_custom_order: string[] | null;
  belt_color_overrides: Record<string, string> | null;
  booking_cancel_hours: number;
  class_reminder_hours: number;
  marketing_enabled: boolean;
  hero_ab_enabled: boolean;
  hero_variant_b_headline: string | null;
  hero_variant_b_subheadline: string | null;
  seo_keywords: string[] | null;
  public_translations: Record<string, unknown>;
  locale: string;
  member_required_fields: Record<string, unknown>;
  shop_member_discount_percent: number;
  shop_flat_tax_cents: number;
  coaches_stripes_only: boolean;
  stripe_tax_enabled: boolean;
  payment_provider: string;
  stripe_only: boolean;
  waiver_retention_days: number | null;
  digest_inactive_days: number;
  digest_hour: number;
  digest_slack_webhook_url: string | null;
  digest_sections: Record<string, boolean>;
  ai_off_hours_message: string | null;
  ai_persona_name: string | null;
  ai_tone: string;
  ai_languages: string[];
  twilio_phone: string | null;
  digest_frequency: 'daily' | 'weekly';
  digest_sms_enabled: boolean;
  digest_sms_phone: string | null;
};

const GYM_SETTINGS_COLUMNS =
  'id, name, slug, kiosk_enabled, website_enabled, store_enabled, marketing_enabled, ai_front_desk_enabled, daily_digest_enabled, logo_url, favicon_url, hero_image_url, setup_completed_at, primary_color, tagline, about_text, contact_email, contact_phone, address_line1, address_city, address_state, address_zip, custom_domain, white_label_enabled, store_return_policy, ga4_measurement_id, meta_pixel_id, google_place_id, google_ads_conversion_id, review_checkin_threshold, require_waiver_for_checkin, timezone, locale, belt_system, belt_custom_order, belt_color_overrides, booking_cancel_hours, class_reminder_hours, hero_ab_enabled, hero_variant_b_headline, hero_variant_b_subheadline, seo_keywords, public_translations, member_required_fields, shop_member_discount_percent, shop_flat_tax_cents, coaches_stripes_only, stripe_tax_enabled, payment_provider, stripe_only, waiver_retention_days, digest_inactive_days, digest_hour, digest_slack_webhook_url, digest_sections, digest_frequency, digest_sms_enabled, digest_sms_phone, ai_off_hours_message, ai_persona_name, ai_tone, ai_languages, twilio_phone';

function parseGymSettingsRow(data: Record<string, unknown>): GymSettings {
  const customOrder = data.belt_custom_order;
  const colorOverrides = data.belt_color_overrides;
  return {
    ...(data as GymSettings),
    marketing_enabled: Boolean((data as GymSettings).marketing_enabled),
    hero_ab_enabled: Boolean((data as GymSettings).hero_ab_enabled),
    seo_keywords: Array.isArray((data as GymSettings).seo_keywords)
      ? ((data as GymSettings).seo_keywords as string[])
      : [],
    public_translations:
      (data as GymSettings).public_translations &&
      typeof (data as GymSettings).public_translations === 'object'
        ? ((data as GymSettings).public_translations as Record<string, unknown>)
        : {},
    member_required_fields:
      (data as GymSettings).member_required_fields &&
      typeof (data as GymSettings).member_required_fields === 'object'
        ? ((data as GymSettings).member_required_fields as Record<string, unknown>)
        : {},
    shop_member_discount_percent: Number((data as GymSettings).shop_member_discount_percent ?? 0),
    shop_flat_tax_cents: Number((data as GymSettings).shop_flat_tax_cents ?? 0),
    coaches_stripes_only: Boolean((data as GymSettings).coaches_stripes_only),
    stripe_tax_enabled: Boolean((data as GymSettings).stripe_tax_enabled),
    payment_provider: String((data as GymSettings).payment_provider ?? 'stripe'),
    stripe_only: (data as GymSettings).stripe_only !== false,
    waiver_retention_days:
      (data as GymSettings).waiver_retention_days != null
        ? Number((data as GymSettings).waiver_retention_days)
        : null,
    belt_custom_order: Array.isArray(customOrder)
      ? customOrder.filter((b): b is string => typeof b === 'string')
      : null,
    belt_color_overrides:
      colorOverrides && typeof colorOverrides === 'object' && !Array.isArray(colorOverrides)
        ? Object.fromEntries(
            Object.entries(colorOverrides as Record<string, unknown>).filter(
              (entry): entry is [string, string] => typeof entry[1] === 'string'
            )
          )
        : null,
    digest_inactive_days: Math.min(
      90,
      Math.max(1, Number((data as GymSettings).digest_inactive_days ?? 14))
    ),
    ai_off_hours_message:
      typeof (data as GymSettings).ai_off_hours_message === 'string'
        ? (data as GymSettings).ai_off_hours_message
        : null,
    ai_persona_name:
      typeof (data as GymSettings).ai_persona_name === 'string'
        ? (data as GymSettings).ai_persona_name
        : null,
    ai_tone: (data as GymSettings).ai_tone === 'formal' ? 'formal' : 'friendly',
    ai_languages: Array.isArray((data as GymSettings).ai_languages)
      ? ((data as GymSettings).ai_languages as string[]).filter((l) => typeof l === 'string')
      : ['en'],
    digest_hour: Math.min(
      23,
      Math.max(0, Number((data as GymSettings).digest_hour ?? 8))
    ),
    digest_slack_webhook_url:
      typeof (data as GymSettings).digest_slack_webhook_url === 'string'
        ? (data as GymSettings).digest_slack_webhook_url
        : null,
    digest_sections: parseDigestSections((data as GymSettings).digest_sections),
    digest_frequency:
      (data as GymSettings).digest_frequency === 'weekly' ? 'weekly' : 'daily',
    digest_sms_enabled: Boolean((data as GymSettings).digest_sms_enabled),
    digest_sms_phone:
      typeof (data as GymSettings).digest_sms_phone === 'string'
        ? (data as GymSettings).digest_sms_phone
        : null,
    twilio_phone:
      typeof (data as GymSettings).twilio_phone === 'string'
        ? (data as GymSettings).twilio_phone
        : null,
  };
}

export async function getGymSettings(gymId: string): Promise<GymSettings> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('gyms')
    .select(GYM_SETTINGS_COLUMNS)
    .eq('id', gymId)
    .single();

  if (error || !data) throw new ServiceError(404, 'Gym not found');
  return parseGymSettingsRow(data as Record<string, unknown>);
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
  faviconUrl?: string | null;
  heroImageUrl?: string | null;
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
  googleAdsConversionId?: string | null;
  reviewCheckinThreshold?: number;
  requireWaiverForCheckin?: boolean;
  timezone?: string;
  beltSystem?: string;
  beltCustomOrder?: string[] | null;
  beltColorOverrides?: Record<string, string> | null;
  bookingCancelHours?: number;
  classReminderHours?: number;
  marketingEnabled?: boolean;
  heroAbEnabled?: boolean;
  heroVariantBHeadline?: string | null;
  heroVariantBSubheadline?: string | null;
  seoKeywords?: string[] | null;
  publicTranslations?: Record<string, unknown> | null;
  locale?: string;
  shopMemberDiscountPercent?: number;
  shopFlatTaxCents?: number;
  coachesStripesOnly?: boolean;
  stripeTaxEnabled?: boolean;
  paymentProvider?: string;
  stripeOnly?: boolean;
  waiverRetentionDays?: number | null;
  digestInactiveDays?: number;
  digestHour?: number;
  digestSlackWebhookUrl?: string | null;
  digestSections?: Record<string, boolean>;
  aiOffHoursMessage?: string | null;
  aiPersonaName?: string | null;
  aiTone?: 'formal' | 'friendly';
  aiLanguages?: string[];
  twilioPhone?: string | null;
  digestFrequency?: 'daily' | 'weekly';
  digestSmsEnabled?: boolean;
  digestSmsPhone?: string | null;
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

  const beltCustomOrder =
    input.beltCustomOrder?.map((belt) => belt.trim().toLowerCase()).filter(Boolean) ?? null;
  if (beltCustomOrder && beltCustomOrder.length > 0 && beltCustomOrder.length < 2) {
    throw new ServiceError(400, 'Custom belt order needs at least two belts.');
  }

  const beltColorOverrides = input.beltColorOverrides ?? null;
  if (beltColorOverrides) {
    for (const [belt, color] of Object.entries(beltColorOverrides)) {
      if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
        throw new ServiceError(400, `Invalid hex color for belt "${belt}". Use format #RRGGBB.`);
      }
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
      favicon_url: input.faviconUrl?.trim() || null,
      hero_image_url: input.heroImageUrl?.trim() || null,
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
      google_ads_conversion_id: input.googleAdsConversionId?.trim() || null,
      review_checkin_threshold: input.reviewCheckinThreshold ?? 5,
      require_waiver_for_checkin: input.requireWaiverForCheckin ?? true,
      timezone: input.timezone?.trim() || 'America/New_York',
      belt_system: input.beltSystem?.trim() || 'bjj_adult',
      belt_custom_order: beltCustomOrder && beltCustomOrder.length >= 2 ? beltCustomOrder : null,
      belt_color_overrides: beltColorOverrides,
      booking_cancel_hours: Math.max(0, input.bookingCancelHours ?? 2),
      class_reminder_hours: Math.max(0, Math.min(24, input.classReminderHours ?? 2)),
      marketing_enabled: input.marketingEnabled ?? false,
      hero_ab_enabled: input.heroAbEnabled ?? false,
      hero_variant_b_headline: input.heroVariantBHeadline?.trim() || null,
      hero_variant_b_subheadline: input.heroVariantBSubheadline?.trim() || null,
      seo_keywords: input.seoKeywords ?? null,
      public_translations: input.publicTranslations ?? {},
      locale: input.locale?.trim() || 'en-US',
      shop_member_discount_percent: Math.min(
        100,
        Math.max(0, input.shopMemberDiscountPercent ?? 0)
      ),
      shop_flat_tax_cents: Math.max(0, input.shopFlatTaxCents ?? 0),
      coaches_stripes_only: input.coachesStripesOnly ?? false,
      stripe_tax_enabled: input.stripeTaxEnabled ?? false,
      payment_provider: input.paymentProvider?.trim() || 'stripe',
      stripe_only: input.stripeOnly !== false,
      waiver_retention_days: input.waiverRetentionDays ?? null,
      digest_inactive_days: Math.min(90, Math.max(1, input.digestInactiveDays ?? 14)),
      digest_hour: Math.min(23, Math.max(0, input.digestHour ?? 8)),
      digest_slack_webhook_url: input.digestSlackWebhookUrl?.trim() || null,
      digest_sections: parseDigestSections(input.digestSections),
      ai_off_hours_message: input.aiOffHoursMessage?.trim() || null,
      ai_persona_name: input.aiPersonaName?.trim() || 'Front Desk',
      ai_tone: input.aiTone === 'formal' ? 'formal' : 'friendly',
      ai_languages:
        input.aiLanguages && input.aiLanguages.length > 0 ? input.aiLanguages : ['en'],
      twilio_phone: input.twilioPhone?.trim() || null,
      digest_frequency: input.digestFrequency === 'weekly' ? 'weekly' : 'daily',
      digest_sms_enabled: input.digestSmsEnabled ?? false,
      digest_sms_phone: input.digestSmsPhone?.trim() || null,
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

  return parseGymSettingsRow(data as Record<string, unknown>);
}

export async function listSiblingGyms(
  gymId: string
): Promise<{ id: string; name: string; slug: string }[]> {
  const admin = getAdminClient();
  const { data: gym, error } = await admin.from('gyms').select('owner_id').eq('id', gymId).single();
  if (error || !gym) throw new ServiceError(404, 'Gym not found');

  const { data, error: listError } = await admin
    .from('gyms')
    .select('id, name, slug')
    .eq('owner_id', gym.owner_id)
    .neq('id', gymId)
    .order('name');

  if (listError) throw new ServiceError(500, listError.message);
  return data ?? [];
}

export async function getGymName(gymId: string): Promise<string | null> {
  const admin = getAdminClient();
  const { data } = await admin.from('gyms').select('name').eq('id', gymId).maybeSingle();
  return data?.name ?? null;
}

export async function completeGymSetup(gymId: string): Promise<GymSettings> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('gyms')
    .update({ setup_completed_at: new Date().toISOString() })
    .eq('id', gymId)
    .select(GYM_SETTINGS_COLUMNS)
    .single();

  if (error) throw new ServiceError(500, error.message);
  return parseGymSettingsRow(data as Record<string, unknown>);
}

export async function updateMemberRequiredFields(
  gymId: string,
  fields: Record<string, boolean>
): Promise<GymSettings> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('gyms')
    .update({ member_required_fields: fields })
    .eq('id', gymId)
    .select(GYM_SETTINGS_COLUMNS)
    .single();

  if (error) throw new ServiceError(500, error.message);
  return parseGymSettingsRow(data as Record<string, unknown>);
}
