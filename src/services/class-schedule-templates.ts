import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';
import { createClass } from '@/services/classes';

export type ClassScheduleTemplate = {
  id: string;
  gym_id: string;
  name: string;
  season_label: string | null;
  effective_from: string | null;
  effective_to: string | null;
  created_at: string;
  updated_at: string;
  item_count?: number;
};

export type SaveScheduleTemplateInput = {
  name: string;
  seasonLabel?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
};

export async function listScheduleTemplates(gymId: string): Promise<ClassScheduleTemplate[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('class_schedule_templates')
    .select('*, class_schedule_template_items(count)')
    .eq('gym_id', gymId)
    .order('updated_at', { ascending: false });

  if (error) throw new ServiceError(500, error.message);

  return (data ?? []).map((row) => {
    const items = row.class_schedule_template_items as { count: number }[] | null;
    const { class_schedule_template_items: _items, ...template } = row as Record<string, unknown>;
    return {
      ...(template as ClassScheduleTemplate),
      item_count: items?.[0]?.count ?? 0,
    };
  });
}

export async function saveScheduleAsTemplate(
  gymId: string,
  input: SaveScheduleTemplateInput
): Promise<ClassScheduleTemplate> {
  const name = input.name.trim();
  if (!name) throw new ServiceError(400, 'Template name is required.');

  const admin = getAdminClient();
  const { data: classes, error: classError } = await admin
    .from('classes')
    .select('name, description, instructor, day_of_week, start_time, end_time, capacity, category_tag, color, overbook_allowance')
    .eq('gym_id', gymId)
    .eq('is_active', true)
    .order('day_of_week')
    .order('start_time');

  if (classError) throw new ServiceError(500, classError.message);
  if (!classes?.length) {
    throw new ServiceError(400, 'Add at least one active class before saving a template.');
  }

  const { data: template, error: templateError } = await admin
    .from('class_schedule_templates')
    .insert({
      gym_id: gymId,
      name,
      season_label: input.seasonLabel?.trim() || null,
      effective_from: input.effectiveFrom || null,
      effective_to: input.effectiveTo || null,
    })
    .select('*')
    .single();

  if (templateError || !template) {
    if (templateError?.code === '23505') {
      throw new ServiceError(409, 'A template with this name already exists.');
    }
    throw new ServiceError(500, templateError?.message ?? 'Failed to save template.');
  }

  const items = classes.map((cls, index) => ({
    template_id: template.id,
    name: cls.name,
    description: cls.description,
    instructor: cls.instructor ?? '',
    day_of_week: cls.day_of_week ?? 'Monday',
    start_time: cls.start_time ?? '09:00',
    end_time: cls.end_time ?? '10:00',
    capacity: cls.capacity ?? 20,
    category_tag: cls.category_tag,
    color: cls.color,
    overbook_allowance: cls.overbook_allowance ?? 0,
    sort_order: index,
  }));

  const { error: itemsError } = await admin.from('class_schedule_template_items').insert(items);
  if (itemsError) {
    await admin.from('class_schedule_templates').delete().eq('id', template.id);
    throw new ServiceError(500, itemsError.message);
  }

  return { ...template, item_count: items.length };
}

export async function applyScheduleTemplate(
  gymId: string,
  templateId: string,
  options?: { replaceActive?: boolean }
): Promise<{ created: number; deactivated: number }> {
  const admin = getAdminClient();

  const { data: template, error: templateError } = await admin
    .from('class_schedule_templates')
    .select('id')
    .eq('id', templateId)
    .eq('gym_id', gymId)
    .maybeSingle();

  if (templateError) throw new ServiceError(500, templateError.message);
  if (!template) throw new ServiceError(404, 'Template not found.');

  const { data: items, error: itemsError } = await admin
    .from('class_schedule_template_items')
    .select('*')
    .eq('template_id', templateId)
    .order('sort_order');

  if (itemsError) throw new ServiceError(500, itemsError.message);
  if (!items?.length) throw new ServiceError(400, 'Template has no classes to apply.');

  let deactivated = 0;
  if (options?.replaceActive) {
    const { data: activeClasses, error: deactivateError } = await admin
      .from('classes')
      .update({ is_active: false })
      .eq('gym_id', gymId)
      .eq('is_active', true)
      .select('id');

    if (deactivateError) throw new ServiceError(500, deactivateError.message);
    deactivated = activeClasses?.length ?? 0;
  }

  let created = 0;
  for (const item of items) {
    await createClass({
      gymId,
      name: item.name,
      description: item.description,
      instructor: item.instructor,
      dayOfWeek: item.day_of_week,
      startTime: item.start_time,
      endTime: item.end_time,
      capacity: item.capacity,
      categoryTag: item.category_tag,
      color: item.color,
      overbookAllowance: item.overbook_allowance ?? 0,
    });
    created++;
  }

  await admin
    .from('class_schedule_templates')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', templateId);

  return { created, deactivated };
}

export async function deleteScheduleTemplate(gymId: string, templateId: string): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from('class_schedule_templates')
    .delete()
    .eq('id', templateId)
    .eq('gym_id', gymId);

  if (error) throw new ServiceError(500, error.message);
}
