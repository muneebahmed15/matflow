-- Module 11: GBP posts/reviews cache, Google Ads conversion id

ALTER TABLE public.gyms
  ADD COLUMN IF NOT EXISTS google_ads_conversion_id text;

CREATE TABLE IF NOT EXISTS public.gbp_local_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  summary text NOT NULL,
  body text,
  status text NOT NULL DEFAULT 'draft',
  external_id text,
  error_message text,
  posted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gbp_local_posts_gym ON public.gbp_local_posts(gym_id);

ALTER TABLE public.gbp_local_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY gbp_local_posts_staff ON public.gbp_local_posts
  FOR ALL USING (
    gym_id IN (SELECT gym_id FROM public.staff_roles WHERE user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.gbp_reviews_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  external_review_id text NOT NULL,
  author_name text,
  rating integer,
  comment text,
  review_reply text,
  replied_at timestamptz,
  imported_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gym_id, external_review_id)
);

CREATE INDEX IF NOT EXISTS idx_gbp_reviews_cache_gym ON public.gbp_reviews_cache(gym_id);

ALTER TABLE public.gbp_reviews_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY gbp_reviews_cache_staff ON public.gbp_reviews_cache
  FOR ALL USING (
    gym_id IN (SELECT gym_id FROM public.staff_roles WHERE user_id = auth.uid())
  );
