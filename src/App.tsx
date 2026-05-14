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
  Wand2,
  Edit3,
  Paperclip,
  AlertCircle,
  Copy,
  X,
  Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import { startBuildPipeline, checkServerHealth, requestSummary, type ChatHistoryEntry, type PipelinePhase, type ToolKind, type ToolStatus, AGENTS_PIPELINE } from './lib/api';
import { saveMessage, loadMessages, clearMessages, loadConversationSummary, countMessages } from './lib/messages';
import { VisualBuilder } from './components/visual';
import { HuggyLogo } from './components/HuggyLogo';
import { useAuth } from './lib/useAuth';
import { useProjects } from './lib/useProjects';
import { supabase, type Build } from './lib/supabase';
import LandingPage from './pages/LandingPage';
import OnboardingTour from './components/OnboardingTour';
import FeedbackWidget from './components/FeedbackWidget';
import { BuildFeedback } from './components/BuildFeedback';
import { BuildHistoryDrawer } from './components/BuildHistoryDrawer';
import { TemplateCarousel, type Template } from './components/TemplateCarousel';
import {
  AIBubble,
  AgentTimeline,
  ToolBlock,
  PhaseIndicator,
  LiveCodeStream,
  TechnicalDetails,
  ModeAnnounce,
  TodoList,
  ActionLog,
  QuestionBlock,
  ConversationMessage,
  type AgentNode,
  type PipelinePhase,
  type AgentStepStatus,
  type CapabilityPlan,
  type AgentMode,
  type TodoStep,
  type TodoStatus,
  type ActionEntry,
} from './components/streaming';
import { useAnalytics, usePageTracking, useSessionTracking } from './lib/useAnalytics';
import { useNavigate, useLocation } from 'react-router-dom';

// Undo/Redo imports
import { useUndoRedo } from './hooks/useUndoRedo';
import { UndoRedoToolbar } from './components/UndoRedoToolbar';
import { BuildTimeline } from './components/BuildTimeline';

// ─── Streaming Chat Types ─────────────────────────────────────────────────────
type AgentStatus = 'idle' | 'active' | 'completed' | 'skipped';

// Remove markdown code blocks (```...```) and file:path markers from text shown in chat.
// Code is rendered separately in the VibeCodingOverlay and the files section.
function stripCodeBlocks(text: string): string {
  if (!text) return '';
  let out = text;
  // Safety net: if the message accidentally STARTS with a JSON object (e.g. an agent leaked
  // its raw JSON output), strip the whole leading {...} block so the user only sees clean text.
  const trimmed = out.trimStart();
  if (trimmed.startsWith('{')) {
    let depth = 0;
    let endIdx = -1;
    for (let i = 0; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) { endIdx = i; break; }
      }
    }
    if (endIdx > 0) {
      out = trimmed.slice(endIdx + 1).trimStart();
    }
  }
  // Remove complete fenced code blocks (```lang\n...\n```)
  out = out.replace(/```[\s\S]*?```/g, '');
  // Remove any dangling opening fence and content until end (streaming in progress)
  out = out.replace(/```[\s\S]*$/g, '');
  // Remove bare file:path lines that sometimes leak
  out = out.replace(/^\s*file:\S+\s*$/gim, '');
  // Strip leading "💬 Mode Discussion — ..." / "⚙️ Mode Code — ..." / "❓ Mode Question — ..." lines
  // The mode is shown by the ModeAnnounce component, no need to repeat it in the text.
  out = out.replace(/^\s*(?:💬|⚙️|❓)\s*Mode\s+(?:Discussion|Code|Question)\s*[—\-:].*\n?/gim, '');
  // Strip markdown bold/italic/inline-code (** * __ _ `)
  out = out.replace(/\*\*([^*]+)\*\*/g, '$1');
  out = out.replace(/\*([^*]+)\*/g, '$1');
  out = out.replace(/__([^_]+)__/g, '$1');
  out = out.replace(/_([^_]+)_/g, '$1');
  out = out.replace(/`([^`]+)`/g, '$1');
  // Strip markdown links [text](url) → text
  out = out.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Strip markdown headings (# ## ###)
  out = out.replace(/^#{1,6}\s+/gm, '');
  // Collapse excessive blank lines
  out = out.replace(/\n{3,}/g, '\n\n').trim();
  return out;
}

interface AgentInfo {
  name: string;
  status: AgentStatus;
  description: string;
  phase?: PipelinePhase;
  toolsCompleted?: number;
  toolsTotal?: number;
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

/** Enhanced ToolEvent matching api.ts ToolKind */
interface ToolEvent {
  id: string;            // stable per (path) - last status wins
  kind: ToolKind;        // extended: read, write, edit, analyze, etc.
  path: string;
  label?: string;        // display label (e.g. "Reading src/App.tsx")
  detail?: string;       // additional info (e.g. "124 lines", "+12 -3")
  lines?: number;
  status: ToolStatus;
  agentName?: string;    // which agent emitted this tool event
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
  chatOnly?: boolean;
  // NEW: Advanced streaming state
  phase?: PipelinePhase;
  phaseProgress?: number;
  phaseElapsed?: number;
  toolEvents?: ToolEvent[];
  activeToolsByAgent?: Record<string, ToolEvent[]>;  // tools grouped by agent
  // Phase D: Transparent Agent narration state
  narration?: {
    mode?: AgentMode;
    modeReason?: string;
    todos?: TodoStep[];
    actions?: ActionEntry[];
    question?: { question: string; options?: string[]; reason?: string };
  };
  meta?: {
    securityScore?: number;
    qaScore?: number;
    complexity?: string;
    chatOnly?: boolean;
    capabilityPlan?: CapabilityPlan;
    elapsedTime?: number;
    tokensUsed?: number;
  };
}

type ChatEntry = UserMessage | BuildMessage;

// ─── Agent Definitions ────────────────────────────────────────────────────────
const AGENTS_DEF = [
  { name: 'Intent Parser',     Icon: ClipboardList, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30' },
  { name: 'Builder Agent',     Icon: Code2,         color: 'text-accent',   bg: 'bg-accent/10',   border: 'border-accent/30'   },
  { name: 'Preview Compiler',  Icon: Eye,           color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/30'   },
  { name: 'Repair Agent',      Icon: ShieldCheck,   color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30'  },
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; content: string }[]>([]);
  
  const [appMode, setAppMode] = useState<'build' | 'plan' | 'edit'>('build');
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-6');
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'code' | 'visual' | 'analytics'>('preview');
  const [isCustomDomainModalOpen, setIsCustomDomainModalOpen] = useState(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [deployStep, setDeployStep] = useState<'confirm' | 'deploying' | 'success' | 'error'>('confirm');
  const [deployResultUrl, setDeployResultUrl] = useState<string | null>(null);
  const [deployVercelUrl, setDeployVercelUrl] = useState<string | null>(null);
  const [deployCustomUrl, setDeployCustomUrl] = useState<string | null>(null);
  const [deployAliasAssigned, setDeployAliasAssigned] = useState<boolean>(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [deployCopied, setDeployCopied] = useState(false);
  const [deploySlug, setDeploySlug] = useState<string>('');
  const [deployBadgeEnabled, setDeployBadgeEnabled] = useState<boolean>(true);
  const [customDomain, setCustomDomain] = useState('');
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<{ selector: string, text: string } | null>(null);
  const [buildHistory, setBuildHistory] = useState<Build[]>([]);
  // Phase 6: persistent conversation memory per project
  const [conversationSummary, setConversationSummary] = useState<string>('');
  const [messageCount, setMessageCount] = useState<number>(0);
  const [isPreviewOnly, setIsPreviewOnly] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [isRenamingProject, setIsRenamingProject] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  // Undo/Redo state
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  // Undo/Redo hook with Supabase data
  const {
    builds: undoRedoBuilds,
    currentIndex: undoRedoCurrentIndex,
    canUndo,
    canRedo,
    isLoading: isUndoRedoLoading,
    isViewingHistory,
    undo,
    redo,
    resetToLive,
    jumpToVersion,
    refresh: refreshUndoRedo,
  } = useUndoRedo({
    projectId: currentProject?.id,
    getBuilds: async (projectId) => {
      const { data, error } = await supabase
        .from('builds')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    onRestore: (build) => {
      const restoredFiles = Array.isArray(build.files) ? build.files : [];
      if (restoredFiles.length > 0) {
        setGeneratedFiles(restoredFiles);
        setActiveFilePath(restoredFiles[0]?.path || null);
        setIsPreviewOnly(true);
      }
    },
    onResetToLive: () => {
      if (currentProject?.id) {
        // Reload latest build
        getBuilds(currentProject.id).then(builds => {
          const latest = builds[builds.length - 1];
          if (latest?.files?.length > 0) {
            setGeneratedFiles(latest.files);
            setActiveFilePath(latest.files[0].path);
          }
          setIsPreviewOnly(false);
        });
      }
    },
  });

  // Refresh undo/redo when project changes
  useEffect(() => {
    if (currentProject?.id) {
      refreshUndoRedo();
    }
  }, [currentProject?.id]);

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

  // Phase 6: Auto-load persistent conversation messages + summary when project changes
  useEffect(() => {
    if (!currentProject?.id || !user?.id) {
      setConversationSummary('');
      setMessageCount(0);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [dbMessages, summary, total] = await Promise.all([
          loadMessages(currentProject.id, 50),
          loadConversationSummary(currentProject.id),
          countMessages(currentProject.id),
        ]);
        if (cancelled) return;

        setConversationSummary(summary);
        setMessageCount(total);

        // Restore messages into the chat (only if we have DB messages and current state is fresh)
        if (dbMessages.length > 0) {
          const restored: ChatEntry[] = dbMessages.map(m => {
            if (m.role === 'user') {
              return {
                id: m.id,
                type: 'user' as const,
                content: m.content,
                timestamp: new Date(m.created_at).getTime(),
              };
            }
            // assistant
            return {
              id: m.id,
              type: 'build' as const,
              timestamp: new Date(m.created_at).getTime(),
              userPrompt: '',
              agents: [],
              thinkingLines: [],
              reply: m.content,
              replyVisible: m.content,
              files: [],
              filesVisible: 0,
              isComplete: true,
              isStreaming: false,
              meta: (m.meta as BuildMessage['meta']) || {},
            };
          });
          setMessages(restored);
        }
      } catch (err: any) {
        console.warn('[Memory] Failed to load messages:', err?.message);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject?.id, user?.id]);

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
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((m: any) => m && m.id && m.type);
    } catch {
      localStorage.removeItem('huggy_messages_v2');
      return [];
    }
  });
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isServerOnline, setIsServerOnline] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState<Array<{path: string, content: string}>>(() => {
    // Restore last generated files from localStorage so the preview survives a page refresh.
    // The DB load (when a project is selected) will overwrite this with the authoritative version.
    try {
      const saved = localStorage.getItem('huggy_generated_files');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((f: any) => f && typeof f.path === 'string' && typeof f.content === 'string');
    } catch {
      localStorage.removeItem('huggy_generated_files');
      return [];
    }
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewBuilding, setIsPreviewBuilding] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Live stream of the Builder Agent output for the VibeCodingOverlay
  const [liveStream, setLiveStream] = useState<string>('');
  const [activeAgentName, setActiveAgentName] = useState<string>('');

  // Build history drawer
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);


  // Build preview server-side (esbuild) whenever generated files change
  useEffect(() => {
    if (generatedFiles.length === 0) { setPreviewUrl(null); setPreviewError(null); return; }

    let cancelled = false;
    setIsPreviewBuilding(true);
    setPreviewError(null);

    fetch('/api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: generatedFiles, isEditMode }),
    })
      .then(async r => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || `Preview failed (${r.status})`);
        return data;
      })
      .then(({ id, error }) => {
        if (cancelled) return;
        if (error) throw new Error(error);
        setPreviewUrl(`/api/preview/${id}`);
      })
      .catch(err => {
        if (!cancelled) {
          setPreviewUrl(null);
          setPreviewError(err.message || 'Preview build failed');
          console.warn('[Preview] build failed:', err.message);
        }
      })
      .finally(() => { if (!cancelled) setIsPreviewBuilding(false); });

    return () => { cancelled = true; };
  }, [generatedFiles, isEditMode]);

  // Auto-save chat input
  useEffect(() => {
    localStorage.setItem('huggy_chat_input', chatInput);
  }, [chatInput]);

  // Auto-save messages
  useEffect(() => {
    localStorage.setItem('huggy_messages_v2', JSON.stringify(messages));
  }, [messages]);

  // Auto-save generated files so the preview survives a page refresh
  useEffect(() => {
    if (generatedFiles.length === 0) return; // Don't wipe on initial empty state
    try {
      const serialized = JSON.stringify(generatedFiles);
      // Skip persistence if project is huge (>2MB) — localStorage quota is typically 5-10MB
      // and other state (messages, summary, etc.) also needs room.
      if (serialized.length > 2_000_000) {
        console.warn('[Storage] Generated files exceed 2MB — skipping localStorage persistence');
        return;
      }
      localStorage.setItem('huggy_generated_files', serialized);
    } catch (e) {
      // Quota exceeded or storage disabled — silently ignore
      console.warn('[Storage] Failed to persist generated files:', (e as Error).message);
    }
  }, [generatedFiles]);

  // Smart sticky scroll - only auto-scroll if user is already near the bottom
  const scrollToBottom = useCallback((force = false) => {
    const el = chatScrollRef.current;
    if (!el) return;
    if (force || isAtBottomRef.current) {
      requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      });
    }
  }, []);

  useEffect(() => {
    if (isAtBottomRef.current) scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleChatScroll = useCallback(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isAtBottomRef.current = distanceFromBottom < 80;
    setShowScrollBtn(distanceFromBottom > 120);
  }, []);

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
        badgeEnabled: true, // Free tier always has badge
      });
      const { url, slug, badgeEnabled } = response.data;
      setDeployUrl(url);
      setDeploySlug(slug || '');
      setDeployBadgeEnabled(badgeEnabled !== false);
      
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


  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // ─── Streaming Build Pipeline ───────────────────────────────────────────────
  // Ref to accumulate live reply text without depending on React state batching
  const liveReplyRef = useRef('');
  // Ref to the typewriter queue: chars waiting to be displayed
  const typewriterQueueRef = useRef<string>('');
  const typewriterActiveRef = useRef(false);

  const startBuild = async () => {
    if (!chatInput.trim() || isBuilding) return;

    // Cancel any existing stream before starting new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    const prompt = chatInput.trim();
    const buildId = `build-${Date.now()}`;
    const userId = `user-${Date.now()}`;
    liveReplyRef.current = ''; // reset for this build
    typewriterQueueRef.current = '';
    typewriterActiveRef.current = false;

    // Initial agents state — all idle
    const initialAgents: AgentInfo[] = AGENTS_DEF.map(a => ({
      name: a.name, status: 'idle' as AgentStatus, description: '',
    }));

    // Push user message + empty build message AVANT tout appel async
    setMessages(prev => [
      ...prev,
      { id: userId, type: 'user' as const, content: prompt, timestamp: Date.now() },
      {
        id: buildId, type: 'build' as const, timestamp: Date.now(), userPrompt: prompt,
        agents: initialAgents, thinkingLines: [],
        reply: '', replyVisible: '', files: [], filesVisible: 0,
        isComplete: false, isStreaming: true,
      },
    ]);

    setIsBuilding(true);
    setIsConnecting(true);
    setChatInput('');
    setLiveStream('');
    setActiveAgentName('');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Track silencieusement (ne bloque pas)
    try { trackBuild(currentProject?.id || 'unknown', 'started', { promptLength: prompt.length, model: selectedModel }); } catch {}

    let projectId = currentProject?.id;
    if (!projectId && user?.id) {
      try {
        const proj = await createProject(prompt.slice(0, 50), prompt);
        projectId = proj?.id;
      } catch { /* continue without project */ }
    }

    // Phase 6: persist the user message to DB (fire-and-forget, non-blocking)
    if (projectId && user?.id) {
      saveMessage({
        projectId,
        userId: user.id,
        role: 'user',
        content: prompt,
      }).then(() => setMessageCount(c => c + 1)).catch(() => {});
    }

    try {
      await startBuildPipeline(prompt, async (event) => {
        // Update connecting state on first event
        if (isConnecting) setIsConnecting(false);


        // ── Agent progress ──────────────────────────────────────────────────
        if (event.type === 'agent' || event.type === 'agent_start' || event.type === 'agent_active' || event.type === 'agent_complete') {
          setMessages(prev => prev.map(m => {
            if (m.id !== buildId || m.type !== 'build') return m;
            const bm = m as BuildMessage;
            const currentAgents = Array.isArray(bm.agents) ? bm.agents : initialAgents;
            const agentIndex = typeof event.agentIndex === 'number'
              ? event.agentIndex
              : typeof event.index === 'number'
                ? event.index
                : currentAgents.findIndex(a => a.name === event.agent);
            const updatedAgents = currentAgents.map((a, i) =>
              i === agentIndex
                ? {
                    ...a,
                    status: (event.status || (event.type === 'agent_complete' ? 'completed' : 'active')) as AgentStatus,
                    description: event.description || event.message || '',
                    phase: event.phase || a.phase,
                  }
                : a
            );
            const newThinking = (event.status === 'active' || event.type === 'agent_active') && event.description
              ? [...(Array.isArray(bm.thinkingLines) ? bm.thinkingLines : []), `[${event.agent}] ${event.description}`]
              : (Array.isArray(bm.thinkingLines) ? bm.thinkingLines : []);
            return { ...bm, agents: updatedAgents, thinkingLines: newThinking };
          }));
        }

        // ── Agent skip (conditional agent didn't run) ─────────────────────────
        if (event.type === 'agent_skip') {
          setMessages(prev => prev.map(m => {
            if (m.id !== buildId || m.type !== 'build') return m;
            const bm = m as BuildMessage;
            const currentAgents = Array.isArray(bm.agents) ? bm.agents : initialAgents;
            const agentIndex = currentAgents.findIndex(a => a.name === event.agent);
            if (agentIndex === -1) return m;
            const updatedAgents = currentAgents.map((a, i) =>
              i === agentIndex
                ? { ...a, status: 'skipped' as AgentStatus, description: event.reason || 'Skipped' }
                : a
            );
            return { ...bm, agents: updatedAgents };
          }));
        }

        // ── Phase change events ───────────────────────────────────────────────
        if (event.type === 'phase_start' || event.type === 'phase_progress' || event.type === 'phase_complete') {
          setMessages(prev => prev.map(m => {
            if (m.id !== buildId || m.type !== 'build') return m;
            const bm = m as BuildMessage;
            return {
              ...bm,
              phase: event.phase as PipelinePhase || bm.phase,
              phaseProgress: event.phaseProgress || bm.phaseProgress || 0,
            };
          }));
        }

        // ── Tool events (granular actions) ──────────────────────────────────
        if (event.type === 'tool' || event.type === 'tool_start' || event.type === 'tool_progress' || event.type === 'tool_complete') {
          setMessages(prev => prev.map(m => {
            if (m.id !== buildId || m.type !== 'build') return m;
            const bm = m as BuildMessage;

            // Create or update tool event
            const toolId = event.toolId || `${event.tool}-${event.path || event.toolLabel}`;
            const existingTools = bm.toolEvents || [];
            const existingIndex = existingTools.findIndex(t => t.id === toolId);

            const newTool: ToolEvent = {
              id: toolId,
              kind: (event.tool || 'write') as ToolKind,
              path: event.path || event.toolLabel || '',
              label: event.toolLabel || event.path || '',
              detail: event.toolDetail || (event.lines ? `${event.lines} lines` : undefined),
              lines: event.lines,
              status: (event.toolStatus || (event.type === 'tool_complete' ? 'completed' : 'active')) as ToolStatus,
              agentName: event.agent,
              timestamp: Date.now(),
            };

            let updatedTools: ToolEvent[];
            if (existingIndex >= 0) {
              // Update existing tool
              updatedTools = existingTools.map((t, i) => i === existingIndex ? newTool : t);
            } else {
              // Add new tool
              updatedTools = [...existingTools, newTool];
            }

            // Group tools by agent for display
            const activeToolsByAgent: Record<string, ToolEvent[]> = {};
            updatedTools.forEach(tool => {
              const agent = tool.agentName || 'Builder Agent';
              if (!activeToolsByAgent[agent]) activeToolsByAgent[agent] = [];
              activeToolsByAgent[agent].push(tool);
            });

            return { ...bm, toolEvents: updatedTools, activeToolsByAgent };
          }));
        }

        // ── Metrics event ─────────────────────────────────────────────────────
        if (event.type === 'metrics' && event.metrics) {
          setMessages(prev => prev.map(m => {
            if (m.id !== buildId || m.type !== 'build') return m;
            const bm = m as BuildMessage;
            return {
              ...bm,
              meta: {
                ...bm.meta,
                elapsedTime: event.metrics?.duration,
                tokensUsed: (event.metrics?.tokensIn || 0) + (event.metrics?.tokensOut || 0),
              },
            };
          }));
        }

        if (event.type === 'thinking') {
          const line = event.thinkingLine || event.description || event.message;
          if (line) {
            setMessages(prev => prev.map(m => {
              if (m.id !== buildId || m.type !== 'build') return m;
              const bm = m as BuildMessage;
              const thinkingLines = Array.isArray(bm.thinkingLines) ? bm.thinkingLines : [];
              return { ...bm, thinkingLines: [...thinkingLines, `[${event.agent || 'AI'}] ${line}`] };
            }));
          }
        }

        if (event.type === 'reply') {
          const chunk = event.replyChunk || event.reply || '';
          if (chunk) {
            // JSON-emitting agents should NEVER stream into the user-visible chat.
            // Their raw JSON output would leak (e.g. "{ \"intent\": \"conversation\", ... }")
            // and the actual conversation handler will provide the final clean reply.
            const JSON_AGENTS = new Set([
              'Intent Parser', 'Product Manager', 'DBA Architect', 'UX Designer',
              'Security Auditor', 'QA Reviewer', 'i18n Agent', 'Capability Planner',
              'Web Research',
            ]);
            if (event.agent === 'Builder Agent' || event.agent === 'Repair Agent') {
              // Code stream → visual overlay only, not chat reply
              setLiveStream(prev => (prev + chunk).slice(-8000));
              setActiveAgentName(event.agent);
            } else if (event.agent && JSON_AGENTS.has(event.agent)) {
              // Silently drop — these agents emit JSON, not conversation
              return;
            } else {
              // Chat reply: accumulate in ref (source of truth)
              liveReplyRef.current += chunk;
              // Enqueue new chars for typewriter display
              typewriterQueueRef.current += chunk;

              // Start typewriter loop if not already running
              if (!typewriterActiveRef.current) {
                typewriterActiveRef.current = true;
                const pump = () => {
                  if (typewriterQueueRef.current.length === 0) {
                    typewriterActiveRef.current = false;
                    return;
                  }
                  // Consume 1-2 chars per tick for natural feel
                  const take = Math.min(2, typewriterQueueRef.current.length);
                  const chars = typewriterQueueRef.current.slice(0, take);
                  typewriterQueueRef.current = typewriterQueueRef.current.slice(take);
                  setMessages(prev => prev.map(m => {
                    if (m.id !== buildId || m.type !== 'build') return m;
                    const bm = m as BuildMessage;
                    const next = (bm.replyVisible || '') + chars;
                    return { ...bm, replyVisible: next };
                  }));
                  // 22ms between ticks ≈ Claude speed (~45 chars/s)
                  setTimeout(pump, 22);
                };
                setTimeout(pump, 22);
              }
            }
          }
        }

        // ── Pipeline complete ───────────────────────────────────────────────
        if (event.type === 'complete') {
          const finalFiles: FileEntry[] = event.files || [];

          // Store files for preview
          if (finalFiles.length) {
            setGeneratedFiles(finalFiles);
            setActiveFilePath(finalFiles[0].path);
          }

          // Read accumulated live reply from ref (always accurate, no batching issue)
          const alreadyStreamed = liveReplyRef.current;
          // Use event.reply only if nothing was streamed live
          const fullReply = alreadyStreamed.length > 0
            ? alreadyStreamed
            : (event.reply || '✅ Application générée avec succès.');

          const isChatOnly = event.meta?.chatOnly ?? (finalFiles.length === 0);

          if (alreadyStreamed.length > 0) {
            // Reply was streamed live via typewriter pump.
            // Mark complete metadata but DO NOT touch replyVisible — let the pump finish naturally.
            // Wait for the pump to drain, then finalize.
            const finalize = () => {
              if (typewriterActiveRef.current || typewriterQueueRef.current.length > 0) {
                // Still pumping — check again in 50ms
                setTimeout(finalize, 50);
                return;
              }
              setMessages(prev => prev.map(m => {
                if (m.id !== buildId || m.type !== 'build') return m;
                const bm = m as BuildMessage;
                return {
                  ...bm,
                  reply: fullReply,
                  replyVisible: bm.replyVisible || fullReply, // keep what's already displayed
                  files: finalFiles,
                  filesVisible: finalFiles.length,
                  isComplete: true,
                  isStreaming: false,
                  chatOnly: isChatOnly || bm.chatOnly,
                  meta: {
                    ...bm.meta,
                    securityScore: event.meta?.securityScore,
                    qaScore: event.meta?.qaScore,
                    complexity: event.meta?.complexity,
                    chatOnly: isChatOnly || bm.chatOnly,
                  },
                };
              }));
            };
            // First update metadata (isComplete) without touching replyVisible
            setMessages(prev => prev.map(m => {
              if (m.id !== buildId || m.type !== 'build') return m;
              const bm = m as BuildMessage;
              return {
                ...bm,
                files: finalFiles,
                isComplete: true,
                chatOnly: isChatOnly || bm.chatOnly,
                meta: {
                  ...bm.meta,
                  securityScore: event.meta?.securityScore,
                  qaScore: event.meta?.qaScore,
                  complexity: event.meta?.complexity,
                  chatOnly: isChatOnly || bm.chatOnly,
                },
              };
            }));
            setTimeout(finalize, 50);
          } else {
            // Nothing was streamed live — use slow typewriter (Claude style: 25ms per char)
            setMessages(prev => prev.map(m => {
              if (m.id !== buildId || m.type !== 'build') return m;
              const bm = m as BuildMessage;
              return {
                ...bm,
                reply: fullReply,
                replyVisible: '',
                files: finalFiles,
                filesVisible: 0,
                isComplete: true,
                isStreaming: true,
                chatOnly: isChatOnly || bm.chatOnly,
                meta: {
                  ...bm.meta,
                  securityScore: event.meta?.securityScore,
                  qaScore: event.meta?.qaScore,
                  complexity: event.meta?.complexity,
                  chatOnly: isChatOnly || bm.chatOnly,
                },
              };
            }));
            // Slow typewriter: ~25ms per character, feels like Claude
            let charIndex = 0;
            const typeNext = () => {
              charIndex = Math.min(charIndex + 2, fullReply.length);
              setMessages(prev => prev.map(m => {
                if (m.id !== buildId || m.type !== 'build') return m;
                return { ...(m as BuildMessage), replyVisible: fullReply.slice(0, charIndex) };
              }));
              if (charIndex < fullReply.length) {
                setTimeout(typeNext, 18);
              } else {
                // Done typing — reveal files then finalize
                finalFiles.forEach((_, fileIdx) => {
                  setTimeout(() => {
                    setMessages(prev => prev.map(m => {
                      if (m.id !== buildId || m.type !== 'build') return m;
                      return { ...(m as BuildMessage), filesVisible: fileIdx + 1 };
                    }));
                  }, fileIdx * 150 + 200);
                });
                setTimeout(() => {
                  setMessages(prev => prev.map(m => {
                    if (m.id !== buildId || m.type !== 'build') return m;
                    return { ...(m as BuildMessage), isStreaming: false };
                  }));
                }, finalFiles.length * 150 + 500);
              }
            };
            setTimeout(typeNext, 50);
          }

          setIsBuilding(false);

          if (projectId) {
            try {
              await saveBuild(projectId, prompt, { files: event.files, reply: event.reply, meta: event.meta });
              await refreshProfile();
            } catch (e) { console.warn('Failed to save build:', e); }

            // Phase 6: persist assistant reply for conversation memory
            if (user?.id && fullReply) {
              saveMessage({
                projectId,
                userId: user.id,
                role: 'assistant',
                content: fullReply.slice(0, 5000),
                meta: {
                  files_count: finalFiles.length,
                  security_score: event.meta?.securityScore,
                  qa_score: event.meta?.qaScore,
                  complexity: event.meta?.complexity,
                },
              }).then(async () => {
                const newCount = messageCount + 2;
                setMessageCount(newCount);
                // Auto-summarize when conversation grows beyond 30 messages
                if (newCount > 30 && newCount % 10 === 0) {
                  try {
                    const old = await loadMessages(projectId, newCount - 20);
                    const toSummarize = old.slice(0, -20); // keep 20 most recent untouched
                    if (toSummarize.length > 0) {
                      const { summary, compressed } = await requestSummary(
                        toSummarize.map(m => ({ role: m.role, content: m.content })),
                        conversationSummary,
                      );
                      if (compressed && summary) {
                        setConversationSummary(summary);
                        await supabase
                          .from('projects')
                          .update({ conversation_summary: summary, summary_message_count: toSummarize.length })
                          .eq('id', projectId);
                      }
                    }
                  } catch (sErr) {
                    console.warn('[Memory] summarize failed:', sErr);
                  }
                }
              }).catch(() => {});
            }
          }
        }

        // ── Early meta (e.g., chatOnly flag, capabilityPlan) ─────────────
        if (event.type === 'meta' && event.meta) {
          const isChatOnly = !!event.meta.chatOnly;
          const capPlan = event.meta.capabilityPlan;
          if (isChatOnly || capPlan) {
            setMessages(prev => prev.map(m => {
              if (m.id !== buildId || m.type !== 'build') return m;
              const bm = m as BuildMessage;
              const nextMeta = { ...(bm.meta || {}) };
              if (isChatOnly) nextMeta.chatOnly = true;
              if (capPlan) nextMeta.capabilityPlan = capPlan as CapabilityPlan;
              return { ...bm, chatOnly: isChatOnly || bm.chatOnly, meta: nextMeta };
            }));
          }
        }

        // ── Partial files (progressive display) ────────────────────────────
        if (event.type === 'files_partial' && Array.isArray(event.files) && event.files.length > 0) {
          setGeneratedFiles(event.files as FileEntry[]);
          if (!activeFilePath) setActiveFilePath(event.files[0].path);
        }

        // -- Granular tool events (per-file start / progress / complete) ----
        if (event.type === 'tool' && event.kind && event.path) {
          const path = event.path;
          const kind = event.kind as 'start' | 'progress' | 'complete';
          const lines = typeof event.lines === 'number' ? event.lines : undefined;
          setMessages(prev => prev.map(m => {
            if (m.id !== buildId || m.type !== 'build') return m;
            const bm = m as BuildMessage;
            const existing = bm.toolEvents || [];
            const idx = existing.findIndex(e => e.path === path);
            const nextStatus: 'active' | 'completed' = kind === 'complete' ? 'completed' : 'active';
            const nextEntry: ToolEvent = {
              id: path,
              kind: 'write',
              path,
              lines: lines ?? existing[idx]?.lines,
              status: nextStatus,
            };
            const toolEvents = idx >= 0
              ? existing.map((e, i) => (i === idx ? nextEntry : e))
              : [...existing, nextEntry];
            return { ...bm, toolEvents };
          }));
        }

        // ── Phase D: Transparent Agent narration events ─────────────────────
        if (event.type === 'mode_announce' && event.mode) {
          const mode = event.mode as AgentMode;
          const reason = event.reason || '';
          setMessages(prev => prev.map(m => {
            if (m.id !== buildId || m.type !== 'build') return m;
            const bm = m as BuildMessage;
            return {
              ...bm,
              narration: {
                ...(bm.narration || {}),
                mode,
                modeReason: reason,
              },
            };
          }));
        }

        if (event.type === 'question' && event.question) {
          const q = {
            question: event.question,
            options: Array.isArray(event.options) ? event.options : [],
            reason: event.reason || '',
          };
          setMessages(prev => prev.map(m => {
            if (m.id !== buildId || m.type !== 'build') return m;
            const bm = m as BuildMessage;
            return {
              ...bm,
              narration: { ...(bm.narration || {}), question: q },
            };
          }));
        }

        if (event.type === 'todo_init' && Array.isArray(event.steps)) {
          const todos: TodoStep[] = event.steps.map(s => ({
            id: s.id,
            label: s.label,
            status: (s.status as TodoStatus) || 'pending',
          }));
          setMessages(prev => prev.map(m => {
            if (m.id !== buildId || m.type !== 'build') return m;
            const bm = m as BuildMessage;
            return { ...bm, narration: { ...(bm.narration || {}), todos } };
          }));
        }

        if (event.type === 'todo_update' && event.stepId && event.todoStatus) {
          const stepId = event.stepId;
          const status = event.todoStatus as TodoStatus;
          setMessages(prev => prev.map(m => {
            if (m.id !== buildId || m.type !== 'build') return m;
            const bm = m as BuildMessage;
            const existing = bm.narration?.todos || [];
            const updated = existing.map(t => (t.id === stepId ? { ...t, status } : t));
            return { ...bm, narration: { ...(bm.narration || {}), todos: updated } };
          }));
        }

        if (event.type === 'action_log' && event.tool && event.action) {
          const entry: ActionEntry = {
            id: event.actionId || `action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            tool: event.tool,
            action: event.action,
            why: event.why,
            next: event.next,
          };
          setMessages(prev => prev.map(m => {
            if (m.id !== buildId || m.type !== 'build') return m;
            const bm = m as BuildMessage;
            const actions = [...(bm.narration?.actions || []), entry];
            return { ...bm, narration: { ...(bm.narration || {}), actions } };
          }));
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

      },
        // CRITICAL FIX: only pass existing files when EXPLICITLY in edit mode.
        // Otherwise new app requests after a previous build get forced into edit mode
        // by the looksLikeEditRequest heuristic because generatedFiles persists in localStorage.
        appMode === 'edit' ? generatedFiles : [],
        // Build chat history from current messages (Phase 6: extended to 20 turns, 600 chars)
        messages
          .filter(m => m.type === 'user' || (m.type === 'build' && (m as BuildMessage).isComplete))
          .slice(-20)
          .map(m => ({
            role: m.type === 'user' ? 'user' : 'assistant',
            content: m.type === 'user'
              ? (m as UserMessage).content
              : ((m as BuildMessage).reply || '').slice(0, 600),
          } as ChatHistoryEntry)),
        { signal: controller.signal, onConnecting: () => setIsConnecting(true), conversationSummary }
      );
    } catch (error) {
      // Don't show error if intentionally cancelled
      if ((error as Error).message === 'Stream cancelled' || controller.signal.aborted) {
        return;
      }
      const errMsg = error instanceof Error ? error.message : String(error);
      const errReply = `❌ Connexion échouée: ${errMsg}`;
      setMessages(prev => prev.map(m => {
        if (m.id !== buildId || m.type !== 'build') return m;
        return { ...(m as BuildMessage), reply: errReply, replyVisible: errReply, isComplete: true, isStreaming: false };
      }));
    } finally {
      setIsBuilding(false);
      setIsConnecting(false);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  };

  const stopBuild = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsBuilding(false);
    setIsConnecting(false);
    setMessages(prev => prev.map(m => {
      if (m.type !== 'build') return m;
      const bm = m as BuildMessage;
      if (!bm.isComplete && bm.isStreaming) {
        return { ...bm, isComplete: true, isStreaming: false, replyVisible: (bm.replyVisible || '') + '\n\n⏹ Génération interrompue.' };
      }
      return m;
    }));
  };

  const copyMessage = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMsgId(id);
      setTimeout(() => setCopiedMsgId(prev => prev === id ? null : prev), 2000);
    } catch {}
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
      <div className="min-h-screen bg-bg-deep flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-huggy-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-zinc-500 font-medium">Loading Huggy…</p>
        </div>
      </div>
    );
  }


  if (isPreviewOnly) {
    return (
      <div className="fixed inset-0 bg-bg-deep flex flex-col">
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
    <div className={`flex flex-col h-screen overflow-hidden font-sans transition-colors duration-300 ${
      theme === 'dark' 
        ? 'bg-bg-deep text-text-secondary' 
        : 'bg-bg-deep text-text-secondary'
    }`}>
      {/* Top Header */}
      <header className={`flex items-center justify-between px-4 border-b h-14 shrink-0 z-10 transition-colors duration-300 ${
        theme === 'dark'
          ? 'border-border-subtle bg-bg-surface'
          : 'border-border-subtle bg-bg-surface'
      }`}>
        {/* ── LEFT ──────────────────────────────────────────── */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="flex items-center gap-2 pl-1">
            {/* Logo Icon */}
            <div className="flex items-center cursor-pointer h-14 px-1" onClick={() => navigate('/')}>
              <HuggyLogo size="md" />
            </div>
            
            {/* Home Link Section */}
            <div className="flex items-center gap-2.5 ml-1 relative z-[55]">
              <div 
                onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                className={`w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-zinc-50 transition-all cursor-pointer group ${theme === 'dark' ? 'border-zinc-700' : 'border-zinc-200'}`}
              >
                <Home className={`w-4 h-4 transition-colors ${isHeaderMenuOpen ? 'text-accent' : 'text-text-muted group-hover:text-text-secondary'}`} />
              </div>
              <AnimatePresence>
                {isHeaderMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsHeaderMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full left-0 mt-2 w-64 bg-bg-elevated border border-border-default rounded-xl z-[60] py-2 overflow-hidden backdrop-blur-xl shadow-2xl"
                    >
                      {/* User Info Section */}
                      <div className="px-4 py-3 border-b border-zinc-800/50">
                        <div className="text-xs font-bold text-zinc-100">{profile?.full_name || user?.email?.split('@')[0] || 'User'}</div>
                        <div className="text-[10px] text-zinc-500 truncate">{user?.email || ''}</div>
                      </div>

                      {/* Credits Section */}
                      <div className="px-4 py-3 border-b border-border-subtle bg-accent/5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Credits Huggy</span>
                          <span className="text-[10px] text-accent-text font-mono">{(profile?.plan || 'free').toUpperCase()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-accent/20 rounded-md">
                            <Coins className="w-4 h-4 text-accent" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-zinc-100">{profile?.credits ?? 0} <span className="text-zinc-500 font-normal">/ {profile?.max_credits ?? 500}</span></div>
                            <div className="w-32 h-1 bg-bg-hover rounded-full mt-1 overflow-hidden">
                              <div className="h-full bg-accent transition-all" style={{ width: `${Math.round(((profile?.credits ?? 0) / (profile?.max_credits ?? 500)) * 100)}%` }} />
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
                            <Layout className="w-4 h-4 text-text-muted group-hover:text-accent" />
                            User Dashboard
                          </div>
                          <ExternalLink className="w-3 h-3 text-zinc-600" />
                        </button>
                        <button className="w-full flex items-center gap-2 px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-lg transition-all text-xs font-medium group">
                          <Settings className="w-4 h-4 text-text-muted group-hover:text-accent" />
                          Project Settings
                        </button>
                        <button className="w-full flex items-center gap-2 px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-lg transition-all text-xs font-medium group text-zinc-100">
                          <CreditCard className="w-4 h-4 text-text-muted group-hover:text-accent" />
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
              <button
                onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
                className={`rounded-[14px] px-4 py-2 flex items-center gap-2 shadow-sm border transition-all ${theme === 'dark' ? 'bg-zinc-900/60 border-zinc-700/60 hover:bg-zinc-800/80' : 'bg-white border-zinc-200 hover:bg-zinc-50'}`}
              >
                <span className={`font-display font-bold text-[13px] tracking-tight leading-none ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'}`}>{currentProject?.name || 'New Project'}</span>
                <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${isProjectMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isProjectMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => { setIsProjectMenuOpen(false); setIsRenamingProject(false); }} />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      className={`absolute top-full left-0 mt-2 w-64 rounded-xl z-[60] py-2 border overflow-hidden bg-bg-elevated border-border-default shadow-2xl`}
                    >
                      {/* Current project header */}
                      <div className={`px-4 py-2.5 border-b text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-zinc-500 border-zinc-800/50' : 'text-zinc-400 border-zinc-100'}`}>
                        Current Project
                      </div>

                      {/* Rename */}
                      {isRenamingProject ? (
                        <div className="px-3 py-2">
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            onKeyDown={async e => {
                              if (e.key === 'Enter' && renameValue.trim() && currentProject) {
                                await createProject(renameValue.trim(), 'New project created from rename');
                                setIsRenamingProject(false);
                                setIsProjectMenuOpen(false);
                              }
                              if (e.key === 'Escape') setIsRenamingProject(false);
                            }}
                            className={`w-full text-sm px-3 py-1.5 rounded-lg border outline-none focus:ring-1 focus:ring-accent bg-bg-surface border-border-default text-text-primary`}
                            placeholder="Project name…"
                          />
                          <p className="text-[10px] text-zinc-500 mt-1 px-1">Press Enter to confirm</p>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setRenameValue(currentProject?.name || ''); setIsRenamingProject(true); }}
                          className={`w-full flex items-center gap-2.5 px-4 py-2 text-left text-xs transition-colors ${theme === 'dark' ? 'text-zinc-300 hover:bg-zinc-800/60' : 'text-zinc-600 hover:bg-zinc-50'}`}
                        >
                          <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                          Rename project
                        </button>
                      )}

                      {/* Switch project */}
                      {projects && projects.length > 1 && (
                        <>
                          <div className={`px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400'}`}>Switch to</div>
                          {projects.filter(p => p.id !== currentProject?.id).slice(0, 4).map(proj => (
                            <button
                              key={proj.id}
                              onClick={() => { setCurrentProject(proj); setIsProjectMenuOpen(false); }}
                              className={`w-full flex items-center gap-2.5 px-4 py-2 text-left text-xs transition-colors ${theme === 'dark' ? 'text-zinc-300 hover:bg-zinc-800/60' : 'text-zinc-600 hover:bg-zinc-50'}`}
                            >
                              <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
                              {proj.name}
                            </button>
                          ))}
                        </>
                      )}

                      {/* Separator + New project */}
                      <div className={`border-t mt-1 pt-1 ${theme === 'dark' ? 'border-zinc-800/50' : 'border-zinc-100'}`}>
                        <button
                          onClick={async () => {
                            const name = `Project ${(projects?.length || 0) + 1}`;
                            await createProject(name, 'New project created');
                            setIsProjectMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-4 py-2 text-left text-xs font-medium transition-colors text-accent hover:bg-bg-hover`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          New Project
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
            {/* Panel + history toggles */}
            <div className={`flex items-center gap-0.5 ml-3 pl-3 border-l ${theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className={`p-1.5 rounded-md transition-colors ${isSidebarCollapsed ? 'bg-accent/20 text-accent' : 'hover:bg-bg-hover text-text-muted hover:text-text-secondary'}`}
                title="Toggle Chat"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsHistoryOpen(true)}
                className={`p-1.5 rounded-md transition-colors ${isHistoryOpen ? 'bg-blue-600/20 text-blue-400' : (theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300' : 'hover:bg-zinc-100 text-zinc-400')}`}
                title="Historique des versions"
              >
                <History className="w-4 h-4" />
              </button>
            </div>
        </div>

        {/* ── CENTER ────────────────────────────────────────── */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1">
          <div className={`flex items-center gap-0.5 p-0.5 rounded-lg border ${theme === 'dark' ? 'bg-zinc-900/60 border-zinc-800/60' : 'bg-zinc-50 border-zinc-200'}`}>
            <button
              onClick={() => setViewMode('preview')}
              aria-label="Preview mode"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                viewMode === 'preview'
                  ? (theme === 'dark' ? 'bg-zinc-800 text-white shadow-sm' : 'bg-white text-zinc-800 shadow-sm')
                  : (theme === 'dark' ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600')
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              Preview
            </button>
            <button
              onClick={() => setViewMode('code')}
              aria-label="Code mode"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                viewMode === 'code'
                  ? (theme === 'dark' ? 'bg-zinc-800 text-white shadow-sm' : 'bg-white text-zinc-800 shadow-sm')
                  : (theme === 'dark' ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600')
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              Code
            </button>
          </div>

          {/* Device picker */}
          <div className="relative">
            <button
              onClick={() => setIsDeviceMenuOpen(!isDeviceMenuOpen)}
              className={`p-1.5 rounded-md border transition-colors ${
                theme === 'dark'
                  ? 'bg-zinc-900/60 border-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100'
              }`}
              title="Device"
            >
              <CurrentIcon className="w-3.5 h-3.5" />
            </button>
            <AnimatePresence>
              {isDeviceMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsDeviceMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.95 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-44 bg-[#161617] border border-zinc-800 rounded-xl shadow-2xl z-20 py-1 overflow-hidden"
                  >
                    {devices.map((device) => (
                      <button
                        key={device.id}
                        onClick={() => { setSelectedDevice(device.id as any); setIsDeviceMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2 transition-colors text-left text-xs ${
                          selectedDevice === device.id
                            ? 'bg-zinc-800/60 text-zinc-100'
                            : 'text-zinc-400 hover:bg-zinc-800/30 hover:text-zinc-200'
                        }`}
                      >
                        <device.icon className={`w-4 h-4 ${selectedDevice === device.id ? 'text-blue-400' : ''}`} />
                        {device.label}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Undo/Redo Toolbar */}
          <div className="border-l border-zinc-800/50 pl-2 ml-1">
            <UndoRedoToolbar
              canUndo={canUndo}
              canRedo={canRedo}
              isViewingHistory={isViewingHistory}
              onUndo={undo}
              onRedo={redo}
              onResetToLive={resetToLive}
              onOpenHistory={() => setIsHistoryDrawerOpen(true)}
            />
          </div>
        </div>

        {/* ── RIGHT ─────────────────────────────────────────── */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Theme toggle icon button */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className={`p-1.5 rounded-md border transition-all duration-200 ${
              theme === 'dark'
                ? 'border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:text-yellow-400 hover:border-zinc-600'
                : 'border-zinc-200 bg-zinc-50 text-zinc-500 hover:text-blue-500 hover:bg-zinc-100'
            }`}
          >
            <AnimatePresence mode="wait" initial={false}>
              {theme === 'dark' ? (
                <motion.span key="sun" initial={{ rotate: -45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 45, opacity: 0 }} transition={{ duration: 0.15 }} className="block">
                  <Sun className="w-4 h-4" />
                </motion.span>
              ) : (
                <motion.span key="moon" initial={{ rotate: 45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -45, opacity: 0 }} transition={{ duration: 0.15 }} className="block">
                  <Moon className="w-4 h-4" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* Deploy button */}
          <button
            onClick={() => {
              if (generatedFiles.length === 0) {
                alert('Veuillez d\'abord générer des fichiers avant de déployer.');
                return;
              }
              setDeployStep('confirm'); setDeployResultUrl(null); setDeployError(null); setIsDeployModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 text-white text-[11px] font-bold rounded-lg hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20"
          >
            <Cloud className="w-3.5 h-3.5" />
            Deploy
          </button>
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
              <div className="relative flex-1 min-h-0">
              <div
                ref={chatScrollRef}
                onScroll={handleChatScroll}
                className={`h-full rounded-2xl border overflow-hidden shadow-inner flex flex-col p-4 overflow-y-auto scrollbar-hide ${theme === 'dark' ? 'bg-[#161617] border-zinc-800/50' : 'bg-zinc-50 border-zinc-200'}`}>
                {messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 opacity-30">
                    <Clock className="w-8 h-8 mb-3" />
                    <p className="text-xs font-medium">No history yet</p>
                    <p className="text-[10px] mt-1">Your conversations will appear here</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-5">
                    {messages.map((entry, index) => {

                      // ── User message ──────────────────────────────────────
                      if (entry.type === 'user') {
                        return (
                          <motion.div 
                            key={entry.id} 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
                            className="flex justify-end"
                          >
                            <div className="group relative max-w-[85%] bg-indigo-600/20 border border-indigo-500/30 rounded-2xl rounded-tr-sm px-3.5 py-2.5">
                              <p className="text-xs text-zinc-200 leading-relaxed select-text">{entry.content}</p>
                              <span className="text-[9px] text-zinc-600 mt-1 block text-right">
                                {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <button
                                onClick={() => copyMessage(entry.id, entry.content)}
                                className="absolute -top-2 -left-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200"
                                title="Copier"
                              >
                                {copiedMsgId === entry.id ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          </motion.div>
                        );
                      }

                      // ── Build message ─────────────────────────────────────
                      const bm = entry as BuildMessage;

                      if (bm.chatOnly || bm.meta?.chatOnly) {
                        const text = stripCodeBlocks(bm.replyVisible || bm.reply || '');
                        return (
                          <ConversationMessage
                            key={bm.id}
                            id={bm.id}
                            text={text}
                            isStreaming={!!bm.isStreaming}
                            timestamp={bm.timestamp}
                            theme={theme}
                            copied={copiedMsgId === bm.id}
                            onCopy={() => copyMessage(bm.id, text)}
                          />
                        );
                      }

                      const safeAgents = Array.isArray(bm.agents) ? bm.agents : [];
                      const safeFiles = Array.isArray(bm.files) ? bm.files : [];
                      const safeFilesVisible = typeof bm.filesVisible === 'number' ? bm.filesVisible : 0;

                      // ── Derive UI state from raw agent events ────────────
                      const activeAgent = safeAgents.find(a => a.status === 'active');
                      const allDone = safeAgents.length > 0 && safeAgents.every(a => a.status === 'completed' || a.status === 'skipped');

                      // Check if this is the latest message and we're connecting
                      const isLatestMessage = index === messages.length - 1;
                      const showConnecting = isLatestMessage && isConnecting && !bm.isComplete;

                      // Map agent name → pipeline phase for the StatusPill
                      // NEW: Use bm.phase from streaming events if available
                      let phase: PipelinePhase = bm.phase || 'thinking';
                      if (bm.isComplete || allDone) phase = 'done';
                      else if (showConnecting) phase = 'initializing';
                      // Fallback to agent-based mapping if no phase from events
                      else if (!bm.phase) {
                        if (activeAgent?.name === 'Intent Parser') phase = 'understanding';
                        else if (activeAgent?.name === 'Builder Agent') phase = 'coding';
                        else if (activeAgent?.name === 'Preview Compiler') phase = 'building';
                        else if (activeAgent?.name === 'Repair Agent') phase = 'repairing';
                      }

                      // Build the AgentNode[] for the timeline
                      const timelineAgents: AgentNode[] = AGENTS_DEF.map((def, idx) => {
                        const a = safeAgents[idx];
                        return {
                          name: def.name,
                          status: (a?.status || 'idle') as AgentStepStatus,
                          description: a?.description,
                        };
                      });

                      // Tool blocks under each agent using activeToolsByAgent (NEW streaming)
                      // or fall back to bm.toolEvents / files for backwards-compat.
                      const visibleFiles = safeFiles.slice(0, Math.max(safeFilesVisible, safeFiles.length));
                      const builderAgentIdx = AGENTS_DEF.findIndex(a => a.name === 'Builder Agent');
                      const builderAgentState = safeAgents[builderAgentIdx];
                      const isBuilderActive = builderAgentState?.status === 'active';

                      // NEW: Use activeToolsByAgent from streaming events if available
                      const activeToolsByAgent = bm.activeToolsByAgent || {};
                      const liveToolEvents = bm.toolEvents || [];

                      // Build childrenByAgent for all agents with tools
                      const childrenByAgent: Record<string, React.ReactNode> = {};

                      // If we have streaming tool events grouped by agent, use them
                      if (Object.keys(activeToolsByAgent).length > 0) {
                        Object.entries(activeToolsByAgent).forEach(([agentName, tools]) => {
                          const activeTools = tools.filter(t => t.status === 'active');
                          const completedTools = tools.filter(t => t.status === 'completed');
                          const showTools = [...activeTools, ...completedTools.slice(-5)]; // Show active + last 5 completed

                          if (showTools.length > 0) {
                            childrenByAgent[agentName] = (
                              <>
                                {showTools.map((te) => (
                                  <ToolBlock
                                    key={`${bm.id}-${te.id}`}
                                    kind={te.kind}
                                    label={te.label || te.path}
                                    detail={te.detail || (typeof te.lines === 'number' ? `${te.lines} lines` : undefined)}
                                    status={te.status}
                                  />
                                ))}
                              </>
                            );
                          }
                        });
                      }
                      // Fall back to flat toolEvents (legacy)
                      else if (liveToolEvents.length > 0) {
                        childrenByAgent['Builder Agent'] = (
                          <>
                            {liveToolEvents.map((te) => (
                              <ToolBlock
                                key={`${bm.id}-${te.id}`}
                                kind={te.kind || 'write'}
                                label={te.label || te.path}
                                detail={te.detail || (typeof te.lines === 'number' ? `${te.lines} lines` : undefined)}
                                status={te.status}
                              />
                            ))}
                          </>
                        );
                      }
                      // Fall back to deriving from files (backwards-compat)
                      else if (visibleFiles.length > 0) {
                        childrenByAgent['Builder Agent'] = (
                          <>
                            {visibleFiles.map((file, fi) => {
                              const lineCount = (file.content?.match(/\n/g)?.length || 0) + 1;
                              const isLastWhileStreaming = isBuilderActive && fi === visibleFiles.length - 1 && bm.isStreaming;
                              return (
                                <ToolBlock
                                  key={`${bm.id}-${file.path}-${fi}`}
                                  kind="write"
                                  label={file.path}
                                  detail={`${lineCount} ${lineCount > 1 ? 'lines' : 'line'}`}
                                  status={isLastWhileStreaming ? 'active' : 'completed'}
                                />
                              );
                            })}
                          </>
                        );
                      }
                      // Show placeholder while building
                      else if (isBuilderActive) {
                        childrenByAgent['Builder Agent'] = <ToolBlock kind="write" label="Generating React app..." status="active" />;
                      }

                      // Detect a "currently writing" path from the live stream global state
                      const isThisBuildStreaming = bm.isStreaming && !bm.isComplete && phase === 'building';
                      const livePathMatch = isThisBuildStreaming ? liveStream.match(/```(?:[a-z]+\s+)?file:([^\n`]+)/i) : null;
                      const showLiveCode = isThisBuildStreaming && liveStream.trim().length > 0;
                      const livePath = livePathMatch?.[1]?.trim() || (visibleFiles[visibleFiles.length - 1]?.path) || 'generating...';
                      // Strip file: markers from liveStream for cleaner inline display
                      const liveCodeContent = liveStream
                        .replace(/```(?:[a-z]+\s+)?file:[^\n]+\n?/gi, '')
                        .replace(/```/g, '')
                        .slice(-1200); // last ~1200 chars to keep the panel snappy

                      const replyText = stripCodeBlocks(bm.replyVisible || '');
                      const showReply = replyText.length > 0;
                      const fullReplyText = stripCodeBlocks(bm.reply || '');
                      const isStillTyping = bm.isStreaming && replyText.length < fullReplyText.length;

                      return (
                        <AIBubble
                          key={bm.id}
                          phase={phase}
                          timestamp={bm.timestamp}
                          phaseProgress={bm.phaseProgress}
                          showPhaseIndicator={bm.isStreaming && !bm.isComplete}
                        >
                          {/* Phase D: Mode announce — ONLY for code/question modes (casual chat = no badge) */}
                          {bm.narration?.mode && bm.narration.mode !== 'discussion' && (
                            <ModeAnnounce
                              mode={bm.narration.mode}
                              reason={bm.narration.modeReason}
                            />
                          )}

                          {/* Phase D: Question block with clickable options (only in Question mode) */}
                          {bm.narration?.question && (
                            <QuestionBlock
                              question={bm.narration.question.question}
                              options={bm.narration.question.options}
                              reason={bm.narration.question.reason}
                              onAnswer={(answer) => setChatInput(answer)}
                            />
                          )}

                          {/* Phase D: Live todo list — ONLY when there's actual work to track (not for chat) */}
                          {bm.narration?.todos && bm.narration.todos.length > 0 && !bm.chatOnly && (
                            <TodoList steps={bm.narration.todos} />
                          )}

                          {/* Agent timeline with nested tool blocks */}
                          <AgentTimeline agents={timelineAgents} childrenByAgent={childrenByAgent} />

                          {/* Phase D: Significant action log (🛠️ / ✅ / ➡️) */}
                          {bm.narration?.actions && bm.narration.actions.length > 0 && (
                            <ActionLog entries={bm.narration.actions} />
                          )}

                          {/* Live code stream (inline mini-editor) */}
                          {showLiveCode && (
                            <LiveCodeStream
                              path={livePath}
                              content={liveCodeContent}
                              isStreaming={isThisBuildStreaming}
                              maxHeight={180}
                            />
                          )}

                          {/* Reply text (typewriter) */}
                          {showReply && (
                            <p className="text-xs leading-relaxed text-zinc-200 whitespace-pre-wrap select-text">
                              {replyText}
                              {isStillTyping && (
                                <span className="windsurf-cursor animate-windsurf-cursor inline-block ml-0.5" />
                              )}
                            </p>
                          )}

                          {/* Phase A: Technical details (Metrics + Capability) hidden behind toggle */}
                          {bm.isComplete && !bm.isStreaming && (
                            <TechnicalDetails
                              securityScore={bm.meta?.securityScore}
                              qaScore={bm.meta?.qaScore}
                              complexity={bm.meta?.complexity}
                              filesCount={safeFiles.length}
                              timestamp={bm.timestamp}
                              capabilityPlan={bm.meta?.capabilityPlan}
                            />
                          )}

                          {/* Inline 👍 / 👎 feedback */}
                          {bm.isComplete && !bm.isStreaming && !bm.chatOnly && safeFiles.length > 0 && (
                            <BuildFeedback
                              userId={user?.id}
                              buildId={bm.id}
                              projectId={currentProject?.id}
                              prompt={bm.userPrompt}
                            />
                          )}
                        </AIBubble>
                      );
                    })}

                    <div className="pt-4 flex flex-col items-center gap-2">
                      {messageCount > 0 && currentProject?.id && (
                        <div className="text-[9px] text-zinc-500 flex items-center gap-1">
                          <span>💭</span>
                          <span>{messageCount} messages mémorisés</span>
                          {conversationSummary && <span className="text-blue-400">· résumé actif</span>}
                        </div>
                      )}
                      <button
                        onClick={async () => {
                          setMessages([]);
                          if (currentProject?.id) {
                            await clearMessages(currentProject.id);
                            setConversationSummary('');
                            setMessageCount(0);
                          }
                        }}
                        className="text-[9px] text-zinc-600 hover:text-zinc-400 uppercase tracking-tighter font-bold transition-colors"
                      >
                        Clear History
                      </button>
                    </div>
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>
              {/* Jump-to-bottom button */}
              <AnimatePresence>
                {showScrollBtn && (
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    onClick={() => { isAtBottomRef.current = true; scrollToBottom(true); }}
                    className="absolute bottom-3 right-3 z-10 p-1.5 rounded-full bg-zinc-700 border border-zinc-600 text-zinc-300 hover:bg-zinc-600 shadow-lg transition-colors"
                    aria-label="Aller en bas"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </motion.button>
                )}
              </AnimatePresence>
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
                
                {/* Attached files preview */}
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {attachedFiles.map((f, i) => (
                      <div key={i} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium border ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-100 border-zinc-200 text-zinc-600'}`}>
                        <Paperclip className="w-3 h-3" />
                        <span className="max-w-[120px] truncate">{f.name}</span>
                        <button onClick={() => setAttachedFiles(prev => prev.filter((_, j) => j !== i))} className="text-zinc-500 hover:text-red-400 ml-0.5">×</button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-2">
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.txt,.md,.json,.csv,.tsx,.ts,.js,.jsx,.css,.html"
                      multiple
                      className="hidden"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        const results: { name: string; content: string }[] = [];
                        for (const file of files) {
                          if (file.type.startsWith('image/')) {
                            results.push({ name: file.name, content: `[Image: ${file.name}]` });
                          } else {
                            const text = await file.text();
                            results.push({ name: file.name, content: text.slice(0, 2000) });
                          }
                        }
                        setAttachedFiles(prev => [...prev, ...results]);
                        const extra = results.map(r => `\n\n---\n**${r.name}**:\n${r.content}`).join('');
                        setChatInput(prev => prev + extra);
                        e.target.value = '';
                      }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={`p-1.5 rounded-full border transition-colors text-zinc-500 ${theme === 'dark' ? 'hover:bg-zinc-800 border-zinc-800/80' : 'hover:bg-zinc-100 border-zinc-200'}`}
                      title="Attach file"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        const newEditMode = !isEditMode;
                        setIsEditMode(newEditMode);
                        // Sync appMode with edit state - critical for passing existingFiles to pipeline
                        setAppMode(newEditMode ? 'edit' : 'build');
                      }}
                      className={`p-1.5 rounded-full border transition-all duration-200 ${
                        isEditMode
                          ? 'bg-blue-600/20 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                          : (theme === 'dark' ? 'hover:bg-zinc-800 border-zinc-800/80 text-zinc-500' : 'hover:bg-zinc-100 border-zinc-200 text-zinc-500')
                      }`}
                      title={isEditMode ? 'Désactiver le mode édition' : 'Activer le mode édition'}
                    >
                      <Target className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 relative">
                    <div className={`flex items-center rounded-lg overflow-hidden border ${theme === 'dark' ? 'bg-zinc-800/50 border-zinc-700/30' : 'bg-zinc-100 border-zinc-200'}`}>
                      <button 
                        onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                        className={`px-2 py-1 transition-colors text-[9px] font-bold flex items-center gap-1 ${theme === 'dark' ? 'hover:bg-zinc-700/50 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-600'}`}
                      >
                        <Brain className="w-2.5 h-2.5 text-violet-400" />
                        {selectedModel.includes('sonnet') ? 'ELITE' : 'FAST'}
                        <ChevronDown className={`w-2.5 h-2.5 transition-transform ${isModelMenuOpen ? 'rotate-180' : ''}`} />
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
                            className={`absolute bottom-full right-32 mb-2 w-48 rounded-xl z-20 py-1 overflow-hidden border bg-bg-elevated border-border-default`}
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
                      <button className={`px-2 py-1 transition-colors text-[9px] font-medium capitalize ${theme === 'dark' ? 'hover:bg-zinc-700/50 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-600'}`}>
                        {appMode}
                      </button>
                      <button 
                        onClick={() => setIsModeMenuOpen(!isModeMenuOpen)}
                        className={`p-1 transition-colors border-l ${theme === 'dark' ? 'hover:bg-zinc-700/50 text-zinc-400 border-zinc-700/30' : 'hover:bg-zinc-200 text-zinc-500 border-zinc-300'}`}
                      >
                        <ChevronDown className={`w-2.5 h-2.5 transition-transform ${isModeMenuOpen ? 'rotate-180' : ''}`} />
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
                            className={`absolute bottom-full right-0 mb-2 w-32 rounded-xl z-20 py-1 overflow-hidden border bg-bg-elevated border-border-default`}
                          >
                            <button
                              onClick={() => { setAppMode('build'); setIsModeMenuOpen(false); setIsEditMode(false); }}
                              className={`w-full px-3 py-2 text-left text-xs font-medium flex items-center gap-2 transition-colors ${appMode === 'build' ? (theme === 'dark' ? 'bg-zinc-800 text-blue-400' : 'bg-blue-50 text-blue-600') : (theme === 'dark' ? 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200' : 'text-zinc-600 hover:bg-zinc-50')}`}
                            >
                              <Zap className="w-3.5 h-3.5" />
                              Build
                            </button>
                            <button
                              onClick={() => { setAppMode('plan'); setIsModeMenuOpen(false); setIsEditMode(false); }}
                              className={`w-full px-3 py-2 text-left text-xs font-medium flex items-center gap-2 transition-colors ${appMode === 'plan' ? (theme === 'dark' ? 'bg-zinc-800 text-blue-400' : 'bg-blue-50 text-blue-600') : (theme === 'dark' ? 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200' : 'text-zinc-600 hover:bg-zinc-50')}`}
                            >
                              <Layout className="w-3.5 h-3.5" />
                              Plan
                            </button>
                            <button
                              onClick={() => { setAppMode('edit'); setIsModeMenuOpen(false); setIsEditMode(true); }}
                              className={`w-full px-3 py-2 text-left text-xs font-medium flex items-center gap-2 transition-colors ${appMode === 'edit' ? (theme === 'dark' ? 'bg-zinc-800 text-blue-400' : 'bg-blue-50 text-blue-600') : (theme === 'dark' ? 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200' : 'text-zinc-600 hover:bg-zinc-50')}`}
                            >
                              <Target className="w-3.5 h-3.5" />
                              Edit
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>

                    <button 
                      onClick={toggleRecording}
                      className={`p-1.5 rounded-full transition-colors ${isRecording ? 'bg-red-500/20 text-red-500 animate-pulse' : (theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500')}`}
                    >
                      <Mic className="w-3.5 h-3.5" />
                    </button>
                    {isBuilding ? (
                      <button
                        onClick={stopBuild}
                        className="p-2 rounded-lg transition-all duration-200 border bg-red-600/20 border-red-500/50 text-red-400 hover:bg-red-600/30 hover:text-red-300 huggy-stop-pulse"
                        title="Arrêter la génération"
                        aria-label="Arrêter"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                      </button>
                    ) : (
                      <button
                        id="send-prompt-btn"
                        disabled={!chatInput.trim()}
                        onClick={startBuild}
                        className={`p-2 rounded-full transition-all duration-200 border ${
                          chatInput.trim()
                            ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20 border-blue-600'
                            : (theme === 'dark' ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border-zinc-700/50' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed border-zinc-300')
                        }`}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                    )}
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
            {/* Empty State - Template Carousel (shown when no preview active) */}
            {!previewUrl && !isBuilding && (
              <TemplateCarousel 
                onSelect={(template: Template) => {
                  setChatInput(template.prompt);
                  // Auto-submit after a brief delay to let the user see what was selected
                  setTimeout(() => {
                    startBuild();
                  }, 100);
                }} 
              />
            )}

            {/* Preview loading spinner */}
            {isPreviewBuilding && !isBuilding && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg-deep">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-6 h-6 text-accent animate-spin" />
                  <span className="text-xs text-zinc-500">Compilation en cours…</span>
                </div>
              </div>
            )}

            {previewError && !isBuilding && !isPreviewBuilding && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg-deep p-6">
                <div className="max-w-lg w-full rounded-2xl border border-red-500/30 bg-zinc-950 p-6 shadow-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <div>
                      <h3 className="text-sm font-bold text-zinc-100">Preview compilation failed</h3>
                      <p className="text-xs text-zinc-500">The generated code needs a correction or regeneration.</p>
                    </div>
                  </div>
                  <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-black/50 p-3 text-[11px] text-red-200 font-mono">{previewError}</pre>
                  <button
                    onClick={() => {
                      setPreviewError(null);
                      setGeneratedFiles(prev => [...prev]);
                    }}
                    className="mt-4 w-full rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition"
                  >
                    Retry preview build
                  </button>
                </div>
              </div>
            )}

            {/* Generated App Live Preview / Code Editor / Analytics */}
            {previewUrl && !isEditMode && (
              <div className="absolute inset-0 z-10 bg-bg-deep">
                {viewMode === 'preview' ? (
                  <iframe
                    title="Live Preview"
                    src={previewUrl}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals"
                    allow="accelerometer; camera; encrypted-media; fullscreen; geolocation; gyroscope; microphone; midi; payment; picture-in-picture; speaker; usb; vr"
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
                  <div className="w-full h-full p-8 overflow-y-auto bg-bg-deep text-text-secondary">
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
                      onClick={() => { setIsEditMode(false); setAppMode('build'); }}
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
      
      {/* ── Deploy Modal ── */}
      <AnimatePresence>
        {isDeployModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => { if (deployStep !== 'deploying') setIsDeployModalOpen(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={e => e.stopPropagation()}
              className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-[#1a1a1b] border-zinc-800' : 'bg-white border-zinc-200'}`}
            >
              {/* Header */}
              <div className={`flex items-center justify-between px-6 py-4 border-b ${theme === 'dark' ? 'border-zinc-800' : 'border-zinc-100'}`}>
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${deployStep === 'success' ? 'bg-green-500/15' : deployStep === 'error' ? 'bg-red-500/15' : 'bg-blue-500/15'}`}>
                    {deployStep === 'success' ? <CheckCircle2 className="w-4 h-4 text-green-400" /> :
                     deployStep === 'error' ? <AlertCircle className="w-4 h-4 text-red-400" /> :
                     deployStep === 'deploying' ? <Loader2 className="w-4 h-4 text-blue-400 animate-spin" /> :
                     <Cloud className="w-4 h-4 text-blue-400" />}
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${theme === 'dark' ? 'text-zinc-100' : 'text-zinc-800'}`}>
                      {deployStep === 'confirm' && 'Deploy your app'}
                      {deployStep === 'deploying' && 'Deploying…'}
                      {deployStep === 'success' && 'Deployed successfully!'}
                      {deployStep === 'error' && 'Deployment failed'}
                    </h3>
                    <p className="text-[11px] text-zinc-500">{currentProject?.name || 'New Project'}</p>
                  </div>
                </div>
                {deployStep !== 'deploying' && (
                  <button onClick={() => setIsDeployModalOpen(false)} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Body */}
              <div className="px-6 py-5">
                {deployStep === 'confirm' && (
                  <div className="space-y-4">
                    <div className={`rounded-xl border p-4 space-y-2.5 ${theme === 'dark' ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>Files</span>
                        <span className={`text-xs font-bold ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-700'}`}>{generatedFiles.length} files</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>Provider</span>
                        <span className="text-xs font-bold text-blue-400 flex items-center gap-1"><Zap className="w-3 h-3" /> Vercel</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>Project</span>
                        <span className={`text-xs font-bold ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-700'}`}>{currentProject?.name || 'huggy-app'}</span>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setIsDeployModalOpen(false)} className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${theme === 'dark' ? 'border-zinc-700 text-zinc-400 hover:bg-zinc-800' : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50'}`}>
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          setDeployStep('deploying');
                          try {
                            const response = await axios.post('/api/deploy', {
                              projectId: currentProject?.id,
                              projectName: currentProject?.name || 'huggy-app',
                              files: generatedFiles,
                            });
                            const url = response.data.url as string;
                            const vercelUrl = response.data.vercelUrl as string | undefined;
                            const customUrl = response.data.customUrl as string | undefined;
                            const aliasAssigned = response.data.aliasAssigned as boolean | undefined;
                            setDeployResultUrl(url);
                            setDeployVercelUrl(vercelUrl || url);
                            setDeployCustomUrl(customUrl || url);
                            setDeployAliasAssigned(aliasAssigned || false);
                            setDeployUrl(url);
                            trackDeploy(currentProject?.id || 'unknown', 'completed', { url, filesCount: generatedFiles.length, aliasAssigned });
                            setDeployStep('success');
                          } catch (e: any) {
                            setDeployError(e?.response?.data?.error || e.message || 'Unknown error');
                            setDeployStep('error');
                          }
                        }}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center justify-center gap-2"
                      >
                        <Cloud className="w-4 h-4" /> Deploy now
                      </button>
                    </div>
                  </div>
                )}

                {deployStep === 'deploying' && (
                  <div className="py-6 flex flex-col items-center gap-4">
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 rounded-full border-4 border-blue-500/20" />
                      <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin" />
                      <Cloud className="absolute inset-0 m-auto w-6 h-6 text-blue-400" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-700'}`}>Building & uploading…</p>
                      <p className="text-xs text-zinc-500">This may take a few seconds</p>
                    </div>
                    {[
                      { label: 'Bundling files', done: true },
                      { label: 'Uploading to Vercel', done: false },
                      { label: 'Assigning domain', done: false },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center gap-2 w-full">
                        {s.done
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                          : <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.3 }} className="w-3.5 h-3.5 rounded-full border-2 border-blue-400 shrink-0" />}
                        <span className={`text-xs ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>{s.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {deployStep === 'success' && deployResultUrl && (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center py-4 gap-2">
                      <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mb-1">
                        <CheckCircle2 className="w-7 h-7 text-green-400" />
                      </div>
                      <p className={`text-sm font-bold ${theme === 'dark' ? 'text-zinc-100' : 'text-zinc-800'}`}>Your app is live!</p>
                      {deploySlug && (
                        <p className="text-xs text-zinc-500">{deploySlug}.huggy.fun</p>
                      )}
                    </div>

                    {/* Custom Domain URL (if alias assigned) */}
                    {deployAliasAssigned && deployCustomUrl && (
                      <div className={`flex flex-col gap-2 rounded-xl border p-3 ${theme === 'dark' ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'}`}>
                        <div className="flex items-center gap-2">
                          <Globe2 className="w-4 h-4 text-green-400 shrink-0" />
                          <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">Custom Domain</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <a href={deployCustomUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline truncate flex-1">{deployCustomUrl}</a>
                          <button
                            onClick={() => { navigator.clipboard.writeText(deployCustomUrl); setDeployCopied(true); setTimeout(() => setDeployCopied(false), 2000); }}
                            className={`shrink-0 p-1.5 rounded-lg transition-colors ${deployCopied ? 'text-green-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                          >
                            {deployCopied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Vercel URL (always works) */}
                    <div className={`flex flex-col gap-2 rounded-xl border p-3 ${theme === 'dark' ? 'bg-zinc-900/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-blue-400 shrink-0" />
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Vercel URL (Guaranteed to work)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={deployVercelUrl || deployResultUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline truncate flex-1">{deployVercelUrl || deployResultUrl}</a>
                        <button
                          onClick={() => { navigator.clipboard.writeText(deployVercelUrl || deployResultUrl); setDeployCopied(true); setTimeout(() => setDeployCopied(false), 2000); }}
                          className={`shrink-0 p-1.5 rounded-lg transition-colors ${deployCopied ? 'text-green-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                          {deployCopied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* DNS Setup Instructions (if alias not assigned) */}
                    {!deployAliasAssigned && deployCustomUrl && (
                      <div className={`flex flex-col gap-2 rounded-xl border p-3 ${theme === 'dark' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">DNS Setup Required</span>
                        </div>
                        <p className="text-[11px] text-zinc-400">
                          To make <code className="text-amber-300">{deployCustomUrl?.replace('https://', '')}</code> work globally, add this CNAME record to your DNS:
                        </p>
                        <div className={`font-mono text-[10px] p-2 rounded ${theme === 'dark' ? 'bg-black/30' : 'bg-white'}`}>
                          <div className="text-zinc-400">Name: <span className="text-zinc-200">{deploySlug}</span></div>
                          <div className="text-zinc-400">Type: <span className="text-zinc-200">CNAME</span></div>
                          <div className="text-zinc-400">Value: <span className="text-zinc-200">cname.vercel-dns.com</span></div>
                        </div>
                        <p className="text-[10px] text-zinc-500">
                          Or use the Vercel URL above which works immediately everywhere.
                        </p>
                      </div>
                    )}
                    
                    {/* Made with Huggy Badge Indicator */}
                    {deployBadgeEnabled && (
                      <div className={`flex items-center gap-2 rounded-lg border p-2.5 ${theme === 'dark' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
                        <div className="w-5 h-5 rounded bg-blue-500 flex items-center justify-center shrink-0">
                          <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-blue-400">Made with Huggy badge</p>
                          <p className="text-[10px] text-zinc-500 truncate">Displayed on your live app (free tier)</p>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 shrink-0">Free</span>
                      </div>
                    )}
                    
                    <button onClick={() => setIsDeployModalOpen(false)} className="w-full py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors">
                      Done
                    </button>
                  </div>
                )}

                {deployStep === 'error' && (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center py-4 gap-2">
                      <div className="w-14 h-14 rounded-full bg-red-500/15 flex items-center justify-center mb-1">
                        <AlertCircle className="w-7 h-7 text-red-400" />
                      </div>
                      <p className={`text-sm font-bold ${theme === 'dark' ? 'text-zinc-100' : 'text-zinc-800'}`}>Deployment failed</p>
                      <p className="text-xs text-zinc-500 text-center">{deployError}</p>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setIsDeployModalOpen(false)} className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${theme === 'dark' ? 'border-zinc-700 text-zinc-400 hover:bg-zinc-800' : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50'}`}>Close</button>
                      <button onClick={() => setDeployStep('confirm')} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors">Try again</button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Onboarding Tour for Builder */}
      <OnboardingTour isBuilder={true} />
      
      {/* Feedback Widget */}
      <FeedbackWidget />
      <BuildHistoryDrawer
        open={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        projectId={currentProject?.id}
        getBuilds={getBuilds}
        onRestore={(b) => {
          const restoredFiles = Array.isArray(b.files) ? b.files as FileEntry[] : [];
          if (restoredFiles.length === 0) return;
          setGeneratedFiles(restoredFiles);
          setActiveFilePath(restoredFiles[0].path);
          setIsHistoryOpen(false);
        }}
      />

      {/* History Drawer with Build Timeline (Undo/Redo) */}
      <AnimatePresence>
        {isHistoryDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50"
              onClick={() => setIsHistoryDrawerOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-[320px] z-50 bg-[#0a0a0b] border-l border-zinc-800 flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <History className="w-4 h-4 text-accent" />
                  Version History
                </h2>
                <button
                  onClick={() => setIsHistoryDrawerOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* Build Timeline */}
              <div className="flex-1 overflow-y-auto p-3">
                <BuildTimeline
                  builds={undoRedoBuilds}
                  currentIndex={undoRedoCurrentIndex}
                  onSelect={(idx) => {
                    jumpToVersion(idx);
                    setIsHistoryDrawerOpen(false);
                  }}
                  onResetToLive={() => {
                    resetToLive();
                    setIsHistoryDrawerOpen(false);
                  }}
                />
              </div>
              
              {/* Instructions */}
              <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
                <p className="text-[10px] text-zinc-500 text-center">
                  Ctrl+Z to undo · Ctrl+Shift+Z to redo
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

