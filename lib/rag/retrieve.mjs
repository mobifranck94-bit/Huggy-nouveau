/**
 * Retrieval - given a free-text query, returns the top-k most relevant chunks
 * from the knowledge_chunks table in Supabase.
 *
 * Falls back to an empty array (no error) if:
 *   - OPENAI_API_KEY not configured
 *   - Supabase not reachable
 *   - knowledge_chunks table empty or migration not run
 *
 * The caller (pipeline) MUST handle the empty case by falling back to the
 * static knowledge base in lib/prompts/knowledgeBase.mjs.
 */

import { embed, isEmbeddingAvailable } from './embed.mjs';

let supabaseClient = null;
async function getSupabase() {
  if (supabaseClient) return supabaseClient;
  try {
    const mod = await import('../supabase.mjs');
    supabaseClient = mod.supabase;
    return supabaseClient;
  } catch (err) {
    console.warn('[RAG] Supabase client unavailable:', err.message);
    return null;
  }
}

/**
 * @param {string} query - the user prompt or builder context
 * @param {object} [opts]
 * @param {number} [opts.k=5] - number of chunks to retrieve
 * @param {string} [opts.source] - filter to a specific source ('tailwind', 'react', etc.)
 * @returns {Promise<Array<{title: string, content: string, source: string, similarity: number}>>}
 */
export async function retrieveKnowledge(query, opts = {}) {
  const { k = 5, source = null } = opts;

  if (!query || typeof query !== 'string') return [];
  if (!isEmbeddingAvailable()) return [];

  const supabase = await getSupabase();
  if (!supabase) return [];

  try {
    const vector = await embed(query);
    if (!vector) return [];

    const { data, error } = await supabase.rpc('match_knowledge_chunks', {
      query_embedding: vector,
      match_count: k,
      filter_source: source,
    });

    if (error) {
      // Most common cause: migration not run yet. Stay silent on subsequent calls.
      console.warn('[RAG] Retrieval RPC error (falling back to static KB):', error.message);
      return [];
    }

    return (data || []).filter(r => r.similarity > 0.4); // drop weak matches
  } catch (err) {
    console.warn('[RAG] Retrieval failed:', err.message);
    return [];
  }
}

/**
 * Build a compact context block ready to inject into a system prompt.
 * Returns '' (empty string) if nothing useful was found.
 */
export async function buildRagContext(query, opts = {}) {
  const chunks = await retrieveKnowledge(query, opts);
  if (chunks.length === 0) return '';

  const lines = chunks.map(c => `## ${c.source}${c.title ? ` — ${c.title}` : ''}\n${c.content}`);
  return `# RAG CONTEXT (retrieved knowledge)\n${lines.join('\n\n')}`;
}
