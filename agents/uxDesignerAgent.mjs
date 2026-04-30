import { callClaude } from '../lib/callClaude.mjs';

const UX_SYSTEM_PROMPT = `# Senior UX Designer. Output ONE JSON only:
{
  "colorTokens": {
    "primary":"#6366F1","accent":"#8B5CF6",
    "background":"#0F0F13","surface":"#1A1A24","border":"#2A2A3A",
    "muted":"#94A3B8","destructive":"#EF4444","success":"#22C55E"
  },
  "typography": { "fontFamily":"Inter", "fontFamilyMono":"JetBrains Mono" },
  "spacing": [4,8,12,16,24,32,48,64],
  "borderRadius": { "sm":"6px","md":"10px","lg":"14px","xl":"20px" },
  "components": [
    { "name":"PrimaryButton", "spec":"gradient primary→accent, rounded-xl, px-6 py-3, hover scale-105" },
    { "name":"Card", "spec":"surface bg, border 1px, rounded-xl, p-6, hover surface lighter" },
    { "name":"Input", "spec":"surface bg, border 1px, rounded-lg, px-4 py-2.5, focus ring 2px primary" }
  ],
  "layouts": [
    { "page":"/", "wireframe":"Sticky navbar blur → Hero centered + CTA → Features 3-col → Testimonials → CTA banner → Footer 4-col", "interactions":["CTA scale+glow on hover","cards translateY(-4px) on hover","scroll fade-up stagger"] }
  ],
  "animations": { "default":"all 0.2s cubic-bezier(0.4,0,0.2,1)", "page":"fade-slide-up 0.4s" }
}
Rules: derive palette from PM designGuidelines (never invent). Surface ≥8% lighter than background on dark themes. authStrategy != none → include LoginCard, UserAvatar. Wireframes precise enough that Coder doesn't ask layout questions.`;

export async function runUXDesignerAgent(pmPlan, dbaPlan) {
  const slim = {
    pm:  { designGuidelines: pmPlan.designGuidelines, pages: pmPlan.pages, authStrategy: pmPlan.authStrategy, complexity: pmPlan.complexity },
    dba: { needsDatabase: dbaPlan.needsDatabase, tables: dbaPlan.tables?.map(t => t.name) ?? [] },
  };
  return callClaude({
    systemPrompt: UX_SYSTEM_PROMPT,
    userMessage:  JSON.stringify(slim),
    model:        'claude-haiku-4-5-20251001',
    maxTokens:    3500,
  });
}
