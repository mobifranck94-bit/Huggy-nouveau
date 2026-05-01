import { useNavigate } from 'react-router-dom';
import { useProjects } from '../lib/useProjects';
import { 
  Plus, Layout, Zap, LogOut, Clock, Star, 
  Code2, Globe, Heart, ChevronRight, Search, 
  Settings, User, Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect } from 'react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { projects, loading: projectsLoading, fetchProjects } = useProjects();

  // Mock data for free access mode
  const user = { email: 'guest@huggy.app' };
  const profile = { full_name: 'Guest User', credits: 100 };

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleSignOut = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans selection:bg-indigo-500 selection:text-white">
      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 border-r border-white/5 bg-[#050505] hidden lg:flex flex-col p-6">
        <div className="flex items-center gap-2 mb-12 px-2">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Heart className="w-4.5 h-4.5 text-white fill-white" />
          </div>
          <span className="text-xl font-display font-bold tracking-tight text-white">lovable.ai</span>
        </div>

        <nav className="space-y-1 mb-12">
          {[
            { label: 'All Projects', icon: Layout, active: true },
            { label: 'Marketplace', icon: Globe },
            { label: 'Academy', icon: Code2 },
            { label: 'Community', icon: Sparkles },
          ].map((item, i) => (
            <button 
              key={i}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${item.active ? 'bg-white/5 text-white' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
            >
              <item.icon className={`w-4 h-4 ${item.active ? 'text-indigo-400' : ''}`} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto space-y-4">
          <div className="bg-[#111] border border-white/5 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Credits</span>
              <span className="text-[10px] font-bold text-indigo-400">Upgrade</span>
            </div>
            <div className="text-xl font-display font-black text-white mb-2">{profile.credits}</div>
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500" style={{ width: '100%' }} />
            </div>
          </div>

          <button 
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-zinc-500 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="lg:pl-64 min-h-screen">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-[#050505]/50 backdrop-blur-xl sticky top-0 z-20">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="w-full relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" />
              <input 
                type="text" 
                placeholder="Search projects..." 
                className="w-full bg-white/5 border border-white/5 rounded-full py-2 pl-10 pr-4 text-sm outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-zinc-500 hover:text-white transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shadow-lg shadow-indigo-500/20">
              GU
            </div>
          </div>
        </header>

        <div className="p-8 md:p-12 max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight mb-2">Projects</h1>
              <p className="text-sm text-zinc-500">Manage and iterate on your AI creations.</p>
            </div>
            <button 
              onClick={() => navigate('/builder')}
              className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold text-sm rounded-xl hover:bg-zinc-200 transition-all active:scale-95 shadow-xl shadow-white/5"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          </div>

          {projectsLoading ? (
            <div className="flex items-center justify-center py-32">
              <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-32 bg-[#080808] border border-white/5 rounded-[32px] text-center px-4"
            >
              <div className="w-16 h-16 bg-white/5 rounded-[24px] flex items-center justify-center mb-6">
                <Layout className="w-8 h-8 text-zinc-600" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No projects yet</h3>
              <p className="text-zinc-500 text-sm max-w-sm mb-8">Start your first project by describing what you want to build. Lovable will do the rest.</p>
              <button 
                onClick={() => navigate('/builder')}
                className="px-8 py-3 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-500 transition-colors"
              >
                Start Building
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {projects.map((project, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={project.id} 
                  onClick={() => navigate(`/builder?project=${project.id}`)}
                  className="group bg-[#080808] border border-white/5 rounded-[24px] p-6 hover:border-white/10 hover:bg-[#0c0c0c] cursor-pointer transition-all overflow-hidden relative"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-5 h-5 text-zinc-600" />
                  </div>
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-500/10 transition-colors">
                    <Globe className="w-5 h-5 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">{project.name}</h3>
                  <p className="text-sm text-zinc-500 line-clamp-2 mb-6 h-10 font-medium">{project.description || 'No description provided.'}</p>
                  <div className="flex items-center justify-between text-[11px] font-bold text-zinc-600 uppercase tracking-widest pt-4 border-t border-white/5">
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {new Date(project.created_at).toLocaleDateString()}</span>
                    <span className="px-2 py-0.5 bg-white/5 rounded text-zinc-400">Draft</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
