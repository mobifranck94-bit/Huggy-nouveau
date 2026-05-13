/**
 * StatusPill - animated badge that reflects the current pipeline phase.
 * Phases: thinking → building → compiling → repairing → done | error
 */

import { motion } from 'motion/react';
import { Brain, Hammer, Package, Wrench, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export type PipelinePhase = 'connecting' | 'thinking' | 'building' | 'compiling' | 'repairing' | 'done' | 'error';

interface StatusPillProps {
  phase: PipelinePhase;
  /** Optional elapsed time in seconds, displayed on the right */
  elapsed?: number;
}

const PHASE_CONFIG: Record<PipelinePhase, {
  label: string;
  Icon: typeof Brain;
  color: string;          // text + dot color
  bg: string;             // background
  border: string;         // border color
  pulse: boolean;
}> = {
  connecting: {
    label: 'Connecting',
    Icon: Loader2,
    color: 'text-zinc-300',
    bg: 'bg-zinc-500/10',
    border: 'border-zinc-500/25',
    pulse: true,
  },
  thinking: {
    label: 'Thinking',
    Icon: Brain,
    color: 'text-violet-300',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/25',
    pulse: true,
  },
  building: {
    label: 'Building',
    Icon: Hammer,
    color: 'text-blue-300',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/25',
    pulse: true,
  },
  compiling: {
    label: 'Compiling',
    Icon: Package,
    color: 'text-cyan-300',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/25',
    pulse: true,
  },
  repairing: {
    label: 'Repairing',
    Icon: Wrench,
    color: 'text-amber-300',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/25',
    pulse: true,
  },
  done: {
    label: 'Done',
    Icon: CheckCircle2,
    color: 'text-green-300',
    bg: 'bg-green-500/10',
    border: 'border-green-500/25',
    pulse: false,
  },
  error: {
    label: 'Error',
    Icon: AlertCircle,
    color: 'text-red-300',
    bg: 'bg-red-500/10',
    border: 'border-red-500/25',
    pulse: false,
  },
};

export function StatusPill({ phase, elapsed }: StatusPillProps) {
  const cfg = PHASE_CONFIG[phase];

  return (
    <motion.span
      layout
      initial={{ opacity: 0, y: -2 }}
      animate={{ opacity: 1, y: 0 }}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cfg.bg} ${cfg.border} ${cfg.color}`}
      aria-live="polite"
    >
      {cfg.pulse ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <cfg.Icon className="w-3 h-3" />
      )}
      <span>{cfg.label}</span>
      {typeof elapsed === 'number' && elapsed > 0 && (
        <span className="text-zinc-500 font-mono">· {elapsed.toFixed(1)}s</span>
      )}
    </motion.span>
  );
}

export default StatusPill;
