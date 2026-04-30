import { createClient } from '@supabase/supabase-js';

const supabaseUrl    = import.meta.env.VITE_SUPABASE_URL    || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Huggy] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants — mode hors-ligne activé.');
}

// ─── Database Types ──────────────────────────────────────────────────────────
export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  plan: 'free' | 'pro' | 'enterprise';
  credits: number;
  max_credits: number;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  original_prompt: string | null;
  status: 'active' | 'archived' | 'deleted';
  created_at: string;
  updated_at: string;
}

export interface Build {
  id: string;
  project_id: string;
  user_id: string;
  prompt: string;
  status: 'running' | 'completed' | 'failed';
  files: Array<{ path: string; content: string }>;
  reply: string | null;
  security_score: number | null;
  qa_score: number | null;
  complexity: string | null;
  credits_used: number;
  meta: Record<string, unknown>;
  created_at: string;
  completed_at: string | null;
}

// createClient throws if either argument is an empty string.
// We use a valid-looking placeholder so the app loads even without env vars.
// The isSupabaseConfigured flag in App.tsx prevents any real DB calls in that case.
const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

export const supabase = createClient(
  supabaseUrl  || PLACEHOLDER_URL,
  supabaseAnonKey || PLACEHOLDER_KEY,
);
