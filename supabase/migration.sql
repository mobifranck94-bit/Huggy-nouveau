-- ═══════════════════════════════════════════════════════════════════════════════
-- Huggy Nouveau — Supabase Migration
-- Run this in Supabase Dashboard → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Profiles ─────────────────────────────────────────────────────────────
-- Extends auth.users with app-specific data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  email TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  credits INTEGER DEFAULT 500,
  max_credits INTEGER DEFAULT 500,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ─── 2. Projects ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  original_prompt TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_projects_user ON public.projects(user_id);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- ─── 3. Builds ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  files JSONB DEFAULT '[]'::jsonb,
  reply TEXT,
  security_score INTEGER,
  qa_score INTEGER,
  complexity TEXT,
  credits_used INTEGER DEFAULT 1,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_builds_project ON public.builds(project_id);
CREATE INDEX idx_builds_user ON public.builds(user_id);

ALTER TABLE public.builds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own builds"
  ON public.builds FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own builds"
  ON public.builds FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own builds"
  ON public.builds FOR UPDATE
  USING (auth.uid() = user_id);

-- ─── 4. Auto-create profile on signup ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists to make this script idempotent
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── 5. Decrement credits function ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.use_credits(user_uuid UUID, amount INTEGER DEFAULT 1)
RETURNS INTEGER AS $$
DECLARE
  remaining INTEGER;
BEGIN
  UPDATE public.profiles
  SET credits = credits - amount,
      updated_at = now()
  WHERE id = user_uuid AND credits >= amount
  RETURNING credits INTO remaining;

  IF remaining IS NULL THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  RETURN remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 6. Updated_at trigger ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
