import { useNavigate } from 'react-router-dom';
import { useProjects } from '../lib/useProjects';
import {
  Plus,
  Search,
  Puzzle,
  Clock,
  FolderOpen,
  Settings,
  Mic,
  ArrowUp,
  ChevronDown,
  Shield,
  Box,
  SlidersHorizontal,
  SquarePen,
  PanelRightClose,
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

import { useAuth } from '../lib/useAuth';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { projects } = useProjects(user?.id);

  const [prompt, setPrompt] = useState('');
  const [activeProject] = useState<string>('New project');
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [prompt]);

  const handleSubmit = () => {
    if (!prompt.trim()) return;
    navigate('/builder', { state: { initialPrompt: prompt } });
  };

  // Sample recent chats (will be replaced by real projects once schema supports it)
  const recentChats = projects.slice(0, 5).map(p => ({
    id: p.id,
    title: p.name || 'Sans titre',
    age: getRelativeAge(p.created_at),
  }));

  // Fallback sample data when no projects
  const displayChats = recentChats.length > 0 ? recentChats : [
    { id: '1', title: 'bonjour', age: '22 h' },
    { id: '2', title: 'Trouver composant chat streaming', age: '2 j' },
    { id: '3', title: "Capturer l'interface globale", age: '2 j' },
    { id: '4', title: 'Trouver alternatives OpenRouter', age: '2 j' },
    { id: '5', title: 'Proposer idées innovantes', age: '2 j' },
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0e0e10] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0e0e10] text-zinc-200 font-sans flex">
      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside className="w-[260px] shrink-0 bg-[#0a0a0b] border-r border-zinc-900 flex flex-col h-screen">
        {/* Top nav */}
        <div className="px-3 pt-3 pb-2 space-y-0.5">
          <button
            onClick={() => navigate('/builder')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-zinc-300 hover:bg-zinc-800/50 transition-colors"
          >
            <SquarePen className="w-4 h-4" strokeWidth={1.75} />
            <span>Nouveau clavardage</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-zinc-300 hover:bg-zinc-800/50 transition-colors">
            <Search className="w-4 h-4" strokeWidth={1.75} />
            <span>Recherche</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-zinc-300 hover:bg-zinc-800/50 transition-colors">
            <Puzzle className="w-4 h-4" strokeWidth={1.75} />
            <span>Modules d'extension</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-zinc-300 hover:bg-zinc-800/50 transition-colors">
            <Clock className="w-4 h-4" strokeWidth={1.75} />
            <span>Automatisations</span>
          </button>
        </div>

        {/* Projets section */}
        <div className="mt-3 px-3 flex-1 overflow-y-auto">
          <div className="px-3 mb-1">
            <span className="text-[11px] text-zinc-500 font-normal">Projets</span>
          </div>
          <button
            onClick={() => setProjectsExpanded(!projectsExpanded)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-zinc-300 hover:bg-zinc-800/50 transition-colors"
          >
            <FolderOpen className="w-4 h-4" strokeWidth={1.75} />
            <span>New project</span>
          </button>
          {projectsExpanded && (
            <div className="mt-0.5 space-y-0.5">
              {displayChats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => navigate(`/builder?project=${chat.id}`)}
                  className="w-full flex items-center justify-between gap-2 pl-10 pr-3 py-1.5 rounded-lg text-[13px] text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 transition-colors group"
                >
                  <span className="truncate">{chat.title}</span>
                  <span className="text-[11px] text-zinc-600 shrink-0">{chat.age}</span>
                </button>
              ))}
              <button className="w-full flex items-center pl-10 pr-3 py-1.5 rounded-lg text-[13px] text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300 transition-colors">
                Afficher plus
              </button>
            </div>
          )}

          {/* Clavardages section */}
          <div className="mt-6 px-3 mb-1 flex items-center justify-between">
            <span className="text-[11px] text-zinc-500 font-normal">Clavardages</span>
            <div className="flex items-center gap-1">
              <button className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors">
                <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
              <button className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors">
                <SquarePen className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            </div>
          </div>
          <div className="px-3 py-2 text-[12px] text-zinc-600">Aucun clavardage</div>
        </div>

        {/* Bottom: Settings + Upgrade */}
        <div className="border-t border-zinc-900 p-3 flex items-center justify-between gap-2">
          <button className="flex items-center gap-2 px-2 py-1.5 text-[13px] text-zinc-400 hover:text-zinc-200 transition-colors">
            <Settings className="w-4 h-4" strokeWidth={1.75} />
            <span>Paramètres</span>
          </button>
          <button className="px-3 py-1.5 text-[12px] text-zinc-300 bg-zinc-800/80 hover:bg-zinc-700 rounded-md border border-zinc-700/50 transition-colors">
            Mettre à niveau
          </button>
        </div>
      </aside>

      {/* ── Main Area ──────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-12 flex items-center justify-between px-4 shrink-0">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-600/20 border border-purple-500/30 text-purple-300 text-[12px] hover:bg-purple-600/30 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            <span>Obtenir Plus</span>
          </button>
          <button className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors" title="Fermer le panneau">
            <PanelRightClose className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </header>

        {/* Center content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-12">
          <h1 className="text-[28px] font-normal text-zinc-200 mb-10 text-center">
            Que devrions-nous créer dans <span className="text-zinc-200">{activeProject}</span>?
          </h1>

          {/* Input card */}
          <div className="w-full max-w-[720px] bg-[#1a1a1c] border border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
            {/* Textarea */}
            <div className="px-5 pt-4 pb-2">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Demandez n'importe quoi à Codex, @ pour utiliser des plugins ou mentionner des fichiers"
                rows={1}
                className="w-full bg-transparent border-0 outline-none resize-none text-[14px] text-zinc-200 placeholder-zinc-500 leading-relaxed"
                style={{ minHeight: '24px' }}
              />
            </div>

            {/* Row 1: permissions + model */}
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-1">
                <button
                  title="Ajouter"
                  className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
                >
                  <Plus className="w-4 h-4" strokeWidth={1.75} />
                </button>
                <button className="flex items-center gap-1.5 px-2 py-1 text-[12px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors">
                  <Shield className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Autorisations par défaut</span>
                  <ChevronDown className="w-3 h-3" strokeWidth={2} />
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button className="flex items-center gap-1 px-2 py-1 text-[12px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors">
                  <span>5.5</span>
                  <span className="text-zinc-500">Moyen</span>
                  <ChevronDown className="w-3 h-3" strokeWidth={2} />
                </button>
                <button className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors">
                  <Mic className="w-4 h-4" strokeWidth={1.75} />
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!prompt.trim()}
                  className={`p-1.5 rounded-md transition-colors ${
                    prompt.trim()
                      ? 'bg-white text-zinc-900 hover:bg-zinc-200'
                      : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  <ArrowUp className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: project + environment + fallback */}
          <div className="w-full max-w-[720px] mt-3 flex items-center gap-2 px-1">
            <button className="flex items-center gap-1.5 px-2.5 py-1 text-[12px] text-zinc-400 hover:text-zinc-200 rounded-md transition-colors">
              <Box className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>{activeProject}</span>
              <ChevronDown className="w-3 h-3" strokeWidth={2} />
            </button>
            <button className="flex items-center gap-1.5 px-2.5 py-1 text-[12px] text-zinc-400 hover:text-zinc-200 rounded-md transition-colors">
              <span>Aucun environnement</span>
              <ChevronDown className="w-3 h-3" strokeWidth={2} />
            </button>
            <button className="flex items-center gap-1.5 px-2.5 py-1 text-[12px] text-zinc-400 hover:text-zinc-200 rounded-md transition-colors">
              <span>Aucun</span>
              <ChevronDown className="w-3 h-3" strokeWidth={2} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────
function getRelativeAge(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'maintenant';
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} j`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} sem`;
  const months = Math.floor(days / 30);
  return `${months} mo`;
}
