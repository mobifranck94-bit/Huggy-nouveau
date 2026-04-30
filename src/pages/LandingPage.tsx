import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart, Check, X, Eye, EyeOff, ArrowUp, Github,
  Zap, Globe2, Code2, Database, Shield, Cpu,
  ChevronRight, Star, Users, BarChart3
} from 'lucide-react';

interface Props {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string, name: string) => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  onGithubSignIn: () => Promise<void>;
}

const SUGGESTIONS = ['E-commerce website', 'Personal blog', 'Landing page', 'Portfolio site', 'SaaS dashboard', 'Mobile app'];

const FREE_FEATURES  = ['2 active projects', 'Built-in hosting', 'AI app generator (basic)', '3 pre-made templates', 'Community support', '100 monthly build credits'];
const PRO_FEATURES   = ['10 active projects', 'AI app generator (advanced)', 'Custom domain support', 'Real-time collaboration', 'API & external data integration', '2,000 monthly build credits'];
const TEAM_FEATURES  = ['Unlimited projects', 'Team dashboard & role permissions', 'Database editor & visual schema', 'Version control', 'Priority support', '10,000 monthly build credits'];

export default function LandingPage({ onSignIn, onSignUp, onGoogleSignIn, onGithubSignIn }: Props) {
  const [modal, setModal]           = useState<'signin' | 'signup' | null>(null);
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [name, setName]             = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [prompt, setPrompt]         = useState('');
  const [billing, setBilling]       = useState<'monthly' | 'yearly'>('monthly');
  const [mobileMenu, setMobileMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [prompt]);

  const handleAuth = async () => {
    if (!email || !password) { setError('Veuillez remplir tous les champs.'); return; }
    setLoading(true); setError('');
    try {
      if (modal === 'signin') await onSignIn(email, password);
      else await onSignUp(email, password, name || email.split('@')[0]);
    } catch (e: any) {
      setError(e.message || 'Une erreur est survenue.');
    } finally { setLoading(false); }
  };

  const openModal = (type: 'signin' | 'signup') => {
    setModal(type); setError(''); setEmail(''); setPassword(''); setName('');
  };

  const yearly = (p: number) => Math.round(p * 0.8);

  return (
    <div className="min-h-screen bg-[#f2f2f2] font-sans overflow-x-hidden">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center">
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-lg font-bold text-black tracking-tight">Huggy</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-zinc-600 font-medium">
            {['Templates', 'Enterprise', 'Pricing', 'FAQ'].map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} className="hover:text-black transition-colors">{l}</a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => openModal('signin')} className="px-4 py-1.5 text-sm font-medium text-zinc-700 hover:text-black transition-colors">
              Sign In
            </button>
            <button onClick={() => openModal('signup')} className="px-4 py-1.5 text-sm font-bold bg-black text-white rounded-lg hover:bg-zinc-800 transition-colors">
              Sign Up
            </button>
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileMenu(v => !v)}>
            <div className="w-5 h-0.5 bg-black mb-1" />
            <div className="w-5 h-0.5 bg-black mb-1" />
            <div className="w-5 h-0.5 bg-black" />
          </button>
        </div>

        <AnimatePresence>
          {mobileMenu && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
              className="md:hidden overflow-hidden bg-white border-t border-black/5 px-6 py-4 flex flex-col gap-4">
              {['Templates', 'Enterprise', 'Pricing', 'FAQ'].map(l => (
                <a key={l} href={`#${l.toLowerCase()}`} className="text-sm font-medium text-zinc-700">{l}</a>
              ))}
              <button onClick={() => openModal('signin')} className="text-sm font-medium text-left text-zinc-700">Sign In</button>
              <button onClick={() => openModal('signup')} className="px-4 py-2 text-sm font-bold bg-black text-white rounded-lg w-fit">Sign Up</button>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-14 overflow-hidden">
        {/* gradient bg */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-[#fde8e8] to-[#f87060] opacity-70 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#f87060] to-transparent pointer-events-none" />

        <div className="relative z-10 w-full max-w-4xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-5xl md:text-7xl font-extrabold text-black leading-tight mb-4 tracking-tight">
              What do you<br />want to create?
            </h1>
            <p className="text-lg text-zinc-600 mb-10">Start building with a single prompt. No coding needed.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
            className="bg-white rounded-2xl border border-black/10 shadow-xl p-4 text-left">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Ask Huggy build..."
              rows={3}
              className="w-full resize-none text-base text-black placeholder:text-zinc-400 outline-none bg-transparent leading-relaxed"
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); openModal('signup'); } }}
            />
            <div className="flex items-center justify-between mt-3">
              <div className="flex gap-2">
                {['Attach', 'Online'].map(b => (
                  <button key={b} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-xs font-medium text-zinc-600 transition-colors">
                    {b === 'Attach' ? '📎' : '🌐'} {b}
                  </button>
                ))}
              </div>
              <button onClick={() => openModal('signup')}
                className="w-9 h-9 bg-[#f87060] rounded-xl flex items-center justify-center hover:bg-[#f05040] transition-colors shadow-md">
                <ArrowUp className="w-4 h-4 text-white" />
              </button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className="flex flex-wrap justify-center gap-2 mt-6">
            {SUGGESTIONS.map((s, i) => (
              <button key={i} onClick={() => { setPrompt(s); openModal('signup'); }}
                className="px-4 py-2 bg-white/60 backdrop-blur-sm border border-white/50 rounded-full text-sm font-medium text-zinc-700 hover:bg-white hover:shadow-md transition-all">
                {s}
              </button>
            ))}
          </motion.div>
        </div>

        <div className="absolute bottom-8 left-0 right-0 flex justify-center">
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2 }}
            className="w-6 h-10 border-2 border-black/20 rounded-full flex items-start justify-center pt-2">
            <div className="w-1.5 h-2 bg-black/30 rounded-full" />
          </motion.div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-[#f87060] to-[#f2f2f2] py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-5xl md:text-6xl font-extrabold text-black text-center mb-16 tracking-tight">
            Consider yourself<br />limitless
          </motion.h2>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: 'Create at the speed of thought',
                desc: 'Tell Huggy your idea, and watch it transform into a working app — complete with all the necessary components, pages, flows and features.',
                icon: Cpu,
                items: ['Medical App', 'Backend', 'Code'],
              },
              {
                title: "The backend's built-in automatically",
                desc: "Everything your app needs to function — sign-in, data storage, role-based permissions — is taken care of behind the scenes.",
                icon: Database,
                items: ['Backend Build', '4/4 files', 'Launch app'],
              },
            ].map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                className="bg-white/80 backdrop-blur-sm rounded-3xl border border-white p-8 shadow-lg">
                <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center mb-5">
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-black mb-3">{f.title}</h3>
                <p className="text-zinc-500 leading-relaxed mb-6">{f.desc}</p>
                <button onClick={() => openModal('signup')}
                  className="flex items-center gap-2 text-sm font-bold text-black hover:gap-3 transition-all">
                  Start building <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: 0.3 }}
            className="mt-6 bg-white/80 backdrop-blur-sm rounded-3xl border border-white p-8 shadow-lg flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center mb-5">
                <Globe2 className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-black mb-3">Ready to use, instantly</h3>
              <p className="text-zinc-500 leading-relaxed mb-6">
                Huggy includes built-in hosting, so when your app is ready the only thing left is publish, share and grow.
              </p>
              <button onClick={() => openModal('signup')}
                className="flex items-center gap-2 text-sm font-bold text-black hover:gap-3 transition-all">
                Start building <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 bg-zinc-100 rounded-2xl p-6 space-y-3">
              {['Deploy to production', 'Custom domain', 'SSL certificate', 'Global CDN'].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-sm font-medium text-zinc-700">{item}</span>
                  <Check className="w-4 h-4 text-green-500 ml-auto" />
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────────── */}
      <section id="pricing" className="bg-[#f2f2f2] py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-12">
            <h2 className="text-5xl md:text-6xl font-extrabold text-black mb-6 tracking-tight">
              Pricing plans for<br />every need
            </h2>
            <div className="inline-flex items-center bg-white border border-black/10 rounded-full p-1 shadow-sm">
              {(['monthly', 'yearly'] as const).map(b => (
                <button key={b} onClick={() => setBilling(b)}
                  className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-all ${billing === b ? 'bg-black text-white shadow' : 'text-zinc-600 hover:text-black'}`}>
                  Pay {b} {b === 'yearly' && <span className="ml-1 text-[10px] font-bold text-[#f87060]">-20%</span>}
                </button>
              ))}
            </div>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Free', price: 0, desc: 'Individuals testing ideas or learning Huggy.', features: FREE_FEATURES, cta: 'Join Free', highlight: false },
              { name: 'Pro Plan', price: 29, desc: 'Freelancers, small startups & creators ready to build real products.', features: PRO_FEATURES, cta: 'Upgrade to Pro', highlight: true },
              { name: 'Team Plan', price: 79, desc: 'Growing teams & startups that need collaboration and scalability.', features: TEAM_FEATURES, cta: 'Start Team Plan', highlight: false },
            ].map((plan, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className={`rounded-3xl border p-8 flex flex-col ${plan.highlight
                  ? 'bg-gradient-to-b from-[#f8a090] to-[#f87060] border-[#f87060] shadow-2xl scale-105'
                  : 'bg-white border-black/10 shadow-md'}`}>
                <div className={`text-xs font-bold uppercase tracking-widest mb-2 ${plan.highlight ? 'text-white/80' : 'text-zinc-400'}`}>
                  {plan.name}
                </div>
                <p className={`text-sm mb-6 leading-relaxed ${plan.highlight ? 'text-white/90' : 'text-zinc-500'}`}>
                  {plan.desc}
                </p>
                <div className={`flex items-baseline gap-1 mb-6 ${plan.highlight ? 'text-white' : 'text-black'}`}>
                  <span className="text-xl font-bold">$</span>
                  <span className="text-5xl font-extrabold">
                    {billing === 'yearly' && plan.price > 0 ? yearly(plan.price) : plan.price}
                  </span>
                  <span className={`text-sm ${plan.highlight ? 'text-white/70' : 'text-zinc-400'}`}>USD /<br />month</span>
                </div>
                <button onClick={() => openModal('signup')}
                  className={`w-full py-3 rounded-xl font-bold text-sm mb-8 transition-all ${plan.highlight
                    ? 'bg-black text-white hover:bg-zinc-900'
                    : 'bg-zinc-100 text-black hover:bg-zinc-200 border border-black/10'}`}>
                  {plan.cta}
                </button>
                <ul className="space-y-3 flex-1">
                  {plan.features.map((f, j) => (
                    <li key={j} className={`flex items-center gap-2.5 text-sm ${plan.highlight ? 'text-white/90' : 'text-zinc-600'}`}>
                      <Check className={`w-4 h-4 shrink-0 ${plan.highlight ? 'text-white' : 'text-black'}`} />
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-[#f2f2f2] to-[#f87060] py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-5xl md:text-7xl font-extrabold text-black mb-6 tracking-tight">
              So, what are you<br />building?
            </h2>
            <p className="text-lg text-zinc-600 mb-8">
              Huggy is the AI-powered platform that lets you build fully functioning apps in minutes using nothing but natural language.
            </p>
            <button onClick={() => openModal('signup')}
              className="px-8 py-4 bg-black text-white font-bold rounded-2xl text-lg hover:bg-zinc-800 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5">
              Start building for free
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="bg-[#f87060] py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center">
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-lg font-bold text-black">Huggy</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-black/70">
            {['Templates', 'Enterprise', 'Pricing', 'FAQ', 'Privacy', 'Terms'].map(l => (
              <a key={l} href="#" className="hover:text-black transition-colors">{l}</a>
            ))}
          </div>
          <p className="text-sm text-black/50">© {new Date().getFullYear()} Huggy. All rights reserved.</p>
        </div>
      </footer>

      {/* ── Auth Modal ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {modal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setModal(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

              <div className="p-8">
                <button onClick={() => setModal(null)} className="absolute top-5 right-5 p-2 hover:bg-zinc-100 rounded-xl transition-colors">
                  <X className="w-4 h-4 text-zinc-400" />
                </button>

                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                    <Heart className="w-4 h-4 text-white fill-white" />
                  </div>
                  <span className="text-lg font-bold text-black">Huggy</span>
                </div>

                <h2 className="text-2xl font-extrabold text-black mb-1">
                  {modal === 'signin' ? 'Welcome back' : 'Create your account'}
                </h2>
                <p className="text-zinc-500 text-sm mb-6">
                  {modal === 'signin' ? 'Sign in to continue building.' : 'Start building for free, no credit card required.'}
                </p>

                {/* Social auth */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button onClick={onGoogleSignIn}
                    className="flex items-center justify-center gap-2 py-2.5 border border-black/10 rounded-xl text-sm font-medium hover:bg-zinc-50 transition-colors">
                    <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Google
                  </button>
                  <button onClick={onGithubSignIn}
                    className="flex items-center justify-center gap-2 py-2.5 border border-black/10 rounded-xl text-sm font-medium hover:bg-zinc-50 transition-colors">
                    <Github className="w-4 h-4" />
                    GitHub
                  </button>
                </div>

                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-black/10" /></div>
                  <div className="relative text-center"><span className="px-3 bg-white text-xs text-zinc-400 font-medium">or continue with email</span></div>
                </div>

                {error && (
                  <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                    {error}
                  </div>
                )}

                <div className="space-y-3">
                  {modal === 'signup' && (
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wide mb-1.5">Full Name</label>
                      <input value={name} onChange={e => setName(e.target.value)}
                        placeholder="John Doe" type="text"
                        className="w-full px-4 py-3 bg-zinc-50 border border-black/10 rounded-xl text-sm outline-none focus:border-black focus:bg-white transition-all" />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wide mb-1.5">Email</label>
                    <input value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com" type="email"
                      className="w-full px-4 py-3 bg-zinc-50 border border-black/10 rounded-xl text-sm outline-none focus:border-black focus:bg-white transition-all"
                      onKeyDown={e => e.key === 'Enter' && handleAuth()} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wide mb-1.5">Password</label>
                    <div className="relative">
                      <input value={password} onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••" type={showPwd ? 'text' : 'password'}
                        className="w-full px-4 py-3 bg-zinc-50 border border-black/10 rounded-xl text-sm outline-none focus:border-black focus:bg-white transition-all pr-10"
                        onKeyDown={e => e.key === 'Enter' && handleAuth()} />
                      <button onClick={() => setShowPwd(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                        {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button onClick={handleAuth} disabled={loading}
                  className="w-full mt-5 py-3 bg-black text-white font-bold rounded-xl hover:bg-zinc-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                  {loading ? 'Chargement...' : modal === 'signin' ? 'Sign In' : 'Create Account'}
                </button>

                <p className="text-center text-sm text-zinc-500 mt-4">
                  {modal === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                  <button onClick={() => openModal(modal === 'signin' ? 'signup' : 'signin')}
                    className="font-bold text-black hover:underline">
                    {modal === 'signin' ? 'Sign Up' : 'Sign In'}
                  </button>
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
