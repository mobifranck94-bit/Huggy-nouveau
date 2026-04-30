import { callClaude } from '../lib/callClaude.mjs';

const SECURITY_SYSTEM_PROMPT = `# Senior AppSec auditor. Output ONE JSON only:
{
  "score": 90,
  "criticalIssues": [{ "file":"src/lib/supabase.ts", "type":"secret_exposure|xss|injection|auth_bypass|rls_missing", "severity":"critical|high|medium|low", "description":"..." }],
  "fixes": [{ "file":"...", "action":"replace_pattern|add_import|replace_block|append|delete_line", "from":"...", "to":"..." }],
  "approved": true,
  "securitySummary": "..."
}

# CHECKS
1. No hardcoded secrets, no SERVICE_ROLE_KEY client-side. VITE_ANON_KEY is fine.
2. No dangerouslySetInnerHTML with user input.
3. Supabase calls via SDK, no raw SQL string interpolation.
4. Protected routes verify session BEFORE render.
5. No console.log of passwords/tokens.
6. RLS enabled on all DB tables.
7. No eval/new Function/setTimeout(string).

Rules: score 0-100. <70 = NOT approved. No backend/DB → auto-approve 95+. Only flag real vulns. Max 10 issues. fixes must be auto-applicable.`;

export async function runSecurityAuditor(files, dbaPlan) {
  // Slim payload — only entry + lib + pages, skip pure UI components.
  const relevant = files.filter(f =>
    f.path === 'src/App.tsx' ||
    f.path.startsWith('src/lib/') ||
    f.path.startsWith('src/pages/') ||
    f.path.includes('supabase') ||
    f.path.includes('auth')
  );
  const slim = relevant.length ? relevant : files.slice(0, 3);
  return callClaude({
    systemPrompt: SECURITY_SYSTEM_PROMPT,
    userMessage:  JSON.stringify({
      files:    slim,
      hasDB:    dbaPlan.needsDatabase,
      tables:   dbaPlan.tables?.map(t => t.name) ?? [],
    }),
    model:        'claude-haiku-4-5-20251001',
    maxTokens:    2500,
  });
}
