/**
 * Knowledge ingestion script - chunks curated documentation snippets,
 * generates embeddings, and writes them to the knowledge_chunks table.
 *
 * Usage:
 *   1. Ensure supabase/migration_rag.sql has been applied
 *   2. Set OPENAI_API_KEY and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   3. Run:  node scripts/ingest-knowledge.mjs
 *
 * Re-runs are idempotent: existing chunks are upserted by (source, title).
 */

import 'dotenv/config';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { embed, isEmbeddingAvailable } from '../lib/rag/embed.mjs';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
  process.exit(1);
}
if (!isEmbeddingAvailable()) {
  console.error('Missing OPENAI_API_KEY in env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Knowledge corpus ────────────────────────────────────────────────────────
// Curated, high-signal chunks. Each ~150-400 tokens, focused on one concept.
const CORPUS = [
  // ─── Tailwind ──────────────────────────────────────────────────────────────
  {
    source: 'tailwind',
    title: 'Modern dark surface palette',
    content: `Production dark UI palette (Linear/Vercel/Lovable style):
- Page background: bg-[#0a0a0b] or bg-zinc-950
- Card surfaces:   bg-zinc-900/60 with border border-zinc-800/60 and shadow-xl
- Hover state:     bg-zinc-800/60 or border-zinc-700
- Inputs:          bg-zinc-800 text-zinc-100 placeholder:text-zinc-500
- Primary text:    text-zinc-100
- Body text:       text-zinc-300
- Muted text:      text-zinc-500
- Subtle text:     text-zinc-600 (do NOT use on bg-zinc-900: contrast too low)
Always pair surfaces with rounded-2xl for cards and rounded-xl for buttons/inputs.`,
  },
  {
    source: 'tailwind',
    title: 'Accent colors and CTA patterns',
    content: `Accent colors:
- Primary CTA:   bg-blue-600 hover:bg-blue-500 text-white shadow-md hover:shadow-lg
- Glow effect:   shadow-[0_0_24px_rgba(59,130,246,0.35)]
- Success:       text-green-400, bg-green-500/10, border-green-500/30
- Warning:       text-yellow-400, bg-yellow-500/10
- Danger:        text-red-400, bg-red-500/10, border-red-500/30
- Secondary:     text-violet-400, bg-violet-600
Button transitions: transition-all duration-150 hover:scale-[1.02] active:scale-95.
Always include focus:outline-none focus:ring-2 focus:ring-blue-500/40 for keyboard a11y.`,
  },
  {
    source: 'tailwind',
    title: 'Spacing and layout grid',
    content: `Spacing scale used in production designs:
- Container max widths: max-w-md (form), max-w-2xl (article), max-w-4xl (dashboard), max-w-6xl (marketing)
- Card padding:  p-6 (default), p-4 (compact), p-8 (hero)
- Section spacing: py-12 md:py-16 lg:py-24
- Gap between items: gap-4 (lists), gap-6 (cards), gap-2 (inline icons)
- Grid: grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6
- Hero center: min-h-screen flex items-center justify-center
Mobile-first then add sm: md: lg: breakpoints. Never start with desktop styles.`,
  },

  // ─── React 19 ──────────────────────────────────────────────────────────────
  {
    source: 'react',
    title: 'State management with hooks',
    content: `useState for local state with TypeScript:
  const [items, setItems] = useState<Item[]>([]);
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);

Updates that depend on prev value MUST use function form:
  setItems(prev => [...prev, newItem]);
  setCount(prev => prev + 1);

Never mutate state directly - always create new arrays/objects.
For derived data, compute it during render - no useEffect:
  const total = items.reduce((s, i) => s + i.price, 0);
  const completed = items.filter(i => i.done).length;`,
  },
  {
    source: 'react',
    title: 'useEffect patterns',
    content: `useEffect for side effects only (not for syncing state).
Always include dependency array and cleanup function:
  useEffect(() => {
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);   // cleanup
  }, []);

For async:
  useEffect(() => {
    let cancelled = false;
    fetch('/api/data').then(r => r.json()).then(data => {
      if (!cancelled) setData(data);
    });
    return () => { cancelled = true; };
  }, [id]);

Subscriptions cleanup pattern:
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handler);
    return () => subscription.unsubscribe();
  }, []);`,
  },
  {
    source: 'react',
    title: 'Forms and controlled inputs',
    content: `Controlled inputs with Enter-to-submit:
  const [value, setValue] = useState('');
  const submit = () => { if (value.trim()) onAdd(value); setValue(''); };

  <input
    value={value}
    onChange={e => setValue(e.target.value)}
    onKeyDown={e => e.key === 'Enter' && submit()}
    placeholder="Add item..."
    aria-label="New item"
    className="flex-1 rounded-xl bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/40"
  />

For forms with multiple fields, use a single state object:
  const [form, setForm] = useState({ email: '', password: '' });
  onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}`,
  },

  // ─── shadcn-style components ───────────────────────────────────────────────
  {
    source: 'shadcn',
    title: 'Button variants',
    content: `Production Button component patterns:

Primary:
  <button className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-blue-500 hover:shadow-lg active:scale-95 transition-all">

Secondary (outlined):
  <button className="rounded-xl border border-zinc-700 bg-zinc-900/60 px-5 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 transition">

Ghost:
  <button className="rounded-xl px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition">

Destructive:
  <button className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition">

Icon-only:
  <button aria-label="Delete" className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition">
    <Trash2 className="w-4 h-4" />
  </button>`,
  },
  {
    source: 'shadcn',
    title: 'Card and stat patterns',
    content: `Production card patterns:

Basic card:
  <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/60 p-6 shadow-xl backdrop-blur-sm">
    <h3 className="text-base font-semibold text-zinc-100 mb-2">{title}</h3>
    <p className="text-sm text-zinc-400">{body}</p>
  </div>

Stat card (KPI):
  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-4 h-4 text-blue-400" />
      <span className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</span>
    </div>
    <p className="text-3xl font-bold text-zinc-100">{value}</p>
    <p className="text-xs text-green-400 mt-1">+12% this week</p>
  </div>

Empty state:
  <div className="text-center py-12">
    <Icon className="mx-auto w-12 h-12 text-zinc-700 mb-3" />
    <p className="text-sm text-zinc-400">No items yet</p>
    <button className="mt-4 ...">Create first item</button>
  </div>`,
  },
  {
    source: 'shadcn',
    title: 'Modal and dialog patterns',
    content: `Modal overlay with backdrop:
  {open && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={() => setOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl"
      >
        <h3 className="text-base font-bold text-zinc-100 mb-2">{title}</h3>
        {children}
        <button onClick={() => setOpen(false)} className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-zinc-800">
          <X className="w-4 h-4 text-zinc-500" />
        </button>
      </motion.div>
    </div>
  )}`,
  },

  // ─── Supabase ──────────────────────────────────────────────────────────────
  {
    source: 'supabase',
    title: 'Auth pattern with session management',
    content: `Supabase auth complete pattern:

  import { createClient, User } from '@supabase/supabase-js';
  const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

  function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        setLoading(false);
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
        setUser(session?.user ?? null);
      });
      return () => subscription.unsubscribe();
    }, []);

    return {
      user,
      loading,
      signIn: (email, pw) => supabase.auth.signInWithPassword({ email, password: pw }),
      signUp: (email, pw) => supabase.auth.signUp({ email, password: pw }),
      signOut: () => supabase.auth.signOut(),
    };
  }`,
  },
  {
    source: 'supabase',
    title: 'Database CRUD with RLS',
    content: `Reading + writing data with Supabase:

Read with filter:
  const { data, error } = await supabase
    .from('items')
    .select('id, name, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

Insert with returning:
  const { data, error } = await supabase
    .from('items')
    .insert({ name, user_id: userId })
    .select()
    .single();

Update:
  await supabase.from('items').update({ done: true }).eq('id', id);

Delete:
  await supabase.from('items').delete().eq('id', id);

Always pair with RLS policies:
  ALTER TABLE items ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users see own items" ON items FOR SELECT USING (auth.uid() = user_id);
  CREATE POLICY "Users insert own items" ON items FOR INSERT WITH CHECK (auth.uid() = user_id);`,
  },

  // ─── motion/react ──────────────────────────────────────────────────────────
  {
    source: 'motion',
    title: 'Page and item entrance animations',
    content: `motion/react patterns (formerly framer-motion):

Page fade-in:
  import { motion } from 'motion/react';
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: 'easeOut' }}
  >

Staggered list:
  {items.map((item, i) => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05, duration: 0.3 }}
    >

Hover interaction:
  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>

Modal enter/exit:
  import { AnimatePresence, motion } from 'motion/react';
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      />
    )}
  </AnimatePresence>`,
  },
];

// ─── Ingest ───────────────────────────────────────────────────────────────────
async function ingest() {
  console.log(`Ingesting ${CORPUS.length} chunks...\n`);

  const texts = CORPUS.map(c => `${c.title}\n${c.content}`);
  console.log('Generating embeddings (batched)...');
  const vectors = await embed(texts);

  if (!vectors || !Array.isArray(vectors)) {
    console.error('Failed to generate embeddings');
    process.exit(1);
  }

  console.log(`Got ${vectors.length} embeddings, writing to knowledge_chunks...`);

  // Clear old chunks for these sources first (clean re-ingest)
  const sources = [...new Set(CORPUS.map(c => c.source))];
  await supabase.from('knowledge_chunks').delete().in('source', sources);

  const rows = CORPUS.map((chunk, i) => ({
    source: chunk.source,
    title: chunk.title,
    content: chunk.content,
    embedding: vectors[i],
    tokens: Math.ceil((chunk.content.length + (chunk.title?.length || 0)) / 4),
  }));

  const { error } = await supabase.from('knowledge_chunks').insert(rows);
  if (error) {
    console.error('Insert failed:', error.message);
    process.exit(1);
  }

  console.log(`\n✓ Ingested ${rows.length} chunks across ${sources.length} sources: ${sources.join(', ')}`);
  console.log('Run a build to see RAG retrieval in action.\n');
}

ingest().catch(err => {
  console.error('Ingestion crashed:', err);
  process.exit(1);
});
