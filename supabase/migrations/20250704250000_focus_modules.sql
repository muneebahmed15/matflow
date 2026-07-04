-- Modules 1, 7, 11, 12 focus batch

ALTER TABLE public.gyms
  ADD COLUMN IF NOT EXISTS marketing_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hero_ab_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hero_variant_b_headline text,
  ADD COLUMN IF NOT EXISTS hero_variant_b_subheadline text,
  ADD COLUMN IF NOT EXISTS seo_keywords text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS public_translations jsonb NOT NULL DEFAULT '{}';

ALTER TABLE public.review_requests
  ADD COLUMN IF NOT EXISTS link_clicked_at timestamptz;

CREATE TABLE IF NOT EXISTS public.gym_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_gym_api_keys_gym ON public.gym_api_keys(gym_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_gym_api_keys_hash ON public.gym_api_keys(key_hash);

ALTER TABLE public.gym_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY gym_api_keys_staff_read ON public.gym_api_keys
  FOR SELECT USING (
    gym_id IN (SELECT gym_id FROM public.staff_roles WHERE user_id = auth.uid())
  );

CREATE POLICY gym_api_keys_admin_write ON public.gym_api_keys
  FOR ALL USING (
    gym_id IN (
      SELECT gym_id FROM public.staff_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE TABLE IF NOT EXISTS public.sms_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  name text NOT NULL,
  body text NOT NULL,
  audience text NOT NULL DEFAULT 'active_members',
  status text NOT NULL DEFAULT 'draft',
  sent_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_sms_campaigns_gym ON public.sms_campaigns(gym_id);

ALTER TABLE public.sms_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY sms_campaigns_staff ON public.sms_campaigns
  FOR ALL USING (
    gym_id IN (SELECT gym_id FROM public.staff_roles WHERE user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_gym ON public.push_subscriptions(gym_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_subscriptions_member ON public.push_subscriptions
  FOR ALL USING (
    member_id IN (
      SELECT id FROM public.members WHERE auth_user_id = auth.uid()
    )
  );
