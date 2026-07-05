import { z } from 'zod';

const uuid = () => z.string().uuid();
const dateOnly = () => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const checkInSchema = z.object({
  member_id: uuid(),
  gym_id: uuid(),
  notes: z.string().max(2000).optional(),
  checked_in_by: uuid().optional(),
  class_id: uuid().optional(),
  location_id: uuid().optional(),
});

export const attendanceLogQuerySchema = z.object({
  gym_id: uuid(),
  date: dateOnly().optional(),
  location_id: uuid().optional(),
});

export const plansQuerySchema = z.object({
  gym_id: uuid(),
});

export const gymOnboardSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
});

export const emailNotificationTypeSchema = z.enum([
  'welcome',
  'checkin',
  'waiver_signed',
  'subscription_created',
  'belt_promotion',
]);

export const sendEmailSchema = z.object({
  type: emailNotificationTypeSchema,
  member_id: uuid(),
  gym_id: uuid(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export const createCheckoutSchema = z.object({
  stripe_price_id: z.string().min(1),
  member_id: uuid(),
  gym_id: uuid(),
  member_email: z.string().email().optional(),
  family_id: uuid().optional(),
});

export const createPlanSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  price_cents: z.number().int().positive(),
  interval: z.enum(['month', 'year']),
  gym_id: uuid(),
  setup_fee_cents: z.number().int().min(0).optional(),
});

export const cancelSubscriptionSchema = z.object({
  subscription_id: uuid(),
  stripe_subscription_id: z.string().min(1),
  reason: z.string().max(2000).optional(),
  cancel_immediately: z.boolean().optional(),
});

export const pauseSubscriptionSchema = z.object({
  subscription_id: uuid(),
  stripe_subscription_id: z.string().min(1),
  reason: z.string().max(2000).optional(),
  action: z.enum(['pause', 'resume']),
});

export const refundSchema = z.object({
  stripe_subscription_id: z.string().min(1),
  subscription_id: uuid(),
  member_id: uuid().optional(),
  amount_cents: z.number().int().positive().optional(),
  reason: z.string().max(2000).optional(),
});

export const changePlanSchema = z.object({
  subscription_id: uuid(),
  stripe_subscription_id: z.string().min(1),
  new_plan_id: uuid(),
  new_stripe_price_id: z.string().min(1),
  member_id: uuid().optional(),
});
