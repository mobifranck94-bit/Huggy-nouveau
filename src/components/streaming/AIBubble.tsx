/**
 * AIBubble - simplified container for AI streaming response.
 * Design System: minimal header, single accent color
 */

import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { StatusPill, type PipelinePhase } from './StatusPill';

interface AIBubbleProps {
  phase: PipelinePhase;
  elapsed?: number;
  children: ReactNode;
}

export function AIBubble({ phase, elapsed, children }: AIBubbleProps) {
  const isStreaming = phase !== 'done' && phase !== 'error';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className="flex-1 min-w-0"
      role="article"
      aria-live={isStreaming ? 'polite' : 'off'}
      aria-busy={isStreaming}
    >
      {/* Minimal Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-md bg-accent-dim border border-accent-border flex items-center justify-center">
          <Sparkles className="w-3 h-3 text-accent" />
        </div>
        <span className="text-[11px] font-semibold text-text-primary">Huggy</span>
        <StatusPill phase={phase} elapsed={elapsed} />
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 pl-7">{children}</div>
    </motion.div>
  );
}

export default AIBubble;
