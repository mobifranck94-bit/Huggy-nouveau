import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart, Check, X, ArrowUp, Github,
  Zap, Globe2, Code2, Database, Shield, Cpu,
  ChevronRight, Star, Users, BarChart3,
  Search, ClipboardCheck, MessageSquare, Rocket,
  ExternalLink, ArrowRight, Menu, Play, Sparkles
} from 'lucide-react';

const SUGGESTIONS = ['E-commerce SaaS', 'AI Portfolio', 'Blog with CMS', 'Mobile App API', 'Marketing Page'];

const TEMPLATES = [
  { title: 'Personal Website', category: 'Portfolio', img: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&q=80&w=400' },
  { title: 'SaaS Dashboard', category: 'Business', img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=400' },
  { title: 'E-commerce Store', category: 'Shop', img: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&q=80&w=400' },
  { title: 'AI Chat App', category: 'Technology', img: 'https://images.unsplash.com/photo-1531746790731-6c087fecd05a?auto=format&fit=crop&q=80&w=400' },
  { title: 'Marketing Landing', category: 'Creative', img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=400' },
  { title: 'Blog Platform', category: 'Writing', img: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=400' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
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
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      
      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Heart className="w-4.5 h-4.5 text-white fill-white" />
              </div>
              <span className="text-xl font-display font-bold tracking-tight text-white">lovable.ai</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8 text-[13px] font-medium text-zinc-400">
              {['Sections', 'Resources', 'Community', 'Pricing', 'Vite edit'].map(l => (
                <a key={l} href={`#${l.toLowerCase()}`} className="hover:text-white transition-colors">{l}</a>
              ))}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <button onClick={goToDashboard} className="text-[13px] font-medium text-zinc-400 hover:text-white transition-colors">
              Log in
            </button>
            <button onClick={goToBuilder} className="px-5 py-2 bg-white text-black text-[13px] font-bold rounded-lg hover:bg-zinc-200 transition-all active:scale-95">
              Get started
            </button>
          </div>

          <button className="md:hidden p-2 text-zinc-400" onClick={() => setMobileMenu(!mobileMenu)}>
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* ── Hero Section ──────────────────────────────────────────────────── */}
      <section className="relative pt-40 pb-32 px-6 overflow-hidden">
        {/* Background Mesh Gradient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140%] aspect-square bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-purple-900/10 to-transparent -translate-y-1/2 blur-[120px] pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100%] h-[800px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[11px] font-bold text-indigo-400 mb-8">
              <Sparkles className="w-3 h-3" />
              Try the lovable web app
            </div>
            <h1 className="text-6xl md:text-8xl font-display font-black text-white leading-[1.05] tracking-tight mb-6">
              Build something Lovable
            </h1>
            <p className="text-lg md:text-xl text-zinc-400 font-medium max-w-2xl mx-auto mb-12">
              Create apps and websites by chatting with AI
            </p>

            {/* Prompt Box */}
            <div className="max-w-2xl mx-auto bg-[#1A1A1A] border border-white/10 rounded-2xl p-2 shadow-2xl flex items-center gap-2 focus-within:border-indigo-500/50 transition-all">
              <div className="flex-1 px-4">
                <input 
                  type="text" 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ask Lovable to create a landing page"
                  className="w-full bg-transparent border-none outline-none text-white text-sm placeholder:text-zinc-500 py-3"
                  onKeyDown={(e) => e.key === 'Enter' && goToBuilder()}
                />
              </div>
              <button 
                onClick={goToBuilder}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all group"
              >
                <span className="text-sm font-bold">Run</span>
                <div className="w-5 h-5 bg-black/20 rounded flex items-center justify-center">
                  <ArrowUp className="w-3 h-3" />
                </div>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Trust Section ─────────────────────────────────────────────────── */}
      <section className="py-20 border-t border-white/5 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-10">Trusted by the world's best build and teams</p>
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8 opacity-40 grayscale transition-all hover:grayscale-0 hover:opacity-100">
            {['Microsoft', 'ElevenLabs', 'HubSpot', 'Vercel', 'Zendesk', 'Uber'].map(logo => (
              <span key={logo} className="text-xl font-display font-black text-white tracking-tighter">{logo}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Meet Lovable Section ──────────────────────────────────────────── */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-display font-black text-white mb-20">Meet Lovable</h2>
          
          <div className="grid md:grid-cols-2 gap-20 items-center">
            <div className="relative aspect-square bg-[#111] rounded-[48px] overflow-hidden border border-white/5 flex items-center justify-center">
              <div className="w-2/3 h-2/3 bg-gradient-to-t from-orange-500/40 via-purple-500/20 to-transparent rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-1/2 bg-gradient-to-t from-indigo-500/40 to-transparent rounded-t-full" />
              {/* Semi-circle visual */}
              <div className="absolute bottom-20 w-64 h-32 bg-gradient-to-r from-orange-400 to-indigo-400 rounded-t-full opacity-60" />
            </div>

            <div className="space-y-16">
              {[
                { title: 'Start with an Idea', desc: 'Describe the app or website you want to create or drop in screenshots and docs.' },
                { title: 'Watch it come to life', desc: 'See your vision transform into a working prototype in real time as AI builds it for you.' },
                { title: 'Refine and ship', desc: 'Iterate on your creation with simple feedback and deploy it to the world with one click.' },
              ].map((item, i) => (
                <div key={i} className="group cursor-default">
                  <h3 className="text-3xl font-display font-black text-white group-hover:text-indigo-400 transition-colors mb-4">{item.title}</h3>
                  <p className="text-zinc-400 text-lg leading-relaxed max-w-md">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Templates Section ─────────────────────────────────────────────── */}
      <section className="py-32 bg-[#080808] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-end mb-16">
            <div>
              <h2 className="text-4xl md:text-5xl font-display font-black text-white mb-4">Discover templates</h2>
              <p className="text-zinc-500 font-medium">Start your next project with a template</p>
            </div>
            <button className="text-sm font-bold text-zinc-400 hover:text-white transition-colors underline underline-offset-4">View all</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TEMPLATES.map((t, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -5 }}
                className="group cursor-pointer"
              >
                <div className="aspect-[4/3] bg-[#111] rounded-2xl overflow-hidden border border-white/5 mb-4 relative">
                  <img src={t.img} alt={t.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-500 scale-105 group-hover:scale-100" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">{t.title}</h4>
                <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mt-1">{t.category}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats Section ─────────────────────────────────────────────────── */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-display font-black text-white mb-4">Lovable in numbers</h2>
          <p className="text-zinc-500 font-medium mb-16">Millions of builders are already turning ideas into reality</p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { val: '36M+', label: 'projects built on Lovable' },
              { val: '200K+', label: 'projects built per day on Lovable' },
              { val: '300M', label: 'visits per day to Lovable & its applications' },
            ].map((s, i) => (
              <div key={i} className="bg-[#111] border border-white/5 rounded-3xl p-10 flex flex-col justify-between h-64 hover:border-white/10 transition-colors">
                <div className="text-6xl font-display font-black text-white">{s.val}</div>
                <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ───────────────────────────────────────────────────── */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_bottom,_var(--tw-gradient-stops))] from-indigo-900/30 via-transparent to-transparent blur-3xl pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400 mb-6">AI App Builder</p>
          <h2 className="text-5xl md:text-7xl font-display font-black text-white leading-tight mb-12">Ready to build?</h2>
          
          <div className="max-w-2xl mx-auto bg-[#1A1A1A] border border-white/10 rounded-2xl p-2 shadow-2xl flex items-center gap-2 focus-within:border-indigo-500/50 transition-all">
            <div className="flex-1 px-4">
              <input 
                type="text" 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask Lovable to create a landing page"
                className="w-full bg-transparent border-none outline-none text-white text-sm placeholder:text-zinc-500 py-3"
              />
            </div>
            <button 
              onClick={goToBuilder}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all group"
            >
              <span className="text-sm font-bold">Run</span>
              <div className="w-5 h-5 bg-black/20 rounded flex items-center justify-center">
                <ArrowUp className="w-3 h-3" />
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="py-20 bg-[#050505] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-12 mb-20">
            <div className="col-span-2 md:col-span-1 space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded flex items-center justify-center text-white">
                  <Heart className="w-3.5 h-3.5 fill-white" />
                </div>
                <span className="text-lg font-display font-bold text-white tracking-tight">lovable.ai</span>
              </div>
            </div>
            
            {[
              { title: 'Company', links: ['About', 'Press & Media', 'Community', 'Security', 'User Terms', 'Partnerships'] },
              { title: 'Product', links: ['Pricing', 'Student discount', 'Enteprise', 'Product Roadmap', 'Academy', 'Extension', 'SaaS', 'App', 'Report', 'Changelog', 'Marketplace', 'Templates', 'Credits'] },
              { title: 'Resources', links: ['Login', 'The mirror', 'Careers', 'Community hub', 'Merch', 'Blog', 'Support', 'Features', 'FAQs', 'Affiliate'] },
              { title: 'Legal', links: ['Privacy policy', 'Do not sell or share my personal information', 'Cookie settings', 'Cookie policy', 'Terms of service', 'General terms', 'DPA', 'Credits policy', 'Legal Notice', 'Open source/3rd party licenses', 'DPA'] },
            ].map((col, i) => (
              <div key={i} className="space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-white">{col.title}</h4>
                <div className="flex flex-col gap-2.5 text-xs font-medium text-zinc-500">
                  {col.links.map(l => (
                    <a key={l} href="#" className="hover:text-white transition-colors">{l}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-12 border-t border-white/5 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
            <div className="flex gap-8">
              <span>© {new Date().getFullYear()} Lovable</span>
            </div>
            <div className="flex items-center gap-4">
              <Github className="w-4 h-4" />
              <span>X</span>
              <span>Discord</span>
              <span>YouTube</span>
              <span>LinkedIn</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
