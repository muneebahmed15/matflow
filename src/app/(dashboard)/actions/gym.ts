'use server';

import { revalidatePath } from 'next/cache';

import { requireStaffSession } from '@/lib/auth/staff';



import { getGymSettings, updateGymSettings, completeGymSetup, type GymSettings } from '@/services/gym';











import type { StaffRole } from '@/lib/auth/staff';






import { setPlanActive } from '@/services/plans';






import { listLocations, createLocation, deleteLocation } from '@/services/gym-locations';







import { getGbpConnectionStatus, getGbpOAuthUrl, syncDirectoryListings } from '@/services/gbp';





import { type ActionResult, toActionError } from './_shared';

export async function getStaffContextAction(): Promise<
  ActionResult<{ gymId: string; role: StaffRole; timezone: string }>
> {
  try {
    const auth = await requireStaffSession();
    const settings = await getGymSettings(auth.gymId);
    return {
      ok: true,
      data: { gymId: auth.gymId, role: auth.role, timezone: settings.timezone },
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
  reviewCheckinThreshold?: number;
  requireWaiverForCheckin?: boolean;
  timezone?: string;
  beltSystem?: string;
  beltCustomOrder?: string[] | null;
  beltColorOverrides?: Record<string, string> | null;
  bookingCancelHours?: number;
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

