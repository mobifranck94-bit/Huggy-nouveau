import { useNavigate } from 'react-router-dom';
import { useProjects } from '../lib/useProjects';
import { 
  Plus, Layout, Zap, LogOut, Clock, Star, 
  Code2, Globe, Heart, ChevronRight, Search, 
  Settings, User, Users
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect } from 'react';

export default function Dashboard() {
  const navigate = useNavigate();
  
  // Mock data for free access mode
  const user = { email: 'guest@huggy.app', id: '00000000-0000-0000-0000-000000000000' };
  const profile = { full_name: 'Guest User', credits: 100 };

  const { projects, loading: projectsLoading, fetchProjects } = useProjects(user.id);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleSignOut = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-huggy-dark font-sans selection:bg-huggy-blue/20">
      
      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 border-r border-zinc-100 bg-white hidden lg:flex flex-col p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-10 px-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 bg-huggy-blue rounded-xl flex items-center justify-center shadow-lg shadow-huggy-blue/20 overflow-hidden">
             <img src="/assets/huggy-mascot.png" className="w-full h-full object-cover" />
          </div>
          <span className="text-xl font-display font-bold tracking-tight text-huggy-dark">Huggy</span>
        </div>

        <nav className="space-y-1 mb-10">
          {[
            { label: 'All Projects', icon: Layout, active: true },
            { label: 'Marketplace', icon: Globe },
            { label: 'Academy', icon: Code2 },
            { label: 'Community', icon: Users },
          ].map((item, i) => (
            <button 
              key={i}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[13px] font-bold transition-all uppercase tracking-widest ${item.active ? 'bg-huggy-blue/5 text-huggy-blue' : 'text-zinc-400 hover:text-huggy-blue hover:bg-zinc-50'}`}
            >
              <item.icon className={`w-4.5 h-4.5 ${item.active ? 'text-huggy-blue' : ''}`} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto space-y-4">
          <div className="bg-zinc-50 border border-zinc-100 rounded-[24px] p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Credits</span>
              <span className="text-[10px] font-black text-huggy-blue uppercase tracking-widest cursor-pointer hover:underline">Upgrade</span>
            </div>
            <div className="text-2xl font-display font-black text-huggy-dark mb-2">{profile.credits}</div>
            <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
              <div className="h-full bg-huggy-blue" style={{ width: '100%' }} />
            </div>
          </div>

          <button 
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2 text-[11px] font-black text-zinc-400 hover:text-red-500 transition-colors uppercase tracking-[0.2em]"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="lg:pl-64 min-h-screen">
        <header className="h-20 border-b border-zinc-100 flex items-center justify-between px-8 bg-white/80 backdrop-blur-xl sticky top-0 z-20">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="w-full relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-huggy-blue transition-colors" />
              <input 
                type="text" 
                placeholder="Search your creations..." 
                className="w-full bg-zinc-50 border border-zinc-100 rounded-full py-3 pl-12 pr-6 text-sm outline-none focus:border-huggy-blue/50 focus:bg-white transition-all font-medium"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2.5 text-zinc-400 hover:text-huggy-dark transition-colors bg-zinc-50 rounded-xl hover:bg-zinc-100">
              <Settings className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-full bg-huggy-blue flex items-center justify-center text-[11px] font-black text-white shadow-lg shadow-huggy-blue/20">
              GU
            </div>
          </div>
        </header>

        <div className="p-8 md:p-12 max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h1 className="text-4xl font-display font-black text-huggy-dark tracking-tight mb-2 flex items-center gap-3">
                Projects 
              </h1>
              <p className="text-sm text-zinc-500 font-medium tracking-wide">Manage and iterate on your AI creations.</p>
            </div>
            <button 
              onClick={() => navigate('/builder')}
              className="huggy-button px-8 py-4 text-sm flex items-center gap-2 shadow-xl shadow-huggy-blue/10"
            >
              <Plus className="w-4.5 h-4.5" />
              New Project
            </button>
          </div>

          {projectsLoading ? (
            <div className="flex items-center justify-center py-32">
              <div className="w-12 h-12 border-4 border-huggy-blue border-t-transparent rounded-full animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-32 bg-white border border-zinc-100 rounded-[48px] text-center px-6 shadow-sm"
            >
              <div className="w-24 h-24 bg-huggy-blue/5 rounded-[32px] flex items-center justify-center mb-8">
                <img src="/assets/huggy-mascot.png" className="w-16 h-16 animate-floating" />
              </div>
              <h3 className="text-2xl font-display font-black text-huggy-dark mb-3">No projects yet</h3>
              <p className="text-zinc-400 text-sm max-w-sm mb-10 font-medium leading-relaxed uppercase tracking-widest">Describe your idea to Huggy and watch the magic happen.</p>
              <button 
                onClick={() => navigate('/builder')}
                className="huggy-button px-10 py-4"
              >
                Start Building
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {projects.map((project, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={project.id} 
                  onClick={() => navigate(`/builder?project=${project.id}`)}
                  className="group huggy-card p-8 hover:border-huggy-blue/20 hover:shadow-2xl hover:-translate-y-1 cursor-pointer transition-all overflow-hidden relative"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-6 h-6 text-huggy-blue" />
                  </div>
                  <div className="w-14 h-14 bg-huggy-blue/5 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-huggy-blue/10 transition-colors">
                    <Globe className="w-7 h-7 text-huggy-blue" />
                  </div>
                  <h3 className="text-xl font-display font-black text-huggy-dark mb-3 group-hover:text-huggy-blue transition-colors uppercase tracking-tight">{project.name}</h3>
                  <p className="text-sm text-zinc-400 line-clamp-2 mb-8 h-10 font-medium leading-relaxed">{project.description || 'No description provided.'}</p>
                  <div className="flex items-center justify-between text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] pt-6 border-t border-zinc-50">
                    <span className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> {new Date(project.created_at).toLocaleDateString()}</span>
                    <span className="px-3 py-1 bg-zinc-50 rounded-full text-zinc-500">Draft</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
      
      <style>{`
        @keyframes floating {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-floating {
          animation: floating 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
