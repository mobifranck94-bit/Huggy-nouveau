/**
 * AgentStep - one node in the vertical AgentTimeline.
 * Renders status indicator (○ idle, ◉ active with pulse, ✓ done, ⊘ skipped, ✗ error),
 * label, optional duration, and a nested list of children (typically ToolBlocks).
 */

import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Check, Minus, X } from 'lucide-react';

export type AgentStepStatus = 'idle' | 'active' | 'completed' | 'skipped' | 'error';

interface AgentStepProps {
  name: string;
  status: AgentStepStatus;
  description?: string;
  isLast?: boolean;
  children?: ReactNode;
}

export function AgentStep({ name, status, description, isLast = false, children }: AgentStepProps) {
  const isActive = status === 'active';
  const isDone = status === 'completed';
  const isSkipped = status === 'skipped';
  const isError = status === 'error';

  return (
    <div className="relative flex gap-3">
      {/* Left rail: dot + connecting line */}
      <div className="relative flex flex-col items-center shrink-0">
        {/* Dot */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className={`relative z-10 flex items-center justify-center w-4 h-4 rounded-full border ${
            isDone
              ? 'bg-green-500/20 border-green-500/50 text-green-300'
              : isActive
              ? 'bg-blue-500/20 border-blue-400 text-blue-300'
              : isSkipped
              ? 'bg-zinc-800 border-zinc-700 text-zinc-600'
              : isError
              ? 'bg-red-500/20 border-red-500/50 text-red-300'
              : 'bg-zinc-900 border-zinc-700 text-zinc-600'
          }`}
        >
          {isDone && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
          {isSkipped && <Minus className="w-2.5 h-2.5" strokeWidth={3} />}
          {isError && <X className="w-2.5 h-2.5" strokeWidth={3} />}
          {isActive && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 huggy-pulse-dot" />
              <motion.span
                className="absolute inset-0 rounded-full border-2 border-blue-400/50"
                animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
              />
            </>
          )}
        </motion.div>

        {/* Connector line (skip on last item) */}
        {!isLast && (
          <div
            className={`w-px flex-1 mt-1 mb-1 ${
              isDone || isSkipped
                ? 'bg-gradient-to-b from-violet-500/60 via-blue-500/40 to-zinc-800'
                : isActive
                ? 'huggy-timeline-connector-active'
                : 'bg-zinc-800'
            }`}
            style={{ minHeight: '1rem' }}
          />
        )}
      </div>

      {/* Right content: label + nested */}
      <div className={`flex-1 min-w-0 ${isLast ? '' : 'pb-3'}`}>
        <div className="flex items-baseline gap-2">
          <span
            className={`text-xs font-semibold ${
              isDone
                ? 'text-zinc-300'
                : isActive
                ? 'text-zinc-100'
                : isSkipped || isError
                ? 'text-zinc-500'
                : 'text-zinc-500'
            }`}
          >
            {name}
          </span>
          {description && (
            <span className="text-[10px] text-zinc-500 truncate">{description}</span>
          )}
        </div>

        {/* Children: tool blocks, etc. */}
        {children && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
            className="mt-1.5 flex flex-col gap-1"
          >
            {children}
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default AgentStep;
