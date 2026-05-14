import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  User, 
  Sparkles, 
  Code2, 
  Wrench, 
  Eye, 
  CheckCircle2, 
  AlertCircle,
  Terminal,
  FileCode,
  Loader2
} from 'lucide-react';

// Types
export type MessageType = 'user' | 'assistant' | 'system' | 'tool' | 'code' | 'error';

export interface StreamMessage {
  id: string;
  type: MessageType;
  content: string;
  isStreaming?: boolean;
  timestamp: Date;
  metadata?: {
    agent?: string;
    tool?: string;
    file?: string;
    status?: 'pending' | 'success' | 'error';
  };
}

export interface AIChatStreamProps {
  messages: StreamMessage[];
  isTyping?: boolean;
  currentAgent?: string;
  onScroll?: (scrollTop: number) => void;
}

// Agent icons mapping
const AGENT_ICONS: Record<string, React.ElementType> = {
  'Intent Parser': Bot,
  'Builder Agent': Code2,
  'Preview Compiler': Eye,
  'Repair Agent': Wrench,
  'System': Terminal,
  default: Sparkles
};

// Message bubble component
const MessageBubble = ({ message }: { message: StreamMessage }) => {
  const isUser = message.type === 'user';
  const isSystem = message.type === 'system' || message.type === 'tool';
  const isCode = message.type === 'code';
  const isError = message.type === 'error';
  
  const Icon = isUser ? User : 
               isError ? AlertCircle :
               isCode ? FileCode :
               AGENT_ICONS[message.metadata?.agent || ''] || AGENT_ICONS.default;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} group`}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center
        ${isUser ? 'bg-accent/20 text-accent' : 
          isError ? 'bg-red-500/20 text-red-400' :
          isCode ? 'bg-blue-500/20 text-blue-400' :
          isSystem ? 'bg-zinc-700/50 text-zinc-400' :
          'bg-violet-500/20 text-violet-400'}`}
      >
        <Icon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Header */}
        <div className={`flex items-center gap-2 mb-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-[11px] font-medium text-zinc-400">
            {isUser ? 'You' : message.metadata?.agent || 'Huggy'}
          </span>
          <span className="text-[10px] text-zinc-600">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {message.metadata?.status === 'pending' && (
            <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
          )}
          {message.metadata?.status === 'success' && (
            <CheckCircle2 className="w-3 h-3 text-green-400" />
          )}
          {message.metadata?.status === 'error' && (
            <AlertCircle className="w-3 h-3 text-red-400" />
          )}
        </div>

        {/* Message bubble */}
        <div className={`relative max-w-[90%] rounded-lg px-3 py-2 text-[13px] leading-relaxed
          ${isUser ? 
            'bg-accent/10 text-zinc-100 border border-accent/20' :
            isError ?
            'bg-red-500/10 text-red-200 border border-red-500/20' :
            isCode ?
            'bg-bg-surface text-zinc-300 border border-border-default font-mono text-[12px]' :
            'bg-bg-elevated text-zinc-200 border border-border-default'
          }`}
        >
          {/* Streaming cursor */}
          {message.isStreaming && (
            <span className="inline-block w-2 h-4 bg-accent ml-1 animate-pulse" />
          )}
          
          {/* Content */}
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>

          {/* Tool indicator */}
          {message.metadata?.tool && (
            <div className="mt-2 pt-2 border-t border-border-subtle">
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                <Wrench className="w-3 h-3" />
                <span>Using {message.metadata.tool}</span>
              </div>
            </div>
          )}

          {/* File indicator */}
          {message.metadata?.file && (
            <div className="mt-2 pt-2 border-t border-border-subtle">
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                <FileCode className="w-3 h-3" />
                <span>{message.metadata.file}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Typing indicator component
const TypingIndicator = ({ agent }: { agent?: string }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <div className="flex-shrink-0 w-7 h-7 rounded-md bg-violet-500/20 flex items-center justify-center">
        <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-medium text-zinc-400">{agent || 'Huggy'}</span>
          <span className="text-[10px] text-zinc-600">is thinking...</span>
        </div>
        <div className="flex items-center gap-1 py-2">
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-accent"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0 }}
          />
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-accent"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
          />
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-accent"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
          />
        </div>
      </div>
    </motion.div>
  );
};

// Main component
export function AIChatStream({ 
  messages, 
  isTyping = false, 
  currentAgent,
  onScroll 
}: AIChatStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  // Handle scroll events
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isNearBottom);
    onScroll?.(scrollTop);
  };

  return (
    <div className="flex flex-col h-full bg-bg-deep">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-bg-base">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-accent" />
          <span className="text-[12px] font-medium text-zinc-300">AI Chat Stream</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500">{messages.length} messages</span>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
      >
        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isTyping && (
          <TypingIndicator agent={currentAgent} />
        )}
      </div>

      {/* Scroll to bottom button */}
      {!autoScroll && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => {
            setAutoScroll(true);
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
          }}
          className="absolute bottom-4 right-4 p-2 rounded-full bg-bg-elevated border border-border-default
            text-zinc-400 hover:text-zinc-200 hover:border-border-strong transition-all shadow-lg"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </motion.button>
      )}
    </div>
  );
}

export default AIChatStream;
