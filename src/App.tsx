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
  Eye,
  Globe2,
  CheckCircle2,
  Loader2,
  Activity,
  CreditCard,
  User,
  Settings,
  LogOut,
  ExternalLink,
  Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useRef } from 'react';
import { startBuildPipeline, checkServerHealth } from './lib/api';
import { useAuth } from './lib/useAuth';
import { useProjects } from './lib/useProjects';

export default function App() {
  // ─── Supabase Auth & Data (Mocked for Preview) ───────────────────────────
  const realAuth = useAuth();
  const auth = {
    ...realAuth,
    isAuthenticated: true,
    loading: false,
    user: { id: 'preview-user-id', email: 'preview@huggy.app' },
    profile: {
      id: 'preview-user-id',
      full_name: 'Preview User',
      credits: 500,
      max_credits: 500,
      plan: 'pro'
    }
  };
  const { projects, currentProject, createProject, saveBuild } = useProjects(auth.user?.id);

  const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState(false);
  const [isFileExplorerOpen, setIsFileExplorerOpen] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<'desktop' | 'mobile' | 'tablet'>('desktop');
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  
  const [appMode, setAppMode] = useState<'build' | 'plan'>('build');
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const [chatInput, setChatInput] = useState(() => {
    return localStorage.getItem('huggy_chat_input') || '';
  });
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'assistant', content: string, timestamp: number}[]>(() => {
    const saved = localStorage.getItem('huggy_chat_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [isRecording, setIsRecording] = useState(false);
  const [isServerOnline, setIsServerOnline] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState<Array<{path: string, content: string}>>([]);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Generate Preview Blob URL when files change
  useEffect(() => {
    if (generatedFiles.length === 0) {
      setPreviewUrl(null);
      return;
    }

    const appFile = generatedFiles.find(f => f.path.endsWith('App.tsx') || f.path.endsWith('App.js'));
    const stylesFile = generatedFiles.find(f => f.path.endsWith('.css'));

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <script src="https://cdn.tailwindcss.com"><\/script>
          <style>${stylesFile?.content || ''}</style>
          <style>body{margin:0;font-family:Inter,system-ui,sans-serif}</style>
        </head>
        <body class="bg-[#0a0a0b] text-white">
          <div id="root"></div>
          <script src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
          <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
          <script type="text/babel">
            try {
              ${appFile?.content || 'document.getElementById("root").innerHTML = "<h1>App ready</h1>"'}
              const root = ReactDOM.createRoot(document.getElementById('root'));
              if (typeof App !== 'undefined') root.render(React.createElement(App));
            } catch(e) {
              document.getElementById('root').innerHTML = '<pre style="color:#f87171;padding:20px">' + e.message + '</pre>';
            }
          <\/script>
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [generatedFiles]);

  // Auto-save chat input
  useEffect(() => {
    localStorage.setItem('huggy_chat_input', chatInput);
  }, [chatInput]);

  // Auto-save chat history
  useEffect(() => {
    localStorage.setItem('huggy_chat_history', JSON.stringify(chatHistory));
  }, [chatHistory]);

  // Handle textarea auto-resize
  useEffect(() => {
    if (chatInputRef.current) {
      chatInputRef.current.style.height = 'auto';
      const newHeight = Math.min(chatInputRef.current.scrollHeight, 160);
      chatInputRef.current.style.height = `${newHeight}px`;
    }
  }, [chatInput]);

  // Check server health on mount (hidden but kept for state if needed elsewhere)
  useEffect(() => {
    checkServerHealth().then(setIsServerOnline);
    const interval = setInterval(() => {
      checkServerHealth().then(setIsServerOnline);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Build Pipeline State
  const [isBuilding, setIsBuilding] = useState(false);
  const [currentAgentIndex, setCurrentAgentIndex] = useState(-1);
  const [buildLogs, setBuildLogs] = useState<{agent: string, status: 'pending' | 'active' | 'completed'}[]>([]);

  const agents = [
    { id: 'research', name: 'Web Research', icon: Search, description: 'Analyzing references and context...' },
    { id: 'pm', name: 'Product Manager', icon: ClipboardList, description: 'Drafting implementation plan...' },
    { id: 'dba', name: 'DBA Architect', icon: Database, description: 'Structuring database & RLS policies...' },
    { id: 'ux', name: 'UX Designer', icon: Layout, description: 'Designing design system & components...' },
    { id: 'coder', name: 'Coder Agent', icon: Code2, description: 'Generating React & TypeScript code...' },
    { id: 'security', name: 'Security Auditor', icon: ShieldCheck, description: 'Auditing for vulnerabilities...' },
    { id: 'reviewer', name: 'QA Reviewer', icon: Eye, description: 'Checking for bugs & UX consistency...' },
    { id: 'i18n', name: 'i18n Agent', icon: Globe2, description: 'Handling translations & RTL support...' },
  ];

  const startBuild = async () => {
    if (!chatInput.trim() || isBuilding) return;

    // Check credits
    if (auth.profile && auth.profile.credits <= 0) {
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Crédits insuffisants. Upgrade ton plan pour continuer à build.',
        timestamp: Date.now()
      }]);
      return;
    }

    const prompt = chatInput;
    
    // Add to history
    setChatHistory(prev => [...prev, { 
      role: 'user', 
      content: prompt, 
      timestamp: Date.now() 
    }]);

    setIsBuilding(true);
    setCurrentAgentIndex(0);
    setBuildLogs(agents.map(a => ({ agent: a.name, status: 'pending' })));
    setChatInput('');

    // Auto-create project if none exists
    let projectId = currentProject?.id;
    if (!projectId) {
      try {
        const proj = await createProject(prompt.slice(0, 50), prompt);
        projectId = proj.id;
      } catch { /* continue without project */ }
    }

    try {
      await startBuildPipeline(prompt, async (event) => {
        if (event.type === 'complete') {
          // Pipeline finished successfully
          setIsBuilding(false);
          setCurrentAgentIndex(-1);

          // Add assistant response to chat
          const replyParts = [];
          if (event.reply) replyParts.push(event.reply);
          if (event.meta) {
            replyParts.push(`\n\n📊 **Résultats:** ${event.files?.length ?? 0} fichiers • Security: ${event.meta.securityScore ?? '—'}/100 • QA: ${event.meta.qaScore ?? '—'}/100`);
          }
          if (replyParts.length > 0) {
            setChatHistory(prev => [...prev, {
              role: 'assistant',
              content: replyParts.join(''),
              timestamp: Date.now()
            }]);
          }

          // Store generated files for preview & file explorer
          if (event.files?.length) {
            setGeneratedFiles(event.files);
          }

          // Save build to Supabase & deduct credits
          if (projectId) {
            try {
              await saveBuild(projectId, prompt, {
                files: event.files,
                reply: event.reply,
                meta: event.meta,
              });
              await auth.refreshProfile();
            } catch (e) {
              console.warn('Failed to save build:', e);
            }
          }

        } else if (event.type === 'error') {
          setIsBuilding(false);
          setCurrentAgentIndex(-1);
          setChatHistory(prev => [...prev, {
            role: 'assistant',
            content: `❌ Pipeline error: ${event.message}`,
            timestamp: Date.now()
          }]);

        } else if (event.type === 'agent' && event.status === 'active') {
          setCurrentAgentIndex(event.index ?? 0);
          setBuildLogs(prev => prev.map((log, i) => {
            if (i === event.index) return { ...log, status: 'active' };
            return log;
          }));

        } else if (event.type === 'agent' && event.status === 'completed') {
          setBuildLogs(prev => prev.map((log, i) => {
            if (i === event.index) return { ...log, status: 'completed' };
            return log;
          }));
        }
      }, generatedFiles);
    } catch (error) {
      setIsBuilding(false);
      setCurrentAgentIndex(-1);
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: `❌ Connection failed: ${(error as Error).message}. Make sure the pipeline server is running (npm run dev:server).`,
        timestamp: Date.now()
      }]);
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
    { id: 'desktop', label: "Taille actuelle de l'écran", icon: MonitorSmartphone },
    { id: 'mobile', label: 'Mobile', icon: Smartphone },
    { id: 'tablet', label: 'Comprimé', icon: Tablet },
  ];

  const CurrentIcon = devices.find(d => d.id === selectedDevice)?.icon || MonitorSmartphone;

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0b] text-zinc-400 overflow-hidden select-none">
      {/* Top Header */}
      <header className="flex items-center px-4 py-2 border-b border-zinc-800/50 h-14 shrink-0">
        <div className="flex items-center gap-2 w-auto shrink-0">
          <div className="flex items-center gap-2 pl-1">
            {/* Logo Icon */}
            <div className="w-10 h-10 rounded-xl bg-[#1c1c1e] border border-zinc-800/80 flex items-center justify-center shadow-lg group cursor-pointer hover:border-zinc-700 transition-all duration-300 overflow-hidden">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center relative overflow-hidden group-hover:bg-indigo-500 transition-colors">
                {/* Simplified monster-like shape */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-indigo-700 opacity-50" />
                <div className="relative w-5 h-5 flex flex-col items-center justify-center">
                  <div className="w-4 h-4 bg-white rounded-t-full relative">
                    <div className="absolute top-1 left-1 w-1 h-1 bg-zinc-900 rounded-full" />
                    <div className="absolute top-1 right-1 w-1 h-1 bg-zinc-900 rounded-full" />
                    <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-0.5 bg-pink-500 rounded-full" />
                  </div>
                  <div className="w-5 h-2 bg-indigo-600 -mt-1 rounded-full border-t border-indigo-400/30" />
                </div>
              </div>
            </div>
            
            {/* Home Link Section */}
            <div className="flex items-center gap-2.5 ml-1 relative">
              <div 
                onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                className="w-8 h-8 rounded-lg border border-zinc-800/80 flex items-center justify-center hover:bg-zinc-800/50 transition-all cursor-pointer group"
              >
                <Home className={`w-4 h-4 transition-colors ${isHeaderMenuOpen ? 'text-blue-400' : 'text-zinc-400 group-hover:text-zinc-200'}`} />
              </div>
              <span className="text-[13px] font-medium text-zinc-400">Home</span>
              <span className="text-zinc-700 text-sm">/</span>

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
                        <div className="text-xs font-bold text-zinc-100">{auth.profile?.full_name || auth.user?.email?.split('@')[0] || 'User'}</div>
                        <div className="text-[10px] text-zinc-500 truncate">{auth.user?.email || ''}</div>
                      </div>

                      {/* Credits Section */}
                      <div className="px-4 py-3 border-b border-zinc-800/50 bg-blue-500/5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Credits Huggy</span>
                          <span className="text-[10px] text-blue-400 font-mono">{(auth.profile?.plan || 'free').toUpperCase()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-500/20 rounded-md">
                            <Coins className="w-4 h-4 text-blue-400" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-zinc-100">{auth.profile?.credits ?? 0} <span className="text-zinc-500 font-normal">/ {auth.profile?.max_credits ?? 500}</span></div>
                            <div className="w-32 h-1 bg-zinc-800 rounded-full mt-1 overflow-hidden">
                              <div className="h-full bg-blue-500 transition-all" style={{ width: `${Math.round(((auth.profile?.credits ?? 0) / (auth.profile?.max_credits ?? 500)) * 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Menu Links */}
                      <div className="p-1.5">
                        <button className="w-full flex items-center justify-between px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-lg transition-all text-xs font-medium group">
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
                            await auth.signOut();
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
                className="bg-zinc-900/60 border border-zinc-800/80 rounded-[14px] px-4 py-2 flex items-center gap-3 shadow-sm"
              >
                <span className="font-display font-medium text-zinc-100 text-[13px] tracking-tight leading-none">{currentProject?.name || 'New Project'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <button className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors">
              <Clock className="w-4 h-4 text-zinc-400" />
            </button>
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={`p-1.5 rounded-md transition-colors ${isSidebarCollapsed ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-zinc-800 text-zinc-400'}`}
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-zinc-900/40 p-1 rounded-lg border border-zinc-800/50 ml-8">
          <button 
            onClick={() => setIsFileExplorerOpen(false)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-all text-xs font-bold ${!isFileExplorerOpen ? 'bg-zinc-800/80 text-blue-400 shadow-sm border border-zinc-700/30' : 'text-zinc-400 hover:bg-zinc-800/80'}`}
          >
            <Globe className="w-3.5 h-3.5" />
            Preview
          </button>
          <button 
            onClick={() => setIsFileExplorerOpen(true)}
            className={`p-1.5 rounded-md transition-all ${isFileExplorerOpen ? 'bg-zinc-800/80 text-blue-400 border border-zinc-700/30' : 'text-zinc-400 hover:bg-zinc-800/80'}`}
          >
            <Code2 className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 hover:bg-zinc-800/80 rounded-md transition-colors text-zinc-400">
            <Cloud className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1 bg-zinc-900/40 p-1 rounded-lg border border-zinc-800/50 ml-2 mr-auto relative">
          <button 
            onClick={() => setIsDeviceMenuOpen(!isDeviceMenuOpen)}
            className="p-1.5 bg-zinc-800/80 text-blue-400 rounded-md transition-colors border border-zinc-700/30 hover:bg-zinc-700/50 flex items-center gap-1"
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
          <Github className="w-4 h-4 text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors" />
          <button className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity">
            <Zap className="w-3.5 h-3.5 fill-white" />
            Upgrade
          </button>
          <button className="px-3.5 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-500 transition-colors">
            Publish
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
              <div className="flex-1 bg-[#161617] rounded-2xl border border-zinc-800/50 overflow-hidden shadow-inner flex flex-col p-4 overflow-y-auto scrollbar-hide">
                {chatHistory.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 opacity-30">
                    <Clock className="w-8 h-8 mb-3" />
                    <p className="text-xs font-medium">No history yet</p>
                    <p className="text-[10px] mt-1">Your conversations will appear here</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {chatHistory.map((msg, idx) => (
                      <div key={idx} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                            {msg.role === 'user' ? 'Request' : 'Huggy'}
                          </span>
                          <span className="text-[9px] text-zinc-600">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className={`text-xs p-3 rounded-xl border ${
                          msg.role === 'user' 
                            ? 'bg-zinc-800/30 border-zinc-700/30 text-zinc-300' 
                            : 'bg-blue-500/5 border-blue-500/20 text-blue-100'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    <div className="pt-4 flex justify-center">
                      <button 
                        onClick={() => setChatHistory([])}
                        className="text-[9px] text-zinc-600 hover:text-zinc-400 uppercase tracking-tighter font-bold transition-colors"
                      >
                        Clear History
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input Area */}
              <div className="bg-[#161617] rounded-2xl border border-zinc-800/50 p-4 shadow-lg flex flex-col relative transition-all duration-200 shrink-0">
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
                  className="w-full bg-transparent border-none text-zinc-200 text-sm font-medium resize-none focus:outline-none placeholder:text-zinc-500 mb-2 max-h-[160px] scrollbar-hide overflow-y-auto"
                />
                
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-zinc-800 rounded-full border border-zinc-800/80 transition-colors text-zinc-500">
                      <Plus className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setIsEditMode(!isEditMode)}
                      className={`p-2 rounded-full border transition-all duration-200 ${
                        isEditMode 
                          ? 'bg-blue-600/20 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                          : 'hover:bg-zinc-800 border-zinc-800/80 text-zinc-500'
                      }`}
                    >
                      <Target className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 relative">
                    <div className="flex items-center bg-zinc-800/50 rounded-lg overflow-hidden border border-zinc-700/30">
                      <button className="px-3 py-1.5 hover:bg-zinc-700/50 transition-colors text-zinc-400 text-xs font-medium capitalize">
                        {appMode}
                      </button>
                      <button 
                        onClick={() => setIsModeMenuOpen(!isModeMenuOpen)}
                        className="p-1.5 hover:bg-zinc-700/50 transition-colors text-zinc-400 border-l border-zinc-700/30"
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
                            className="absolute bottom-full right-0 mb-2 w-32 bg-[#1c1c1d] border border-zinc-800 rounded-xl shadow-2xl z-20 py-1 overflow-hidden"
                          >
                            <button 
                              onClick={() => { setAppMode('build'); setIsModeMenuOpen(false); }}
                              className={`w-full px-3 py-2 text-left text-xs font-medium flex items-center gap-2 transition-colors ${appMode === 'build' ? 'bg-zinc-800 text-blue-400' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}
                            >
                              <Zap className="w-3.5 h-3.5" />
                              Build
                            </button>
                            <button 
                              onClick={() => { setAppMode('plan'); setIsModeMenuOpen(false); }}
                              className={`w-full px-3 py-2 text-left text-xs font-medium flex items-center gap-2 transition-colors ${appMode === 'plan' ? 'bg-zinc-800 text-blue-400' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}
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
                      className={`p-2 rounded-full transition-colors ${isRecording ? 'bg-red-500/20 text-red-500 animate-pulse' : 'hover:bg-zinc-800 text-zinc-400'}`}
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                    <button 
                      disabled={!chatInput.trim() || isBuilding}
                      onClick={startBuild}
                      className={`p-2 rounded-full transition-colors border border-zinc-700/50 ${
                        chatInput.trim() && !isBuilding 
                          ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20' 
                          : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
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
          className="flex-1 bg-[#0d0d0e] rounded-2xl border border-zinc-800/50 shadow-2xl relative overflow-hidden flex"
        >
          {/* File Explorer Sidebar */}
          <AnimatePresence>
            {isFileExplorerOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 240, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="h-full border-r border-zinc-800/50 bg-[#0d0d0e] flex flex-col shrink-0 overflow-hidden"
              >
                <div className="p-4 flex items-center justify-between border-b border-zinc-800/30">
                  <span className="text-xs font-bold text-zinc-200 uppercase tracking-widest">Files</span>
                  <Plus className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300 cursor-pointer" />
                </div>
                <div className="flex-1 overflow-y-auto py-2">
                  {files.map((file, idx) => (
                    <div key={idx} className="group">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-zinc-800/50 cursor-pointer text-zinc-300 transition-colors">
                        {file.type === 'folder' ? (
                          <>
                            <ChevronRight className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${file.open ? 'rotate-90' : ''}`} />
                            <FolderOpen className="w-4 h-4 text-zinc-400" />
                          </>
                        ) : (
                          <file.icon className={`w-4 h-4 ml-5 ${file.color}`} />
                        )}
                        <span className="text-sm">{file.name}</span>
                      </div>
                      {file.type === 'folder' && file.open && file.children && (
                        <div className="ml-4">
                      {file.children.map((child, cIdx) => (
                        <div key={cIdx} className="flex items-center gap-2 px-3 py-1 hover:bg-zinc-800/50 cursor-pointer text-zinc-400 transition-colors">
                          {child.type === 'folder' ? (
                            <>
                              <ChevronRight className="w-3 h-3 text-zinc-500 ml-5" />
                              <FolderOpen className="w-4 h-4 text-zinc-400" />
                            </>
                          ) : (
                            <child.icon className={`w-4 h-4 ml-5 ${child.color}`} />
                          )}
                          <span className="text-sm">{child.name}</span>
                        </div>
                      ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 relative">
            {/* Subtle grid pattern background */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
            />

            {/* Generated App Live Preview */}
            {previewUrl && !isBuilding && !isEditMode && (
              <div className="absolute inset-0 z-10 bg-[#0a0a0b]">
                <iframe
                  title="Live Preview"
                  src={previewUrl}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            )}

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

            {/* Huggy Multi-Agent Pipeline Visualization */}
            <AnimatePresence>
              {isBuilding && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-40 bg-[#0d0d0e]/95 backdrop-blur-xl flex flex-col items-center justify-center p-8"
                >
                  <div className="max-w-2xl w-full">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h2 className="text-2xl font-display font-bold text-zinc-100 flex items-center gap-3">
                          <Activity className="w-6 h-6 text-blue-500" />
                          Huggy Orchestrator
                        </h2>
                        <p className="text-zinc-500 text-sm mt-1">Executing multi-agent pipeline for your request</p>
                      </div>
                      <div className="text-right">
                        <span className="text-3xl font-mono font-bold text-blue-500/50">
                          {Math.round(((currentAgentIndex + 1) / agents.length) * 100)}%
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                      {agents.map((agent, index) => {
                        const isCompleted = index < currentAgentIndex;
                        const isActive = index === currentAgentIndex;
                        const isPending = index > currentAgentIndex;

                        return (
                          <motion.div
                            key={agent.id}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className={`p-4 rounded-xl border transition-all duration-300 ${
                              isActive 
                                ? 'bg-blue-600/10 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
                                : isCompleted 
                                  ? 'bg-zinc-800/20 border-zinc-800/50 opacity-60' 
                                  : 'bg-zinc-900/20 border-zinc-800/30 opacity-40'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                                <agent.icon className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className={`text-sm font-bold truncate ${isActive ? 'text-zinc-100' : 'text-zinc-400'}`}>
                                  {agent.name}
                                </h3>
                                <p className="text-[11px] text-zinc-500 truncate">
                                  {isActive ? agent.description : isCompleted ? 'Verification successful' : 'Waiting...'}
                                </p>
                              </div>
                              {isCompleted && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                              {isActive && <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />}
                            </div>
                            
                            {isActive && (
                              <motion.div 
                                layoutId="progress-bar"
                                className="h-0.5 bg-blue-500 mt-3 rounded-full overflow-hidden"
                              >
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: "100%" }}
                                  transition={{ duration: 2, ease: "linear" }}
                                  className="h-full bg-blue-400"
                                />
                              </motion.div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                    
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 font-mono text-[10px] text-zinc-500 h-24 overflow-y-auto">
                      <div className="text-blue-500 mb-1">Starting pipeline...</div>
                      {buildLogs.filter(l => l.status !== 'pending').map((log, i) => (
                        <div key={i} className="mb-0.5">
                          [Agent: {log.agent}] <span className={log.status === 'completed' ? 'text-green-500' : 'text-yellow-500 animate-pulse'}>
                            {log.status === 'completed' ? '✓ DONE' : '• EXECUTING...'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </main>
        </>
      )}
    </div>
  );
}
