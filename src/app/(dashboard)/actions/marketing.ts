'use server';

import { revalidatePath } from 'next/cache';

import { requireStaffSession } from '@/lib/auth/staff';


import { getMember } from '@/services/members';




















import { listCampaigns, createCampaign, sendCampaign, requestReview, updateCampaignAdSpend } from '@/services/marketing';
















import { type ActionResult, toActionError } from './_shared';

export async function listCampaignsAction() {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true as const, data: await listCampaigns(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}


export async function createCampaignAction(input: {
  name: string;
  subject: string;
  bodyHtml: string;
  audience: string;
}) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const campaign = await createCampaign({ ...input, gymId: auth.gymId });
    revalidatePath('/marketing');
    return { ok: true as const, data: campaign };
  } catch (error) {
    return toActionError(error);
  }
}


export async function sendCampaignAction(campaignId: string) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true as const, data: await sendCampaign(auth.gymId, campaignId) };
  } catch (error) {
    return toActionError(error);
  }
}


export async function scheduleCampaignAction(
  campaignId: string,
  scheduledAt: string
): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const { scheduleCampaign } = await import('@/services/marketing');
    await scheduleCampaign(auth.gymId, campaignId, scheduledAt);
    revalidatePath('/marketing');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}


export async function cancelScheduledCampaignAction(campaignId: string): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const { cancelScheduledCampaign } = await import('@/services/marketing');
    await cancelScheduledCampaign(auth.gymId, campaignId);
    revalidatePath('/marketing');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}


export async function updateCampaignAdSpendAction(
  campaignId: string,
  adSpendCents: number
): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    await updateCampaignAdSpend(auth.gymId, campaignId, adSpendCents);
    revalidatePath('/marketing');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}


export async function requestReviewAction(memberId: string): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    await getMember(auth.gymId, memberId);
    await requestReview(auth.gymId, memberId);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

