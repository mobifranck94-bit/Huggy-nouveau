const URL_REGEX = /https?:\/\/[^\s"'<>]+/gi;
const MAX_CONTENT_LENGTH = 8000;
const RESEARCH_TRIGGERS = [
  'inspire-toi de', 'clone de', 'ressemble à', 'like',
  'scrape', 'http://', 'https://', 'similar to', 'based on',
];

export function needsWebResearch(prompt) {
  const lower = prompt.toLowerCase();
  return RESEARCH_TRIGGERS.some(t => lower.includes(t))
    || (prompt.match(URL_REGEX)?.length ?? 0) > 0;
}

export async function runWebResearchAgent(userPrompt) {
  if (!needsWebResearch(userPrompt)) {
    return { enrichedContext: '' };
  }

  const urls = userPrompt.match(URL_REGEX) ?? [];
  const results = [];

  for (const url of urls.slice(0, 2)) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'HuggyCrawler/1.0' } });
      const html = await res.text();

      // Extraction basique : balises sémantiques pertinentes
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_CONTENT_LENGTH);

      results.push(`## Source: ${url}\n${text}`);
    } catch (err) {
      results.push(`## Source: ${url}\n[Fetch error: ${err.message}]`);
    }
  }

  // DuckDuckGo fallback si pas d'URL directe
  if (urls.length === 0) {
    try {
      const query = encodeURIComponent(userPrompt.slice(0, 100));
      const res = await fetch(`https://api.duckduckgo.com/?q=${query}&format=json&no_html=1`);
      const data = await res.json();
      if (data.AbstractText) {
        results.push(`## DuckDuckGo Abstract\n${data.AbstractText}`);
      }
    } catch { /* silently fail */ }
  }

  return {
    enrichedContext: results.length > 0
      ? `\n\n# WEB RESEARCH RESULTS (use as design/feature inspiration)\n${results.join('\n\n')}`
      : '',
  };
}
