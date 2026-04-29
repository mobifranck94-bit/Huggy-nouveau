// Wrapper universel pour tous les agents IA
export async function callClaude({ systemPrompt, userMessage, model = 'claude-haiku-4-5' }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const rawText = data.content.map(b => b.text || '').join('');

  // Nettoyer les backticks markdown si le modèle les inclut malgré les instructions
  const clean = rawText.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();

  try {
    return JSON.parse(clean);
  } catch {
    throw new Error(`Invalid JSON from Claude: ${clean.slice(0, 300)}`);
  }
}
