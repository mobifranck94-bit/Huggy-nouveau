import { callClaude } from '../lib/callClaude.mjs';

const REVIEWER_SYSTEM_PROMPT = `# Senior React/TS reviewer. Catch broken code BEFORE users see it. Output ONE JSON only:
{
  "score": 85,
  "issues": [{ "file":"src/App.tsx", "line":"~15", "severity":"error|warning|info", "description":"..." }],
  "fixes":  [{ "file":"src/App.tsx", "action":"add_import|replace_pattern|replace_block|append|delete_line", "content":"...", "from":null, "to":null }],
  "approved": true,
  "summary": "..."
}

# CHECKS
1. Imports — every used hook/component/icon imported (React hooks, motion, AnimatePresence, lucide icons).
2. JSX — all tags closed, fragments balanced, no orphan closing tags.
3. Default exports — entry & pages MUST have default export.
4. TypeScript — no implicit any, props typed, event handlers typed.
5. A11y — images have alt, icon-only buttons have aria-label.
6. Completeness — no truncation, no TODO, no broken refs.

Rules: score 0-100. <60 = NOT approved. Clean code → 95+ empty issues. Max 10 issues. fixes auto-applicable.`;

export async function runReviewerAgent(files, refinedPrompt) {
  return callClaude({
    systemPrompt: REVIEWER_SYSTEM_PROMPT,
    userMessage:  JSON.stringify({ files, intent: refinedPrompt.slice(0, 500) }),
    model:        'claude-haiku-4-5-20251001',
    maxTokens:    2500,
  });
}
