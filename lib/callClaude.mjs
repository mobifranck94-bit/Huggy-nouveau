// Wrapper universel pour tous les agents IA
export async function callClaude({
  systemPrompt,
  userMessage,
  model = 'claude-haiku-4-5-20251001',
  maxTokens,
}) {
  // Default tokens per model when caller doesn't override.
  // Agents that emit short JSON pass a smaller maxTokens to save cost.
  const defaultMap = {
    'claude-haiku-4-5-20251001': 4096,
    'claude-sonnet-4-6':         16000,
    'claude-opus-4-6':           16000,
  };
  const max_tokens = maxTokens ?? defaultMap[model] ?? 4096;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens,
      system:   systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status} ${await response.text()}`);
  }

  const data    = await response.json();
  const rawText = data.content.map(b => b.text || '').join('');

  // Strip outermost markdown fence only (avoid matching backticks inside JSON strings)
  let clean = rawText.trim();
  
  // Find the first '{' and the last '}' to extract the JSON object
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    clean = clean.slice(firstBrace, lastBrace + 1);
  } else if (clean.startsWith('```')) {
    // Fallback for markdown fences if braces aren't found correctly
    clean = clean.replace(/^```(?:json)?\s*\n?/, '');
    clean = clean.replace(/\n?```\s*$/, '');
    clean = clean.trim();
  }

  try {
    return JSON.parse(clean);
  } catch (e) {
    throw new Error(`Invalid JSON from Claude: ${clean.slice(0, 300)}... (Error: ${e.message})`);
  }
}
