const DEFAULT_TIMEOUT_MS = 6000;

function withTimeout(promise, ms = DEFAULT_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`web research timeout after ${ms}ms`)), ms)),
  ]);
}

function compactResult(item) {
  return {
    title: String(item.title || item.name || 'Untitled').slice(0, 120),
    url: String(item.url || item.link || '').slice(0, 240),
    snippet: String(item.snippet || item.content || item.description || '').replace(/\s+/g, ' ').slice(0, 500),
  };
}

async function tavilySearch(query) {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: key,
      query,
      search_depth: 'basic',
      include_answer: false,
      include_raw_content: false,
      max_results: 3,
    }),
  });

  if (!res.ok) throw new Error(`Tavily search failed (${res.status})`);
  const json = await res.json();
  return (json.results || []).map(compactResult);
}

async function serpSearch(query) {
  const key = process.env.SERPAPI_API_KEY;
  if (!key) return [];

  const url = new URL('https://serpapi.com/search.json');
  url.searchParams.set('engine', 'google');
  url.searchParams.set('q', query);
  url.searchParams.set('api_key', key);
  url.searchParams.set('num', '3');

  const res = await fetch(url);
  if (!res.ok) throw new Error(`SerpAPI search failed (${res.status})`);
  const json = await res.json();
  return (json.organic_results || []).map(compactResult);
}

export function isWebResearchAvailable() {
  return Boolean(process.env.TAVILY_API_KEY || process.env.SERPAPI_API_KEY);
}

export async function runWebResearch(capabilityPlan, opts = {}) {
  if (!capabilityPlan?.needsWebSearch) return { used: false, results: [], context: '' };
  if (!isWebResearchAvailable()) return { used: false, results: [], context: '' };

  const queries = (capabilityPlan.webSearchQueries || []).slice(0, opts.maxQueries || 3);
  if (!queries.length) return { used: false, results: [], context: '' };

  const all = [];
  for (const query of queries) {
    try {
      const results = await withTimeout(
        process.env.TAVILY_API_KEY ? tavilySearch(query) : serpSearch(query),
        opts.timeoutMs || DEFAULT_TIMEOUT_MS,
      );
      if (results.length) all.push({ query, results });
    } catch (err) {
      console.warn('[WebResearch] search failed:', err.message);
    }
  }

  if (!all.length) return { used: false, results: [], context: '' };

  const context = [
    '# WEB RESEARCH CONTEXT',
    'Use these snippets only as documentation context. Do not copy secrets. Prefer stable APIs and cite setup requirements in README.',
    ...all.flatMap(group => [
      `\n## Query: ${group.query}`,
      ...group.results.map((r, idx) => `- [${idx + 1}] ${r.title}\n  URL: ${r.url}\n  Snippet: ${r.snippet}`),
    ]),
  ].join('\n');

  return { used: true, results: all, context };
}
