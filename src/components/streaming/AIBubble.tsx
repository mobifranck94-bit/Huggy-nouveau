/**
 * AIBubble - container wrapping a single AI streaming response.
 * Header: avatar + "Huggy AI" + StatusPill + timestamp.
 * Body  : free children (timeline, code stream, reply, metrics, feedback).
 */

import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { StatusPill, type PipelinePhase } from './StatusPill';

interface AIBubbleProps {
  phase: PipelinePhase;
  elapsed?: number;
  timestamp?: number;
  children: ReactNode;
}

export function AIBubble({ phase, elapsed, timestamp, children }: AIBubbleProps) {
  const isStreaming = phase !== 'done' && phase !== 'error';
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6, filter: 'blur(3px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex gap-3 items-start"
      role="article"
      aria-live={isStreaming ? 'polite' : 'off'}
      aria-busy={isStreaming}
    >
      {/* Avatar */}
      <div className="relative shrink-0 mt-0.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-[0_0_14px_rgba(20,136,252,0.35)]">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        {(phase === 'thinking' || phase === 'building' || phase === 'compiling' || phase === 'repairing') && (
          <motion.span
            aria-hidden="true"
            className="absolute -inset-0.5 rounded-lg border border-blue-400/40"
            animate={{ opacity: [0.6, 0.2, 0.6] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-[11px] font-semibold text-zinc-200">Huggy AI</span>
          <StatusPill phase={phase} elapsed={elapsed} />
          {timestamp && (
            <span className="ml-auto text-[9px] text-zinc-600 font-mono">
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {/* Sections (stacked) */}
        <div className="flex flex-col gap-3">{children}</div>
      </div>
    </motion.div>
  );
}

export default AIBubble;
