import { useNavigate } from 'react-router-dom';
import { useProjects } from '../lib/useProjects';
import {
  Plus,
  MessageSquare,
  FolderKanban,
  Settings,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../lib/useAuth';
import { AIChatInput, Theme } from '../components/AIChatInput';

/**
 * Dashboard vierge - Design system Huggy harmonisé avec support light/dark
 * Parcours: Dashboard → Builder (prompt) → Projet créé → Dashboard (listé)
 */
export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { projects } = useProjects(user?.id);

  const [prompt, setPrompt] = useState('');
  const [theme, setTheme] = useState<Theme>('dark');

  // Load theme from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('huggy-theme') as Theme | null;
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      setTheme('light');
    }
  }, []);

  // Save theme to localStorage
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('huggy-theme', newTheme);
  };

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = () => {
    if (!prompt.trim()) return;
    navigate('/builder', { state: { initialPrompt: prompt } });
  };

  if (authLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-[#0a0a0b]' : 'bg-gray-50'}`}>
        <div className="w-10 h-10 border-4 border-huggy-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  // Theme-based styles
  const isDark = theme === 'dark';
  const styles = {
    container: isDark ? 'bg-[#0a0a0b] text-zinc-100' : 'bg-white text-gray-900',
    sidebar: isDark ? 'bg-[#0a0a0b] border-zinc-800/50' : 'bg-gray-50 border-gray-200',
    sidebarText: isDark ? 'text-zinc-100' : 'text-gray-900',
    navItem: isDark
      ? 'text-zinc-300 hover:text-white hover:bg-zinc-800/60'
      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60',
    emptyBox: isDark
      ? 'bg-zinc-900/50 border-zinc-800/50 text-zinc-500'
      : 'bg-gray-100 border-gray-200 text-gray-500',
    mainBg: isDark
      ? 'bg-gradient-to-br from-[#0a0a0b] via-[#0d0d0f] to-[#0a0a0b]'
      : 'bg-gradient-to-br from-white via-gray-50 to-white',
    heroTitle: isDark ? 'text-zinc-100' : 'text-gray-900',
    heroSubtitle: isDark ? 'text-zinc-500' : 'text-gray-500',
    suggestion: isDark
      ? 'text-zinc-500 bg-zinc-900/50 border-zinc-800 hover:text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/50'
      : 'text-gray-600 bg-gray-100 border-gray-200 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-200',
    footer: isDark ? 'border-zinc-800/30 text-zinc-600' : 'border-gray-200 text-gray-400',
    divider: isDark ? 'border-zinc-800/50' : 'border-gray-200',
  };

  return (
    <div className={`min-h-screen font-sans flex selection:bg-huggy-blue/30 ${styles.container}`}>
      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside className={`w-[280px] shrink-0 border-r flex flex-col ${styles.sidebar}`}>
        {/* Logo */}
        <div className={`h-16 flex items-center px-5 border-b ${styles.divider}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-huggy-blue flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <span className={`text-[15px] font-semibold ${styles.sidebarText}`}>Huggy</span>
          </div>
        </div>

        {/* Navigation principale */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {/* Nouveau projet */}
          <button
            onClick={() => navigate('/builder')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${styles.navItem}`}
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            <span>Nouveau projet</span>
          </button>

          {/* Divider */}
          <div className={`my-3 border-t ${styles.divider}`} />

          {/* Section: Projets récents */}
          <div className="px-3 mb-2">
            <span className={`text-[11px] font-medium uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Projets récents</span>
          </div>

          {projects.length === 0 ? (
            <div className="px-3 py-4">
              <div className={`p-4 rounded-xl border text-center ${styles.emptyBox}`}>
                <FolderKanban className={`w-6 h-6 mx-auto mb-2 ${isDark ? 'text-zinc-600' : 'text-gray-400'}`} strokeWidth={1.5} />
                <p className="text-[12px]">Aucun projet encore</p>
                <p className={`text-[11px] mt-1 ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>Créez votre première idée ci-dessous</p>
              </div>
            </div>
          ) : (
            <div className="space-y-0.5">
              {projects.slice(0, 6).map((project) => (
                <button
                  key={project.id}
                  onClick={() => navigate(`/builder?project=${project.id}`)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] transition-all text-left ${styles.navItem}`}
                >
                  <MessageSquare className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                  <span className="truncate">{project.name || 'Projet sans nom'}</span>
                </button>
              ))}
              {projects.length > 6 && (
                <button className={`w-full text-left px-3 py-2 text-[12px] transition-colors ${isDark ? 'text-zinc-500 hover:text-zinc-400' : 'text-gray-400 hover:text-gray-600'}`}>
                  + {projects.length - 6} autres projets
                </button>
              )}
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className={`p-3 border-t ${styles.divider}`}>
          <div className="flex items-center gap-2">
            <button className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] transition-all ${styles.navItem}`}>
              <Settings className="w-4 h-4" strokeWidth={1.5} />
              <span>Paramètres</span>
            </button>
            {/* Simple Theme Toggle - Just Icon */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition-all ${styles.navItem}`}
              title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Area ──────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-h-screen relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className={`absolute inset-0 pointer-events-none ${styles.mainBg}`} />
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-[120px] pointer-events-none ${isDark ? 'bg-huggy-blue/5' : 'bg-blue-500/5'}`} />

        {/* Content */}
        <div className="relative flex-1 flex flex-col items-center justify-center px-6">
          {/* Hero text */}
          <div className="text-center mb-8">
            <h1 className={`text-[32px] font-semibold mb-3 ${styles.heroTitle}`}>
              Que souhaitez-vous créer?
            </h1>
            <p className={`text-[14px] max-w-md mx-auto ${styles.heroSubtitle}`}>
              Décrivez votre idée en quelques mots. Huggy génère une application complète automatiquement.
            </p>
          </div>

          {/* AI Chat Input - synchronized with LandingPage and Builder */}
          <div className="w-full max-w-[680px] -mt-8">
            <AIChatInput
              value={prompt}
              onChange={setPrompt}
              onSubmit={handleSubmit}
              placeholder="Ex: Un tableau de bord de ventes avec graphiques, un blog avec authentification..."
              submitLabel="Créer"
              showModelSelector={false}
              theme={theme}
              className="min-h-[140px]"
            />

            {/* Suggestions */}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {['Site e-commerce', 'Dashboard analytics', 'App de réservation', 'Blog avec CMS', 'Portfolio 3D'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setPrompt(suggestion)}
                  className={`px-3 py-1.5 rounded-full text-[12px] transition-all ${styles.suggestion}`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer hint */}
        <div className={`relative h-12 flex items-center justify-center border-t ${styles.footer}`}>
          <p className="text-[11px]">
            Appuyez sur Entrée pour créer · Shift+Entrée pour nouvelle ligne
          </p>
        </div>
      </main>
    </div>
  );
}
