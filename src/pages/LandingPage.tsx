import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowUp, Paperclip, Globe, ShoppingCart, 
  BookOpen, Layout, User, Menu, Heart, Check, 
  Github, Zap, MessageSquare, Rocket, Database,
  Plus, Mic, ChevronDown
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
  const goToBuilder = (customPrompt?: string) => {
    const finalPrompt = typeof customPrompt === 'string' ? customPrompt : prompt;
    navigate('/builder', { state: { initialPrompt: finalPrompt } });
  };

  return (
    <div className="min-h-screen bg-white text-huggy-dark font-sans selection:bg-huggy-blue/20 overflow-x-hidden">
      
      {/* ── Background Elements ───────────────────────────────────────────── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] aspect-square bg-huggy-blue/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] aspect-square bg-huggy-cyan/5 blur-[120px] rounded-full" />
      </div>

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-10 py-6 max-w-[1400px] mx-auto">
        <div className="w-32 h-10 relative cursor-pointer" onClick={() => navigate('/')}>
          <img src="/assets/huggy-logo-text.png" alt="Huggy" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180px] md:w-[220px] max-w-none" />
        </div>

        <div className="hidden md:flex items-center gap-8 text-[13px] font-bold text-zinc-400">
          {['Templates', 'Enterprise', 'Pricing', 'iOS', 'Students', 'FAQ'].map(l => (
            <a key={l} href="#" className="hover:text-huggy-blue transition-colors uppercase tracking-widest">{l}</a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={goToDashboard} className="text-sm font-bold text-zinc-400 hover:text-huggy-blue px-4 py-2 transition-colors uppercase tracking-widest">
            Log in
          </button>
          <button onClick={goToBuilder} className="huggy-button px-6 py-2.5 shadow-lg shadow-huggy-blue/20 text-sm">
            Sign Up
          </button>
        </div>
      </nav>

      {/* ── Hero Section ──────────────────────────────────────────────────── */}
      <main className="relative z-10 pt-20 pb-20 px-6 flex flex-col items-center">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center"
        >
          <h1 className="text-4xl md:text-6xl font-display font-black tracking-tight mb-4 text-huggy-dark leading-[1.1]">
            What do you<br />want to create?
          </h1>
          <p className="text-base md:text-lg text-zinc-500 font-medium mb-10 max-w-2xl mx-auto">
            Start building with a single prompt. No coding needed.<br />
            <span className="text-huggy-blue flex items-center justify-center gap-2 mt-2">
              Friendly AI magic at your service 
            </span>
          </p>
        </motion.div>

        {/* Prompt Input Box */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="w-full max-w-3xl relative"
        >
          <div className="bg-white border-2 border-huggy-blue/10 rounded-[40px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.05)] focus-within:border-huggy-blue focus-within:shadow-[0_20px_50px_rgba(37,99,235,0.1)] transition-all">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask Huggy to create an app..."
              className="w-full bg-transparent border-none outline-none text-lg md:text-xl text-huggy-dark placeholder:text-zinc-300 resize-none min-h-[100px] font-medium"
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && goToBuilder()}
            />
            
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 px-4 py-2 bg-zinc-50 border border-zinc-100 rounded-full text-xs font-bold text-zinc-400 hover:bg-zinc-100 transition-colors uppercase tracking-widest">
                  <Paperclip className="w-3.5 h-3.5" />
                  Attach
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-zinc-50 border border-zinc-100 rounded-full text-xs font-bold text-zinc-400 hover:bg-zinc-100 transition-colors uppercase tracking-widest">
                  <Globe className="w-3.5 h-3.5" />
                  Online
                </button>
              </div>
              <button 
                onClick={() => goToBuilder()}
                className="w-12 h-12 bg-huggy-blue hover:bg-huggy-blue-light text-white rounded-full flex items-center justify-center transition-all shadow-lg shadow-huggy-blue/30 active:scale-90"
              >
                <ArrowUp className="w-6 h-6" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Suggestions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap justify-center gap-3 mt-10"
        >
          {[
            { label: 'E-commerce website', icon: ShoppingCart },
            { label: 'Personal blog', icon: BookOpen },
            { label: 'Landing page', icon: Layout },
            { label: 'Portfolio site', icon: User },
          ].map((s, i) => (
            <button 
              key={i}
              onClick={() => goToBuilder(s.label)}
              className="flex items-center gap-3 px-5 py-2.5 bg-white border border-huggy-blue/5 rounded-full text-[11px] font-bold text-zinc-400 hover:text-huggy-blue hover:border-huggy-blue/20 hover:shadow-xl transition-all active:scale-95 uppercase tracking-widest"
            >
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
          ))}
        </motion.div>
      </main>

      {/* ── Features Section ──────────────────────────────────────────────── */}
      <section className="relative z-10 py-32 px-6 max-w-6xl mx-auto space-y-12">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-display font-black text-huggy-dark tracking-tight mb-4">
            Consider yourself<br />limitless
          </h2>
          <div className="w-24 h-1.5 bg-huggy-blue rounded-full mx-auto" />
        </div>

        {/* Feature 1: Speed of thought */}
        <div className="bg-white border border-huggy-blue/5 rounded-[56px] p-10 md:p-20 flex flex-col md:flex-row items-center gap-16 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.03)] hover:shadow-[0_32px_64px_-16px_rgba(37,99,235,0.08)] transition-all group">
          <div className="flex-1 space-y-8 text-center md:text-left">
            <div className="w-16 h-16 bg-huggy-blue/10 rounded-2xl flex items-center justify-center">
              <Zap className="w-8 h-8 text-huggy-blue fill-huggy-blue" />
            </div>
            <h3 className="text-3xl md:text-5xl font-display font-black leading-[1.1] text-huggy-dark">
              Create at the<br />speed of thought
            </h3>
            <p className="text-zinc-500 text-lg leading-relaxed font-medium">
              Tell Huggy your idea, and watch it transform into a working app—complete with all the necessary components.
            </p>
            <button onClick={goToBuilder} className="huggy-button px-10 py-4 text-lg">
              Start building
            </button>
          </div>
          <div className="flex-1 relative aspect-square w-full max-w-md flex items-center justify-center">
            <div className="absolute inset-0 bg-huggy-blue/5 blur-[100px] rounded-full group-hover:bg-huggy-blue/10 transition-colors" />
            <div className="relative z-10 w-full h-full bg-white/50 backdrop-blur-xl border border-white rounded-[48px] p-6 shadow-2xl flex flex-col gap-6 scale-95 group-hover:scale-100 transition-transform duration-700">
               <div className="w-full aspect-video bg-huggy-blue/5 rounded-[32px] overflow-hidden">
                 <img src="/assets/huggy-mascot.png" className="w-full h-full object-cover opacity-20" />
               </div>
               <div className="space-y-4">
                 <div className="h-4 w-2/3 bg-huggy-blue/10 rounded-full" />
                 <div className="h-4 w-full bg-zinc-50 rounded-full" />
                 <div className="h-4 w-1/2 bg-zinc-50 rounded-full" />
               </div>
               <div className="mt-auto h-14 bg-huggy-blue/10 rounded-[20px]" />
            </div>
          </div>
        </div>

        {/* Feature 2: Backend */}
        <div className="bg-white border border-huggy-blue/5 rounded-[56px] p-10 md:p-20 flex flex-col md:flex-row-reverse items-center gap-16 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.03)] hover:shadow-[0_32px_64px_-16px_rgba(37,99,235,0.08)] transition-all group">
          <div className="flex-1 space-y-8 text-center md:text-left">
             <div className="w-16 h-16 bg-huggy-cyan/10 rounded-2xl flex items-center justify-center">
              <Database className="w-8 h-8 text-huggy-cyan fill-huggy-cyan" />
            </div>
            <h3 className="text-3xl md:text-5xl font-display font-black leading-[1.1] text-huggy-dark">
              The backend's built-<br />in automatically
            </h3>
            <p className="text-zinc-500 text-lg leading-relaxed font-medium">
              Everything your app needs to function—sign-in, data storage—is taken care of behind the scenes.
            </p>
            <button onClick={goToBuilder} className="huggy-button px-10 py-4 text-lg">
              Start building
            </button>
          </div>
          <div className="flex-1 relative aspect-square w-full max-w-md flex items-center justify-center">
            <div className="absolute inset-0 bg-huggy-cyan/5 blur-[100px] rounded-full group-hover:bg-huggy-cyan/10 transition-colors" />
            <div className="bg-white rounded-[48px] border border-zinc-100 p-10 shadow-2xl space-y-8 w-full scale-95 group-hover:scale-100 transition-transform duration-700">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-huggy-blue rounded-2xl flex items-center justify-center shadow-lg shadow-huggy-blue/20 overflow-hidden">
                  <img src="/assets/huggy-mascot.png" className="w-full h-full object-cover" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-24 bg-huggy-dark rounded-full" />
                  <div className="h-2 w-16 bg-zinc-200 rounded-full" />
                </div>
              </div>
              <div className="space-y-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="w-3 h-3 text-green-600" />
                    </div>
                    <div className="h-2 w-full bg-zinc-50 rounded-full" />
                  </div>
                ))}
              </div>
              <div className="h-14 huggy-gradient text-white text-sm font-bold rounded-[20px] flex items-center justify-center shadow-lg shadow-huggy-blue/20">
                Launch app
              </div>
            </div>
          </div>
        </div>

        {/* Feature 3: Ready to use */}
        <div className="bg-white border border-huggy-blue/5 rounded-[56px] p-10 md:p-20 flex flex-col md:flex-row items-center gap-16 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.03)] hover:shadow-[0_32px_64px_-16px_rgba(37,99,235,0.08)] transition-all group">
          <div className="flex-1 space-y-8 text-center md:text-left">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center">
              <Rocket className="w-8 h-8 text-purple-500 fill-purple-500" />
            </div>
            <h3 className="text-3xl md:text-5xl font-display font-black leading-[1.1] text-huggy-dark">
              Ready to use,<br />instantly
            </h3>
            <p className="text-zinc-500 text-lg leading-relaxed font-medium">
              Huggy includes built-in hosting, so when your app is ready the only thing left is publish, share and grow.
            </p>
            <button onClick={goToBuilder} className="huggy-button px-10 py-4 text-lg">
              Start building
            </button>
          </div>
          <div className="flex-1 relative aspect-square w-full max-w-md flex items-center justify-center">
            <div className="absolute inset-0 bg-purple-100/30 blur-[100px] rounded-full group-hover:bg-purple-100/50 transition-colors" />
            <div className="relative z-10 w-full bg-white rounded-[48px] border border-zinc-100 p-8 shadow-2xl flex flex-col gap-8 scale-95 group-hover:scale-100 transition-transform duration-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Ready to deploy</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 h-40">
                <div className="bg-zinc-50 rounded-[24px]" />
                <div className="huggy-gradient rounded-[24px] flex items-center justify-center">
                  
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing Section ──────────────────────────────────────────────── */}
      <section className="relative z-10 py-32 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-5xl md:text-7xl font-display font-black text-huggy-dark tracking-tight mb-6">
            Pricing plans for<br />every need
          </h2>
          <div className="w-24 h-1.5 bg-huggy-blue rounded-full mx-auto" />
        </div>

        <div className="flex justify-center mb-20">
          <div className="bg-zinc-100 p-1.5 rounded-full flex gap-1 shadow-inner">
            <button className="px-8 py-3 bg-white rounded-full text-xs font-bold shadow-sm text-huggy-dark uppercase tracking-widest">Monthly</button>
            <button className="px-8 py-3 text-xs font-bold text-zinc-400 hover:text-huggy-dark transition-colors uppercase tracking-widest">Yearly</button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Free Plan */}
          <div className="bg-white border border-huggy-blue/5 rounded-[48px] p-10 space-y-10 flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] transition-all">
            <div className="space-y-4">
              <h4 className="text-2xl font-display font-black text-huggy-dark uppercase tracking-tight">Free</h4>
              <p className="text-sm text-zinc-500 font-medium leading-relaxed">Individuals testing ideas or learning Huggy.</p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-display font-black text-huggy-dark">$0</span>
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">/ month</span>
            </div>
            <button onClick={goToBuilder} className="w-full py-4 bg-zinc-50 text-zinc-500 hover:bg-zinc-100 rounded-2xl text-sm font-bold transition-all uppercase tracking-widest">
              Join Free
            </button>
            <ul className="space-y-5 pt-8 border-t border-zinc-50">
              {['2 active projects', 'Built-in hosting', 'Basic AI Magic'].map(f => (
                <li key={f} className="flex items-center gap-4 text-xs font-bold text-zinc-500">
                  <div className="w-5 h-5 rounded-full bg-zinc-50 flex items-center justify-center">
                    <Check className="w-3 h-3 text-zinc-400" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro Plan */}
          <div className="relative group">
            <div className="absolute inset-0 huggy-gradient blur-[40px] opacity-10 group-hover:opacity-20 transition-opacity rounded-[50px]" />
            <div className="relative h-full bg-white border-2 border-huggy-blue/20 rounded-[48px] p-10 space-y-10 flex flex-col shadow-2xl">
              <div className="absolute top-0 right-10 -translate-y-1/2 bg-huggy-blue text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-xl">Best Value</div>
              <div className="space-y-4">
                <h4 className="text-2xl font-display font-black text-huggy-blue uppercase tracking-tight flex items-center gap-2">
                  Pro Plan 
                </h4>
                <p className="text-sm text-zinc-500 font-medium leading-relaxed">Freelancers, small startups & creators ready to build real products.</p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-display font-black text-huggy-dark">$29</span>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">/ month</span>
              </div>
              <button onClick={goToBuilder} className="huggy-button w-full py-4 text-sm uppercase tracking-widest">
                Upgrade to Pro
              </button>
              <ul className="space-y-5 pt-8 border-t border-zinc-50">
                {['10 active projects', 'Advanced AI Logic', 'Custom Domain Support'].map(f => (
                  <li key={f} className="flex items-center gap-4 text-xs font-bold text-zinc-500">
                    <div className="w-5 h-5 rounded-full bg-huggy-blue/10 flex items-center justify-center">
                      <Check className="w-3 h-3 text-huggy-blue" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Team Plan */}
          <div className="bg-white border border-huggy-blue/5 rounded-[48px] p-10 space-y-10 flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] transition-all">
            <div className="space-y-4">
              <h4 className="text-2xl font-display font-black text-huggy-dark uppercase tracking-tight">Team</h4>
              <p className="text-sm text-zinc-500 font-medium leading-relaxed">Growing teams & startups that need collaboration and scalability.</p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-display font-black text-huggy-dark">$79</span>
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">/ month</span>
            </div>
            <button onClick={goToBuilder} className="w-full py-4 bg-zinc-50 text-zinc-500 hover:bg-zinc-100 rounded-2xl text-sm font-bold transition-all uppercase tracking-widest">
              Start Team Plan
            </button>
            <ul className="space-y-5 pt-8 border-t border-zinc-50">
              {['Unlimited projects', 'Team Permissions', 'Visual Database'].map(f => (
                <li key={f} className="flex items-center gap-4 text-xs font-bold text-zinc-500">
                  <div className="w-5 h-5 rounded-full bg-zinc-50 flex items-center justify-center">
                    <Check className="w-3 h-3 text-zinc-400" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Final CTA Section ────────────────────────────────────────────── */}
      <section className="relative z-10 py-32 px-6 bg-[#0a0a0b] overflow-hidden mt-20">
        {/* Glow Effects */}
        <div className="absolute bottom-0 left-0 right-0 h-[500px] bg-gradient-to-t from-blue-600/40 via-purple-600/10 to-transparent pointer-events-none" />
        <div className="absolute bottom-[-30%] left-1/2 -translate-x-1/2 w-[100%] max-w-4xl aspect-[2/1] bg-blue-500/30 blur-[120px] rounded-[100%] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
          <p className="text-zinc-400 font-medium text-sm md:text-base">AI App Builder</p>
          <h2 className="text-5xl md:text-7xl font-display font-black tracking-tight text-white mb-10">
            Ready to build?
          </h2>

          <div className="relative group mx-auto w-full max-w-2xl text-left">
            <div className="bg-[#1c1c1e] border border-zinc-800 rounded-3xl p-3 shadow-2xl focus-within:border-zinc-700 transition-colors flex flex-col min-h-[140px]">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask Huggy to create a blog about..."
                className="w-full bg-transparent border-none outline-none text-base md:text-lg text-zinc-200 placeholder:text-zinc-500 resize-none flex-1 font-medium px-2 py-2"
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && goToBuilder()}
              />
              <div className="flex items-center justify-between mt-auto pt-2 px-2">
                <button className="w-8 h-8 rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-1.5 text-[13px] font-medium text-blue-500 hover:text-blue-400 transition-colors">
                    Plan <ChevronDown className="w-3 h-3" />
                  </button>
                  <button className="text-zinc-500 hover:text-zinc-300 transition-colors">
                    <Mic className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => goToBuilder()}
                    className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-500 transition-colors"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 py-20 px-6 md:px-10 max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-12 border-t border-zinc-50 mt-20">
        <div className="w-32 h-10 relative cursor-pointer" onClick={() => navigate('/')}>
          <img src="/assets/huggy-logo-text.png" alt="Huggy" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180px] md:w-[220px] max-w-none" />
        </div>

        <div className="flex flex-wrap justify-center items-center gap-8 text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em]">
          {['Templates', 'Enterprise', 'Pricing', 'iOS', 'Students', 'FAQ'].map(l => (
            <a key={l} href="#" className="hover:text-huggy-blue transition-colors">{l}</a>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button onClick={goToDashboard} className="text-xs font-black text-zinc-400 hover:text-huggy-dark px-4 py-2 transition-colors uppercase tracking-[0.1em]">
            Log In
          </button>
          <button onClick={goToBuilder} className="px-8 py-3 bg-huggy-dark text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95">
            Sign Up
          </button>
        </div>
      </footer>
      
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
