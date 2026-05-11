-- ═══════════════════════════════════════════════════════════════════════════════
-- Huggy Nouveau — RAG Knowledge Base Migration (Phase 5)
-- Run this in Supabase Dashboard → SQL Editor → New Query → Run
-- Prerequisites: ensure pgvector extension is available (it ships with Supabase)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Enable pgvector extension ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── 2. knowledge_chunks table ───────────────────────────────────────────────
-- Stores small text chunks (200–600 tokens each) with their 1536-dim embedding.
-- Used at inference time to retrieve the most relevant snippets given a query.
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,           -- e.g. 'tailwind', 'react', 'shadcn', 'supabase'
  title TEXT,                     -- short human-readable title
  content TEXT NOT NULL,          -- the actual text chunk
  embedding VECTOR(1536),         -- text-embedding-3-small dimension
  tokens INTEGER,                 -- approx token count
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 3. Indexes ──────────────────────────────────────────────────────────────
-- Simple btree for filtering by source
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_source ON public.knowledge_chunks(source);

-- ANN index for similarity search (HNSW is fastest for our scale; falls back to
-- ivfflat if HNSW isn't available on the host).
DO $$
BEGIN
  -- Try HNSW first (Postgres 16+ with pgvector >= 0.5)
  BEGIN
    CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding_hnsw
      ON public.knowledge_chunks
      USING hnsw (embedding vector_cosine_ops);
  EXCEPTION WHEN OTHERS THEN
    -- Fallback to ivfflat
    CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding_ivf
      ON public.knowledge_chunks
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
  END;
END $$;

-- ─── 4. Retrieval RPC ────────────────────────────────────────────────────────
-- Server-callable function to retrieve the top-k most similar chunks.
CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
  query_embedding VECTOR(1536),
  match_count INT DEFAULT 5,
  filter_source TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  source TEXT,
  title TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.source,
    kc.title,
    kc.content,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_chunks kc
  WHERE
    kc.embedding IS NOT NULL
    AND (filter_source IS NULL OR kc.source = filter_source)
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ─── 5. RLS ──────────────────────────────────────────────────────────────────
-- Read-only for everyone (knowledge is public). Writes only via service role.
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read knowledge chunks"
  ON public.knowledge_chunks FOR SELECT
  USING (true);

-- Grant execute on retrieval function
GRANT EXECUTE ON FUNCTION public.match_knowledge_chunks(VECTOR, INT, TEXT) TO anon, authenticated, service_role;
