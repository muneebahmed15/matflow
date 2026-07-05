'use server';

import { revalidatePath } from 'next/cache';

import { requireStaffSession } from '@/lib/auth/staff';





























import { listKnowledge, upsertKnowledge, deleteKnowledge } from '@/services/ai-knowledge';

import { listConversations } from '@/services/ai-front-desk';

import { listInboxItems, getConversationMessages } from '@/services/inbox';







import { type ActionResult, toActionError } from './_shared';

export async function listAiKnowledgeAction() {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true as const, data: await listKnowledge(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}


export async function upsertAiKnowledgeAction(input: { topic: string; content: string }) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const data = await upsertKnowledge({ gymId: auth.gymId, ...input });
    revalidatePath('/ai-desk');
    return { ok: true as const, data };
  } catch (error) {
    return toActionError(error);
  }
}


export async function deleteAiKnowledgeAction(knowledgeId: string) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    await deleteKnowledge(auth.gymId, knowledgeId);
    revalidatePath('/ai-desk');
    return { ok: true as const };
  } catch (error) {
    return toActionError(error);
  }
}


export async function listAiConversationsAction() {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true as const, data: await listConversations(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}


export async function listInboxAction() {
  try {
    const auth = await requireStaffSession({ capability: 'marketing.read' });
    return { ok: true as const, data: await listInboxItems(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}


export async function getConversationMessagesAction(conversationId: string) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true as const, data: await getConversationMessages(conversationId, auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listPendingEmailDraftsAction() {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const { listPendingEmailDrafts } = await import('@/services/ai-front-desk');
    return { ok: true as const, data: await listPendingEmailDrafts(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function approveEmailDraftAction(messageId: string): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const { approveEmailDraft } = await import('@/services/ai-front-desk');
    await approveEmailDraft({
      gymId: auth.gymId,
      messageId,
      actorId: auth.user.id,
    });
    revalidatePath('/ai-desk');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function rejectEmailDraftAction(messageId: string): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const { rejectEmailDraft } = await import('@/services/ai-front-desk');
    await rejectEmailDraft({
      gymId: auth.gymId,
      messageId,
      actorId: auth.user.id,
    });
    revalidatePath('/ai-desk');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getAiUsageSummaryAction(): Promise<
  ActionResult<{ used: number; limit: number }>
> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const { getMonthlyAiUsage } = await import('@/lib/ai/usage-metering');
    const { getGymSettings } = await import('@/services/gym');
    const settings = await getGymSettings(auth.gymId);
    const used = await getMonthlyAiUsage(auth.gymId);
    return { ok: true, data: { used, limit: settings.ai_monthly_message_limit } };
  } catch (error) {
    return toActionError(error);
  }
}

