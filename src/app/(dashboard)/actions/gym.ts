'use server';

import { revalidatePath } from 'next/cache';

import { requireStaffSession } from '@/lib/auth/staff';



import { getGymSettings, updateGymSettings, completeGymSetup, type GymSettings } from '@/services/gym';











import type { StaffRole } from '@/lib/auth/staff';






import { setPlanActive } from '@/services/plans';






import { listLocations, createLocation, deleteLocation } from '@/services/gym-locations';







import { getGbpConnectionStatus, getGbpOAuthUrl, syncDirectoryListings, syncGbpHoursFromSchedule, previewGbpHoursFromSchedule } from '@/services/gbp';
import { createApiKey, listApiKeys, revokeApiKey } from '@/services/api-keys';
import { suggestSeoKeywords } from '@/lib/seo-keywords';
import { listPrograms } from '@/services/gym-content';





import { type ActionResult, toActionError } from './_shared';

export async function getStaffContextAction(): Promise<
  ActionResult<{ gymId: string; role: StaffRole; timezone: string; coachesStripesOnly: boolean }>
> {
  try {
    const auth = await requireStaffSession();
    const settings = await getGymSettings(auth.gymId);
    return {
      ok: true,
      data: {
        gymId: auth.gymId,
        role: auth.role,
        timezone: settings.timezone,
        coachesStripesOnly: settings.coaches_stripes_only,
      },
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getGymSettingsAction(): Promise<ActionResult<GymSettings>> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const settings = await getGymSettings(auth.gymId);
    return { ok: true, data: settings };
  } catch (error) {
    return toActionError(error);
  }
}


export async function completeSetupAction(): Promise<ActionResult<GymSettings>> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const settings = await completeGymSetup(auth.gymId);
    revalidatePath('/dashboard');
    revalidatePath('/setup');
    return { ok: true, data: settings };
  } catch (error) {
    return toActionError(error);
  }
}


export async function updateGymSettingsAction(input: {
  name: string;
  slug: string;
  kioskEnabled: boolean;
  websiteEnabled?: boolean;
  storeEnabled?: boolean;
  aiFrontDeskEnabled?: boolean;
  dailyDigestEnabled?: boolean;
  logoUrl?: string | null;
  faviconUrl?: string | null;
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
  heroImageUrl?: string | null;
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
  digestFrequency?: 'daily' | 'weekly';
  digestSmsEnabled?: boolean;
  digestSmsPhone?: string | null;
  aiOffHoursMessage?: string | null;
  aiPersonaName?: string | null;
  aiTone?: 'formal' | 'friendly';
  aiLanguages?: string[];
  twilioPhone?: string | null;
  aiMonthlyMessageLimit?: number;
  aiVoiceEnabled?: boolean;
  aiVoiceTransferKeyword?: string;
  aiVoiceRecordCalls?: boolean;
  staffTransferPhone?: string | null;
  metaPageId?: string | null;
  metaPageAccessToken?: string | null;
  metaVerifyToken?: string | null;
  metaInstagramId?: string | null;
  inboundEmailAddress?: string | null;
  aiEmailAutoReply?: boolean;
  beltGraduationPreset?: 'custom' | 'ibjjf';
  nfcDisplayEnabled?: boolean;
  docusignExportEnabled?: boolean;
  docusignWebhookUrl?: string | null;
  bufferAccessToken?: string | null;
  bufferProfileIds?: string[];
  printfulApiKey?: string | null;
  printfulStoreId?: string | null;
  voiceBriefingEnabled?: boolean;
  voiceBriefingPhone?: string | null;
}): Promise<ActionResult<GymSettings>> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const settings = await updateGymSettings(auth.gymId, input);
    revalidatePath('/settings');
    return { ok: true, data: settings };
  } catch (error) {
    return toActionError(error);
  }
}


export async function setPlanActiveAction(
  planId: string,
  isActive: boolean
): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    await setPlanActive(auth.gymId, planId, isActive);
    revalidatePath('/plans');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}


export async function listLocationsAction() {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true as const, data: await listLocations(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}


export async function createLocationAction(input: {
  name: string;
  addressLine1?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  isPrimary?: boolean;
}) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const data = await createLocation({ gymId: auth.gymId, ...input });
    revalidatePath('/settings');
    return { ok: true as const, data };
  } catch (error) {
    return toActionError(error);
  }
}


export async function deleteLocationAction(locationId: string) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    await deleteLocation(auth.gymId, locationId);
    revalidatePath('/settings');
    return { ok: true as const };
  } catch (error) {
    return toActionError(error);
  }
}


export async function getGbpStatusAction() {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const status = await getGbpConnectionStatus(auth.gymId);
    const oauthUrl = getGbpOAuthUrl(auth.gymId);
    return { ok: true as const, data: { ...status, oauthUrl } };
  } catch (error) {
    return toActionError(error);
  }
}


export async function syncDirectoryListingsAction() {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true as const, data: await syncDirectoryListings(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function syncGbpHoursAction() {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true as const, data: await syncGbpHoursFromSchedule(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function previewGbpHoursAction() {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true as const, data: await previewGbpHoursFromSchedule(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listApiKeysAction() {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true as const, data: await listApiKeys(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createApiKeyAction(name: string) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const data = await createApiKey(auth.gymId, name);
    return { ok: true as const, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function revokeApiKeyAction(keyId: string) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    await revokeApiKey(auth.gymId, keyId);
    revalidatePath('/settings');
    return { ok: true as const };
  } catch (error) {
    return toActionError(error);
  }
}

export async function suggestSeoKeywordsAction() {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const settings = await getGymSettings(auth.gymId);
    const programs = await listPrograms(auth.gymId);
    const keywords = suggestSeoKeywords({
      gymName: settings.name,
      city: settings.address_city,
      state: settings.address_state,
      tagline: settings.tagline,
      programs: programs.map((p) => p.name),
    });
    return { ok: true as const, data: keywords };
  } catch (error) {
    return toActionError(error);
  }
}

export async function startStripeConnectOnboardingAction(): Promise<
  ActionResult<{ onboardingUrl: string }>
> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const settings = await getGymSettings(auth.gymId);
    const { createConnectAccountLink } = await import('@/lib/stripe-connect');
    const { accountId, onboardingUrl } = await createConnectAccountLink({
      gymId: auth.gymId,
      email: auth.user.email ?? settings.contact_email ?? '',
      existingAccountId: settings.stripe_connect_account_id,
    });

    const admin = (await import('@/lib/supabase/admin')).getAdminClient();
    await admin
      .from('gyms')
      .update({ stripe_connect_account_id: accountId })
      .eq('id', auth.gymId);

    return { ok: true, data: { onboardingUrl } };
  } catch (error) {
    return toActionError(error);
  }
}

export async function refreshStripeConnectStatusAction(): Promise<
  ActionResult<{ onboarded: boolean }>
> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const settings = await getGymSettings(auth.gymId);
    if (!settings.stripe_connect_account_id) {
      return { ok: true, data: { onboarded: false } };
    }

    const { refreshConnectAccountStatus } = await import('@/lib/stripe-connect');
    const onboarded = await refreshConnectAccountStatus(settings.stripe_connect_account_id);

    const admin = (await import('@/lib/supabase/admin')).getAdminClient();
    await admin
      .from('gyms')
      .update({ stripe_connect_onboarded: onboarded })
      .eq('id', auth.gymId);

    revalidatePath('/settings');
    return { ok: true, data: { onboarded } };
  } catch (error) {
    return toActionError(error);
  }
}

