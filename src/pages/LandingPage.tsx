import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowUp, Paperclip, Globe, ShoppingCart, 
  BookOpen, Layout, User, Menu, Heart, Check, 
  Github, Zap, MessageSquare, Rocket, Database,
  Plus, Mic, ChevronDown, Sparkles, Star, Brain
} from 'lucide-react';

import { useAuth } from '../lib/useAuth';

import Footer from '../components/Footer';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const pricingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [prompt]);

  const scrollToPricing = () => {
    pricingRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const goToDashboard = () => navigate(user ? '/dashboard' : '/auth');
  const goToAuth = () => navigate('/auth');
  const goToBuilder = (customPrompt?: string) => {
    const finalPrompt = typeof customPrompt === 'string' ? customPrompt : prompt;
    navigate('/builder', { state: { initialPrompt: finalPrompt } });
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white font-sans selection:bg-huggy-blue/20 overflow-x-hidden">
      
      {/* ── Background Elements ───────────────────────────────────────────── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] aspect-square bg-blue-600/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] aspect-square bg-purple-600/10 blur-[140px] rounded-full" />
        <div className="absolute top-[20%] right-[10%] w-[30%] aspect-square bg-blue-400/5 blur-[100px] rounded-full" />
      </div>

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-10 py-8 max-w-[1400px] mx-auto">
        <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-white/10">
              <Heart className="w-6 h-6 text-huggy-dark fill-huggy-dark" />
            </div>
            <span className="font-display font-black text-white text-2xl tracking-tighter">HUGGY</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8 text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em]">
          <button onClick={() => goToBuilder('Show me templates')} className="hover:text-white transition-colors">Templates</button>
          <button onClick={() => goToBuilder('Enterprise SaaS')} className="hover:text-white transition-colors">Enterprise</button>
          <button onClick={scrollToPricing} className="hover:text-white transition-colors">Pricing</button>
          {['iOS', 'FAQ'].map(l => (
            <a key={l} href="#" className="hover:text-white transition-colors">{l}</a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={goToDashboard} className="text-xs font-black text-zinc-500 hover:text-white px-4 py-2 transition-colors uppercase tracking-widest">
            {user ? 'Dashboard' : 'Log in'}
          </button>
          <button onClick={user ? goToDashboard : goToAuth} className="px-6 py-2.5 bg-white text-huggy-dark rounded-full font-black text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95 shadow-lg shadow-white/5">
            {user ? 'Open App' : 'Get Started'}
          </button>
        </div>
      </nav>

      {/* ── Hero Section ──────────────────────────────────────────────────── */}
      <main className="relative z-10 pt-24 pb-20 px-6 flex flex-col items-center">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8">
            <Sparkles className="w-3 h-3 text-blue-400" />
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">The Future of SaaS Building</span>
          </div>
          
          <h1 className="text-5xl md:text-8xl font-display font-black tracking-tight mb-8 text-white leading-[1] max-w-4xl mx-auto">
            Your AI Dev Team<br />in a single prompt.
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 font-medium mb-12 max-w-2xl mx-auto leading-relaxed">
            Deploy enterprise-grade apps with PM, SecOps, UX, and i18n agents built-in.<br />
            <span className="text-blue-500">The only builder with a 7-agent pipeline.</span>
          </p>
        </motion.div>

        {/* Prompt Input Box */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="w-full max-w-3xl relative"
        >
          <div className="bg-[#111115] border border-zinc-800 rounded-[40px] p-6 shadow-2xl focus-within:border-blue-500/50 transition-all">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask Huggy to create an app..."
              className="w-full bg-transparent border-none outline-none text-lg md:text-xl text-white placeholder:text-zinc-600 resize-none min-h-[120px] font-medium"
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && goToBuilder()}
            />
            
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-[10px] font-black text-zinc-500 hover:bg-zinc-800 transition-colors uppercase tracking-[0.2em]">
                  <Paperclip className="w-3.5 h-3.5" />
                  Attach
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-[10px] font-black text-zinc-500 hover:bg-zinc-800 transition-colors uppercase tracking-[0.2em]">
                  <Globe className="w-3.5 h-3.5" />
                  Online
                </button>
              </div>
              <button 
                onClick={() => goToBuilder()}
                className="w-12 h-12 bg-white text-huggy-dark rounded-full flex items-center justify-center transition-all shadow-lg hover:scale-110 active:scale-90"
              >
                <ArrowUp className="w-6 h-6" />
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap justify-center gap-3 mt-12"
        >
          {[
            { label: 'B2B SaaS Dashboard', icon: Layout },
            { label: 'Secure FinTech Portal', icon: Database },
            { label: 'Multi-language Store', icon: Globe },
            { label: 'AI Analytics Tool', icon: Zap },
          ].map((s, i) => (
            <button 
              key={i}
              onClick={() => goToBuilder(s.label)}
              className="flex items-center gap-3 px-5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-full text-[10px] font-black text-zinc-500 hover:text-white hover:border-zinc-700 hover:shadow-xl transition-all active:scale-95 uppercase tracking-[0.15em]"
            >
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
          ))}
        </motion.div>

        {/* Trusted By Section */}
        <div className="mt-32 w-full max-w-5xl">
          <p className="text-center text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] mb-12">Trusted by modern engineering teams</p>
          <div className="flex flex-wrap justify-center items-center gap-10 md:gap-20 opacity-20 hover:opacity-50 transition-all">
            {['Vercel', 'Supabase', 'Railway', 'Stripe', 'Framer'].map(logo => (
              <span key={logo} className="text-2xl font-display font-black tracking-tighter text-white">{logo}</span>
            ))}
          </div>
        </div>
      </main>

      {/* ── Testimonials ────────────────────────────────────────────────── */}
      <section className="py-32 bg-[#08080a]">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-8">
          {[
            { name: "Alex Rivers", role: "CTO @ Flow", text: "Huggy didn't just write code; it understood our business logic and built a secure, scalable MVP in hours instead of months." },
            { name: "Sarah Chen", role: "Product Lead", text: "The multi-agent pipeline is a game changer. Having a dedicated Security Auditor agent built-in gives us massive peace of mind." },
            { name: "Marc Dupont", role: "Indie Hacker", text: "I've tried every AI builder. Huggy is the first one that produces professional-grade code that I actually want to own." }
          ].map((t, i) => (
            <div key={i} className="bg-[#111115] p-10 rounded-[40px] border border-zinc-800 shadow-sm hover:border-zinc-700 transition-all group">
              <div className="flex gap-1 mb-6">
                {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />)}
              </div>
              <p className="text-base text-zinc-400 font-medium leading-relaxed mb-8 italic">"{t.text}"</p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-xs font-black text-blue-500">{t.name[0]}</div>
                <div>
                  <div className="text-sm font-black text-white uppercase tracking-tight">{t.name}</div>
                  <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Section ──────────────────────────────────────────────── */}
      <section className="relative z-10 py-32 px-6 max-w-7xl mx-auto space-y-24">
        <div className="text-center mb-24">
          <h2 className="text-5xl md:text-7xl font-display font-black text-white tracking-tight mb-6">
            Consider yourself<br />limitless
          </h2>
          <div className="w-32 h-1.5 bg-blue-600 rounded-full mx-auto shadow-lg shadow-blue-600/20" />
        </div>

        {/* Feature 1: Multi-agent */}
        <div className="bg-[#0A0A0C] border border-zinc-800 rounded-[64px] p-12 md:p-24 flex flex-col md:flex-row items-center gap-20 shadow-2xl hover:border-blue-500/20 transition-all group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-blue-600/5 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="flex-1 space-y-10 text-center md:text-left relative z-10">
            <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center shadow-inner">
              <Zap className="w-10 h-10 text-blue-500 fill-blue-500" />
            </div>
            <h3 className="text-4xl md:text-6xl font-display font-black leading-[1.05] text-white">
              Multi-Agent<br />Architecture
            </h3>
            <p className="text-zinc-400 text-xl leading-relaxed font-medium">
              Your prompt is orchestrated by a team of specialized agents: PM, DBA, UX Designer, and Coder working in parallel to build production-ready code.
            </p>
            <button onClick={goToBuilder} className="px-10 py-4 bg-white text-huggy-dark font-black text-sm uppercase tracking-widest rounded-full shadow-xl hover:scale-105 transition-all active:scale-95">
              Start building
            </button>
          </div>
          <div className="flex-1 relative aspect-square w-full max-w-lg flex items-center justify-center">
            <div className="bg-[#111115] border border-zinc-800 rounded-[56px] p-8 shadow-2xl w-full scale-95 group-hover:scale-100 transition-transform duration-1000">
               <div className="w-full aspect-video bg-blue-500/5 rounded-[40px] overflow-hidden flex items-center justify-center border border-zinc-800/50">
                 <Brain className="w-20 h-20 text-blue-500/20 animate-pulse" />
               </div>
               <div className="mt-8 space-y-6">
                 <div className="h-4 w-2/3 bg-blue-500/20 rounded-full" />
                 <div className="h-4 w-full bg-zinc-900 rounded-full" />
                 <div className="h-4 w-1/2 bg-zinc-900 rounded-full" />
               </div>
               <div className="mt-12 h-16 bg-blue-600/20 rounded-[24px] border border-blue-500/20" />
            </div>
          </div>
        </div>

        {/* Feature 2: Enterprise */}
        <div className="bg-[#0A0A0C] border border-zinc-800 rounded-[64px] p-12 md:p-24 flex flex-col md:flex-row-reverse items-center gap-20 shadow-2xl hover:border-purple-500/20 transition-all group overflow-hidden relative">
          <div className="absolute top-0 left-0 w-[40%] h-[40%] bg-purple-600/5 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="flex-1 space-y-10 text-center md:text-left relative z-10">
            <div className="w-20 h-20 bg-purple-500/10 rounded-3xl flex items-center justify-center shadow-inner">
              <Database className="w-10 h-10 text-purple-500 fill-purple-500" />
            </div>
            <h3 className="text-4xl md:text-6xl font-display font-black leading-[1.05] text-white">
              Enterprise-Grade<br />Security & i18n
            </h3>
            <p className="text-zinc-400 text-xl leading-relaxed font-medium">
              Native Security Auditor and i18n agents ensure your code is secure, scalable, and ready for global markets from day one. No more vulnerabilities.
            </p>
            <button onClick={goToBuilder} className="px-10 py-4 bg-white text-huggy-dark font-black text-sm uppercase tracking-widest rounded-full shadow-xl hover:scale-105 transition-all active:scale-95">
              Launch enterprise
            </button>
          </div>
          <div className="flex-1 relative aspect-square w-full max-w-lg flex items-center justify-center">
            <div className="bg-[#111115] border border-zinc-800 rounded-[56px] p-10 shadow-2xl w-full scale-95 group-hover:scale-100 transition-transform duration-1000">
              <div className="flex items-center gap-5 mb-10">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-white/10">
                  <Heart className="w-8 h-8 text-huggy-dark fill-huggy-dark" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-white rounded-full" />
                  <div className="h-3 w-20 bg-zinc-800 rounded-full" />
                </div>
              </div>
              <div className="space-y-6 mb-10">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    </div>
                    <div className="h-3 w-full bg-zinc-900 rounded-full" />
                  </div>
                ))}
              </div>
              <div className="h-16 bg-white text-huggy-dark text-sm font-black uppercase tracking-widest rounded-[24px] flex items-center justify-center shadow-xl">
                Deploy to production
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing Section ──────────────────────────────────────────────── */}
      <section ref={pricingRef} className="relative z-10 py-40 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-24">
          <h2 className="text-6xl md:text-8xl font-display font-black text-white tracking-tight mb-8">
            Simple pricing
          </h2>
          <div className="w-32 h-1.5 bg-blue-600 rounded-full mx-auto" />
        </div>

        <div className="grid md:grid-cols-3 gap-10">
          {/* Free Plan */}
          <div className="bg-[#0A0A0C] border border-zinc-800 rounded-[56px] p-12 space-y-12 flex flex-col hover:border-zinc-700 transition-all">
            <div className="space-y-4">
              <h4 className="text-3xl font-display font-black text-white uppercase tracking-tight">Free</h4>
              <p className="text-base text-zinc-500 font-medium leading-relaxed">Individuals testing ideas or learning Huggy.</p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-display font-black text-white">$0</span>
              <span className="text-xs font-black text-zinc-600 uppercase tracking-widest">/ month</span>
            </div>
            <button onClick={goToBuilder} className="w-full py-5 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 rounded-3xl text-xs font-black transition-all uppercase tracking-widest">
              Get Started
            </button>
            <ul className="space-y-6 pt-10 border-t border-zinc-900">
              {['2 active projects', 'Built-in hosting', 'Basic AI Magic'].map(f => (
                <li key={f} className="flex items-center gap-5 text-sm font-bold text-zinc-500">
                  <div className="w-6 h-6 rounded-full bg-zinc-900 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-zinc-700" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro Plan */}
          <div className="relative group scale-105 z-20">
            <div className="absolute inset-0 bg-blue-600 blur-[60px] opacity-10 group-hover:opacity-20 transition-opacity rounded-[60px]" />
            <div className="relative h-full bg-[#111115] border-2 border-blue-500/30 rounded-[56px] p-12 space-y-12 flex flex-col shadow-2xl">
              <div className="absolute top-0 right-12 -translate-y-1/2 bg-blue-600 text-white text-[10px] font-black px-5 py-2 rounded-full uppercase tracking-widest shadow-2xl">Most Popular</div>
              <div className="space-y-4">
                <h4 className="text-3xl font-display font-black text-blue-500 uppercase tracking-tight">Pro</h4>
                <p className="text-base text-zinc-400 font-medium leading-relaxed">Freelancers & creators ready to build real products.</p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-display font-black text-white">$29</span>
                <span className="text-xs font-black text-zinc-600 uppercase tracking-widest">/ month</span>
              </div>
              <button onClick={goToBuilder} className="w-full py-5 bg-white text-huggy-dark rounded-3xl text-xs font-black transition-all uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95">
                Go Pro Now
              </button>
              <ul className="space-y-6 pt-10 border-t border-zinc-800">
                {['10 active projects', 'Advanced AI Logic', 'Custom Domain Support'].map(f => (
                  <li key={f} className="flex items-center gap-5 text-sm font-bold text-zinc-300">
                    <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Team Plan */}
          <div className="bg-[#0A0A0C] border border-zinc-800 rounded-[56px] p-12 space-y-12 flex flex-col hover:border-zinc-700 transition-all">
            <div className="space-y-4">
              <h4 className="text-3xl font-display font-black text-white uppercase tracking-tight">Team</h4>
              <p className="text-base text-zinc-500 font-medium leading-relaxed">Growing teams that need collaboration and scalability.</p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-display font-black text-white">$79</span>
              <span className="text-xs font-black text-zinc-600 uppercase tracking-widest">/ month</span>
            </div>
            <button onClick={goToBuilder} className="w-full py-5 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 rounded-3xl text-xs font-black transition-all uppercase tracking-widest">
              Join Team
            </button>
            <ul className="space-y-6 pt-10 border-t border-zinc-900">
              {['Unlimited projects', 'Team Permissions', 'Visual Database'].map(f => (
                <li key={f} className="flex items-center gap-5 text-sm font-bold text-zinc-500">
                  <div className="w-6 h-6 rounded-full bg-zinc-900 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-zinc-700" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <Footer />
      
      <style>{`
        @keyframes floating {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        .animate-floating {
          animation: floating 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
