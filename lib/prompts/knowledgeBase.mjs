/**
 * Knowledge Base — concise, high-signal references injected into Builder prompts.
 * Designed to be ~1500 tokens total so it doesn't blow the context budget.
 * Updated patterns for React 19 / Tailwind v4 / modern shadcn-style UI.
 */

export const TAILWIND_CHEATSHEET = `
TAILWIND DESIGN TOKENS (use exactly these):
- Surfaces: bg-[#0a0a0b] (page), bg-zinc-900/60 (cards), bg-zinc-800/50 (inputs)
- Borders:  border-zinc-800/60, border-zinc-700 on hover, rounded-2xl (cards), rounded-xl (buttons/inputs)
- Text:     text-zinc-100 (heading), text-zinc-300 (body), text-zinc-500 (muted), text-zinc-700 (placeholder)
- Accents:  text-blue-400/bg-blue-600 (primary), text-violet-400/bg-violet-600 (secondary), text-green-400 (success), text-red-400 (danger)
- Spacing:  p-6 (cards), p-4 (compact), gap-4 (lists), gap-2 (inline)
- Shadows:  shadow-xl on cards, shadow-[0_0_24px_rgba(59,130,246,0.3)] for glow CTAs
- Motion:   transition-all duration-200, hover:scale-[1.02], active:scale-[0.98]
- Layout:   min-h-screen, max-w-{md,xl,4xl,6xl}, mx-auto, grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3

RESPONSIVE BREAKPOINTS:
- sm:  >= 640px
- md:  >= 768px
- lg:  >= 1024px
- xl:  >= 1280px
- Always design mobile-first then layer breakpoints.

ACCESSIBILITY (required):
- Every interactive button needs aria-label
- Inputs paired with <label> or aria-label
- Focus rings: focus:outline-none focus:ring-2 focus:ring-blue-500/40
- Contrast: never use text-zinc-600 on bg-zinc-900 (fails WCAG)
`;

export const REACT_PATTERNS = `
REACT 19 PATTERNS:

useState for local state:
  const [items, setItems] = useState<Item[]>([]);

Controlled inputs with auto-Enter submit:
  <input
    value={text}
    onChange={e => setText(e.target.value)}
    onKeyDown={e => e.key === 'Enter' && submit()}
    aria-label="Description"
  />

Effects with cleanup:
  useEffect(() => {
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

Derived state (no useEffect for sync):
  const total = items.reduce((s, x) => s + x.price, 0);

Lists with stable keys:
  {items.map(i => <Row key={i.id} item={i} />)}

Motion (motion/react):
  import { motion } from 'motion/react';
  <motion.div initial={{opacity: 0, y: 8}} animate={{opacity: 1, y: 0}} transition={{duration: 0.3}} />

Icons (lucide-react):
  import { Plus, Trash2, Check } from 'lucide-react';
  <Plus className="w-4 h-4" />

Supabase client:
  import { createClient } from '@supabase/supabase-js';
  const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
`;

export const COMPONENT_PATTERNS = `
PRODUCTION-GRADE COMPONENT PATTERNS:

Button (primary):
  <button
    onClick={handler}
    className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-500 hover:shadow-lg active:scale-95"
    aria-label="Submit"
  >
    Submit
  </button>

Card:
  <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/60 p-6 shadow-xl backdrop-blur-sm">
    <h3 className="text-base font-semibold text-zinc-100 mb-2">Title</h3>
    <p className="text-sm text-zinc-400">Body</p>
  </div>

Input:
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-medium text-zinc-400" htmlFor="email">Email</label>
    <input
      id="email"
      type="email"
      className="rounded-xl bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-blue-500/40"
      placeholder="you@example.com"
    />
  </div>

Modal / Dialog:
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
      ...
    </div>
  </div>

Empty state:
  <div className="text-center py-12">
    <Icon className="mx-auto w-12 h-12 text-zinc-700 mb-3" />
    <p className="text-sm text-zinc-400">No items yet</p>
  </div>

Stat card:
  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
    <p className="text-xs text-zinc-500 uppercase tracking-wider">Total</p>
    <p className="text-3xl font-bold text-zinc-100 mt-1">1,234</p>
    <p className="text-xs text-green-400 mt-1">+12% this week</p>
  </div>
`;

export const AUTH_STRIPE_PATTERNS = `
AUTH (Supabase) — only emit if user requested auth:
  import { createClient } from '@supabase/supabase-js';
  const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

  // Sign up
  await supabase.auth.signUp({ email, password });
  // Sign in
  await supabase.auth.signInWithPassword({ email, password });
  // Listen
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

STRIPE CHECKOUT — only emit if user requested payments/subscription:
  // Frontend: POST to /api/checkout to create a session, then redirect
  const start = async () => {
    const r = await fetch('/api/checkout', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ priceId }) });
    const { url } = await r.json();
    window.location.href = url;
  };

  // Backend: Edge function at supabase/functions/checkout/index.ts uses STRIPE_SECRET_KEY env var
  // Always remind the user to set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in their env.
`;

/**
 * Pick a relevant subset of the KB to inject into the Builder prompt
 * based on the user's intent and complexity.
 */
export function buildKnowledgeContext({ requirements = [], complexity = 'simple' } = {}) {
  const reqText = requirements.join(' ').toLowerCase();
  const parts = [TAILWIND_CHEATSHEET, COMPONENT_PATTERNS, REACT_PATTERNS];

  const needsAuth   = /\bauth|login|sign[\s-]?up|sign[\s-]?in|register|connexion|inscription|compte/.test(reqText);
  const needsStripe = /\bpay(ment)?|stripe|subscription|billing|abonnement|paiement|checkout/.test(reqText);

  if (needsAuth || needsStripe || complexity !== 'simple') {
    parts.push(AUTH_STRIPE_PATTERNS);
  }

  return `# KNOWLEDGE BASE\n${parts.join('\n\n')}`;
}
