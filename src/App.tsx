import { useState, useRef, useEffect, useCallback } from 'react';
import { useTyping } from './hooks/useTyping';

type Theme = 'dark' | 'light';
import {
  Heart,
  Home,
  ChevronDown, 
  Clock, 
  PanelLeft, 
  Globe, 
  FileText, 
  Cloud, 
  Github, 
  Plus, 
  Target, 
  Mic, 
  ArrowUp, 
  Zap,
  Monitor,
  Smartphone,
  MonitorSmartphone,
  Tablet,
  Layout,
  FileCode,
  Hash,
  FileJson,
  ChevronRight,
  FolderOpen,
  Search,
  ClipboardList,
  Database,
  Code2,
  ShieldCheck,
  Shield,
  Eye,
  Globe2,
  CheckCircle2,
  Loader2,
  CreditCard,
  User,
  Settings,
  LogOut,
  ExternalLink,
  Coins,
  Share2,
  Brain,
  Activity,
  BarChart3,
  Users,
  ArrowRight,
  History,
  Sun,
  Moon,
  Wand2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import { startBuildPipeline, checkServerHealth } from './lib/api';
import { VisualBuilder } from './components/visual';
import { VibeCodingOverlay } from './components/VibeCodingOverlay';
import { useAuth } from './lib/useAuth';
import { useProjects } from './lib/useProjects';
import { supabase, type Build } from './lib/supabase';
import LandingPage from './pages/LandingPage';
import OnboardingTour from './components/OnboardingTour';
import FeedbackWidget from './components/FeedbackWidget';
import { useAnalytics, usePageTracking, useSessionTracking } from './lib/useAnalytics';
import { useNavigate, useLocation } from 'react-router-dom';

// ─── Streaming Chat Types ─────────────────────────────────────────────────────
type AgentStatus = 'idle' | 'active' | 'completed' | 'skipped';

interface AgentInfo {
  name: string;
  status: AgentStatus;
  description: string;
}

interface FileEntry {
  path: string;
  content: string;
}

interface UserMessage {
  id: string;
  type: 'user';
  content: string;
  timestamp: number;
}

interface BuildMessage {
  id: string;
  type: 'build';
  timestamp: number;
  userPrompt: string;
  agents: AgentInfo[];
  thinkingLines: string[];
  reply: string;
  replyVisible: string;
  files: FileEntry[];
  filesVisible: number;
  isComplete: boolean;
  isStreaming: boolean;
  meta?: {
    securityScore?: number;
    qaScore?: number;
    complexity?: string;
  };
}

type ChatEntry = UserMessage | BuildMessage;

// ─── Agent Definitions ────────────────────────────────────────────────────────
const AGENTS_DEF = [
  { name: 'Web Research',      Icon: Globe2,        color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/30'   },
  { name: 'Product Manager',   Icon: ClipboardList, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30' },
  { name: 'DBA Architect',     Icon: Database,      color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30'  },
  { name: 'UX Designer',       Icon: Eye,           color: 'text-pink-400',   bg: 'bg-pink-500/10',   border: 'border-pink-500/30'   },
  { name: 'Coder Agent',       Icon: Code2,         color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30'   },
  { name: 'Security Auditor',  Icon: ShieldCheck,   color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30'    },
  { name: 'QA Reviewer',       Icon: CheckCircle2,  color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30'  },
  { name: 'i18n Agent',        Icon: Globe,         color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
];

export default function App() {
  const { user, profile, loading: authLoading, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { projects, currentProject, setCurrentProject, createProject, saveBuild, getBuilds } = useProjects(user?.id);

  const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState(false);
  const [isFileExplorerOpen, setIsFileExplorerOpen] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<'desktop' | 'mobile' | 'tablet'>('desktop');
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  
  const [appMode, setAppMode] = useState<'build' | 'plan'>('build');
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-6');
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'code' | 'visual' | 'analytics'>('preview');
  const [isCustomDomainModalOpen, setIsCustomDomainModalOpen] = useState(false);
  const [customDomain, setCustomDomain] = useState('');
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<{ selector: string, text: string } | null>(null);
  const [buildHistory, setBuildHistory] = useState<Build[]>([]);
  const [isPreviewOnly, setIsPreviewOnly] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);

  // Theme state - synced with LandingPage via localStorage
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('huggy-theme') as Theme | null;
      return saved || 'dark';
    }
    return 'dark';
  });

  // Sync theme class on html element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('huggy-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  // Analytics hooks
  const { trackBuild, trackDeploy } = useAnalytics();
  usePageTracking('builder');
  useSessionTracking();

  // Handle initial prompt from Landing Page
  useEffect(() => {
    const state = location.state as { initialPrompt?: string };
    if (state?.initialPrompt && !isBuilding) {
      setChatInput(state.initialPrompt);
      // On donne un petit délai pour que le state se mette à jour avant de lancer le build
      setTimeout(() => {
        const btn = document.getElementById('send-prompt-btn');
        if (btn) btn.click();
      }, 500);
      // Nettoyer le state pour éviter de relancer au refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, isBuilding, navigate]);

  // Handle shareable preview route /preview/:buildId
  useEffect(() => {
    const routePath = window.location.pathname;
    if (!routePath.startsWith('/preview/')) return;
    const buildId = routePath.split('/')[2];
    setIsPreviewOnly(true);
    (async () => {
      try {
        const { data } = await supabase.from('builds').select('*').eq('id', buildId).single();
        if (data?.files?.length) {
          setGeneratedFiles(data.files as Array<{ path: string; content: string }>);
        }
      } catch (err: any) {
        console.warn('[Preview] Failed to load build:', err?.message);
      }
    })();
  }, []);

  // Load latest build files and history when project changes
  useEffect(() => {
    if (!currentProject) return;
    (async () => {
      try {
        const builds = await getBuilds(currentProject.id);
        setBuildHistory(builds);
        if (builds.length > 0) {
          const latest = builds[0];
          if (latest.files) setGeneratedFiles(latest.files as Array<{ path: string; content: string }>);
        }
      } catch (err: any) {
        console.warn('[Projects] Failed to load builds:', err?.message);
      }
    })();
  }, [currentProject, getBuilds]);

  // Handle ?project= query param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const projectId = params.get('project');
    if (projectId && projects.length > 0) {
      const proj = projects.find(p => p.id === projectId);
      if (proj && proj.id !== currentProject?.id) {
        setCurrentProject(proj);
      }
    }
  }, [location.search, projects, currentProject, setCurrentProject]);

  const [chatInput, setChatInput] = useState(() => {
    return localStorage.getItem('huggy_chat_input') || '';
  });
  const [messages, setMessages] = useState<ChatEntry[]>(() => {
    try {
      const saved = localStorage.getItem('huggy_messages_v2');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isServerOnline, setIsServerOnline] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState<Array<{path: string, content: string}>>([]);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewBuilding, setIsPreviewBuilding] = useState(false);

  // Build preview server-side (esbuild) whenever generated files change
  useEffect(() => {
    if (generatedFiles.length === 0) { setPreviewUrl(null); return; }

    let cancelled = false;
    setIsPreviewBuilding(true);

    fetch('/api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: generatedFiles, isEditMode }),
    })
      .then(r => r.json())
      .then(({ id, error }) => {
        if (cancelled) return;
        if (error) throw new Error(error);
        setPreviewUrl(`/api/preview/${id}`);
      })
      .catch(err => {
        if (!cancelled) console.warn('[Preview] build failed:', err.message);
      })
      .finally(() => { if (!cancelled) setIsPreviewBuilding(false); });

    return () => { cancelled = true; };
  }, [generatedFiles]);

  // Auto-save chat input
  useEffect(() => {
    localStorage.setItem('huggy_chat_input', chatInput);
  }, [chatInput]);

  // Auto-save messages
  useEffect(() => {
    localStorage.setItem('huggy_messages_v2', JSON.stringify(messages));
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle textarea auto-resize
  useEffect(() => {
    if (chatInputRef.current) {
      chatInputRef.current.style.height = 'auto';
      const newHeight = Math.min(chatInputRef.current.scrollHeight, 160);
      chatInputRef.current.style.height = `${newHeight}px`;
    }
  }, [chatInput]);

  // Listen for messages from Iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'visual-edit-select') {
        setSelectedElement(e.data);
        setChatInput(`Change ce ${e.data.selector} qui contient "${e.data.text}" pour : `);
        if (chatInputRef.current) chatInputRef.current.focus();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Check server health on mount (hidden but kept for state if needed elsewhere)
  useEffect(() => {
    checkServerHealth().then(setIsServerOnline);
    const interval = setInterval(() => {
      checkServerHealth().then(setIsServerOnline);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Build Pipeline State
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [realStats, setRealStats] = useState({ visitors: 0, views: 0 });

  const fetchAnalytics = async () => {
    if (!currentProject) return;
    try {
      const { data: views } = await supabase.from('analytics').select('id', { count: 'exact' }).eq('project_id', currentProject.id).eq('event_type', 'view');
      const { data: visitors } = await supabase.from('analytics').select('id', { count: 'exact' }).eq('project_id', currentProject.id).eq('event_type', 'unique_visitor');
      setRealStats({ 
        visitors: visitors?.length || 0, 
        views: views?.length || 0 
      });
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (viewMode === 'analytics') fetchAnalytics();
  }, [viewMode, currentProject]);

  const handleDeploy = async () => {
    if (generatedFiles.length === 0) return;
    setIsDeploying(true);
    
    // Track deploy start
    trackDeploy(currentProject?.id || 'unknown', 'started', { 
      filesCount: generatedFiles.length 
    });
    
    const deployMsgId = `deploy-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: deployMsgId, type: 'build', timestamp: Date.now(),
      userPrompt: 'Déploiement',
      agents: [], thinkingLines: ['🚀 Build en cours...', '📦 Upload vers Vercel...'],
      reply: '', replyVisible: '', files: [], filesVisible: 0, isComplete: false, isStreaming: true,
    }]);
    try {
      const response = await axios.post('/api/deploy', {
        projectId: currentProject?.id,
        projectName: currentProject?.name || 'huggy-app',
        files: generatedFiles,
      });
      const url = response.data.url as string;
      setDeployUrl(url);
      
      // Track deploy success
      trackDeploy(currentProject?.id || 'unknown', 'completed', { 
        url,
        filesCount: generatedFiles.length 
      });
      
      const msg = `✅ Application déployée !\n\n🔗 **URL:** [${url}](${url})`;
      setMessages(prev => prev.map(m => {
        if (m.id !== deployMsgId || m.type !== 'build') return m;
        return { ...(m as BuildMessage), reply: msg, replyVisible: msg, isComplete: true, isStreaming: false };
      }));
    } catch (e: any) {
      const errMsg = `❌ Déploiement échoué : ${e?.response?.data?.error || e.message}`;
      
      // Track deploy failure
      trackDeploy(currentProject?.id || 'unknown', 'failed', { 
        error: e?.response?.data?.error || e.message 
      });
      
      setMessages(prev => prev.map(m => {
        if (m.id !== deployMsgId || m.type !== 'build') return m;
        return { ...(m as BuildMessage), reply: errMsg, replyVisible: errMsg, isComplete: true, isStreaming: false };
      }));
    } finally {
      setIsDeploying(false);
    }
  };


  // ─── Streaming Build Pipeline ───────────────────────────────────────────────
  const startBuild = async () => {
    if (!chatInput.trim() || isBuilding) return;

    if (profile && profile.credits <= 0) {
      const errId = `err-${Date.now()}`;
      setMessages(prev => [...prev, {
        id: errId, type: 'build', timestamp: Date.now(), userPrompt: chatInput,
        agents: [], thinkingLines: ['⚠️ Crédits insuffisants. Upgrade ton plan pour continuer.'],
        reply: '⚠️ Crédits insuffisants. Upgrade ton plan pour continuer.',
        replyVisible: '⚠️ Crédits insuffisants. Upgrade ton plan pour continuer.',
        files: [], filesVisible: 0, isComplete: true, isStreaming: false,
      }]);
      return;
    }

    const prompt = chatInput;
    const buildId = `build-${Date.now()}`;
    const userId = `user-${Date.now()}`;
    
    // Track build start
    trackBuild(currentProject?.id || 'unknown', 'started', { 
      promptLength: prompt.length,
      model: selectedModel 
    });

    // Initial agents state — all idle
    const initialAgents: AgentInfo[] = AGENTS_DEF.map(a => ({
      name: a.name, status: 'idle', description: '',
    }));

    // Push user message + empty build message
    setMessages(prev => [
      ...prev,
      { id: userId, type: 'user', content: prompt, timestamp: Date.now() },
      {
        id: buildId, type: 'build', timestamp: Date.now(), userPrompt: prompt,
        agents: initialAgents, thinkingLines: [],
        reply: '', replyVisible: '', files: [], filesVisible: 0,
        isComplete: false, isStreaming: true,
      },
    ]);

    setIsBuilding(true);
    setChatInput('');

    let projectId = currentProject?.id;
    if (!projectId) {
      try {
        const proj = await createProject(prompt.slice(0, 50), prompt);
        projectId = proj.id;
      } catch { /* continue without project */ }
    }

    try {
      await startBuildPipeline(prompt, async (event) => {


        // ── Agent progress ──────────────────────────────────────────────────
        if (event.type === 'agent') {
          setMessages(prev => prev.map(m => {
            if (m.id !== buildId || m.type !== 'build') return m;
            const bm = m as BuildMessage;
            const updatedAgents = bm.agents.map((a, i) =>
              i === event.index
                ? { ...a, status: event.status as AgentStatus, description: event.description || '' }
                : a
            );
            const newThinking = event.status === 'active' && event.description
              ? [...bm.thinkingLines, `[${event.agent}] ${event.description}`]
              : bm.thinkingLines;
            return { ...bm, agents: updatedAgents, thinkingLines: newThinking };
          }));
        }

        // ── Pipeline complete ───────────────────────────────────────────────
        if (event.type === 'complete') {
          const finalFiles: FileEntry[] = event.files || [];
          const fullReply = event.reply || '✅ Application générée avec succès.';

          // Store files for preview
              if (finalFiles.length) {
                setGeneratedFiles(finalFiles);
                setActiveFilePath(finalFiles[0].path);
              }

          // Set reply + files (hidden), mark complete
          setMessages(prev => prev.map(m => {
            if (m.id !== buildId || m.type !== 'build') return m;
            return {
              ...(m as BuildMessage),
              reply: fullReply,
              replyVisible: '',
              files: finalFiles,
              filesVisible: 0,
              isComplete: true,
              isStreaming: true,
              meta: {
                securityScore: event.meta?.securityScore,
                qaScore: event.meta?.qaScore,
                complexity: event.meta?.complexity,
              },
            };
          }));

          // Typewriter effect for reply
          let charIndex = 0;
          const CHARS_PER_TICK = 4;
          const typeInterval = setInterval(() => {
            charIndex = Math.min(charIndex + CHARS_PER_TICK, fullReply.length);
            setMessages(prev => prev.map(m => {
              if (m.id !== buildId || m.type !== 'build') return m;
              return { ...(m as BuildMessage), replyVisible: fullReply.slice(0, charIndex) };
            }));
            if (charIndex >= fullReply.length) {
              clearInterval(typeInterval);
              // Stagger file appearances
              finalFiles.forEach((_, fileIdx) => {
                setTimeout(() => {
                  setMessages(prev => prev.map(m => {
                    if (m.id !== buildId || m.type !== 'build') return m;
                    return { ...(m as BuildMessage), filesVisible: fileIdx + 1 };
                  }));
                }, fileIdx * 180);
              });
              // Mark streaming done after all files revealed
              setTimeout(() => {
                setMessages(prev => prev.map(m => {
                  if (m.id !== buildId || m.type !== 'build') return m;
                  return { ...(m as BuildMessage), isStreaming: false };
                }));
              }, finalFiles.length * 180 + 300);
            }
          }, 16);

          setIsBuilding(false);

          if (projectId) {
            try {
              await saveBuild(projectId, prompt, { files: event.files, reply: event.reply, meta: event.meta });
              await refreshProfile();
            } catch (e) { console.warn('Failed to save build:', e); }
          }
        }

        // ── Error ───────────────────────────────────────────────────────────
        if (event.type === 'error') {
          setIsBuilding(false);
          setMessages(prev => prev.map(m => {
            if (m.id !== buildId || m.type !== 'build') return m;
            const bm = m as BuildMessage;
            const errReply = `❌ Erreur pipeline: ${event.message}`;
            return { ...bm, reply: errReply, replyVisible: errReply, isComplete: true, isStreaming: false };
          }));
        }

      }, generatedFiles, appMode, selectedModel, projectId);
    } catch (error) {
      setIsBuilding(false);
      setMessages(prev => prev.map(m => {
        if (m.id !== buildId || m.type !== 'build') return m;
        const bm = m as BuildMessage;
        const errReply = `❌ Connexion échouée: ${(error as Error).message}. Vérifie que le serveur tourne (npm run dev:server).`;
        return { ...bm, reply: errReply, replyVisible: errReply, isComplete: true, isStreaming: false };
      }));
    }
  };

  const toggleRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      // Simulate transcription after a delay
      setTimeout(() => {
        const simulatedText = "Add a dark mode toggle to the navigation bar.";
        setChatInput(prev => prev ? `${prev} ${simulatedText}` : simulatedText);
        setIsRecording(false);
      }, 2000);
    }
  };

  // Build file tree from generated files, or use default structure
  const files = (() => {
    if (generatedFiles.length > 0) {
      const getIcon = (name: string) => {
        if (name.endsWith('.tsx') || name.endsWith('.ts')) return { icon: FileCode, color: 'text-blue-400' };
        if (name.endsWith('.css')) return { icon: Hash, color: 'text-indigo-400' };
        if (name.endsWith('.json')) return { icon: FileJson, color: 'text-yellow-500' };
        return { icon: FileText, color: 'text-zinc-400' };
      };
      return generatedFiles.map(f => {
        const name = f.path.split('/').pop() || f.path;
        const { icon, color } = getIcon(name);
        return { name, type: 'file' as const, icon, color, children: undefined, open: false };
      });
    }
    return [
      { name: 'src', type: 'folder' as const, open: true, children: [
        { name: 'components', type: 'folder' as const, open: false, children: [] as any[] },
        { name: 'App.tsx', type: 'file' as const, icon: FileCode, color: 'text-blue-400' },
        { name: 'main.tsx', type: 'file' as const, icon: FileCode, color: 'text-blue-400' },
        { name: 'index.css', type: 'file' as const, icon: Hash, color: 'text-indigo-400' },
      ]},
      { name: 'package.json', type: 'file' as const, icon: FileJson, color: 'text-yellow-500' },
      { name: 'tsconfig.json', type: 'file' as const, icon: FileJson, color: 'text-blue-500' },
      { name: 'vite.config.ts', type: 'file' as const, icon: FileCode, color: 'text-blue-400' },
    ];
  })();

  const devices = [
    { id: 'desktop', label: 'Desktop', icon: Monitor, width: '100%' },
    { id: 'tablet', label: 'Tablet', icon: Tablet, width: '768px' },
    { id: 'mobile', label: 'Mobile', icon: Smartphone, width: '375px' },
  ];

  const CurrentIcon = devices.find(d => d.id === selectedDevice)?.icon || MonitorSmartphone;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-huggy-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-zinc-500 font-medium">Loading Huggy…</p>
        </div>
      </div>
    );
  }


  if (isPreviewOnly) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0b] flex flex-col">
        <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-6 z-50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-zinc-200 uppercase tracking-widest">Huggy Live Preview</span>
          </div>
          <button onClick={() => window.location.href = '/'} className="text-xs text-zinc-500 hover:text-zinc-300">Back to Builder</button>
        </div>
        <iframe title="Share Preview" src={previewUrl} className="flex-1 border-0" sandbox="allow-scripts allow-same-origin" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen overflow-hidden select-none font-sans transition-colors duration-300 ${
      theme === 'dark' 
        ? 'bg-[#0a0a0b] text-zinc-400' 
        : 'bg-white text-zinc-600'
    }`}>
      {/* Top Header */}
      <header className={`flex items-center px-4 py-2 border-b h-14 shrink-0 z-10 transition-colors duration-300 ${
        theme === 'dark'
          ? 'border-zinc-800 bg-[#141415]'
          : 'border-zinc-100 bg-white shadow-sm'
      }`}>
        <div className="flex items-center gap-2 w-auto shrink-0">
          <div className="flex items-center gap-2 pl-1">
            {/* Logo Icon */}
            <div className="flex items-center cursor-pointer h-14 px-1 gap-2" onClick={() => navigate('/')}>
              {/* Mascotte SVG inline */}
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Corps bleu arrondi */}
                <rect x="3" y="7" width="26" height="22" rx="11" fill="#3B82F6"/>
                {/* Oreilles / antennes */}
                <ellipse cx="12" cy="6" rx="3" ry="4" fill="#2563EB" transform="rotate(-15 12 6)"/>
                <ellipse cx="20" cy="5.5" rx="3" ry="4" fill="#2563EB" transform="rotate(15 20 5.5)"/>
                {/* Visage blanc */}
                <ellipse cx="16" cy="19" rx="9" ry="8" fill="white"/>
                {/* Oeil gauche */}
                <circle cx="13" cy="17" r="2" fill="#1E3A5F"/>
                <circle cx="13.7" cy="16.3" r="0.7" fill="white"/>
                {/* Oeil droit clin d'oeil */}
                <path d="M17.5 16.5 Q19 15.5 20.5 16.5" stroke="#1E3A5F" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                {/* Joues roses */}
                <ellipse cx="11" cy="19.5" rx="2" ry="1.2" fill="#FCA5A5" opacity="0.6"/>
                <ellipse cx="21" cy="19.5" rx="2" ry="1.2" fill="#FCA5A5" opacity="0.6"/>
                {/* Bouche */}
                <path d="M13 21 Q16 23.5 19 21" stroke="#1E3A5F" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              </svg>
              {/* Texte huggy */}
              <span className="font-black text-[18px] tracking-tight leading-none" style={{ color: '#3B82F6', fontFamily: 'system-ui, sans-serif' }}>
                huggy
              </span>
            </div>
            
            {/* Home Link Section */}
            <div className="flex items-center gap-2.5 ml-1 relative">
              <div 
                onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                className={`w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-zinc-50 transition-all cursor-pointer group ${theme === 'dark' ? 'border-zinc-700' : 'border-zinc-200'}`}
              >
                <Home className={`w-4 h-4 transition-colors ${isHeaderMenuOpen ? 'text-blue-500' : 'text-zinc-400 group-hover:text-zinc-600'}`} />
              </div>
              <AnimatePresence>
                {isHeaderMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsHeaderMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full left-0 mt-2 w-64 bg-[#1c1c1d] border border-zinc-800 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 py-2 overflow-hidden backdrop-blur-xl"
                    >
                      {/* User Info Section */}
                      <div className="px-4 py-3 border-b border-zinc-800/50">
                        <div className="text-xs font-bold text-zinc-100">{profile?.full_name || user?.email?.split('@')[0] || 'User'}</div>
                        <div className="text-[10px] text-zinc-500 truncate">{user?.email || ''}</div>
                      </div>

                      {/* Credits Section */}
                      <div className="px-4 py-3 border-b border-zinc-800/50 bg-blue-500/5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Credits Huggy</span>
                          <span className="text-[10px] text-blue-400 font-mono">{(profile?.plan || 'free').toUpperCase()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-500/20 rounded-md">
                            <Coins className="w-4 h-4 text-blue-400" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-zinc-100">{profile?.credits ?? 0} <span className="text-zinc-500 font-normal">/ {profile?.max_credits ?? 500}</span></div>
                            <div className="w-32 h-1 bg-zinc-800 rounded-full mt-1 overflow-hidden">
                              <div className="h-full bg-blue-500 transition-all" style={{ width: `${Math.round(((profile?.credits ?? 0) / (profile?.max_credits ?? 500)) * 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Menu Links */}
                      <div className="p-1.5">
                        <button 
                          onClick={() => {
                            setIsHeaderMenuOpen(false);
                            navigate('/dashboard');
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-lg transition-all text-xs font-medium group"
                        >
                          <div className="flex items-center gap-2">
                            <Layout className="w-4 h-4 text-zinc-500 group-hover:text-blue-400" />
                            User Dashboard
                          </div>
                          <ExternalLink className="w-3 h-3 text-zinc-600" />
                        </button>
                        <button className="w-full flex items-center gap-2 px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-lg transition-all text-xs font-medium group">
                          <Settings className="w-4 h-4 text-zinc-500 group-hover:text-blue-400" />
                          Project Settings
                        </button>
                        <button className="w-full flex items-center gap-2 px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-lg transition-all text-xs font-medium group text-zinc-100">
                          <CreditCard className="w-4 h-4 text-zinc-500 group-hover:text-blue-400" />
                          Upgrade Plan
                        </button>
                      </div>

                      <div className="h-px bg-zinc-800/50 mx-2 my-1" />

                      <div className="p-1.5">
                        <button 
                          onClick={async () => {
                            await signOut();
                            setIsHeaderMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all text-xs font-medium"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="flex flex-col relative ml-1">
              <div 
                className={`rounded-[14px] px-4 py-2 flex items-center gap-3 shadow-sm border ${theme === 'dark' ? 'bg-zinc-900/60 border-zinc-700/60' : 'bg-white border-zinc-200'}`}
              >
                <span className={`font-display font-bold text-[13px] tracking-tight leading-none ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'}`}>{currentProject?.name || 'New Project'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 ml-6">
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={`p-1.5 rounded-md transition-colors ${isSidebarCollapsed ? 'bg-blue-600/20 text-blue-400' : (theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-400')}`}
              title="Toggle Chat"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsFileExplorerOpen(!isFileExplorerOpen)}
              className={`p-1.5 rounded-md transition-colors ${isFileExplorerOpen ? 'bg-blue-600/20 text-blue-400' : (theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-400')}`}
              title="Toggle History"
            >
              <History className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className={`flex items-center gap-1 p-1 rounded-lg border ml-16 shadow-sm ${theme === 'dark' ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-zinc-200'}`}>
          <button 
            onClick={() => setViewMode('preview')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-all text-xs font-bold ${viewMode === 'preview' ? (theme === 'dark' ? 'bg-zinc-800 text-blue-400 shadow-sm border border-zinc-700' : 'bg-zinc-100 text-blue-600 shadow-sm border border-zinc-200') : (theme === 'dark' ? 'text-zinc-400 hover:bg-zinc-800/80' : 'text-zinc-500 hover:bg-zinc-100')}`}
          >
            <Globe className="w-3.5 h-3.5" />
            Preview
          </button>
          <button 
            onClick={() => setViewMode('code')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-all text-xs font-bold ${viewMode === 'code' ? (theme === 'dark' ? 'bg-zinc-800/80 text-blue-400 shadow-sm border border-zinc-700/30' : 'bg-zinc-100 text-blue-600 shadow-sm border border-zinc-200') : (theme === 'dark' ? 'text-zinc-400 hover:bg-zinc-800/80' : 'text-zinc-500 hover:bg-zinc-100')}`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Code
          </button>
          <button 
            onClick={() => setViewMode('visual')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-all text-xs font-bold ${viewMode === 'visual' ? (theme === 'dark' ? 'bg-zinc-800/80 text-purple-400 shadow-sm border border-zinc-700/30' : 'bg-zinc-100 text-purple-600 shadow-sm border border-zinc-200') : (theme === 'dark' ? 'text-zinc-400 hover:bg-zinc-800/80' : 'text-zinc-500 hover:bg-zinc-100')}`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            Visual
          </button>
          <button 
            onClick={() => setViewMode('analytics')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-all text-xs font-bold ${viewMode === 'analytics' ? (theme === 'dark' ? 'bg-zinc-800/80 text-blue-400 shadow-sm border border-zinc-700/30' : 'bg-zinc-100 text-blue-600 shadow-sm border border-zinc-200') : (theme === 'dark' ? 'text-zinc-400 hover:bg-zinc-800/80' : 'text-zinc-500 hover:bg-zinc-100')}`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Analytics
          </button>
        </div>

        <div className={`flex items-center gap-1 p-1 rounded-lg border ml-2 mr-auto relative ${theme === 'dark' ? 'bg-zinc-900/40 border-zinc-800/50' : 'bg-zinc-50 border-zinc-200'}`}>
          <button 
            onClick={() => setIsDeviceMenuOpen(!isDeviceMenuOpen)}
            className={`p-1.5 rounded-md transition-colors border flex items-center gap-1 ${theme === 'dark' ? 'bg-zinc-800/80 text-blue-400 border-zinc-700/30 hover:bg-zinc-700/50' : 'bg-white text-blue-600 border-zinc-200 hover:bg-zinc-50'}`}
          >
            <CurrentIcon className="w-3.5 h-3.5" />
            <span className="text-[10px] ml-1 text-zinc-500 font-bold">/</span>
          </button>

          <AnimatePresence>
            {isDeviceMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsDeviceMenuOpen(false)} 
                />
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute top-full left-0 mt-2 w-56 bg-[#161617] border border-zinc-800 rounded-xl shadow-2xl z-20 py-1 overflow-hidden"
                >
                  {devices.map((device) => (
                    <button
                      key={device.id}
                      onClick={() => {
                        setSelectedDevice(device.id as any);
                        setIsDeviceMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left ${
                        selectedDevice === device.id 
                          ? 'bg-zinc-800/50 text-zinc-100' 
                          : 'text-zinc-400 hover:bg-zinc-800/30 hover:text-zinc-200'
                      }`}
                    >
                      <device.icon className={`w-4 h-4 ${selectedDevice === device.id ? 'text-blue-400' : ''}`} />
                      <span className="text-sm font-medium">{device.label}</span>
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2">
          {generatedFiles.length > 0 && (
            <button 
              onClick={() => {
                const latestBuild = buildHistory[0];
                if (latestBuild) {
                  const url = `${window.location.origin}/preview/${latestBuild.id}`;
                  navigator.clipboard.writeText(url);
                  alert('Lien de preview copié ! Partagez-le avec vos clients.');
                }
              }}
              className={`p-1.5 rounded-lg transition-colors flex items-center gap-2 text-xs text-zinc-400 ${theme === 'dark' ? 'hover:bg-zinc-800 hover:text-zinc-200' : 'hover:bg-zinc-100 hover:text-zinc-600'}`}
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
          )}
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`p-1.5 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'hover:bg-zinc-800 text-zinc-400 hover:text-yellow-400'
                : 'hover:bg-zinc-100 text-zinc-500 hover:text-orange-500'
            }`}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          
          <button className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity">
            <Zap className="w-3.5 h-3.5 fill-white" />
            Upgrade
          </button>
          <button
            onClick={handleDeploy}
            disabled={isDeploying || generatedFiles.length === 0}
            className={`px-3.5 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-500 transition-colors flex items-center gap-2 ${isDeploying ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isDeploying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cloud className="w-3.5 h-3.5" />}
            {isDeploying ? 'Deploying...' : 'Deploy'}
          </button>
          {generatedFiles.length > 0 && (
            <button 
              onClick={() => setIsCustomDomainModalOpen(true)}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-2 text-xs border border-zinc-800"
            >
              <Globe2 className="w-3.5 h-3.5" />
              Domain
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-1 overflow-hidden p-2 gap-2">
        {/* Left Sidebar */}
        <AnimatePresence initial={false}>
          {!isSidebarCollapsed && (
            <motion.div 
              initial={{ width: 0, opacity: 0, x: -20 }}
              animate={{ width: 380, opacity: 1, x: 0 }}
              exit={{ width: 0, opacity: 0, x: -20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="flex flex-col gap-2 shrink-0 h-full overflow-hidden"
            >
              {/* Conversation/History Area */}
              <div className={`flex-1 rounded-2xl border overflow-hidden shadow-inner flex flex-col p-4 overflow-y-auto scrollbar-hide ${theme === 'dark' ? 'bg-[#161617] border-zinc-800/50' : 'bg-zinc-50 border-zinc-200'}`}>
                {messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 opacity-30">
                    <Clock className="w-8 h-8 mb-3" />
                    <p className="text-xs font-medium">No history yet</p>
                    <p className="text-[10px] mt-1">Your conversations will appear here</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-5">
                    {messages.map((entry) => {

                      // ── User message ──────────────────────────────────────
                      if (entry.type === 'user') {
                        return (
                          <div key={entry.id} className="flex justify-end">
                            <div className="max-w-[85%] bg-indigo-600/20 border border-indigo-500/30 rounded-2xl rounded-tr-sm px-3.5 py-2.5">
                              <p className="text-xs text-zinc-200 leading-relaxed">{entry.content}</p>
                              <span className="text-[9px] text-zinc-600 mt-1 block text-right">
                                {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      // ── Build message ─────────────────────────────────────
                      const bm = entry as BuildMessage;
                      return (
                        <div key={bm.id} className="flex flex-col gap-2.5">

                          {/* Pipeline progress header — global bar + ETA */}
                          {(() => {
                            const finished = bm.agents.filter(a => a.status === 'completed' || a.status === 'skipped').length;
                            const activeIdx = bm.agents.findIndex(a => a.status === 'active');
                            const activeAgent = activeIdx >= 0 ? AGENTS_DEF[activeIdx] : null;
                            const pct = Math.round((finished / 8) * 100);
                            return (
                              <div className={`rounded-xl p-2.5 mb-1 border ${theme === 'dark' ? 'bg-zinc-900/40 border-zinc-800/50' : 'bg-zinc-100/80 border-zinc-200'}`}>
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="flex items-center gap-1.5">
                                    {bm.isComplete ? (
                                      <CheckCircle2 className="w-3 h-3 text-green-400" />
                                    ) : (
                                      <motion.div
                                        className="w-2 h-2 rounded-full bg-violet-400"
                                        animate={{ opacity: [1, 0.3, 1] }}
                                        transition={{ duration: 0.9, repeat: Infinity }}
                                      />
                                    )}
                                    <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">
                                      {bm.isComplete ? 'Pipeline complete' : (activeAgent ? activeAgent.name : 'Starting...')}
                                    </span>
                                  </div>
                                  <span className="text-[9px] font-mono text-zinc-500">{finished}/8 · {pct}%</span>
                                </div>
                                <div className={`h-1 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                                  <motion.div
                                    className="h-full bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-400"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ duration: 0.4, ease: 'easeOut' }}
                                  />
                                </div>
                              </div>
                            );
                          })()}

                          {/* Windsurf-style Agent Pipeline */}
                          <div className="flex items-center gap-2">
                            {/* Progress line background */}
                            <div className={`flex-1 h-0.5 rounded-full overflow-hidden relative ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                              <motion.div
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-400"
                                initial={{ width: '0%' }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                              />
                            </div>
                            
                            {/* Agent dots */}
                            <div className="flex items-center gap-1.5">
                              {AGENTS_DEF.map((def, idx) => {
                                const agent = bm.agents[idx];
                                const status = agent?.status || 'idle';
                                const isActive = status === 'active';
                                const isDone = status === 'completed';
                                const isSkipped = status === 'skipped';
                                
                                return (
                                  <div key={def.name} className="relative">
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0 }}
                                      animate={{ 
                                        opacity: 1, 
                                        scale: isActive ? 1.2 : 1,
                                      }}
                                      transition={{ delay: idx * 0.08, type: 'spring', stiffness: 300 }}
                                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                        isDone
                                          ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'
                                          : isActive
                                          ? 'bg-blue-500 shadow-[0_0_12px_rgba(20,136,252,0.6)]'
                                          : isSkipped
                                          ? 'bg-zinc-700'
                                          : 'bg-zinc-600'
                                      }`}
                                    >
                                      {/* Pulse effect for active agent */}
                                      {isActive && (
                                        <motion.div
                                          className="absolute inset-0 rounded-full bg-blue-500"
                                          animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
                                          transition={{ duration: 1.5, repeat: Infinity }}
                                        />
                                      )}
                                    </motion.div>
                                    
                                    {/* Tooltip on hover */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                                      <span className="text-[8px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded whitespace-nowrap">
                                        {def.name}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* 3-dot pulse animation when streaming */}
                            {bm.isStreaming && !bm.isComplete && (
                              <div className="flex items-center gap-0.5 ml-2">
                                <motion.div
                                  className="w-1 h-1 rounded-full bg-blue-400"
                                  animate={{ opacity: [0.3, 1, 0.3] }}
                                  transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                                />
                                <motion.div
                                  className="w-1 h-1 rounded-full bg-blue-400"
                                  animate={{ opacity: [0.3, 1, 0.3] }}
                                  transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                                />
                                <motion.div
                                  className="w-1 h-1 rounded-full bg-blue-400"
                                  animate={{ opacity: [0.3, 1, 0.3] }}
                                  transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                                />
                              </div>
                            )}
                          </div>

                          {/* Windsurf-style Thinking Block - Terminal */}
                          {bm.thinkingLines.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                              transition={{ duration: 0.4, ease: 'easeOut' }}
                              className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg overflow-hidden"
                            >
                              {/* Header */}
                              <div className="flex items-center justify-between px-3 py-2 bg-[#111111] border-b border-[#1a1a1a]">
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1">
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                                  </div>
                                  <span className="text-[10px] text-zinc-500 font-medium ml-2">thinking</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {bm.isStreaming && !bm.isComplete && (
                                    <>
                                      <motion.div
                                        className="w-1 h-1 rounded-full bg-green-400"
                                        animate={{ opacity: [0.4, 1, 0.4] }}
                                        transition={{ duration: 1.4, repeat: Infinity, delay: 0 }}
                                      />
                                      <motion.div
                                        className="w-1 h-1 rounded-full bg-green-400"
                                        animate={{ opacity: [0.4, 1, 0.4] }}
                                        transition={{ duration: 1.4, repeat: Infinity, delay: 0.15 }}
                                      />
                                      <motion.div
                                        className="w-1 h-1 rounded-full bg-green-400"
                                        animate={{ opacity: [0.4, 1, 0.4] }}
                                        transition={{ duration: 1.4, repeat: Infinity, delay: 0.3 }}
                                      />
                                    </>
                                  )}
                                </div>
                              </div>
                              
                              {/* Terminal content */}
                              <div className="p-3 windsurf-scrollbar max-h-32 overflow-y-auto">
                                <div className="space-y-1">
                                  {bm.thinkingLines.map((line, i) => (
                                    <motion.div
                                      key={i}
                                      initial={{ opacity: 0, x: -8 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: i * 0.05, duration: 0.3 }}
                                      className="flex items-start gap-2"
                                    >
                                      <span className="text-[9px] text-zinc-600 font-mono shrink-0">
                                        {(i + 1).toString().padStart(2, '0')}
                                      </span>
                                      <span className={`text-[10px] font-mono leading-relaxed ${
                                        line.includes('✓') || line.includes('✅') 
                                          ? 'text-green-400' 
                                          : line.includes('⚠️') || line.includes('⚠')
                                          ? 'text-amber-400'
                                          : line.includes('✗') || line.includes('❌')
                                          ? 'text-red-400'
                                          : 'text-zinc-400'
                                      }`}>
                                        {line}
                                      </span>
                                    </motion.div>
                                  ))}
                                  {/* Cursor at end when streaming */}
                                  {bm.isStreaming && !bm.isComplete && (
                                    <motion.div
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      className="flex items-center gap-2"
                                    >
                                      <span className="text-[9px] text-zinc-600 font-mono shrink-0">
                                        {(bm.thinkingLines.length + 1).toString().padStart(2, '0')}
                                      </span>
                                      <span className="windsurf-cursor animate-windsurf-cursor" />
                                    </motion.div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}

                          {/* Windsurf-style Streaming Reply - Word by word */}
                          {(bm.replyVisible || bm.isStreaming) && (
                            <motion.div
                              initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                              transition={{ duration: 0.4, ease: 'easeOut' }}
                              className="flex gap-3 items-start"
                            >
                              {/* Avatar */}
                              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_12px_rgba(20,136,252,0.3)]">
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                {/* Header */}
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="text-[11px] font-semibold text-zinc-300">Huggy AI</span>
                                  <span className="text-[9px] text-zinc-500">
                                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                
                                {/* Content with Windsurf typing */}
                                <div className="text-xs text-zinc-200 leading-relaxed space-y-2">
                                  <p className="whitespace-pre-wrap">
                                    {bm.replyVisible}
                                    {bm.isStreaming && bm.replyVisible.length < bm.reply.length && (
                                      <span className="windsurf-cursor animate-windsurf-cursor inline-block ml-0.5" />
                                    )}
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          )}

                          {/* Windsurf-style Files Section - Stagger cascade */}
                          {bm.filesVisible > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.4 }}
                              className="ml-10"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Generated files</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                  {bm.filesVisible}
                                </span>
                              </div>
                              
                              <div className="flex flex-col gap-1.5">
                                {bm.files.slice(0, bm.filesVisible).map((file, fi) => {
                                  const ext = file.path.split('.').pop() || '';
                                  const iconColor =
                                    ext === 'tsx' || ext === 'ts' ? 'text-blue-400' :
                                    ext === 'css' || ext === 'scss' ? 'text-violet-400' :
                                    ext === 'json' ? 'text-amber-400' :
                                    ext === 'html' ? 'text-orange-400' :
                                    ext === 'js' ? 'text-yellow-400' :
                                    'text-zinc-400';
                                  const bgColor =
                                    ext === 'tsx' || ext === 'ts' ? 'bg-blue-500/5' :
                                    ext === 'css' || ext === 'scss' ? 'bg-violet-500/5' :
                                    ext === 'json' ? 'bg-amber-500/5' :
                                    'bg-zinc-500/5';
                                  const FileIconComp =
                                    ext === 'tsx' || ext === 'ts' ? FileCode :
                                    ext === 'css' || ext === 'scss' ? Hash :
                                    ext === 'json' ? FileJson : FileText;
                                  
                                  return (
                                    <motion.div
                                      key={fi}
                                      initial={{ opacity: 0, x: -12, filter: 'blur(4px)' }}
                                      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                                      transition={{ 
                                        delay: fi * 0.08, 
                                        duration: 0.3,
                                        ease: 'easeOut'
                                      }}
                                      className={`flex items-center gap-2.5 px-3 py-2 ${bgColor} border border-zinc-800/40 rounded-md hover:border-zinc-700/60 transition-colors group`}
                                    >
                                      <FileIconComp className={`w-4 h-4 shrink-0 ${iconColor} group-hover:scale-110 transition-transform`} />
                                      <span className="text-[11px] font-mono text-zinc-300 truncate flex-1">{file.path}</span>
                                      <motion.span 
                                        initial={{ opacity: 0, scale: 0 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: fi * 0.08 + 0.15 }}
                                        className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-green-400 shrink-0"
                                      >
                                        created
                                      </motion.span>
                                    </motion.div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}

                          {/* Windsurf-style Score badges after complete */}
                          {bm.isComplete && !bm.isStreaming && bm.meta && (
                            <motion.div
                              initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                              transition={{ duration: 0.4, delay: 0.2 }}
                              className="ml-10"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Build metrics</span>
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                                  className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center"
                                >
                                  <CheckCircle2 className="w-3 h-3 text-green-400" />
                                </motion.div>
                              </div>
                              
                              <div className="flex items-center gap-2 flex-wrap">
                                {bm.meta.securityScore !== undefined && (
                                  <motion.span 
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] hover:border-red-500/30 transition-colors"
                                  >
                                    <Shield className="w-3 h-3 text-red-400" />
                                    <span className="text-[10px] text-zinc-300 font-medium">Security</span>
                                    <span className="text-[10px] text-red-400 font-bold">{bm.meta.securityScore}%</span>
                                  </motion.span>
                                )}
                                {bm.meta.qaScore !== undefined && (
                                  <motion.span 
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.35 }}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] hover:border-green-500/30 transition-colors"
                                  >
                                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                                    <span className="text-[10px] text-zinc-300 font-medium">QA</span>
                                    <span className="text-[10px] text-green-400 font-bold">{bm.meta.qaScore}%</span>
                                  </motion.span>
                                )}
                                {bm.meta.complexity && (
                                  <motion.span 
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] hover:border-blue-500/30 transition-colors"
                                  >
                                    <Zap className="w-3 h-3 text-blue-400" />
                                    <span className="text-[10px] text-zinc-300 font-medium">Complexity</span>
                                    <span className="text-[10px] text-blue-400 font-bold">{bm.meta.complexity}</span>
                                  </motion.span>
                                )}
                                <span className="text-[9px] text-zinc-600 ml-auto">
                                  {new Date(bm.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </motion.div>
                          )}

                          {/* Loading pulse when pipeline just started */}
                          {!bm.isComplete && bm.thinkingLines.length === 0 && (
                            <div className="flex items-center gap-2 ml-2">
                              {[0,1,2].map(i => (
                                <motion.div
                                  key={i}
                                  className="w-1.5 h-1.5 rounded-full bg-zinc-600"
                                  animate={{ opacity: [0.3, 1, 0.3] }}
                                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div className="pt-4 flex justify-center">
                      <button
                        onClick={() => setMessages([])}
                        className="text-[9px] text-zinc-600 hover:text-zinc-400 uppercase tracking-tighter font-bold transition-colors"
                      >
                        Clear History
                      </button>
                    </div>
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>

              {/* Chat Input Area */}
              <div className={`rounded-2xl border p-4 shadow-lg flex flex-col relative transition-all duration-200 shrink-0 ${theme === 'dark' ? 'bg-[#161617] border-zinc-800/50' : 'bg-white border-zinc-200'}`}>
                <textarea 
                  ref={chatInputRef}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      startBuild();
                    }
                  }}
                  placeholder="Décris ton application..."
                  rows={1}
                  className={`w-full bg-transparent border-none text-sm font-medium resize-none focus:outline-none placeholder:text-zinc-400 mb-2 max-h-[160px] scrollbar-hide overflow-y-auto ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'}`}
                />
                
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-2">
                    <button className={`p-2 rounded-full border transition-colors text-zinc-500 ${theme === 'dark' ? 'hover:bg-zinc-800 border-zinc-800/80' : 'hover:bg-zinc-100 border-zinc-200'}`}>
                      <Plus className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setIsEditMode(!isEditMode)}
                      className={`p-2 rounded-full border transition-all duration-200 ${
                        isEditMode 
                          ? 'bg-blue-600/20 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                          : (theme === 'dark' ? 'hover:bg-zinc-800 border-zinc-800/80 text-zinc-500' : 'hover:bg-zinc-100 border-zinc-200 text-zinc-500')
                      }`}
                    >
                      <Target className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 relative">
                    <div className={`flex items-center rounded-lg overflow-hidden border ${theme === 'dark' ? 'bg-zinc-800/50 border-zinc-700/30' : 'bg-zinc-100 border-zinc-200'}`}>
                      <button 
                        onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                        className={`px-3 py-1.5 transition-colors text-[10px] font-bold flex items-center gap-1.5 ${theme === 'dark' ? 'hover:bg-zinc-700/50 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-600'}`}
                      >
                        <Brain className="w-3 h-3 text-violet-400" />
                        {selectedModel.includes('sonnet') ? 'ELITE' : 'FAST'}
                        <ChevronDown className={`w-3 h-3 transition-transform ${isModelMenuOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    <AnimatePresence>
                      {isModelMenuOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setIsModelMenuOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`absolute bottom-full right-32 mb-2 w-48 rounded-xl shadow-2xl z-20 py-1 overflow-hidden border ${theme === 'dark' ? 'bg-[#1c1c1d] border-zinc-800' : 'bg-white border-zinc-200 shadow-lg'}`}
                          >
                            <button 
                              onClick={() => { setSelectedModel('claude-3-5-sonnet-20241022'); setIsModelMenuOpen(false); }}
                              className={`w-full px-3 py-2 text-left text-[11px] font-medium flex items-center gap-2 transition-colors ${selectedModel.includes('sonnet') ? (theme === 'dark' ? 'bg-zinc-800 text-blue-400' : 'bg-blue-50 text-blue-600') : (theme === 'dark' ? 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200' : 'text-zinc-600 hover:bg-zinc-50')}`}
                            >
                              <Zap className="w-3.5 h-3.5 text-violet-400" />
                              Claude 3.5 Sonnet (Elite)
                            </button>
                            <button 
                              onClick={() => { setSelectedModel('claude-3-haiku-20240307'); setIsModelMenuOpen(false); }}
                              className={`w-full px-3 py-2 text-left text-[11px] font-medium flex items-center gap-2 transition-colors ${selectedModel.includes('haiku') ? (theme === 'dark' ? 'bg-zinc-800 text-blue-400' : 'bg-blue-50 text-blue-600') : (theme === 'dark' ? 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200' : 'text-zinc-600 hover:bg-zinc-50')}`}
                            >
                              <Activity className="w-3.5 h-3.5 text-green-400" />
                              Claude 3 Haiku (Fast)
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>

                    <div className={`flex items-center rounded-lg overflow-hidden border ${theme === 'dark' ? 'bg-zinc-800/50 border-zinc-700/30' : 'bg-zinc-100 border-zinc-200'}`}>
                      <button className={`px-3 py-1.5 transition-colors text-xs font-medium capitalize ${theme === 'dark' ? 'hover:bg-zinc-700/50 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-600'}`}>
                        {appMode}
                      </button>
                      <button 
                        onClick={() => setIsModeMenuOpen(!isModeMenuOpen)}
                        className={`p-1.5 transition-colors border-l ${theme === 'dark' ? 'hover:bg-zinc-700/50 text-zinc-400 border-zinc-700/30' : 'hover:bg-zinc-200 text-zinc-500 border-zinc-300'}`}
                      >
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isModeMenuOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    <AnimatePresence>
                      {isModeMenuOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setIsModeMenuOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`absolute bottom-full right-0 mb-2 w-32 rounded-xl shadow-2xl z-20 py-1 overflow-hidden border ${theme === 'dark' ? 'bg-[#1c1c1d] border-zinc-800' : 'bg-white border-zinc-200 shadow-lg'}`}
                          >
                            <button 
                              onClick={() => { setAppMode('build'); setIsModeMenuOpen(false); }}
                              className={`w-full px-3 py-2 text-left text-xs font-medium flex items-center gap-2 transition-colors ${appMode === 'build' ? (theme === 'dark' ? 'bg-zinc-800 text-blue-400' : 'bg-blue-50 text-blue-600') : (theme === 'dark' ? 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200' : 'text-zinc-600 hover:bg-zinc-50')}`}
                            >
                              <Zap className="w-3.5 h-3.5" />
                              Build
                            </button>
                            <button 
                              onClick={() => { setAppMode('plan'); setIsModeMenuOpen(false); }}
                              className={`w-full px-3 py-2 text-left text-xs font-medium flex items-center gap-2 transition-colors ${appMode === 'plan' ? (theme === 'dark' ? 'bg-zinc-800 text-blue-400' : 'bg-blue-50 text-blue-600') : (theme === 'dark' ? 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200' : 'text-zinc-600 hover:bg-zinc-50')}`}
                            >
                              <Layout className="w-3.5 h-3.5" />
                              Plan
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>

                    <button 
                      onClick={toggleRecording}
                      className={`p-2 rounded-full transition-colors ${isRecording ? 'bg-red-500/20 text-red-500 animate-pulse' : (theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500')}`}
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                    <button 
                      id="send-prompt-btn"
                      disabled={!chatInput.trim() || isBuilding}
                      onClick={startBuild}
                      className={`p-2 rounded-full transition-colors border ${
                        chatInput.trim() && !isBuilding 
                          ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20 border-blue-600' 
                          : (theme === 'dark' ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border-zinc-700/50' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed border-zinc-300')
                      }`}
                    >
                      {isBuilding ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> : <ArrowUp className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Preview Area */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`flex-1 rounded-2xl border shadow-2xl relative overflow-hidden flex ${theme === 'dark' ? 'bg-[#0d0d0e] border-zinc-800/50' : 'bg-zinc-50 border-zinc-200'}`}
        >
          {/* File Explorer Sidebar */}
          <AnimatePresence>
            {isFileExplorerOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 240, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className={`h-full border-r flex flex-col shrink-0 overflow-hidden ${theme === 'dark' ? 'border-zinc-800/50 bg-[#0d0d0e]' : 'border-zinc-200 bg-white'}`}
              >
                <div className={`p-4 flex items-center justify-between border-b ${theme === 'dark' ? 'border-zinc-800/30' : 'border-zinc-200'}`}>
                  <span className={`text-xs font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-700'}`}>Version History</span>
                  <History className="w-3.5 h-3.5 text-zinc-500" />
                </div>
                <div className="flex-1 overflow-y-auto py-2">
                  {buildHistory.map((build, idx) => (
                    <div 
                      key={build.id} 
                      onClick={() => setGeneratedFiles(build.files as any)}
                      className={`group px-3 py-2 cursor-pointer border-b transition-all ${theme === 'dark' ? 'hover:bg-zinc-800/50 border-zinc-800/20' : 'hover:bg-zinc-50 border-zinc-100'}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-zinc-400">v{buildHistory.length - idx}</span>
                        <span className="text-[9px] text-zinc-600">{new Date(build.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-zinc-300 line-clamp-1 group-hover:text-blue-400">{build.prompt}</p>
                    </div>
                  ))}
                  
                  <div className={`p-4 mt-4 border-t ${theme === 'dark' ? 'border-zinc-800/30' : 'border-zinc-200'}`}>
                    <span className={`text-xs font-bold uppercase tracking-widest block mb-4 ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-700'}`}>Files</span>
                    {generatedFiles.length > 0 ? (
                      generatedFiles.map((file, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => setActiveFilePath(file.path)}
                          className={`flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-800/50 cursor-pointer transition-colors rounded-lg mb-1 ${activeFilePath === file.path ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-zinc-400'}`}
                        >
                          <FileCode className={`w-4 h-4 ${file.path.endsWith('.css') ? 'text-violet-400' : 'text-blue-400'}`} />
                          <span className="text-sm truncate">{file.path}</span>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-8 text-center">
                        <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-tighter">No files generated yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>


          <div className="flex-1 relative">
            {/* Subtle grid pattern background */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
            />

            {/* ── Vibe Coding Animation (during build) ── */}
            <VibeCodingOverlay
              isBuilding={isBuilding}
              buildMessages={messages.filter(m => m.type === 'build') as any}
            />

            {/* Preview loading spinner */}
            {isPreviewBuilding && !isBuilding && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0a0a0b]">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                  <span className="text-xs text-zinc-500">Compilation en cours…</span>
                </div>
              </div>
            )}

            {/* Generated App Live Preview / Code Editor / Analytics */}
            {previewUrl && !isBuilding && !isEditMode && (
              <div className="absolute inset-0 z-10 bg-[#0a0a0b]">
                {viewMode === 'preview' ? (
                  <iframe
                    title="Live Preview"
                    src={previewUrl}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                  />
                ) : viewMode === 'visual' ? (
                  (() => {
                    const targetFile = generatedFiles.find(f => 
                      f.path.endsWith('App.tsx') || f.path.endsWith('App.jsx')
                    ) || generatedFiles.find(f => 
                      f.path.endsWith('.tsx') || f.path.endsWith('.jsx')
                    );
                    if (!targetFile) {
                      return (
                        <div className="w-full h-full flex items-center justify-center text-zinc-400">
                          <div className="text-center">
                            <Wand2 className="w-12 h-12 mx-auto mb-3 text-purple-400" />
                            <p>No JSX file to edit visually</p>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <VisualBuilder
                        initialCode={targetFile.content}
                        fileName={targetFile.path}
                        onCodeChange={(newCode) => {
                          setGeneratedFiles(prev => prev.map(f => 
                            f.path === targetFile.path ? { ...f, content: newCode } : f
                          ));
                        }}
                        onClose={() => setViewMode('code')}
                      />
                    );
                  })()
                ) : viewMode === 'analytics' ? (
                  <div className="w-full h-full p-8 overflow-y-auto bg-[#0a0a0b] text-zinc-400">
                    <div className="max-w-5xl mx-auto">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h2 className="text-2xl font-bold text-white mb-1">Project Analytics</h2>
                          <p className="text-zinc-500 text-sm">Real-time visitor data for {currentProject?.name || 'this project'}</p>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-xs font-bold text-green-400 uppercase tracking-widest">Live Now: 12 visitors</span>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        {[
                          { label: 'Total Visitors', value: realStats.visitors.toLocaleString(), sub: '+12% from last week', icon: Users, color: 'text-blue-400' },
                          { label: 'Pageviews', value: realStats.views.toLocaleString(), sub: `${(realStats.views / (realStats.visitors || 1)).toFixed(2)} views per visit`, icon: Eye, color: 'text-violet-400' },
                          { label: 'Avg. Duration', value: '13m 38s', sub: 'Engagement is up', icon: Clock, color: 'text-emerald-400' },
                          { label: 'Bounce Rate', value: '73%', sub: '-2% improved', icon: Activity, color: 'text-orange-400' },
                        ].map((stat, i) => (
                          <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{stat.label}</span>
                              <stat.icon className={`w-4 h-4 ${stat.color}`} />
                            </div>
                            <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                            <div className="text-[10px] text-zinc-600">{stat.sub}</div>
                          </div>
                        ))}
                      </div>

                      {/* Main Chart Placeholder */}
                      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 mb-8 h-64 flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                          <span className="text-xs font-bold text-zinc-400">Visitors (Last 7 Days)</span>
                          <div className="flex gap-2">
                            {['23 Apr', '25 Apr', '27 Apr', '29 Apr'].map(d => (
                              <span key={d} className="text-[9px] text-zinc-600">{d}</span>
                            ))}
                          </div>
                        </div>
                        <div className="flex-1 flex items-end gap-2 pb-2">
                          {[40, 60, 45, 80, 55, 90, 70, 85, 100, 75, 60, 40].map((h, i) => (
                            <motion.div 
                              key={i}
                              initial={{ height: 0 }}
                              animate={{ height: `${h}%` }}
                              className="flex-1 bg-gradient-to-t from-blue-600/20 to-blue-500/60 rounded-t-sm"
                            />
                          ))}
                        </div>
                      </div>

                      {/* Tables Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                        {/* Top Sources */}
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
                          <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Top Sources</span>
                            <span className="text-[10px] text-zinc-600">Visitors</span>
                          </div>
                          <div className="space-y-3">
                            {[
                              { name: 'Direct', val: 468, pct: 60 },
                              { name: 'm.facebook.com', val: 224, pct: 30 },
                              { name: 'google.com', val: 34, pct: 5 },
                              { name: 'instagram.com', val: 10, pct: 2 },
                            ].map((s, i) => (
                              <div key={i} className="flex items-center justify-between group">
                                <span className="text-xs text-zinc-300 group-hover:text-blue-400 transition-colors">{s.name}</span>
                                <div className="flex items-center gap-3">
                                  <div className="w-20 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500/50" style={{ width: `${s.pct}%` }} />
                                  </div>
                                  <span className="text-xs font-mono text-zinc-500 w-8 text-right">{s.val}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Top Pages */}
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
                          <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Top Pages</span>
                            <span className="text-[10px] text-zinc-600">Visitors</span>
                          </div>
                          <div className="space-y-3">
                            {[
                              { name: '/produit/digitaux', val: 435 },
                              { name: '/guide-diabete', val: 163 },
                              { name: '/', val: 65 },
                              { name: '/boutique', val: 48 },
                            ].map((p, i) => (
                              <div key={i} className="flex items-center justify-between group">
                                <span className="text-xs text-zinc-300 group-hover:text-violet-400 transition-colors">{p.name}</span>
                                <span className="text-xs font-mono text-zinc-500">{p.val}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full bg-[#1e1e1e] flex flex-col">
                    <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-[#1e1e1e]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <FileCode className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white block">
                            {activeFilePath || 'Select a file'}
                          </span>
                          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                            Live Editor
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800/50 rounded border border-zinc-700/50">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          <span className="text-[10px] text-zinc-400 font-bold uppercase">Sync On</span>
                        </div>
                        <button className="px-3 py-1.5 bg-blue-600 text-white rounded text-[10px] font-bold hover:bg-blue-500 transition-colors">
                          Save Changes
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <Editor
                        height="100%"
                        defaultLanguage="typescript"
                        theme="vs-dark"
                        path={activeFilePath || 'index.tsx'}
                        value={generatedFiles.find(f => f.path === activeFilePath)?.content || ''}
                        onChange={(val) => {
                          if (activeFilePath && val !== undefined) {
                            setGeneratedFiles(prev => prev.map(f => f.path === activeFilePath ? { ...f, content: val } : f));
                          }
                        }}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 13,
                          padding: { top: 20 },
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                          fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
                          lineNumbersMinChars: 3,
                          glyphMargin: false,
                          folding: true,
                          lineDecorationsWidth: 10,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Custom Domain Modal */}
            <AnimatePresence>
              {isCustomDomainModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsCustomDomainModalOpen(false)}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-md bg-[#1c1c1e] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden"
                  >
                    <div className="p-8">
                      <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6">
                        <Globe2 className="w-6 h-6 text-blue-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Connect Custom Domain</h3>
                      <p className="text-zinc-500 text-sm mb-8 leading-relaxed">Enter your own domain to make your application look more professional. We'll handle the SSL certificate.</p>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Your Domain</label>
                          <input 
                            type="text" 
                            placeholder="maboutique.com"
                            value={customDomain}
                            onChange={(e) => setCustomDomain(e.target.value)}
                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                          />
                        </div>
                        
                        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-4">
                          <p className="text-[10px] text-zinc-500 mb-2 font-bold uppercase">Configuration Required</p>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-zinc-400">Type</span>
                              <span className="text-zinc-100 font-mono">CNAME</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-zinc-400">Value</span>
                              <span className="text-blue-400 font-mono">proxy.huggy.app</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 mt-8">
                        <button 
                          onClick={() => setIsCustomDomainModalOpen(false)}
                          className="flex-1 px-4 py-3 bg-zinc-800 text-zinc-300 rounded-xl text-xs font-bold hover:bg-zinc-700 transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => {
                            alert(`Domaine ${customDomain} est en cours de propagation...`);
                            setIsCustomDomainModalOpen(false);
                          }}
                          className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                        >
                          Connect <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Edit Mode Selection Overlay */}
            <AnimatePresence>
              {isEditMode && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-30 cursor-crosshair flex items-center justify-center bg-blue-500/5 border-2 border-dashed border-blue-500/30 m-4 rounded-xl"
                >
                  <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800 px-4 py-2 rounded-full flex items-center gap-3 shadow-2xl">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      <span className="text-xs font-semibold text-zinc-100">Select an element to edit</span>
                    </div>
                    <div className="w-px h-4 bg-zinc-700" />
                    <button 
                      onClick={() => setIsEditMode(false)}
                      className="text-[10px] text-zinc-500 hover:text-zinc-300 uppercase tracking-wider font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>


          </div>
        </motion.div>
      </main>
      
      {/* Onboarding Tour for Builder */}
      <OnboardingTour isBuilder={true} />
      
      {/* Feedback Widget */}
      <FeedbackWidget />
    </div>
  );
}
