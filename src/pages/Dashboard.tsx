import { useNavigate } from 'react-router-dom';
import { useProjects } from '../lib/useProjects';
import {
  Plus,
  MessageSquare,
  FolderKanban,
  Settings,
  Sparkles,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../lib/useAuth';
import { AIChatInput } from '../components/AIChatInput';

/**
 * Dashboard vierge - Design system Huggy harmonisé
 * Parcours: Dashboard → Builder (prompt) → Projet créé → Dashboard (listé)
 */
export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { projects } = useProjects(user?.id);

  const [prompt, setPrompt] = useState('');

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
      <div className="min-h-screen bg-huggy-dark flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-huggy-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-huggy-dark text-zinc-100 font-sans flex selection:bg-huggy-blue/30">
      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside className="w-[280px] shrink-0 bg-[#0a0a0b] border-r border-zinc-800/50 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-zinc-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-huggy-blue flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <span className="text-[15px] font-semibold text-zinc-100">Huggy</span>
          </div>
        </div>

        {/* Navigation principale */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {/* Nouveau projet */}
          <button
            onClick={() => navigate('/builder')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-all"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            <span>Nouveau projet</span>
          </button>

          {/* Divider */}
          <div className="my-3 border-t border-zinc-800/50" />

          {/* Section: Projets récents */}
          <div className="px-3 mb-2">
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Projets récents</span>
          </div>

          {projects.length === 0 ? (
            <div className="px-3 py-4">
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 text-center">
                <FolderKanban className="w-6 h-6 text-zinc-600 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-[12px] text-zinc-500">Aucun projet encore</p>
                <p className="text-[11px] text-zinc-600 mt-1">Créez votre première idée ci-dessous</p>
              </div>
            </div>
          ) : (
            <div className="space-y-0.5">
              {projects.slice(0, 6).map((project) => (
                <button
                  key={project.id}
                  onClick={() => navigate(`/builder?project=${project.id}`)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-all text-left"
                >
                  <MessageSquare className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                  <span className="truncate">{project.name || 'Projet sans nom'}</span>
                </button>
              ))}
              {projects.length > 6 && (
                <button className="w-full text-left px-3 py-2 text-[12px] text-zinc-500 hover:text-zinc-400 transition-colors">
                  + {projects.length - 6} autres projets
                </button>
              )}
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-800/50">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-all">
            <Settings className="w-4 h-4" strokeWidth={1.5} />
            <span>Paramètres</span>
          </button>
        </div>
      </aside>

      {/* ── Main Area ──────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-h-screen relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-huggy-dark via-[#0d0d0f] to-huggy-dark pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-huggy-blue/5 rounded-full blur-[120px] pointer-events-none" />

        {/* Content */}
        <div className="relative flex-1 flex flex-col items-center justify-center px-6">
          {/* Hero text */}
          <div className="text-center mb-8">
            <h1 className="text-[32px] font-semibold text-zinc-100 mb-3">
              Que souhaitez-vous créer?
            </h1>
            <p className="text-[14px] text-zinc-500 max-w-md mx-auto">
              Décrivez votre idée en quelques mots. Huggy génère une application complète automatiquement.
            </p>
          </div>

          {/* AI Chat Input - synchronized with LandingPage and Builder */}
          <div className="w-full max-w-[680px]">
            <AIChatInput
              value={prompt}
              onChange={setPrompt}
              onSubmit={handleSubmit}
              placeholder="Ex: Un tableau de bord de ventes avec graphiques, un blog avec authentification..."
              submitLabel="Créer"
              showModelSelector={false}
            />

            {/* Suggestions */}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {['Site e-commerce', 'Dashboard analytics', 'App de réservation', 'Blog avec CMS', 'Portfolio 3D'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setPrompt(suggestion)}
                  className="px-3 py-1.5 rounded-full text-[12px] text-zinc-500 bg-zinc-900/50 border border-zinc-800 hover:text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer hint */}
        <div className="relative h-12 flex items-center justify-center border-t border-zinc-800/30">
          <p className="text-[11px] text-zinc-600">
            Appuyez sur Entrée pour créer · Shift+Entrée pour nouvelle ligne
          </p>
        </div>
      </main>
    </div>
  );
}
