'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { 
  Plus, Lightbulb, Paperclip, Image, FileCode,
  ChevronDown, Check, Sparkles, Zap, Brain, Bolt, Github,
  SendHorizontal, User, Moon, Sun
} from 'lucide-react'
import { useAuth } from "../lib/useAuth"

// TYPES
interface Model {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  badge?: string
}

export type Theme = "light" | "dark"

// FIGMA ICON
function FigmaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M8 24C10.208 24 12 22.208 12 20V16H8C5.792 16 4 17.792 4 20C4 22.208 5.792 24 8 24Z" fill="currentColor"/>
      <path d="M4 12C4 9.792 5.792 8 8 8H12V16H8C5.792 16 4 14.208 4 12Z" fill="currentColor"/>
      <path d="M4 4C4 1.792 5.792 0 8 0H12V8H8C5.792 8 4 6.208 4 4Z" fill="currentColor"/>
      <path d="M12 0H16C18.208 0 20 1.792 20 4C20 6.208 18.208 8 16 8H12V0Z" fill="currentColor"/>
      <path d="M20 12C20 14.208 18.208 16 16 16C13.792 16 12 14.208 12 12C12 9.792 13.792 8 16 8C18.208 8 20 9.792 20 12Z" fill="currentColor"/>
    </svg>
  )
}

// MODEL DATA
const models: Model[] = [
  { id: 'sonnet-4.5', name: 'Sonnet 4.5', description: 'Fast & intelligent', icon: <Zap className="w-4 h-4 text-blue-400" />, badge: 'Default' },
  { id: 'opus-4.5', name: 'Opus 4.5', description: 'Most capable', icon: <Sparkles className="w-4 h-4 text-purple-400" />, badge: 'Pro' },
  { id: 'haiku-4.5', name: 'Haiku 4.5', description: 'Lightning fast', icon: <Brain className="w-4 h-4 text-emerald-400" /> },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'OpenAI flagship', icon: <Sparkles className="w-4 h-4 text-green-400" /> },
  { id: 'gemini-2.0', name: 'Gemini 2.0', description: 'Google AI', icon: <Brain className="w-4 h-4 text-cyan-400" /> }
]

// AGENT DATA (for future expansion)
const AGENTS = [
  { name: 'Web Research', icon: '🔍', desc: 'Scraping & context' },
  { name: 'Product Manager', icon: '📋', desc: 'Strategy & specs' },
  { name: 'DBA Architect', icon: '🗄️', desc: 'Schema & RLS' },
  { name: 'UX Designer', icon: '🎨', desc: 'Design system' },
  { name: 'Coder Agent', icon: '💻', desc: 'React/TS code' },
  { name: 'Security Auditor', icon: '🔒', desc: 'Vuln scan' },
  { name: 'QA Reviewer', icon: '✓', desc: 'Code review' },
  { name: 'i18n Agent', icon: '🌍', desc: 'Translation' },
]

// MODEL SELECTOR COMPONENT
function ModelSelector({ selectedModel = 'sonnet-4.5', onModelChange }: { 
  selectedModel?: string
  onModelChange?: (model: Model) => void 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState(models.find(m => m.id === selectedModel) || models[0])

  const handleSelect = (model: Model) => {
    setSelected(model)
    setIsOpen(false)
    onModelChange?.(model)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 text-[#8a8a8f] hover:text-white hover:bg-white/5 active:scale-95"
      >
        {selected.icon}
        <span>{selected.name}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute bottom-full left-0 mb-2 z-50 min-w-[220px] bg-[#1a1a1e]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="p-1.5">
              <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a5f]">
                Select Model
              </div>
              {models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleSelect(model)}
                  className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-all duration-150 ${
                    selected.id === model.id ? 'bg-white/10 text-white' : 'text-[#a0a0a5] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex-shrink-0">{model.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{model.name}</span>
                      {model.badge && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          model.badge === 'Pro' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {model.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#6a6a6f]">{model.description}</span>
                  </div>
                  {selected.id === model.id && <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// CHAT INPUT COMPONENT
function ChatInput({ onSend, placeholder = "What do you want to build?", theme = 'dark' }: {
  onSend?: (message: string) => void
  placeholder?: string
  theme?: Theme
}) {
  const [message, setMessage] = useState('')
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Colors based on theme
  const isDark = theme === 'dark'
  const bgColor = isDark ? 'bg-[#1e1e22]' : 'bg-white'
  const textColor = isDark ? 'text-white' : 'text-[#1a1a2e]'
  const placeholderColor = isDark ? 'placeholder-[#5a5a5f]' : 'placeholder-[#9ca3af]'
  const ringColor = isDark ? 'ring-white/[0.08]' : 'ring-black/[0.08]'
  const shadowColor = isDark ? 'shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_20px_rgba(0,0,0,0.4)]' : 'shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_2px_20px_rgba(0,0,0,0.1)]'

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px` 
    }
  }, [message])

  const handleSubmit = () => {
    if (message.trim()) {
      onSend?.(message)
      setMessage('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="relative w-full max-w-[680px] mx-auto">
      <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none" />
      <div className={`relative rounded-2xl ${bgColor} ring-1 ${ringColor} ${shadowColor} transition-colors duration-300`}>
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`w-full resize-none bg-transparent text-[15px] ${textColor} ${placeholderColor} px-5 pt-5 pb-3 focus:outline-none min-h-[80px] max-h-[200px] transition-colors duration-300`}
            style={{ height: '80px' }}
          />
        </div>

        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.12] text-[#8a8a8f] hover:text-white transition-all duration-200 active:scale-95"
              >
                <Plus className={`w-4 h-4 transition-transform duration-200 ${showAttachMenu ? 'rotate-45' : ''}`} />
              </button>

              {showAttachMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowAttachMenu(false)} />
                  <div className="absolute bottom-full left-0 mb-2 z-50 bg-[#1a1a1e]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="p-1.5 min-w-[180px]">
                      {[
                        { icon: <Paperclip className="w-4 h-4" />, label: 'Upload file' },
                        { icon: <Image className="w-4 h-4" />, label: 'Add image' },
                        { icon: <FileCode className="w-4 h-4" />, label: 'Import code' }
                      ].map((item, i) => (
                        <button key={i} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[#a0a0a5] hover:bg-white/5 hover:text-white transition-all duration-150">
                          {item.icon}
                          <span className="text-sm">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <ModelSelector />
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium text-[#6a6a6f] hover:text-white hover:bg-white/5 transition-all duration-200">
              <Lightbulb className="w-4 h-4" />
              <span className="hidden sm:inline">Plan</span>
            </button>

            <button
              onClick={handleSubmit}
              disabled={!message.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-[#1488fc] hover:bg-[#1a94ff] text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-[0_0_20px_rgba(20,136,252,0.3)]"
            >
              <span className="hidden sm:inline">Build now</span>
              <SendHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// RAY BACKGROUND COMPONENT
function RayBackground({ theme }: { theme: Theme }) {
  // Only show ray effect in dark mode
  if (theme === 'light') {
    return (
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none">
        <div className="absolute inset-0 bg-[#f3ede1]" />
        {/* Subtle warm gradient for light mode */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 w-[2000px] h-[1000px]"
          style={{
            background: `radial-gradient(ellipse at center top, rgba(20, 136, 252, 0.15) 0%, transparent 60%)` 
          }}
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none">
      <div className="absolute inset-0 bg-[#0f0f0f]" />
      <div 
        className="absolute left-1/2 -translate-x-1/2 w-[4000px] h-[1800px] sm:w-[6000px]"
        style={{
          background: `radial-gradient(circle at center 800px, rgba(20, 136, 252, 0.8) 0%, rgba(20, 136, 252, 0.35) 14%, rgba(20, 136, 252, 0.18) 18%, rgba(20, 136, 252, 0.08) 22%, rgba(17, 17, 20, 0.2) 25%)` 
        }}
      />
      <div 
        className="absolute top-[175px] left-1/2 w-[1600px] h-[1600px] sm:top-1/2 sm:w-[3043px] sm:h-[2865px]"
        style={{ transform: 'translate(-50%) rotate(180deg)' }}
      >
        <div className="absolute w-full h-full rounded-full -mt-[13px]" style={{ background: 'radial-gradient(43.89% 25.74% at 50.02% 97.24%, #111114 0%, #0f0f0f 100%)', border: '16px solid white', transform: 'rotate(180deg)', zIndex: 5 }} />
        <div className="absolute w-full h-full rounded-full bg-[#0f0f0f] -mt-[11px]" style={{ border: '23px solid #b7d7f6', transform: 'rotate(180deg)', zIndex: 4 }} />
        <div className="absolute w-full h-full rounded-full bg-[#0f0f0f] -mt-[8px]" style={{ border: '23px solid #8fc1f2', transform: 'rotate(180deg)', zIndex: 3 }} />
        <div className="absolute w-full h-full rounded-full bg-[#0f0f0f] -mt-[4px]" style={{ border: '23px solid #64acf6', transform: 'rotate(180deg)', zIndex: 2 }} />
        <div className="absolute w-full h-full rounded-full bg-[#0f0f0f]" style={{ border: '20px solid #1172e2', boxShadow: '0 -15px 24.8px rgba(17, 114, 226, 0.6)', transform: 'rotate(180deg)', zIndex: 1 }} />
      </div>
    </div>
  )
}

// ANNOUNCEMENT BADGE COMPONENT
function AnnouncementBadge({ text, href = "#" }: { text: string; href?: string }) {
  const content = (
    <>
      <Bolt className="w-3.5 h-3.5 text-[#1488fc]" />
      <span className="text-sm font-medium text-[#8a8a8f]">{text}</span>
    </>
  )

  const className = "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"

  return href !== '#' ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{content}</a>
  ) : (
    <button className={className}>{content}</button>
  )
}

// IMPORT BUTTONS COMPONENT
function ImportButtons({ onImport }: { onImport?: (source: string) => void }) {
  return (
    <div className="flex items-center gap-4 justify-center">
      <span className="text-sm text-[#6a6a6f]">or import from</span>
      <div className="flex gap-2">
        {[
          { id: 'figma', name: 'Figma', icon: <FigmaIcon className="w-4 h-4" /> },
          { id: 'github', name: 'GitHub', icon: <Github className="w-4 h-4" /> }
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => onImport?.(option.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-white/10 bg-[#0f0f0f] hover:bg-[#1a1a1e] text-[#8a8a8f] hover:text-white transition-all duration-200 active:scale-95"
          >
            {option.icon}
            <span>{option.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// THEME TOGGLE BUTTON
function ThemeToggleButton({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center justify-center w-10 h-10 rounded-full bg-white/[0.08] hover:bg-white/[0.12] text-[#8a8a8f] hover:text-white transition-all duration-200 active:scale-95"
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
    </button>
  )
}

// NAVBAR COMPONENT
function Navbar({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4">
      {/* Logo */}
      <motion.div 
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => navigate('/')}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1488fc] to-[#1a94ff] flex items-center justify-center shadow-lg shadow-blue-500/20 overflow-hidden">
          <img 
            src="/huggy-logo.png" 
            alt="Huggy" 
            className="w-full h-full object-contain p-1"
          />
        </div>
        <span className="text-xl font-bold text-white tracking-tight">huggy</span>
      </motion.div>

      {/* Right Side */}
      <div className="flex items-center gap-3">
        <ThemeToggleButton theme={theme} onToggle={onToggleTheme} />
        
        {user ? (
          <motion.div 
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.08] text-white text-sm font-medium cursor-pointer"
            onClick={() => navigate('/dashboard')}
            whileHover={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
            whileTap={{ scale: 0.95 }}
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">{user.email?.split('@')[0]}</span>
          </motion.div>
        ) : (
          <motion.button 
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1488fc] hover:bg-[#1a94ff] text-white text-sm font-medium transition-all"
            onClick={() => navigate('/auth')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <User className="w-4 h-4" />
            <span>Sign In</span>
          </motion.button>
        )}
      </div>
    </nav>
  )
}

// CURTAIN OVERLAY COMPONENT
type CurtainPhase = "idle" | "falling" | "rising";
const EASING = "cubic-bezier(0.76, 0, 0.24, 1)";
const DURATION = 600;

function CurtainOverlay({ phase, color }: { phase: CurtainPhase; color: string }) {
  const divRef = useRef<HTMLDivElement>(null);
  const prevPhaseRef = useRef<CurtainPhase>("idle");
  
  useEffect(() => {
    const el = divRef.current;
    if (!el) return;
    
    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    
    // Reset styles first
    el.style.transition = "none";
    
    if (phase === "falling") {
      // Start from hidden
      el.style.transform = "scaleY(0)";
      el.style.opacity = "1";
      
      // Force reflow
      el.offsetHeight;
      
      // Animate to visible
      el.style.transition = `transform ${DURATION}ms ${EASING}`;
      el.style.transform = "scaleY(1)";
    } else if (phase === "rising") {
      // Start from visible
      el.style.transform = "scaleY(1)";
      el.style.opacity = "1";
      
      // Force reflow
      el.offsetHeight;
      
      // Animate to hidden
      el.style.transition = `transform ${DURATION}ms ${EASING}`;
      el.style.transform = "scaleY(0)";
    } else {
      // Idle - hide immediately
      el.style.transform = "scaleY(0)";
      el.style.opacity = "0";
    }
  }, [phase, color]);
  
  return (
    <div
      ref={divRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-[9999]"
      style={{
        background: color,
        transformOrigin: "top",
        transform: "scaleY(0)",
        opacity: 0,
      }}
    />
  );
}

// MAIN LANDING PAGE COMPONENT
// TYPING TEXT COMPONENT - Style rédaction avec curseur
function TypingText({ words, interval = 3000 }: { words: string[]; interval?: number }) {
  const [index, setIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  // Couleurs différentes pour chaque mot
  const wordColors = [
    'from-violet-500 to-purple-500',      // SaaS - violet
    'from-emerald-400 to-teal-500',       // app - vert
    'from-orange-400 to-amber-500',     // website - orange
    'from-pink-500 to-rose-500',        // dashboard - rose
    'from-cyan-400 to-blue-500',        // platform - cyan
    'from-indigo-400 to-violet-500',    // tool - indigo
    'from-fuchsia-500 to-pink-500',     // portal - fuchsia
    'from-lime-400 to-green-500',       // system - lime
  ];

  // Effet typing style rédaction
  useEffect(() => {
    const currentWord = words[index];
    const typingSpeed = isDeleting ? 50 : 100; // Plus rapide en suppression

    const timer = setTimeout(() => {
      if (!isDeleting) {
        // Phase d'écriture
        if (displayText.length < currentWord.length) {
          setDisplayText(currentWord.slice(0, displayText.length + 1));
        } else {
          // Mot complet, attendre avant de supprimer
          setTimeout(() => setIsDeleting(true), 1500);
        }
      } else {
        // Phase de suppression
        if (displayText.length > 0) {
          setDisplayText(displayText.slice(0, -1));
        } else {
          // Passer au mot suivant
          setIsDeleting(false);
          setIndex((prev) => (prev + 1) % words.length);
        }
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, index, words]);

  // Curseur clignotant
  useEffect(() => {
    const cursorTimer = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);
    return () => clearInterval(cursorTimer);
  }, []);

  const currentColor = wordColors[index % wordColors.length];

  return (
    <span className="inline-flex items-baseline">
      <motion.span
        className={`bg-gradient-to-r ${currentColor} bg-clip-text text-transparent italic font-semibold`}
        layout
      >
        {displayText}
      </motion.span>
      {/* Curseur style Windsurf block */}
      <motion.span
        className={`inline-block w-[3px] h-[0.9em] ml-[2px] bg-gradient-to-b ${currentColor} rounded-sm`}
        animate={{ opacity: showCursor ? 1 : 0 }}
        transition={{ duration: 0.1 }}
        style={{ verticalAlign: 'baseline' }}
      />
    </span>
  );
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [theme, setTheme] = useState<Theme>('dark')
  const [phase, setPhase] = useState<CurtainPhase>("idle");
  const [selectedModel, setSelectedModel] = useState<Model>(models[0])
  const curtainColorRef = useRef<string>("#0e0e0e");

  // Load theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('huggy-theme') as Theme | null
    if (saved) {
      setTheme(saved)
      if (saved === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }, [])

  // Toggle with curtain animation
  const toggleTheme = useCallback(() => {
    if (phase !== "idle") return;
    
    const next: Theme = theme === "light" ? "dark" : "light";
    // Set curtain color to the NEW theme's background
    curtainColorRef.current = next === "dark" ? "#0e0e0e" : "#f3ede1";
    
    // Force a reflow to ensure the color is set before animation starts
    setPhase("falling");

    setTimeout(() => {
      // Change theme when curtain covers screen
      setTheme(next);
      localStorage.setItem('huggy-theme', next);
      
      if (next === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }

      // Small delay to ensure DOM update before rising
      requestAnimationFrame(() => {
        setPhase("rising");
      });
      
      // Reset phase after animation
      setTimeout(() => setPhase("idle"), DURATION + 100);
    }, DURATION);
  }, [phase, theme]);

  const handleSend = (message: string) => {
    console.log('Building:', message, 'with model:', selectedModel.id)
    navigate('/builder', { state: { initialPrompt: message, model: selectedModel.id } })
  }

  const handleImport = (source: string) => {
    console.log('Import from:', source)
    // TODO: Handle import from Figma/GitHub
  }

  const handleModelChange = (model: Model) => {
    setSelectedModel(model)
  }

  // Dynamic background based on theme
  const bgColor = theme === 'dark' ? '#0f0f0f' : '#f3ede1';

  return (
    <div className="relative min-h-screen w-full overflow-hidden transition-colors duration-300" style={{ backgroundColor: bgColor }}>
      {/* Curtain Animation Overlay */}
      <CurtainOverlay phase={phase} color={curtainColorRef.current} />
      
      <RayBackground theme={theme} />
      
      {/* Navbar */}
      <Navbar theme={theme} onToggleTheme={toggleTheme} />

      {/* Main Content - Bolt Style */}
      <div className="relative flex flex-col items-center justify-center min-h-screen w-full">
        {/* Announcement badge */}
        <div className="absolute top-[70px] z-10">
          <AnnouncementBadge text="AI-POWERED APP BUILDER" href="#" />
        </div>

        {/* Content container */}
        <div className="absolute top-[70%] left-1/2 sm:top-[55%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center w-full h-full overflow-hidden px-4">
          {/* Title section */}
          <div className="text-center mb-6">
            <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-none transition-colors duration-300 ${theme === 'dark' ? 'text-white' : 'text-[#1a1a2e]'}`}>
              Build any <TypingText words={['SaaS', 'app', 'website', 'dashboard', 'platform', 'tool', 'portal', 'system']} />
            </h1>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-none">
              <span className="bg-gradient-to-r from-[#1488fc] to-[#3b82f6] bg-clip-text text-transparent italic">
                instantly.
              </span>
            </h1>
            <p className={`text-base sm:text-lg transition-colors duration-300 max-w-xl mx-auto mt-2 ${theme === 'dark' ? 'text-[#8a8a8f]' : 'text-[#6b7280]'}`}>
              8 AI agents working together to create stunning apps
            </p>
          </div>

          {/* Chat input */}
          <div className="w-full max-w-[700px] mb-6 sm:mb-8 mt-2">
            <ChatInput placeholder="What do you want to build?" onSend={handleSend} theme={theme} />
          </div>

          {/* Import buttons */}
          <ImportButtons onImport={handleImport} />
        </div>

        {/* Footer info */}
        <div className="absolute bottom-8 left-0 right-0 text-center z-10">
          <p className={`text-xs transition-colors duration-300 ${theme === 'dark' ? 'text-[#5a5a5f]' : 'text-[#9ca3af]'}`}>
            Powered by {selectedModel.name} • Built with React, TypeScript & Tailwind
          </p>
        </div>
      </div>
    </div>
  )
}
