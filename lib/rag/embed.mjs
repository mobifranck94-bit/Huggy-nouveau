/**
 * Embedding helper - turns text into a 1536-dim vector using OpenAI's
 * text-embedding-3-small (cheapest production-grade model: ~$0.02 / 1M tokens).
 *
 * Configuration:
 *   OPENAI_API_KEY  - required for embeddings
 *   EMBED_MODEL     - default 'text-embedding-3-small'
 *
 * Gracefully returns null if no key is configured so the rest of the pipeline
 * keeps working with the static knowledge base.
 */

const EMBED_MODEL = process.env.EMBED_MODEL || 'text-embedding-3-small';
const OPENAI_KEY  = process.env.OPENAI_API_KEY;

let warnedNoKey = false;

/**
 * @param {string|string[]} input - single text or batch
 * @returns {Promise<number[]|number[][]|null>} embedding(s) or null if disabled
 */
export async function embed(input) {
  if (!OPENAI_KEY) {
    if (!warnedNoKey) {
      console.warn('[RAG] OPENAI_API_KEY not set — RAG retrieval disabled, using static KB only');
      warnedNoKey = true;
    }
    return null;
  }

  const isBatch = Array.isArray(input);
  const body = {
    model: EMBED_MODEL,
    input: isBatch ? input : [input],
  };

  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[RAG] Embedding request failed:', res.status, errText.slice(0, 200));
      return null;
    }

    const data = await res.json();
    const vectors = data.data?.map(d => d.embedding) ?? [];
    return isBatch ? vectors : vectors[0] ?? null;
  } catch (err) {
    console.error('[RAG] Embedding error:', err.message);
    return null;
  }
}

export function isEmbeddingAvailable() {
  return Boolean(OPENAI_KEY);
}
