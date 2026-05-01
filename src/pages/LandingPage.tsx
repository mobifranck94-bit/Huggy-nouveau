import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowUp, Paperclip, Globe, ShoppingCart, 
  BookOpen, Layout, User, Menu, Heart, Check, 
  Sparkles, Github
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [prompt]);

  const goToDashboard = () => navigate('/dashboard');
  const goToBuilder = () => navigate('/builder');

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-black font-sans selection:bg-red-200 overflow-hidden">
      
      {/* ── Background Glow ────────────────────────────────────────────────── */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-red-500/30 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-10 py-6 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-2">
          {/* Custom Logo V0-like */}
          <div className="w-8 h-8 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 2L2 26H30L16 2Z" fill="black"/>
              <path d="M18 10L24 20" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-600">
          {['Templates', 'Enterprise', 'Pricing', 'iOS', 'Students', 'FAQ'].map(l => (
            <a key={l} href="#" className="hover:text-black transition-colors">{l}</a>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button onClick={goToDashboard} className="text-sm font-medium text-zinc-600 hover:text-black px-4 py-2 transition-colors">
            Sign In
          </button>
          <button onClick={goToBuilder} className="bg-[#1A1A1A] text-white text-sm font-bold px-6 py-2 rounded-lg hover:bg-black transition-all">
            Sign Up
          </button>
        </div>
      </nav>

      {/* ── Hero Section ──────────────────────────────────────────────────── */}
      <main className="relative z-10 pt-32 pb-20 px-6 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-4 text-black">
            What do you<br />want to create?
          </h1>
          <p className="text-xl md:text-2xl text-zinc-500 font-medium mb-12">
            Start building with a single prompt. No coding needed.
          </p>
        </motion.div>

        {/* Prompt Input Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="w-full max-w-3xl relative"
        >
          <div className="bg-white/40 backdrop-blur-2xl border border-white/40 rounded-[32px] p-6 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] focus-within:ring-2 ring-red-500/20 transition-all">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask v0 build..."
              className="w-full bg-transparent border-none outline-none text-xl md:text-2xl text-black placeholder:text-zinc-400 resize-none min-h-[120px]"
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && goToBuilder()}
            />
            
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/50 border border-white/60 rounded-full text-xs font-bold text-zinc-500 hover:bg-white transition-colors">
                  <Paperclip className="w-3.5 h-3.5" />
                  Attach
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/50 border border-white/60 rounded-full text-xs font-bold text-zinc-500 hover:bg-white transition-colors">
                  <Globe className="w-3.5 h-3.5" />
                  Online
                </button>
              </div>
              <button 
                onClick={goToBuilder}
                className="w-10 h-10 bg-zinc-200 hover:bg-zinc-300 rounded-full flex items-center justify-center transition-colors shadow-sm"
              >
                <ArrowUp className="w-5 h-5 text-zinc-600" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Suggestions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap justify-center gap-3 mt-8"
        >
          {[
            { label: 'E-commerce website', icon: ShoppingCart },
            { label: 'Personal blog', icon: BookOpen },
            { label: 'Landing page', icon: Layout },
            { label: 'Portfolio site', icon: User },
          ].map((s, i) => (
            <button 
              key={i}
              onClick={() => { setPrompt(s.label); goToBuilder(); }}
              className="flex items-center gap-2 px-4 py-2 bg-white/40 backdrop-blur-md border border-white/60 rounded-full text-xs font-bold text-zinc-500 hover:bg-white hover:text-black transition-all active:scale-95"
            >
              <s.icon className="w-3.5 h-3.5" />
              {s.label}
            </button>
          ))}
        </motion.div>
      </main>

      {/* ── Features Section ──────────────────────────────────────────────── */}
      <section className="relative z-10 py-20 px-6 max-w-6xl mx-auto space-y-8">
        <h2 className="text-5xl md:text-7xl font-black text-center mb-16 tracking-tight">
          Consider yourself<br />limitless
        </h2>

        {/* Feature 1: Speed of thought */}
        <div className="bg-white/40 backdrop-blur-3xl border border-white/40 rounded-[48px] p-8 md:p-16 flex flex-col md:flex-row items-center gap-12 overflow-hidden">
          <div className="flex-1 space-y-6">
            <h3 className="text-4xl md:text-5xl font-black leading-tight">
              Create at the<br />speed of thought
            </h3>
            <p className="text-zinc-600 text-lg leading-relaxed font-medium">
              Tell V0 your idea, and watch it transform into a working app—complete with all the necessary components, pages, flows and features.
            </p>
            <button onClick={goToBuilder} className="bg-[#1A1A1A] text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-all">
              Start building
            </button>
          </div>
          <div className="flex-1 relative h-[400px] w-full flex items-center justify-center">
            {/* Visual Illustration Mockup */}
            <div className="relative w-64 h-full bg-white/40 rounded-3xl border border-white/60 p-4 shadow-2xl flex flex-col gap-4">
              <div className="h-40 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl" />
              <div className="space-y-2">
                <div className="h-3 w-3/4 bg-zinc-200 rounded-full" />
                <div className="h-3 w-full bg-zinc-200 rounded-full" />
                <div className="h-3 w-1/2 bg-zinc-200 rounded-full" />
              </div>
              <div className="mt-auto h-10 bg-black rounded-xl" />
            </div>
            {/* Floating Nodes */}
            <div className="absolute top-10 left-0 p-3 bg-white/80 rounded-xl border border-white shadow-lg text-[10px] font-bold flex items-center gap-2">
              <span className="w-4 h-4 bg-purple-100 rounded flex items-center justify-center">🧬</span> Medical App
            </div>
            <div className="absolute top-40 -left-10 p-3 bg-white/80 rounded-xl border border-white shadow-lg text-[10px] font-bold flex items-center gap-2">
              <span className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center">⚙️</span> Backend
            </div>
            <div className="absolute bottom-20 left-4 p-3 bg-white/80 rounded-xl border border-white shadow-lg text-[10px] font-bold flex items-center gap-2">
              <span className="w-4 h-4 bg-green-100 rounded flex items-center justify-center">{'</>'}</span> Code
            </div>
            <div className="absolute top-20 right-0 p-3 bg-white/80 rounded-xl border border-white shadow-lg text-[10px] font-bold flex items-center gap-2">
              <span className="w-4 h-4 bg-orange-100 rounded flex items-center justify-center">📝</span> Create plan
            </div>
            <div className="absolute top-52 -right-10 p-3 bg-white/80 rounded-xl border border-white shadow-lg text-[10px] font-bold flex items-center gap-2">
              <span className="w-4 h-4 bg-red-100 rounded flex items-center justify-center">📋</span> Summarize
            </div>
            <div className="absolute bottom-10 right-4 p-3 bg-white/80 rounded-xl border border-white shadow-lg text-[10px] font-bold flex items-center gap-2">
              <span className="w-4 h-4 bg-indigo-100 rounded flex items-center justify-center">📊</span> Analyze
            </div>
          </div>
        </div>

        {/* Feature 2: Backend */}
        <div className="bg-white/40 backdrop-blur-3xl border border-white/40 rounded-[48px] p-8 md:p-16 flex flex-col md:flex-row-reverse items-center gap-12 overflow-hidden">
          <div className="flex-1 space-y-6">
            <h3 className="text-4xl md:text-5xl font-black leading-tight">
              The backend's built-<br />in automatically
            </h3>
            <p className="text-zinc-600 text-lg leading-relaxed font-medium">
              Everything your app needs to function—sign-in, data storage, role-based permissions—is taken care of behind the scenes.
            </p>
            <button onClick={goToBuilder} className="bg-[#1A1A1A] text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-all">
              Start building
            </button>
          </div>
          <div className="flex-1 relative h-[400px] w-full flex items-center justify-center">
            {/* Visual Illustration Mockup */}
            <div className="bg-white/60 rounded-3xl border border-white p-8 shadow-2xl space-y-6 w-full max-w-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center text-xs">V0</div>
                <div className="space-y-1">
                  <div className="h-2.5 w-24 bg-zinc-800 rounded-full" />
                  <div className="h-2 w-16 bg-zinc-300 rounded-full" />
                </div>
              </div>
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full border-2 border-green-500 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    </div>
                    <div className="h-2 w-full bg-zinc-100 rounded-full" />
                  </div>
                ))}
              </div>
              <div className="h-10 bg-black text-white text-xs font-bold rounded-xl flex items-center justify-center">
                Launch app
              </div>
            </div>
            {/* Floating Icons */}
            <div className="absolute top-1/2 -left-12 grid grid-cols-2 gap-3 opacity-40">
              {[1,2,3,4].map(i => <div key={i} className="w-10 h-10 bg-white/20 border border-white rounded-xl" />)}
            </div>
            <div className="absolute top-1/2 -right-12 grid grid-cols-2 gap-3 opacity-40">
              {[1,2,3,4].map(i => <div key={i} className="w-10 h-10 bg-white/20 border border-white rounded-xl" />)}
            </div>
          </div>
        </div>

        {/* Feature 3: Ready to use */}
        <div className="bg-white/40 backdrop-blur-3xl border border-white/40 rounded-[48px] p-8 md:p-16 flex flex-col md:flex-row items-center gap-12 overflow-hidden">
          <div className="flex-1 space-y-6">
            <h3 className="text-4xl md:text-5xl font-black leading-tight">
              Ready to use,<br />instantly
            </h3>
            <p className="text-zinc-600 text-lg leading-relaxed font-medium">
              V0 includes built-in hosting, so when your app is ready the only thing left is publish, share and grow.
            </p>
            <button onClick={goToBuilder} className="bg-[#1A1A1A] text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-all">
              Start building
            </button>
          </div>
          <div className="flex-1 relative h-[400px] w-full flex items-center justify-center">
            {/* Visual Illustration Mockup */}
            <div className="relative w-72 h-48 bg-white/60 rounded-2xl border border-white p-4 shadow-2xl flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-[10px] font-bold text-zinc-500">Ready to use</span>
              </div>
              <div className="grid grid-cols-2 gap-2 flex-1">
                <div className="bg-zinc-100 rounded-lg" />
                <div className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg" />
              </div>
              <div className="absolute -bottom-4 -left-4 w-10 h-10 bg-black text-white rounded-full flex items-center justify-center text-xl">+</div>
            </div>
            {/* Floating Icons */}
            <div className="absolute -top-10 flex gap-4">
              {[1,2,3,4,5].map(i => <div key={i} className="w-10 h-10 bg-white/80 rounded-full border border-white shadow-lg flex items-center justify-center text-xs opacity-60">Logo</div>)}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing Section ──────────────────────────────────────────────── */}
      <section className="relative z-10 py-32 px-6 max-w-6xl mx-auto">
        <h2 className="text-5xl md:text-7xl font-black text-center mb-8 tracking-tight">
          Pricing plans for<br />every need
        </h2>

        <div className="flex justify-center mb-16">
          <div className="bg-zinc-200/50 backdrop-blur-sm p-1 rounded-full flex gap-1">
            <button className="px-6 py-2 bg-white rounded-full text-xs font-bold shadow-sm">Pay monthly</button>
            <button className="px-6 py-2 text-xs font-bold text-zinc-500">Pay yearly</button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Free Plan */}
          <div className="bg-white border border-white/40 rounded-[32px] p-8 space-y-8 flex flex-col">
            <div className="space-y-2">
              <h4 className="text-xl font-bold">Free</h4>
              <p className="text-sm text-zinc-500 font-medium">Individuals testing ideas or learning V0.</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black">$0</span>
              <span className="text-xs font-bold text-zinc-400 uppercase">USD / month</span>
            </div>
            <button onClick={goToBuilder} className="w-full py-3 bg-zinc-100 rounded-xl text-sm font-bold text-zinc-600 hover:bg-zinc-200 transition-colors">
              Join Free
            </button>
            <ul className="space-y-4 pt-4 border-t border-zinc-100">
              {['2 active projects', 'Built-in hosting', 'AI app generator (basic)'].map(f => (
                <li key={f} className="flex items-center gap-3 text-xs font-bold text-zinc-600">
                  <Check className="w-3.5 h-3.5 text-zinc-400" /> {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro Plan */}
          <div className="bg-gradient-to-b from-red-400 to-white border border-white/40 rounded-[32px] p-[1px] shadow-2xl relative">
            <div className="bg-white rounded-[31px] p-8 space-y-8 flex flex-col h-full overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-red-500/20 to-transparent" />
              <div className="relative z-10 space-y-2">
                <h4 className="text-xl font-bold">Pro Plan</h4>
                <p className="text-sm text-zinc-500 font-medium">Freelancers, small startups & creators ready to build real products.</p>
              </div>
              <div className="relative z-10 flex items-baseline gap-1">
                <span className="text-4xl font-black">$29</span>
                <span className="text-xs font-bold text-zinc-400 uppercase">USD / month</span>
              </div>
              <button onClick={goToBuilder} className="relative z-10 w-full py-3 bg-[#1A1A1A] text-white rounded-xl text-sm font-bold hover:bg-black transition-all">
                Upgrade to Pro
              </button>
              <ul className="relative z-10 space-y-4 pt-4 border-t border-zinc-100">
                {['10 active projects', 'AI app generator (advanced logic)', 'Custom domain support'].map(f => (
                  <li key={f} className="flex items-center gap-3 text-xs font-bold text-zinc-600">
                    <Check className="w-3.5 h-3.5 text-red-400" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Team Plan */}
          <div className="bg-white border border-white/40 rounded-[32px] p-8 space-y-8 flex flex-col">
            <div className="space-y-2">
              <h4 className="text-xl font-bold">Team Plan</h4>
              <p className="text-sm text-zinc-500 font-medium">Growing teams & startups that need collaboration and scalability.</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black">$79</span>
              <span className="text-xs font-bold text-zinc-400 uppercase">USD / month</span>
            </div>
            <button onClick={goToBuilder} className="w-full py-3 bg-zinc-100 rounded-xl text-sm font-bold text-zinc-600 hover:bg-zinc-200 transition-colors">
              Start Team Plan
            </button>
            <ul className="space-y-4 pt-4 border-t border-zinc-100">
              {['Unlimited projects', 'Team dashboard & role permissions', 'Database editor & visual schema'].map(f => (
                <li key={f} className="flex items-center gap-3 text-xs font-bold text-zinc-600">
                  <Check className="w-3.5 h-3.5 text-zinc-400" /> {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Final CTA Section ────────────────────────────────────────────── */}
      <section className="relative z-10 py-32 px-6">
        <div className="max-w-6xl mx-auto bg-white/40 backdrop-blur-3xl border border-white/40 rounded-[64px] p-12 md:p-24 text-center relative overflow-hidden group">
          {/* Combined Visual Elements in Background */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/20 blur-3xl" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-64 h-64 bg-red-500/20 blur-3xl" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative z-10 space-y-8"
          >
            <h2 className="text-5xl md:text-8xl font-black tracking-tight leading-tight">
              So, what are you<br />building?
            </h2>
            <p className="text-zinc-600 text-lg md:text-xl font-medium max-w-2xl mx-auto">
              V0 is the AI-powered platform that lets you build fully functioning apps in minutes using nothing but natural language.
            </p>
            <button onClick={goToBuilder} className="bg-[#1A1A1A] text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-black transition-all shadow-xl">
              Start building
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 py-20 px-10 max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-12 border-t border-black/5 mt-20">
        <div className="flex items-center gap-2">
          {/* Custom Logo V0-like */}
          <div className="w-8 h-8 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 2L2 26H30L16 2Z" fill="black"/>
              <path d="M18 10L24 20" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-8 text-sm font-medium text-zinc-600">
          {['Templates', 'Enterprise', 'Pricing', 'iOS', 'Students', 'FAQ'].map(l => (
            <a key={l} href="#" className="hover:text-black transition-colors">{l}</a>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button onClick={goToDashboard} className="text-sm font-medium text-zinc-600 hover:text-black px-4 py-2 transition-colors">
            Sign In
          </button>
          <button onClick={goToBuilder} className="bg-red-200 text-red-700 text-sm font-bold px-6 py-2 rounded-lg hover:bg-red-300 transition-all">
            Sign Up
          </button>
        </div>
      </footer>
    </div>
  );
}
