/**
 * StatusPill - animated badge that reflects the current pipeline phase.
 * Design System: 4 phases, single accent color (orange)
 * Phases: thinking → working → fixing → done | error
 */

import { motion } from 'motion/react';
import { Brain, Hammer, Wrench, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export type PipelinePhase = 'thinking' | 'working' | 'fixing' | 'done' | 'error';

interface StatusPillProps {
  phase: PipelinePhase;
  /** Optional elapsed time in seconds, displayed on the right */
  elapsed?: number;
}

const PHASE_CONFIG: Record<PipelinePhase, {
  label: string;
  Icon: typeof Brain;
  pulse: boolean;
}> = {
  thinking: {
    label: 'Thinking',
    Icon: Brain,
    pulse: true,
  },
  working: {
    label: 'Working',
    Icon: Hammer,
    pulse: true,
  },
  fixing: {
    label: 'Fixing',
    Icon: Wrench,
    pulse: true,
  },
  done: {
    label: 'Done',
    Icon: CheckCircle2,
    pulse: false,
  },
  error: {
    label: 'Error',
    Icon: AlertCircle,
    pulse: false,
  },
};

export function StatusPill({ phase, elapsed }: StatusPillProps) {
  const cfg = PHASE_CONFIG[phase];
  const isActive = cfg.pulse;

  return (
    <motion.span
      layout
      initial={{ opacity: 0, y: -2 }}
      animate={{ opacity: 1, y: 0 }}
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold bg-accent-dim border-accent-border text-accent-text"
      aria-live="polite"
    >
      {isActive ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <cfg.Icon className="w-3 h-3" />
      )}
      <span>{cfg.label}</span>
      {typeof elapsed === 'number' && elapsed > 0 && (
        <span className="text-text-muted font-mono">· {elapsed.toFixed(1)}s</span>
      )}
    </motion.span>
  );
}

export default StatusPill;
