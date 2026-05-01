import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart, Check, X, ArrowUp, Github,
  Zap, Globe2, Code2, Database, Shield, Cpu,
  ChevronRight, Star, Users, BarChart3,
  Search, ClipboardCheck, MessageSquare, Rocket,
  ExternalLink, ArrowRight, Menu
} from 'lucide-react';

const SUGGESTIONS = ['E-commerce SaaS', 'AI Portfolio', 'Blog with CMS', 'Mobile App API', 'Marketing Page'];

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
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans overflow-x-hidden selection:bg-black selection:text-white">
      
      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <Heart className="w-4.5 h-4.5 text-white fill-white" />
              </div>
              <span className="text-xl font-display font-bold tracking-tight">talentify.ai</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8 text-[13px] font-medium text-zinc-500">
              {['About', 'Process', 'Agents', 'Pricing'].map(l => (
                <a key={l} href={`#${l.toLowerCase()}`} className="hover:text-black transition-colors">{l}</a>
              ))}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <button onClick={goToDashboard} className="text-[13px] font-medium text-zinc-600 hover:text-black transition-colors">
              Log in
            </button>
            <button onClick={goToBuilder} className="px-5 py-2.5 bg-black text-white text-[13px] font-bold rounded-full hover:bg-zinc-800 transition-all active:scale-95 shadow-sm">
              Start building
            </button>
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileMenu(!mobileMenu)}>
            <Menu className="w-6 h-6 text-black" />
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenu && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }}
              className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-black/5 p-6 flex flex-col gap-4 shadow-xl"
            >
              {['About', 'Process', 'Agents', 'Pricing'].map(l => (
                <a key={l} href={`#${l.toLowerCase()}`} onClick={() => setMobileMenu(false)} className="text-sm font-medium text-zinc-600">{l}</a>
              ))}
              <div className="pt-4 flex flex-col gap-3">
                <button onClick={goToDashboard} className="w-full py-3 text-sm font-medium border border-black/10 rounded-full text-center">Log in</button>
                <button onClick={goToBuilder} className="w-full py-3 text-sm font-bold bg-black text-white rounded-full text-center">Start building</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Hero Section ──────────────────────────────────────────────────── */}
      <section className="pt-40 pb-20 px-6 max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/5 rounded-full text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-8">
            <Zap className="w-3 h-3 text-black" />
            AI-Powered Development
          </div>
          <h1 className="text-5xl md:text-8xl font-display font-black text-black leading-[1.05] tracking-tight mb-8">
            Build your vision<br />at the speed of light.
          </h1>
          <p className="text-lg md:text-xl text-zinc-500 font-medium max-w-2xl mx-auto mb-12 leading-relaxed">
            Connect with our elite multi-agent pipeline to explore full-stack capabilities suited to your specific product goals.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <button onClick={goToBuilder} className="w-full md:w-auto px-8 py-4 bg-black text-white font-bold rounded-full hover:bg-zinc-800 transition-all active:scale-95 shadow-lg shadow-black/10">
              Start a new project
            </button>
            <button onClick={goToDashboard} className="w-full md:w-auto px-8 py-4 bg-white border border-black/10 text-black font-bold rounded-full hover:bg-zinc-50 transition-all active:scale-95">
              Hire AI Agents
            </button>
          </div>
        </motion.div>

        {/* Hero Illustration / Mockup */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mt-24 relative"
        >
          <div className="bg-white rounded-3xl border border-black/5 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden aspect-[16/9] md:aspect-[21/9]">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-white to-pink-50/50" />
            <div className="relative h-full flex flex-col p-8 text-left">
              <div className="flex items-center gap-2 mb-6">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 bg-red-400 rounded-full" />
                  <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full" />
                  <div className="w-2.5 h-2.5 bg-green-400 rounded-full" />
                </div>
                <div className="h-4 w-40 bg-black/5 rounded-full ml-4" />
              </div>
              <div className="flex-1 grid grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div className="h-24 bg-black/5 rounded-2xl animate-pulse" />
                  <div className="h-4 w-2/3 bg-black/5 rounded-full" />
                  <div className="h-4 w-full bg-black/5 rounded-full" />
                </div>
                <div className="col-span-2 bg-black/5 rounded-2xl p-6">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 bg-black/10 rounded-full" />
                    <div className="space-y-2">
                      <div className="h-3 w-32 bg-black/10 rounded-full" />
                      <div className="h-2 w-24 bg-black/5 rounded-full" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    {[80, 60, 90, 70].map((w, i) => (
                      <div key={i} className="h-2 bg-black/5 rounded-full" style={{ width: `${w}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────────── */}
      <section className="py-20 bg-white border-y border-black/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12">
            {[
              { name: 'Jon Bell', role: 'CTO @ Code Solutions', text: 'The multi-agent pipeline understood my technical goals and helped me secure a robust deployment.', score: '9/10', sub: 'Satisfaction' },
              { name: 'Eniola Bakare', role: 'Founder @ Abstract', text: 'From start to finish, the recruitment of agents for my build was super simple. Highly recommend!', score: '10/10', sub: 'Project Success' },
              { name: 'Sarah Maplas', role: 'Lead Designer @ Creative', text: 'Thanks to the Coder Agent, I found the perfect technical implementation that matches my vision.', score: '8/10', sub: 'Code Quality' },
              { name: 'Tim Chen', role: 'Senior Architect', text: 'Huggy helped me land a working prototype in just a few weeks. The DBA Agent is top tier.', score: '9/10', sub: 'Data Integrity' },
            ].map((t, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="space-y-4"
              >
                <div className="text-3xl font-display font-black text-black leading-none">{t.score}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-4">{t.sub}</div>
                <p className="text-sm text-zinc-500 leading-relaxed italic">"{t.text}"</p>
                <div>
                  <div className="text-sm font-bold text-black">{t.name}</div>
                  <div className="text-[11px] font-medium text-zinc-400">{t.role}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Process Section ───────────────────────────────────────────────── */}
      <section id="process" className="py-32 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-20 items-start">
          <div className="sticky top-32">
            <div className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">Process</div>
            <h2 className="text-4xl md:text-6xl font-display font-black text-black leading-tight mb-8">
              Discover opportunities<br />and build with ease.
            </h2>
            <p className="text-zinc-500 text-lg mb-8 leading-relaxed">
              Explore our streamlined multi-agent process to transform your ideas into production-ready applications.
            </p>
            <button onClick={goToBuilder} className="flex items-center gap-2 text-sm font-bold text-black hover:gap-3 transition-all">
              View building steps <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-12">
            {[
              { step: '01', title: 'Define your vision.', desc: 'Share your idea through a simple prompt. Our PM Agent will analyze your requirements and structure the build plan.' },
              { step: '02', title: 'Assemble the squad.', desc: 'Select your specialized AI agents—from DBA to QA—to handle every layer of your stack with expert precision.' },
              { step: '03', title: 'Watch the build.', desc: 'Monitor the real-time streaming pipeline as agents collaborate, write code, and audit security in sync.' },
              { step: '04', title: 'Launch dream app.', desc: 'After final review, secure your production build and deploy to top companies with one click.' },
            ].map((s, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group p-8 bg-white rounded-3xl border border-black/5 hover:border-black/10 hover:shadow-xl hover:shadow-black/5 transition-all"
              >
                <div className="text-xs font-black text-zinc-300 group-hover:text-black transition-colors mb-4 uppercase tracking-widest">Step {s.step}</div>
                <h3 className="text-2xl font-display font-black text-black mb-3">{s.title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Agents Section (Recruiters) ────────────────────────────────────── */}
      <section id="agents" className="py-32 bg-white border-y border-black/5 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <div className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">Experts</div>
            <h2 className="text-4xl md:text-6xl font-display font-black text-black leading-tight">
              Securing technical excellence.
            </h2>
            <p className="text-zinc-500 mt-6 max-w-xl mx-auto leading-relaxed">
              We know finding the right code is challenging, which is why we employ only highly skilled AI agents on our platform.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: 'DBA Architect', role: 'Database Design', exp: '8y', tasks: '1.2k+', sat: '98%', color: 'bg-amber-500' },
              { name: 'Coder Agent', role: 'Logic & UI', exp: '10y', tasks: '4.5k+', sat: '99%', color: 'bg-blue-500' },
              { name: 'QA Reviewer', role: 'Testing & Quality', exp: '7y', tasks: '2.1k+', sat: '96%', color: 'bg-green-500' },
            ].map((a, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-[#F8F9FA] rounded-[32px] p-8 border border-black/5 group hover:border-black/10 transition-all"
              >
                <div className="flex justify-between items-start mb-12">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-display font-black text-black">{a.name}</h3>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide">{a.role}</p>
                  </div>
                  <div className={`w-10 h-10 ${a.color} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <Cpu className="w-5 h-5 text-white" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-10">
                  <div>
                    <div className="text-xl font-display font-black text-black leading-none mb-1">{a.exp}</div>
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Experience</div>
                  </div>
                  <div>
                    <div className="text-xl font-display font-black text-black leading-none mb-1">{a.tasks}</div>
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Builds</div>
                  </div>
                  <div>
                    <div className="text-xl font-display font-black text-black leading-none mb-1">{a.sat}</div>
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Rating</div>
                  </div>
                </div>

                <button onClick={goToBuilder} className="w-full py-4 bg-white border border-black/5 rounded-2xl text-[13px] font-bold text-black hover:bg-black hover:text-white transition-all">
                  View capabilities
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Roles (Projects) ───────────────────────────────────────── */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-20">
            <div className="max-w-xl">
              <div className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">Showcase</div>
              <h2 className="text-4xl md:text-6xl font-display font-black text-black leading-tight">
                Find your next role<br />for your product.
              </h2>
            </div>
            <p className="text-zinc-500 text-lg max-w-sm mb-2 leading-relaxed">
              Browse, build and land your dream remote application.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              { company: 'Code Solutions', title: 'Head of Development', type: 'Full-time', date: 'Nov 26, 2024' },
              { company: 'ABC Studios', title: 'UI/UX Designer', type: 'Full-time', date: 'Dec 20, 2024' },
            ].map((j, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.98 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="bg-white p-8 rounded-[32px] border border-black/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group hover:border-black/10 transition-all"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-zinc-100 rounded-lg" />
                    <span className="text-sm font-bold text-black">{j.company}</span>
                    <span className="px-2 py-0.5 bg-black text-[9px] font-black text-white rounded uppercase tracking-widest">Featured</span>
                  </div>
                  <h3 className="text-2xl font-display font-black text-black group-hover:text-blue-600 transition-colors">{j.title}</h3>
                  <div className="flex items-center gap-4 text-xs font-medium text-zinc-400">
                    <span>{j.type}</span>
                    <span>•</span>
                    <span>Posted on {j.date}</span>
                  </div>
                </div>
                <button onClick={goToBuilder} className="px-6 py-3 bg-zinc-100 rounded-2xl text-[13px] font-bold text-black hover:bg-black hover:text-white transition-all">
                  View details
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ───────────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-black rounded-[48px] p-12 md:p-24 text-center text-white relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-800 to-transparent opacity-50 group-hover:scale-110 transition-transform duration-1000" />
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative z-10"
            >
              <h2 className="text-4xl md:text-7xl font-display font-black leading-[1.1] mb-8 tracking-tight">
                Ready to build the<br />future of your agency?
              </h2>
              <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto mb-12">
                Join thousands of creators who’ve found their perfect technical stack through us.
              </p>
              <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                <button onClick={goToBuilder} className="w-full md:w-auto px-10 py-5 bg-white text-black font-bold rounded-full hover:bg-zinc-100 transition-all active:scale-95 shadow-xl">
                  Grab template & Start
                </button>
                <button onClick={goToDashboard} className="w-full md:w-auto px-10 py-5 bg-transparent border border-white/20 text-white font-bold rounded-full hover:bg-white/5 transition-all">
                  Contact Support
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="py-20 px-6 border-t border-black/5 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-20">
            <div className="col-span-2 space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-black rounded flex items-center justify-center text-white">
                  <Heart className="w-3.5 h-3.5 fill-white" />
                </div>
                <span className="text-lg font-display font-bold text-black tracking-tight">talentify.ai</span>
              </div>
              <p className="text-zinc-500 text-sm max-w-xs leading-relaxed font-medium">
                The perfect platform for tech agencies specializing in Remote AI development. Built for speed and quality.
              </p>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-black">Product</h4>
              <div className="flex flex-col gap-2 text-sm font-medium text-zinc-500">
                <a href="#" className="hover:text-black transition-colors">About</a>
                <a href="#" className="hover:text-black transition-colors">Roles</a>
                <a href="#" className="hover:text-black transition-colors">Hiring</a>
                <a href="#" className="hover:text-black transition-colors">Pricing</a>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-black">Social</h4>
              <div className="flex flex-col gap-2 text-sm font-medium text-zinc-500">
                <a href="#" className="hover:text-black transition-colors flex items-center gap-2">X (Twitter) <ExternalLink className="w-3 h-3" /></a>
                <a href="#" className="hover:text-black transition-colors flex items-center gap-2">Instagram <ExternalLink className="w-3 h-3" /></a>
                <a href="#" className="hover:text-black transition-colors flex items-center gap-2">LinkedIn <ExternalLink className="w-3 h-3" /></a>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-12 border-t border-black/5 text-[11px] font-bold uppercase tracking-widest text-zinc-400">
            <div className="flex gap-8">
              <span>© {new Date().getFullYear()} Talentify</span>
              <a href="#" className="hover:text-black transition-colors">Terms of service</a>
              <a href="#" className="hover:text-black transition-colors">Privacy policy</a>
            </div>
            <div className="flex items-center gap-2">
              <span>Built by</span>
              <a href="https://browser.supply" className="text-black hover:underline underline-offset-4">browser.supply</a>
              <span className="text-zinc-200">|</span>
              <span>Powered by Huggy Engine</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
