/**
 * Adaptive Button - Windsurf Style
 * 
 * Remplace le bouton ELITE avec:
 * - UI exacte Windsurf (gradient #1488fc)
 * - Mode toggle Agent/Chat
 * - Model selector avec OpenRouter
 * - Animations cascade Framer Motion
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, 
  MessageSquare, 
  ChevronDown, 
  Check, 
  Zap, 
  Brain, 
  Globe,
  Sparkles,
  AlertCircle,
  Cpu,
  Terminal,
  FileCode,
  Search,
} from 'lucide-react';
import { OPENROUTER_MODELS, selectModelForTask, formatTokenCount } from '../../lib/llm/openrouter.mjs';

// Mode colors - Windsurf exact
const MODE_CONFIG = {
  agent: {
    gradient: 'from-violet-600 via-violet-500 to-blue-500',
    shadow: 'shadow-violet-500/25',
    hoverShadow: 'hover:shadow-violet-500/40',
    icon: Bot,
    label: 'Agent',
    description: '🤖 Autonomous mode - AI acts without confirmation',
  },
  chat: {
    gradient: 'from-blue-500 via-cyan-500 to-cyan-400',
    shadow: 'shadow-blue-500/25',
    hoverShadow: 'hover:shadow-blue-500/40',
    icon: MessageSquare,
    label: 'Chat',
    description: '💬 Interactive mode - AI responds to your questions',
  },
};

interface AdaptiveButtonProps {
  onModeChange?: (mode: 'agent' | 'chat') => void;
  onModelChange?: (modelId: string) => void;
  onPromptSubmit?: (prompt: string, mode: 'agent' | 'chat', model: string) => void;
  currentMode?: 'agent' | 'chat';
  className?: string;
}

export function AdaptiveButton({
  onModeChange,
  onModelChange,
  onPromptSubmit,
  currentMode = 'chat',
  className = '',
}: AdaptiveButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'agent' | 'chat'>(currentMode);
  const [selectedModel, setSelectedModel] = useState('anthropic/claude-3.5-sonnet');
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const modelInfo = OPENROUTER_MODELS[selectedModel];
  const ModeIcon = MODE_CONFIG[mode].icon;
  
  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Handle mode change
  const handleModeChange = (newMode: 'agent' | 'chat') => {
    setMode(newMode);
    onModeChange?.(newMode);
  };
  
  // Handle model change
  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    onModelChange?.(modelId);
    setIsOpen(false);
  };
  
  // Handle prompt submission
  const handleSubmit = () => {
    if (inputValue.trim()) {
      onPromptSubmit?.(inputValue, mode, selectedModel);
      setInputValue('');
      setIsTyping(false);
    }
  };
  
  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Main Adaptive Button - Windsurf Style */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r ${MODE_CONFIG[mode].gradient}
                   rounded-xl text-white font-semibold text-sm 
                   shadow-lg ${MODE_CONFIG[mode].shadow} ${MODE_CONFIG[mode].hoverShadow}
                   transition-all duration-300 border border-white/10`}
      >
        {/* Animated icon */}
        <motion.div
          animate={isTyping ? { rotate: [0, 360] } : {}}
          transition={{ duration: 2, repeat: isTyping ? Infinity : 0, ease: 'linear' }}
        >
          <ModeIcon className="w-4 h-4" />
        </motion.div>
        
        <span className="font-bold">Adaptive</span>
        
        {/* Separator */}
        <span className="w-px h-4 bg-white/20" />
        
        {/* Current model badge */}
        <span className="text-xs opacity-90 flex items-center gap-1.5 bg-white/10 px-2 py-0.5 rounded-full">
          <span>{modelInfo.icon}</span>
          <span className="hidden sm:inline">{modelInfo.name}</span>
        </span>
        
        {/* Dropdown chevron */}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </motion.button>
      
      {/* Dropdown Menu - Windsurf Style */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-full right-0 mt-2 w-96 
                       bg-[#0f0f12] border border-zinc-800/50 
                       rounded-xl shadow-2xl shadow-black/50 
                       overflow-hidden z-50 backdrop-blur-xl"
            style={{ 
              background: 'linear-gradient(180deg, rgba(15,15,18,0.98) 0%, rgba(20,20,25,0.98) 100%)',
            }}
          >
            {/* Mode Toggle Section */}
            <div className="p-4 border-b border-zinc-800/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Mode
                </span>
                <span className="text-[10px] text-zinc-600">
                  {formatTokenCount(modelInfo.context)} context
                </span>
              </div>
              
              {/* Mode Toggle Buttons */}
              <div className="flex bg-zinc-900/80 rounded-xl p-1 border border-zinc-800/50">
                {( ['agent', 'chat'] as const).map((m) => {
                  const Icon = MODE_CONFIG[m].icon;
                  const isActive = mode === m;
                  
                  return (
                    <button
                      key={m}
                      onClick={() => handleModeChange(m)}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold 
                                transition-all duration-200 ${
                        isActive 
                          ? `bg-gradient-to-r ${MODE_CONFIG[m].gradient} text-white shadow-lg` 
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="capitalize">{m}</span>
                    </button>
                  );
                })}
              </div>
              
              {/* Mode description */}
              <p className="text-[11px] text-zinc-500 mt-2 px-1 leading-relaxed">
                {MODE_CONFIG[mode].description}
              </p>
            </div>
            
            {/* Smart Model Selector */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Model
                </span>
                <span className="text-[10px] px-2 py-0.5 bg-violet-500/10 text-violet-400 rounded-full font-medium">
                  Auto-selected
                </span>
              </div>
              
              {/* Current Model Card - Highlighted */}
              <motion.div 
                layoutId="selected-model"
                className="mb-3 p-3 rounded-xl bg-gradient-to-r from-violet-500/10 via-blue-500/10 to-cyan-500/10 
                          border border-[#1488fc]/30 relative overflow-hidden"
              >
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-blue-500/5 blur-xl" />
                
                <div className="relative flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 
                                flex items-center justify-center text-xl shadow-lg shadow-violet-500/20">
                    {modelInfo.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white">{modelInfo.name}</div>
                    <div className="text-[11px] text-zinc-400">{modelInfo.description}</div>
                  </div>
                  <Check className="w-5 h-5 text-[#1488fc]" />
                </div>
                
                {/* Token info */}
                <div className="relative flex items-center gap-4 mt-3 text-[10px] text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Cpu className="w-3 h-3" />
                    {formatTokenCount(modelInfo.context)} context
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {modelInfo.bestFor.slice(0, 2).join(', ')}
                  </span>
                </div>
              </motion.div>
              
              {/* Model List */}
              <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                {Object.entries(OPENROUTER_MODELS).map(([id, model]) => {
                  const isSelected = selectedModel === id;
                  
                  return (
                    <motion.button
                      key={id}
                      onClick={() => handleModelChange(id)}
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg 
                                text-left transition-all duration-150 ${
                        isSelected 
                          ? 'bg-zinc-800 text-white border border-zinc-700' 
                          : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                      }`}
                    >
                      <span className="text-lg">{model.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{model.name}</div>
                        <div className="text-[10px] text-zinc-500 truncate flex items-center gap-2">
                          <span>{model.description}</span>
                          <span className="text-zinc-600">•</span>
                          <span className="text-zinc-600">{formatTokenCount(model.context)} ctx</span>
                        </div>
                      </div>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-2 h-2 rounded-full bg-[#1488fc]"
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
            
            {/* Context Info Footer */}
            <div className="p-3 border-t border-zinc-800/50 bg-zinc-900/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Connected to OpenRouter</span>
                </div>
                
                {/* Token counter (for user info) */}
                <div className="text-[10px] text-zinc-600 flex items-center gap-1">
                  <Terminal className="w-3 h-3" />
                  <span>Tokens tracked</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Adaptive Chat Input - Windsurf Style
 * For inline prompt input with the button
 */
export function AdaptiveChatInput({
  onSubmit,
  mode,
  placeholder = 'What do you want to build?',
}: {
  onSubmit: (prompt: string) => void;
  mode: 'agent' | 'chat';
  placeholder?: string;
}) {
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  
  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value);
      setValue('');
    }
  };
  
  return (
    <div className={`relative flex items-end gap-2 p-3 rounded-xl border transition-all duration-300 ${
      isFocused 
        ? 'border-[#1488fc]/50 bg-zinc-900/80 shadow-lg shadow-[#1488fc]/10' 
        : 'border-zinc-800 bg-zinc-900/50'
    }`}>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        placeholder={placeholder}
        rows={1}
        className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 
                  resize-none outline-none min-h-[20px] max-h-[120px]"
        style={{ fieldSizing: 'content' }}
      />
      
      <motion.button
        onClick={handleSubmit}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        disabled={!value.trim()}
        className={`p-2 rounded-lg transition-all duration-200 ${
          value.trim()
            ? 'bg-gradient-to-r from-violet-500 to-blue-500 text-white shadow-lg shadow-violet-500/20'
            : 'bg-zinc-800 text-zinc-600'
        }`}
      >
        <Sparkles className="w-4 h-4" />
      </motion.button>
    </div>
  );
}

export default AdaptiveButton;
