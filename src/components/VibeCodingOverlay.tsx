/**
 * VibeCodingOverlay - Animation immersive pendant la génération de code
 * Skeleton cards + progress slider + fake code stream + ambient FX + agent status
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ClipboardList, Eye, Code2,
  ShieldCheck, CheckCircle2, Zap
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface AgentInfo {
  name: string;
  status: 'idle' | 'active' | 'completed' | 'skipped';
}

interface BuildMessage {
  agents: AgentInfo[];
  thinkingLines: string[];
  isComplete: boolean;
}

interface VibeCodingOverlayProps {
  isBuilding: boolean;
  buildMessages?: BuildMessage[];
}

// ─── Fake code snippets for streaming ────────────────────────────────────────
const CODE_LINES = [
  "import React, { useState, useEffect } from 'react';",
  "import { motion, AnimatePresence } from 'framer-motion';",
  "import { supabase } from '@/lib/supabase';",
  "",
  "interface User {",
  "  id: string;",
  "  email: string;",
  "  profile: UserProfile;",
  "}",
  "",
  "export default function Dashboard() {",
  "  const [data, setData] = useState<User[]>([]);",
  "  const [loading, setLoading] = useState(true);",
  "",
  "  useEffect(() => {",
  "    fetchData();",
  "  }, []);",
  "",
  "  const fetchData = async () => {",
  "    const { data, error } = await supabase",
  "      .from('users')",
  "      .select('*')",
  "      .order('created_at', { ascending: false });",
  "    if (!error) setData(data ?? []);",
  "    setLoading(false);",
  "  };",
  "",
  "  return (",
  "    <div className=\"min-h-screen bg-zinc-950\">",
  "      <nav className=\"border-b border-zinc-800 px-6 py-4\">",
  "        <h1 className=\"text-xl font-bold text-white\">Dashboard</h1>",
  "      </nav>",
  "      <main className=\"p-8 grid grid-cols-3 gap-6\">",
  "        {data.map(user => (",
  "          <UserCard key={user.id} user={user} />",
  "        ))}",
  "      </main>",
  "    </div>",
  "  );",
  "}",
];

// ─── Agent definitions ────────────────────────────────────────────────────────
const AGENT_DEFS = [
  { name: 'Intent Parser',    icon: ClipboardList, color: '#a78bfa', label: 'Intent'  },
  { name: 'Builder Agent',    icon: Code2,         color: '#60a5fa', label: 'Builder' },
  { name: 'Preview Compiler', icon: Eye,           color: '#22d3ee', label: 'Preview' },
  { name: 'Repair Agent',     icon: ShieldCheck,   color: '#4ade80', label: 'Repair'  },
];

// ─── Syntax Coloring ──────────────────────────────────────────────────────────
function colorize(line: string): JSX.Element {
  if (!line.trim()) return <span>&nbsp;</span>;

  // Keywords
  const keywords = /\b(import|export|default|from|const|let|var|function|return|async|await|if|else|interface|type|extends|implements|new|true|false|null|undefined)\b/g;
  const strings = /(["'`])([^"'`]*)\1/g;
  const comments = /\/\/.*/g;
  const jsx = /(<\/?\w+|\/?>)/g;
  const numbers = /\b\d+\b/g;

  let colored = line
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  colored = colored
    .replace(/(import|export|default|from|const|let|var|function|return|async|await|if|else|interface|type|extends|implements|new|true|false|null|undefined)\b/g,
      '<span style="color:#c084fc">$1</span>')
    .replace(/(['"`])(.*?)\1/g, '<span style="color:#4ade80">$1$2$1</span>')
    .replace(/(\/\/.*)/g, '<span style="color:#6b7280">$1</span>')
    .replace(/(\b\d+\b)/g, '<span style="color:#fb923c">$1</span>');

  return <span dangerouslySetInnerHTML={{ __html: colored }} />;
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-zinc-800 animate-pulse" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-zinc-800 rounded-full animate-pulse w-3/4" />
          <div className="h-2 bg-zinc-800/60 rounded-full animate-pulse w-1/2" />
        </div>
      </div>
      {/* Body lines */}
      <div className="space-y-2">
        <div className="h-2 bg-zinc-800 rounded-full animate-pulse" />
        <div className="h-2 bg-zinc-800 rounded-full animate-pulse w-5/6" />
        <div className="h-2 bg-zinc-800 rounded-full animate-pulse w-4/6" />
      </div>
      {/* Footer */}
      <div className="h-7 bg-zinc-800/60 rounded-lg animate-pulse mt-1" />
    </motion.div>
  );
}

// ─── Stats Skeleton ───────────────────────────────────────────────────────────
function StatSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
    >
      <div className="h-2 bg-zinc-800 rounded-full animate-pulse w-1/2 mb-3" />
      <div className="h-7 bg-zinc-800 rounded-full animate-pulse w-2/3 mb-2" />
      <div className="h-2 bg-zinc-800/60 rounded-full animate-pulse w-3/4" />
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function VibeCodingOverlay({ isBuilding, buildMessages = [] }: VibeCodingOverlayProps) {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [lineIndex, setLineIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('Initializing...');
  const [cursorVisible, setCursorVisible] = useState(true);
  const codeRef = useRef<HTMLDivElement>(null);

  // Compute real progress from agents
  const latestBuild = buildMessages[buildMessages.length - 1];
  const agents = latestBuild?.agents ?? [];
  const totalAgents = AGENT_DEFS.length;
  const completedAgents = agents.filter(a => a.status === 'completed').length;
  const activeAgent = agents.find(a => a.status === 'active');
  const realProgress = Math.min(95, (completedAgents / totalAgents) * 90 + (activeAgent ? 5 : 0));

  // Smooth progress bar
  useEffect(() => {
    if (!isBuilding) return;
    const target = realProgress || progress;
    const timer = setInterval(() => {
      setProgress(prev => {
        const next = prev + (target - prev) * 0.1 + 0.3;
        return Math.min(next, 95);
      });
    }, 150);
    return () => clearInterval(timer);
  }, [isBuilding, realProgress]);

  // Progress label
  useEffect(() => {
    if (!isBuilding) return;
    if (activeAgent) {
      setProgressLabel(activeAgent.name + '...');
    } else if (completedAgents === 0) {
      setProgressLabel('Initializing pipeline...');
    } else if (completedAgents >= totalAgents) {
      setProgressLabel('Finalizing...');
    } else {
      setProgressLabel(`${completedAgents}/${totalAgents} agents done`);
    }
  }, [activeAgent, completedAgents, totalAgents, isBuilding]);

  // Fake code streaming
  useEffect(() => {
    if (!isBuilding) {
      setVisibleLines([]);
      setLineIndex(0);
      return;
    }
    const timer = setInterval(() => {
      setLineIndex(prev => {
        const next = prev + 1;
        if (next >= CODE_LINES.length) return 0; // loop
        return next;
      });
    }, 180);
    return () => clearInterval(timer);
  }, [isBuilding]);

  useEffect(() => {
    setVisibleLines(CODE_LINES.slice(Math.max(0, lineIndex - 14), lineIndex));
  }, [lineIndex]);

  // Auto-scroll code
  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.scrollTop = codeRef.current.scrollHeight;
    }
  }, [visibleLines]);

  // Cursor blink
  useEffect(() => {
    const timer = setInterval(() => setCursorVisible(v => !v), 530);
    return () => clearInterval(timer);
  }, []);

  if (!isBuilding) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="vibe-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 z-20 overflow-hidden"
        style={{ background: '#0a0a0b' }}
      >
        {/* ── Ambient background ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Blue glow */}
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.25, 0.15] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-32 -left-32 w-96 h-96 rounded-full"
            style={{ background: 'radial-gradient(circle, #1488fc55 0%, transparent 70%)' }}
          />
          {/* Purple glow */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
            className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full"
            style={{ background: 'radial-gradient(circle, #7c3aed44 0%, transparent 70%)' }}
          />
          {/* Scanline sweep */}
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'linear', repeatDelay: 1.5 }}
            className="absolute inset-y-0 w-1/3"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(20,136,252,0.04), transparent)' }}
          />
          {/* Dot grid */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '28px 28px' }}
          />
        </div>

        {/* ── Content ── */}
        <div className="relative h-full flex flex-col p-5 gap-4 overflow-hidden">

          {/* Header */}
          <motion.div
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-3"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center"
            >
              <Zap className="w-3.5 h-3.5 text-blue-400" />
            </motion.div>
            <div>
              <span className="text-sm font-bold text-white">Generating your app</span>
              <span className="text-xs text-zinc-500 ml-2">{progressLabel}</span>
            </div>
            <div className="ml-auto flex items-center gap-1">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                  className="w-1.5 h-1.5 rounded-full bg-blue-400"
                />
              ))}
            </div>
          </motion.div>

          {/* ── Stat skeletons row ── */}
          <div className="grid grid-cols-4 gap-3 shrink-0">
            {[0, 0.08, 0.16, 0.24].map((delay, i) => (
              <StatSkeleton key={i} delay={delay} />
            ))}
          </div>

          {/* ── Main content: Cards + Code ── */}
          <div className="flex-1 grid grid-cols-5 gap-4 min-h-0">
            {/* Left: skeleton cards */}
            <div className="col-span-2 flex flex-col gap-3 overflow-hidden">
              <SkeletonCard delay={0.1} />
              <SkeletonCard delay={0.2} />
              <SkeletonCard delay={0.3} />
            </div>

            {/* Right: fake code stream */}
            <div
              ref={codeRef}
              className="col-span-3 bg-zinc-900 border border-zinc-800 rounded-xl p-4 overflow-hidden font-mono text-xs leading-5"
            >
              {/* Code window header */}
              <div className="flex items-center gap-1.5 mb-3 pb-3 border-b border-zinc-800">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                <span className="ml-2 text-zinc-500 text-[10px]">App.tsx</span>
              </div>

              {/* Code lines */}
              <div className="space-y-0.5">
                {visibleLines.map((line, i) => (
                  <motion.div
                    key={`${lineIndex}-${i}`}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.1 }}
                    className="flex"
                  >
                    <span className="text-zinc-700 w-6 text-right mr-3 shrink-0 select-none">
                      {Math.max(0, lineIndex - visibleLines.length) + i + 1}
                    </span>
                    <span className="text-zinc-200">
                      {colorize(line)}
                    </span>
                  </motion.div>
                ))}
                {/* Active cursor line */}
                <div className="flex">
                  <span className="text-zinc-700 w-6 text-right mr-3 shrink-0">
                    {lineIndex + 1}
                  </span>
                  <span className="text-zinc-200">
                    {cursorVisible
                      ? <span className="inline-block w-2 h-4 bg-blue-400 align-middle" />
                      : <span className="inline-block w-2 h-4 align-middle" />
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Progress bar ── */}
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="shrink-0"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-zinc-500">{progressLabel}</span>
              <span className="text-xs font-mono text-blue-400">{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #1488fc, #7c3aed)' }}
              />
            </div>
          </motion.div>

          {/* ── Agent status bar ── */}
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="shrink-0 flex items-center gap-2 flex-wrap"
          >
            {AGENT_DEFS.map((def, i) => {
              const agentState = agents.find(a => a.name === def.name);
              const status = agentState?.status ?? 'idle';
              const Icon = def.icon;

              return (
                <motion.div
                  key={def.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.05 * i }}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-medium transition-all ${
                    status === 'active'
                      ? 'border-blue-500/50 bg-blue-500/10 text-blue-300'
                      : status === 'completed'
                      ? 'border-green-500/30 bg-green-500/10 text-green-400'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-500'
                  }`}
                >
                  {status === 'active' ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    >
                      <Icon className="w-3 h-3" />
                    </motion.div>
                  ) : status === 'completed' ? (
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                  ) : (
                    <Icon className="w-3 h-3" />
                  )}
                  <span>{def.label}</span>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default VibeCodingOverlay;
