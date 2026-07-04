'use server';

import { revalidatePath } from 'next/cache';

import { requireStaffSession } from '@/lib/auth/staff';


import { getMember } from '@/services/members';




















import { listCampaigns, createCampaign, sendCampaign, requestReview, updateCampaignAdSpend, getReviewConversionStats } from '@/services/marketing';
import { createSmsCampaign, listSmsCampaigns, sendSmsCampaign } from '@/services/sms-campaigns';
import {
  createAndPublishGbpPost,
  importGbpLocationData,
  listGbpLocalPosts,
  listGbpReviews,
  replyToGbpReview,
} from '@/services/gbp';
import { generateMarketingCopy } from '@/lib/ai/marketing-copy';
import { getGymSettings } from '@/services/gym';
















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

export async function getReviewConversionStatsAction() {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true as const, data: await getReviewConversionStats(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listSmsCampaignsAction() {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true as const, data: await listSmsCampaigns(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createSmsCampaignAction(input: {
  name: string;
  body: string;
  audience: string;
}) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const campaign = await createSmsCampaign({ ...input, gymId: auth.gymId });
    revalidatePath('/marketing');
    return { ok: true as const, data: campaign };
  } catch (error) {
    return toActionError(error);
  }
}

export async function sendSmsCampaignAction(campaignId: string) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true as const, data: await sendSmsCampaign(auth.gymId, campaignId) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listGbpPostsAction() {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true as const, data: await listGbpLocalPosts(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createGbpPostAction(input: { summary: string; body?: string }) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const data = await createAndPublishGbpPost(auth.gymId, input);
    revalidatePath('/marketing');
    return { ok: true as const, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listGbpReviewsAction() {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true as const, data: await listGbpReviews(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function replyGbpReviewAction(reviewId: string, replyText: string) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const data = await replyToGbpReview(auth.gymId, reviewId, replyText);
    revalidatePath('/marketing');
    return { ok: true as const, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function importGbpDataAction() {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const data = await importGbpLocationData(auth.gymId);
    revalidatePath('/marketing');
    return { ok: true as const, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function generateInstagramCaptionAction(input: { topic?: string }) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const settings = await getGymSettings(auth.gymId);
    const data = await generateMarketingCopy('instagram_caption', {
      gymName: settings.name,
      tagline: settings.tagline,
      topic: input.topic,
    });
    return { ok: true as const, data };
  } catch (error) {
    return toActionError(error);
  }
}

