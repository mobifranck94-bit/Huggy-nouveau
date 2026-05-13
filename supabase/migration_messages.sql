-- ═══════════════════════════════════════════════════════════════════════════════
-- Huggy Nouveau — Conversation Memory Migration (Phase 6)
-- Run this in Supabase Dashboard → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Messages table (per-project conversation history) ────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_project_created
  ON public.messages(project_id, created_at);

CREATE INDEX IF NOT EXISTS idx_messages_user
  ON public.messages(user_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own messages" ON public.messages;
CREATE POLICY "Users can insert own messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
CREATE POLICY "Users can update own messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;
CREATE POLICY "Users can delete own messages"
  ON public.messages FOR DELETE
  USING (auth.uid() = user_id);

-- ─── 2. Add conversation_summary column to projects ──────────────────────────
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS conversation_summary TEXT DEFAULT '';

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS summary_message_count INTEGER DEFAULT 0;

-- ─── 3. Helper view: message count per project ────────────────────────────────
CREATE OR REPLACE VIEW public.project_message_stats AS
SELECT
  project_id,
  COUNT(*) AS total_messages,
  COUNT(*) FILTER (WHERE role = 'user') AS user_messages,
  COUNT(*) FILTER (WHERE role = 'assistant') AS assistant_messages,
  MAX(created_at) AS last_message_at
FROM public.messages
GROUP BY project_id;

-- ─── 4. Cleanup function: delete messages older than 90 days for free plans ──
CREATE OR REPLACE FUNCTION public.cleanup_old_messages()
RETURNS INTEGER AS $$
DECLARE
  deleted INTEGER;
BEGIN
  DELETE FROM public.messages m
  USING public.profiles p
  WHERE m.user_id = p.id
    AND p.plan = 'free'
    AND m.created_at < now() - interval '90 days';
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
