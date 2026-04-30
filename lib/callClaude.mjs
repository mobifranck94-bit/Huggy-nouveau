// Wrapper universel pour tous les agents IA
export async function callClaude({ systemPrompt, userMessage, model = 'claude-haiku-4-5-20251001' }) {
  // Résolution du max_tokens selon le modèle : le Coder génère des fichiers complets
  // et peut dépasser 8 192 tokens — on alloue plus pour les grands modèles.
  const maxTokensMap = {
    'claude-haiku-4-5-20251001': 8192,
    'claude-sonnet-4-6': 32000,
    'claude-opus-4-6': 32000,
  };
  const max_tokens = maxTokensMap[model] ?? 16000;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const rawText = data.content.map(b => b.text || '').join('');

  // Retirer uniquement le premier et dernier fence markdown (``` ou ```json)
  // en testant rawText.trimStart() — évite le flag multiline qui matche
  // les backticks à l'intérieur des strings JSON (contenu de fichiers de code).
  let clean = rawText.trim();
  
  // Find the first '{' and the last '}' to extract the JSON object
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    clean = clean.slice(firstBrace, lastBrace + 1);
  } else if (clean.startsWith('```')) {
    // Fallback for markdown fences if braces aren't found correctly (unlikely for objects)
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
