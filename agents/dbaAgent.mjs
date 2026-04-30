import { callClaude } from '../lib/callClaude.mjs';

const DBA_SYSTEM_PROMPT = `# Senior DBA (Supabase/Postgres). Output ONE JSON only:
{
  "needsDatabase": true,
  "tables": [{
    "name":"posts",
    "columns":[
      {"name":"id","type":"uuid","primary":true,"default":"gen_random_uuid()"},
      {"name":"title","type":"text","required":true},
      {"name":"author_id","type":"uuid","references":"auth.users(id)","onDelete":"CASCADE"},
      {"name":"created_at","type":"timestamptz","default":"now()"}
    ],
    "indexes":["CREATE INDEX idx_posts_author ON posts(author_id);"],
    "rls_policies":[
      "ALTER TABLE posts ENABLE ROW LEVEL SECURITY;",
      "CREATE POLICY \\"own\\" ON posts FOR ALL USING (auth.uid() = author_id);"
    ]
  }],
  "supabaseClientCode": "import { createClient } from '@supabase/supabase-js';\\nexport const supabase = createClient(import.meta.env.VITE_SUPABASE_URL!, import.meta.env.VITE_SUPABASE_ANON_KEY!);"
}
Rules: static app → needsDatabase:false, tables:[], supabaseClientCode:"". Always reference auth.users (no custom users table). RLS on every table. VITE_ prefix only.`;

export async function runDBAAgent(pmPlan, originalPrompt) {
  // Slim payload — only what the DBA actually needs.
  const slim = {
    dataModel:     pmPlan.dataModel,
    authStrategy:  pmPlan.authStrategy,
    securityLevel: pmPlan.securityLevel,
    summary:       pmPlan.summary,
  };
  return callClaude({
    systemPrompt: DBA_SYSTEM_PROMPT,
    userMessage:  JSON.stringify({ pm: slim, prompt: originalPrompt.slice(0, 300) }),
    model:        'claude-haiku-4-5-20251001',
    maxTokens:    3000,
  });
}
