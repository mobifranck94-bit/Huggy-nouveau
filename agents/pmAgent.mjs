import { callClaude } from '../lib/callClaude.mjs';

const PM_SYSTEM_PROMPT = `# Senior PM. Output ONE valid JSON only (no fences):
{
  "projectName": "kebab-case",
  "summary": "one line",
  "pages": [{ "route":"/", "name":"Home", "keyComponents":["Hero"], "dataNeeds":[] }],
  "designGuidelines": { "colorScheme":"dark violet", "typography":"Inter", "style":"glassmorphism", "mood":"premium" },
  "dataModel": [{ "entity":"Post", "fields":["id","title","author_id"], "relations":["belongs_to User"] }],
  "authStrategy": "none|supabase_email|supabase_oauth|supabase_magic_link",
  "complexity": "simple|medium|complex",
  "needsI18n": false,
  "targetLocales": [],
  "securityLevel": "standard|strict|minimal",
  "refinedPrompt": "5-10x more detailed prompt for Coder: layouts, exact colors, animations, sections, SEO meta, a11y."
}
Rules: vague → modern dark SaaS. dataModel empty for landing/portfolio. needsI18n only if user asks. strict only for payments/health/sensitive auth.`;

export async function runPMAgent(enrichedPrompt, existingFiles = []) {
  const ctx = existingFiles.length
    ? `\n\nEXISTING FILES (decide if modification or new feature):\n${existingFiles.map(f => `- ${f.path}`).join('\n')}`
    : '';
  return callClaude({
    systemPrompt: PM_SYSTEM_PROMPT,
    userMessage:  enrichedPrompt + ctx,
    model:        'claude-haiku-4-5-20251001',
    maxTokens:    3500,
  });
}
