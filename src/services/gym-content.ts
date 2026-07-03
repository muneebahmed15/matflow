import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';

export type GymProgram = {
  id: string;
  gym_id: string;
  name: string;
  description: string | null;
  age_group: string | null;
  sort_order: number;
  is_active: boolean;
};

export type GymCoach = {
  id: string;
  gym_id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
  belt_rank: string | null;
  specialties: string | null;
  sort_order: number;
  is_active: boolean;
};

export async function listPrograms(gymId: string): Promise<GymProgram[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('gym_programs')
    .select('*')
    .eq('gym_id', gymId)
    .order('sort_order')
    .order('name');

  if (error) throw new ServiceError(500, error.message);
  return (data ?? []) as GymProgram[];
}

export async function createProgram(input: {
  gymId: string;
  name: string;
  description?: string;
  ageGroup?: string;
}): Promise<GymProgram> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('gym_programs')
    .insert({
      gym_id: input.gymId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      age_group: input.ageGroup?.trim() || null,
    })
    .select('*')
    .single();

  if (error) throw new ServiceError(500, error.message);
  return data as GymProgram;
}

export async function listCoaches(gymId: string): Promise<GymCoach[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('gym_coaches')
    .select('*')
    .eq('gym_id', gymId)
    .order('sort_order')
    .order('name');

  if (error) throw new ServiceError(500, error.message);
  return (data ?? []) as GymCoach[];
}

export async function createCoach(input: {
  gymId: string;
  name: string;
  bio?: string;
  photoUrl?: string;
  beltRank?: string;
  specialties?: string;
}): Promise<GymCoach> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('gym_coaches')
    .insert({
      gym_id: input.gymId,
      name: input.name.trim(),
      bio: input.bio?.trim() || null,
      photo_url: input.photoUrl?.trim() || null,
      belt_rank: input.beltRank?.trim() || null,
      specialties: input.specialties?.trim() || null,
    })
    .select('*')
    .single();

  if (error) throw new ServiceError(500, error.message);
  return data as GymCoach;
}

export async function updateProgram(input: {
  gymId: string;
  programId: string;
  name?: string;
  description?: string | null;
  ageGroup?: string | null;
  isActive?: boolean;
}): Promise<GymProgram> {
  const admin = getAdminClient();
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.description !== undefined) updates.description = input.description?.trim() || null;
  if (input.ageGroup !== undefined) updates.age_group = input.ageGroup?.trim() || null;
  if (input.isActive !== undefined) updates.is_active = input.isActive;

  const { data, error } = await admin
    .from('gym_programs')
    .update(updates)
    .eq('id', input.programId)
    .eq('gym_id', input.gymId)
    .select('*')
    .single();

  if (error) throw new ServiceError(500, error.message);
  return data as GymProgram;
}

export async function deleteProgram(gymId: string, programId: string): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from('gym_programs')
    .delete()
    .eq('id', programId)
    .eq('gym_id', gymId);

  if (error) throw new ServiceError(500, error.message);
}

export async function updateCoach(input: {
  gymId: string;
  coachId: string;
  name?: string;
  bio?: string | null;
  photoUrl?: string | null;
  beltRank?: string | null;
  specialties?: string | null;
  isActive?: boolean;
}): Promise<GymCoach> {
  const admin = getAdminClient();
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.bio !== undefined) updates.bio = input.bio?.trim() || null;
  if (input.photoUrl !== undefined) updates.photo_url = input.photoUrl?.trim() || null;
  if (input.beltRank !== undefined) updates.belt_rank = input.beltRank?.trim() || null;
  if (input.specialties !== undefined) updates.specialties = input.specialties?.trim() || null;
  if (input.isActive !== undefined) updates.is_active = input.isActive;

  const { data, error } = await admin
    .from('gym_coaches')
    .update(updates)
    .eq('id', input.coachId)
    .eq('gym_id', input.gymId)
    .select('*')
    .single();

  if (error) throw new ServiceError(500, error.message);
  return data as GymCoach;
}

export async function deleteCoach(gymId: string, coachId: string): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from('gym_coaches')
    .delete()
    .eq('id', coachId)
    .eq('gym_id', gymId);

  if (error) throw new ServiceError(500, error.message);
}

export async function listPublishedReviews(gymId: string) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('gym_reviews')
    .select('*')
    .eq('gym_id', gymId)
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error) throw new ServiceError(500, error.message);
  return data ?? [];
}

export async function listGallery(gymId: string) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('gym_gallery')
    .select('*')
    .eq('gym_id', gymId)
    .order('sort_order');

  if (error) throw new ServiceError(500, error.message);
  return data ?? [];
}

export async function addGalleryImage(input: {
  gymId: string;
  imageUrl: string;
  caption?: string;
}): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin.from('gym_gallery').insert({
    gym_id: input.gymId,
    image_url: input.imageUrl.trim(),
    caption: input.caption?.trim() || null,
  });

  if (error) throw new ServiceError(500, error.message);
}

export async function createReview(input: {
  gymId: string;
  authorName: string;
  rating: number;
  body?: string;
}): Promise<void> {
  const admin = getAdminClient();
  if (input.rating < 1 || input.rating > 5) {
    throw new ServiceError(400, 'Rating must be 1–5');
  }

  const { error } = await admin.from('gym_reviews').insert({
    gym_id: input.gymId,
    author_name: input.authorName.trim(),
    rating: input.rating,
    body: input.body?.trim() || null,
    is_published: true,
  });

  if (error) throw new ServiceError(500, error.message);
}
