/**
 * StatusPill - animated badge that reflects the current pipeline phase.
 * Phases: initializing → understanding → exploring → researching → planning →
 *         architecting → thinking → coding → installing → building → testing →
 *         reviewing → repairing → optimizing → finalizing → done | error
 */

import { motion } from 'motion/react';
import {
  Loader2, Brain, Hammer, Package, Wrench, CheckCircle2, AlertCircle,
  Target, Search, ClipboardList, Layout, Code2, Download, FlaskConical,
  Shield, Zap, Sparkles, Compass, Palette, Database,
} from 'lucide-react';
import type { PipelinePhase } from '../../lib/api';

export type { PipelinePhase };

interface StatusPillProps {
  phase: PipelinePhase;
  /** Optional elapsed time in seconds, displayed on the right */
  elapsed?: number;
  /** Show pulse animation for active phases */
  showPulse?: boolean;
}

const PHASE_CONFIG: Record<PipelinePhase, {
  label: string;
  Icon: typeof Brain;
  color: string;
  bg: string;
  border: string;
  pulse: boolean;
  category: 'setup' | 'analysis' | 'research' | 'planning' | 'architecture' | 'coding' | 'build' | 'test' | 'review' | 'final' | 'error';
}> = {
  initializing: {
    label: 'Initializing',
    Icon: Loader2,
    color: 'text-zinc-300',
    bg: 'bg-zinc-500/10',
    border: 'border-zinc-500/25',
    pulse: true,
    category: 'setup',
  },
  understanding: {
    label: 'Understanding',
    Icon: Target,
    color: 'text-violet-300',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/25',
    pulse: true,
    category: 'analysis',
  },
  exploring: {
    label: 'Exploring',
    Icon: Compass,
    color: 'text-violet-300',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/25',
    pulse: true,
    category: 'analysis',
  },
  researching: {
    label: 'Researching',
    Icon: Search,
    color: 'text-cyan-300',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/25',
    pulse: true,
    category: 'research',
  },
  planning: {
    label: 'Planning',
    Icon: ClipboardList,
    color: 'text-purple-300',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/25',
    pulse: true,
    category: 'planning',
  },
  architecting: {
    label: 'Architecting',
    Icon: Layout,
    color: 'text-indigo-300',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/25',
    pulse: true,
    category: 'architecture',
  },
  thinking: {
    label: 'Thinking',
    Icon: Brain,
    color: 'text-blue-300',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/25',
    pulse: true,
    category: 'coding',
  },
  coding: {
    label: 'Coding',
    Icon: Code2,
    color: 'text-blue-300',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/25',
    pulse: true,
    category: 'coding',
  },
  installing: {
    label: 'Installing',
    Icon: Download,
    color: 'text-cyan-300',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/25',
    pulse: true,
    category: 'build',
  },
  building: {
    label: 'Building',
    Icon: Package,
    color: 'text-cyan-300',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/25',
    pulse: true,
    category: 'build',
  },
  testing: {
    label: 'Testing',
    Icon: FlaskConical,
    color: 'text-green-300',
    bg: 'bg-green-500/10',
    border: 'border-green-500/25',
    pulse: true,
    category: 'test',
  },
  reviewing: {
    label: 'Reviewing',
    Icon: Shield,
    color: 'text-amber-300',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/25',
    pulse: true,
    category: 'review',
  },
  repairing: {
    label: 'Repairing',
    Icon: Wrench,
    color: 'text-orange-300',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/25',
    pulse: true,
    category: 'review',
  },
  optimizing: {
    label: 'Optimizing',
    Icon: Zap,
    color: 'text-orange-300',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/25',
    pulse: true,
    category: 'review',
  },
  finalizing: {
    label: 'Finalizing',
    Icon: Sparkles,
    color: 'text-emerald-300',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/25',
    pulse: true,
    category: 'final',
  },
  done: {
    label: 'Done',
    Icon: CheckCircle2,
    color: 'text-green-300',
    bg: 'bg-green-500/10',
    border: 'border-green-500/25',
    pulse: false,
    category: 'final',
  },
  error: {
    label: 'Error',
    Icon: AlertCircle,
    color: 'text-red-300',
    bg: 'bg-red-500/10',
    border: 'border-red-500/25',
    pulse: false,
    category: 'error',
  },
};

export function StatusPill({ phase, elapsed, showPulse = true }: StatusPillProps) {
  const cfg = PHASE_CONFIG[phase];
  const isInitializing = phase === 'initializing';

  return (
    <motion.span
      layout
      initial={{ opacity: 0, y: -2 }}
      animate={{ opacity: 1, y: 0 }}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cfg.bg} ${cfg.border} ${cfg.color}`}
      aria-live="polite"
    >
      <span className="relative">
        {cfg.pulse && showPulse ? (
          <>
            <cfg.Icon className={`w-3 h-3 ${isInitializing ? 'animate-spin' : ''}`} />
            {/* Pulse ring for active phases */}
            {!isInitializing && phase !== 'done' && phase !== 'error' && (
              <motion.span
                className={`absolute inset-0 rounded-full ${cfg.bg.replace('/10', '/30')}`}
                animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
              />
            )}
          </>
        ) : (
          <cfg.Icon className="w-3 h-3" />
        )}
      </span>
      <span>{cfg.label}</span>
      {typeof elapsed === 'number' && elapsed > 0 && (
        <span className="text-zinc-500 font-mono">· {elapsed.toFixed(1)}s</span>
      )}
    </motion.span>
  );
}

export default StatusPill;
