/**
 * AgentStep - one node in the vertical AgentTimeline.
 * Design System: couleur unique accent (orange) pour tous les états actifs
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
        {/* Dot - unified accent color scheme */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className={`relative z-10 flex items-center justify-center w-4 h-4 rounded-full border ${
            isDone
              ? 'bg-accent-dim border-accent-border text-accent'
              : isActive
              ? 'bg-accent-dim border-accent text-accent'
              : isSkipped
              ? 'bg-bg-elevated border-border-default text-text-muted'
              : isError
              ? 'bg-red-dim border-red/30 text-red'
              : 'bg-bg-surface border-border-default text-text-muted'
          }`}
        >
          {isDone && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
          {isSkipped && <Minus className="w-2.5 h-2.5" strokeWidth={3} />}
          {isError && <X className="w-2.5 h-2.5" strokeWidth={3} />}
          {isActive && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-soft" />
              <motion.span
                className="absolute inset-0 rounded-full border-2 border-accent/50"
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
                ? 'bg-border-default'
                : isActive
                ? 'bg-accent/30'
                : 'bg-border-subtle'
            }`}
            style={{ minHeight: '1rem' }}
          />
        )}
      </div>

      {/* Right content: label + nested */}
      <div className={`flex-1 min-w-0 ${isLast ? '' : 'pb-2'}`}>
        <div className="flex items-baseline gap-2">
          <span
            className={`text-xs font-semibold ${
              isDone || isActive
                ? 'text-text-primary'
                : isSkipped || isError
                ? 'text-text-secondary'
                : 'text-text-muted'
            }`}
          >
            {name}
          </span>
          {description && (
            <span className="text-[10px] text-text-muted truncate">{description}</span>
          )}
        </div>

        {/* Children: tool blocks, etc. */}
        {children && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.25 }}
            className="mt-1 flex flex-col gap-1"
          >
            {children}
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default AgentStep;
