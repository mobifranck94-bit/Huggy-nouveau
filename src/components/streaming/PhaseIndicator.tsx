/**
 * PhaseIndicator - displays current pipeline phase with progress visualization.
 * Shows the active phase with animated indicator and optional progress bar.
 *
 * @example
 * <PhaseIndicator phase="coding" progress={65} showProgressBar />
 */

import { motion, AnimatePresence } from 'motion/react';
import {
  Loader2,
  Target,
  Search,
  ClipboardList,
  Layout,
  Brain,
  Code2,
  Download,
  Package,
  FlaskConical,
  Shield,
  Wrench,
  Zap,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Compass,
  Palette,
  Database,
} from 'lucide-react';
import type { PipelinePhase } from '../../lib/api';

interface PhaseIndicatorProps {
  phase: PipelinePhase;
  progress?: number; // 0-100
  showProgressBar?: boolean;
  elapsedSeconds?: number;
}

const PHASE_META: Record<PipelinePhase, {
  label: string;
  shortLabel: string;
  Icon: typeof Loader2;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  category: 'setup' | 'analysis' | 'research' | 'planning' | 'architecture' | 'coding' | 'build' | 'test' | 'review' | 'final' | 'error';
}> = {
  initializing: {
    label: 'Initializing',
    shortLabel: 'Init',
    Icon: Loader2,
    color: 'text-zinc-300',
    bgColor: 'bg-zinc-500/10',
    borderColor: 'border-zinc-500/25',
    description: 'Setting up environment',
    category: 'setup',
  },
  understanding: {
    label: 'Understanding',
    shortLabel: 'Understand',
    Icon: Target,
    color: 'text-violet-300',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/25',
    description: 'Analyzing your request',
    category: 'analysis',
  },
  exploring: {
    label: 'Exploring',
    shortLabel: 'Explore',
    Icon: Compass,
    color: 'text-violet-300',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/25',
    description: 'Exploring context',
    category: 'analysis',
  },
  researching: {
    label: 'Researching',
    shortLabel: 'Research',
    Icon: Search,
    color: 'text-cyan-300',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/25',
    description: 'Gathering knowledge',
    category: 'research',
  },
  planning: {
    label: 'Planning',
    shortLabel: 'Plan',
    Icon: ClipboardList,
    color: 'text-purple-300',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/25',
    description: 'Creating plan',
    category: 'planning',
  },
  architecting: {
    label: 'Architecting',
    shortLabel: 'Design',
    Icon: Layout,
    color: 'text-indigo-300',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/25',
    description: 'Designing system',
    category: 'architecture',
  },
  thinking: {
    label: 'Thinking',
    shortLabel: 'Think',
    Icon: Brain,
    color: 'text-blue-300',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/25',
    description: 'Considering approach',
    category: 'coding',
  },
  coding: {
    label: 'Coding',
    shortLabel: 'Code',
    Icon: Code2,
    color: 'text-accent',
    bgColor: 'bg-accent/10',
    borderColor: 'border-accent/30',
    description: 'Building application',
    category: 'coding',
  },
  installing: {
    label: 'Installing',
    shortLabel: 'Install',
    Icon: Download,
    color: 'text-cyan-300',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/25',
    description: 'Installing dependencies',
    category: 'build',
  },
  building: {
    label: 'Building',
    shortLabel: 'Build',
    Icon: Package,
    color: 'text-cyan-300',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/25',
    description: 'Compiling',
    category: 'build',
  },
  testing: {
    label: 'Testing',
    shortLabel: 'Test',
    Icon: FlaskConical,
    color: 'text-green-300',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/25',
    description: 'Running tests',
    category: 'test',
  },
  reviewing: {
    label: 'Reviewing',
    shortLabel: 'Review',
    Icon: Shield,
    color: 'text-amber-300',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/25',
    description: 'Security audit',
    category: 'review',
  },
  repairing: {
    label: 'Repairing',
    shortLabel: 'Fix',
    Icon: Wrench,
    color: 'text-orange-300',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/25',
    description: 'Fixing issues',
    category: 'review',
  },
  optimizing: {
    label: 'Optimizing',
    shortLabel: 'Optimize',
    Icon: Zap,
    color: 'text-orange-300',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/25',
    description: 'Optimizing code',
    category: 'review',
  },
  finalizing: {
    label: 'Finalizing',
    shortLabel: 'Finalize',
    Icon: Sparkles,
    color: 'text-emerald-300',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/25',
    description: 'Final touches',
    category: 'final',
  },
  done: {
    label: 'Done',
    shortLabel: 'Done',
    Icon: CheckCircle2,
    color: 'text-green-300',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/25',
    description: 'Complete',
    category: 'final',
  },
  error: {
    label: 'Error',
    shortLabel: 'Error',
    Icon: AlertCircle,
    color: 'text-red-300',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/25',
    description: 'Something went wrong',
    category: 'error',
  },
};

const CATEGORY_COLORS: Record<string, string> = {
  setup: 'zinc',
  analysis: 'violet',
  research: 'cyan',
  planning: 'purple',
  architecture: 'indigo',
  coding: 'blue',
  build: 'cyan',
  test: 'green',
  review: 'amber',
  final: 'emerald',
  error: 'red',
};

export function PhaseIndicator({
  phase,
  progress = 0,
  showProgressBar = false,
  elapsedSeconds,
}: PhaseIndicatorProps) {
  const meta = PHASE_META[phase];
  const isDone = phase === 'done';
  const isError = phase === 'error';
  const isInitializing = phase === 'initializing';
  const categoryColor = CATEGORY_COLORS[meta.category];

  return (
    <div className="flex flex-col gap-1.5">
      {/* Phase Badge */}
      <motion.div
        layout
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={`
          inline-flex items-center gap-2 rounded-full border px-2.5 py-1
          ${meta.bgColor} ${meta.borderColor}
          transition-colors duration-300
        `}
      >
        {/* Animated Icon */}
        <span className={`relative ${meta.color}`}>
          {isDone ? (
            <meta.Icon className="w-3.5 h-3.5" />
          ) : isError ? (
            <meta.Icon className="w-3.5 h-3.5" />
          ) : (
            <>
              <meta.Icon className={`w-3.5 h-3.5 ${isInitializing ? 'animate-spin' : ''}`} />
              {/* Pulse ring for active phases */}
              {!isInitializing && !isDone && !isError && (
                <motion.span
                  className={`absolute inset-0 rounded-full ${meta.bgColor.replace('/10', '/30')}`}
                  animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                />
              )}
            </>
          )}
        </span>

        {/* Phase Label */}
        <span className={`text-[11px] font-semibold ${meta.color}`}>
          {meta.label}
        </span>

        {/* Elapsed Time */}
        {typeof elapsedSeconds === 'number' && elapsedSeconds > 0 && (
          <span className="text-[10px] text-zinc-500 font-mono">
            · {elapsedSeconds.toFixed(1)}s
          </span>
        )}
      </motion.div>

      {/* Progress Bar */}
      <AnimatePresence>
        {showProgressBar && !isDone && !isError && progress > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full"
          >
            <div className="h-0.5 w-full bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className={`h-full bg-${categoryColor}-500 rounded-full`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
            <div className="flex justify-between mt-0.5">
              <span className="text-[9px] text-zinc-500">{meta.description}</span>
              <span className="text-[9px] text-zinc-500 font-mono">{progress}%</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PhaseIndicator;
