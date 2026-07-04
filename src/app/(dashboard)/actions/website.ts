'use server';

import { revalidatePath } from 'next/cache';

import { requireStaffSession } from '@/lib/auth/staff';
































import { listBlogPosts, createBlogPost, publishBlogPost, deleteBlogPost } from '@/services/blog';


import { listPrograms, createProgram, updateProgram, deleteProgram, listCoaches, createCoach, updateCoach, deleteCoach, addGalleryImage } from '@/services/gym-content';




import { type ActionResult, toActionError } from './_shared';

export async function listProgramsAction() {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true as const, data: await listPrograms(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}


export async function createProgramAction(input: {
  name: string;
  description?: string;
  ageGroup?: string;
}) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const program = await createProgram({ ...input, gymId: auth.gymId });
    revalidatePath('/website-content');
    return { ok: true as const, data: program };
  } catch (error) {
    return toActionError(error);
  }
}


export async function updateProgramAction(input: {
  programId: string;
  name?: string;
  description?: string | null;
  ageGroup?: string | null;
}) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const program = await updateProgram({ ...input, gymId: auth.gymId });
    revalidatePath('/website-content');
    return { ok: true as const, data: program };
  } catch (error) {
    return toActionError(error);
  }
}


export async function deleteProgramAction(programId: string) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    await deleteProgram(auth.gymId, programId);
    revalidatePath('/website-content');
    return { ok: true as const };
  } catch (error) {
    return toActionError(error);
  }
}


export async function listCoachesAction() {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true as const, data: await listCoaches(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}


export async function createCoachAction(input: {
  name: string;
  bio?: string;
  beltRank?: string;
  specialties?: string;
  staffRoleId?: string | null;
}) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const coach = await createCoach({ ...input, gymId: auth.gymId });
    revalidatePath('/website-content');
    return { ok: true as const, data: coach };
  } catch (error) {
    return toActionError(error);
  }
}


export async function updateCoachAction(input: {
  coachId: string;
  name?: string;
  bio?: string | null;
  beltRank?: string | null;
  specialties?: string | null;
  staffRoleId?: string | null;
}) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const coach = await updateCoach({ ...input, gymId: auth.gymId });
    revalidatePath('/website-content');
    return { ok: true as const, data: coach };
  } catch (error) {
    return toActionError(error);
  }
}


export async function deleteCoachAction(coachId: string) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    await deleteCoach(auth.gymId, coachId);
    revalidatePath('/website-content');
    return { ok: true as const };
  } catch (error) {
    return toActionError(error);
  }
}


export async function addGalleryImageAction(input: { imageUrl: string; caption?: string }) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    await addGalleryImage({ ...input, gymId: auth.gymId });
    revalidatePath('/website-content');
    return { ok: true as const };
  } catch (error) {
    return toActionError(error);
  }
}


export async function listBlogPostsAction() {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true as const, data: await listBlogPosts(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}


export async function createBlogPostAction(input: {
  title: string;
  excerpt?: string;
  bodyHtml: string;
}) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const post = await createBlogPost({ ...input, gymId: auth.gymId });
    revalidatePath('/website-content');
    return { ok: true as const, data: post };
  } catch (error) {
    return toActionError(error);
  }
}


export async function publishBlogPostAction(postId: string) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    await publishBlogPost(auth.gymId, postId);
    revalidatePath('/website-content');
    return { ok: true as const };
  } catch (error) {
    return toActionError(error);
  }
}


export async function deleteBlogPostAction(postId: string) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    await deleteBlogPost(auth.gymId, postId);
    revalidatePath('/website-content');
    return { ok: true as const };
  } catch (error) {
    return toActionError(error);
  }
}

