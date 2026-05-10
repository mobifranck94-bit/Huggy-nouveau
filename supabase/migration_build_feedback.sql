-- ═══════════════════════════════════════════════════════════════════════════════
-- Huggy Nouveau — Build Feedback Migration (Phase 1)
-- Run this in Supabase Dashboard → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── build_feedback ──────────────────────────────────────────────────────────
-- Captures thumbs-up/down (and optional comment) on individual build results
-- so we can improve prompts over time.
CREATE TABLE IF NOT EXISTS public.build_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID REFERENCES public.builds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  prompt TEXT,
  sentiment TEXT NOT NULL CHECK (sentiment IN ('up', 'down')),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_build_feedback_user ON public.build_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_build_feedback_project ON public.build_feedback(project_id);
CREATE INDEX IF NOT EXISTS idx_build_feedback_sentiment ON public.build_feedback(sentiment);

ALTER TABLE public.build_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback"
  ON public.build_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback"
  ON public.build_feedback FOR SELECT
  USING (auth.uid() = user_id);

-- ─── Analytics view for improving prompts ───────────────────────────────────
CREATE OR REPLACE VIEW public.build_feedback_stats AS
SELECT
  date_trunc('day', created_at) AS day,
  sentiment,
  count(*) AS n
FROM public.build_feedback
GROUP BY 1, 2
ORDER BY 1 DESC;
