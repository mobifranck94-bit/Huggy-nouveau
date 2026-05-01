import { useNavigate } from 'react-router-dom';
import { useProjects } from '../lib/useProjects';
import { Plus, Layout, Zap, LogOut, Clock, Star, Code2, Globe } from 'lucide-react';
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
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-200 font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <header className="flex items-center justify-between pb-6 border-b border-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Code2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Welcome back, {profile?.full_name || user?.email?.split('@')[0]}</h1>
              <p className="text-sm text-zinc-500">Here's what's happening with your apps today.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-zinc-900/50 rounded-xl border border-zinc-800/80">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium">{profile?.credits || 0} credits</span>
            </div>
            <button 
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Your Projects</h2>
              <button 
                onClick={() => navigate('/builder')}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black font-bold text-sm rounded-xl hover:bg-zinc-200 transition-colors shadow-lg"
              >
                <Plus className="w-4 h-4" />
                New Project
              </button>
            </div>

            {projectsLoading ? (
              <div className="flex items-center justify-center py-24 bg-zinc-900/20 rounded-3xl border border-zinc-800/50">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 bg-zinc-900/20 rounded-3xl border border-zinc-800/50 text-center px-4">
                <Layout className="w-12 h-12 text-zinc-700 mb-4" />
                <h3 className="text-lg font-bold text-zinc-300 mb-2">No projects yet</h3>
                <p className="text-zinc-500 text-sm max-w-sm mb-6">Create your first Huggy application by describing what you want to build using plain language.</p>
                <button 
                  onClick={() => navigate('/builder')}
                  className="px-6 py-3 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20"
                >
                  Start Building
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map((project, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    key={project.id} 
                    onClick={() => navigate(`/builder?project=${project.id}`)}
                    className="group relative bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-5 hover:bg-zinc-800/60 hover:border-zinc-700 cursor-pointer transition-all overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <Globe className="w-4 h-4 text-zinc-400" />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-zinc-200 mb-2 group-hover:text-blue-400 transition-colors">{project.name}</h3>
                    <p className="text-sm text-zinc-500 line-clamp-2 mb-4 h-10">{project.description || 'No description provided.'}</p>
                    <div className="flex items-center justify-between text-xs font-medium text-zinc-600">
                      <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {new Date(project.created_at).toLocaleDateString()}</span>
                      <span className="px-2 py-1 bg-zinc-800 rounded-md text-zinc-400">v1.0</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar Area */}
          <div className="space-y-6">
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <Star className="w-24 h-24 text-amber-500" />
              </div>
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-6 relative z-10">Your Plan</h3>
              <div className="relative z-10">
                <div className="text-3xl font-black text-white mb-2">Free Plan</div>
                <p className="text-sm text-zinc-500 mb-6">You are using the basic Huggy features. Upgrade to unlock full multi-agent power.</p>
                
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Credits used</span>
                    <span className="font-medium text-white">{100 - (profile?.credits || 0)} / 100</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500" style={{ width: `${Math.min(100, Math.max(0, ((100 - (profile?.credits || 0)) / 100) * 100))}%` }} />
                  </div>
                </div>

                <button className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/20">
                  Upgrade to Pro
                </button>
              </div>
            </div>

            <div className="bg-zinc-900/20 border border-zinc-800/50 rounded-3xl p-6">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Resources</h3>
              <div className="space-y-2">
                {['Documentation', 'Community Discord', 'Video Tutorials', 'Release Notes'].map(link => (
                  <a key={link} href="#" className="block px-4 py-3 rounded-xl hover:bg-zinc-800/50 text-sm text-zinc-300 transition-colors">
                    {link}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
