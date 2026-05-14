/**
 * AIBubble - container wrapping a single AI streaming response.
 * Header: avatar + "Huggy AI" + StatusPill + PhaseIndicator + timestamp.
 * Body  : free children (timeline, code stream, reply, metrics, feedback).
 */

import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { StatusPill, type PipelinePhase } from './StatusPill';
import { PhaseIndicator } from './PhaseIndicator';

interface AIBubbleProps {
  phase: PipelinePhase;
  elapsed?: number;
  timestamp?: number;
  phaseProgress?: number;  // NEW: 0-100 progress for phase indicator
  showPhaseIndicator?: boolean;  // NEW: show detailed phase info
  children: ReactNode;
}

export function AIBubble({ phase, elapsed, timestamp, phaseProgress, showPhaseIndicator, children }: AIBubbleProps) {
  const isStreaming = phase !== 'done' && phase !== 'error';
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6, filter: 'blur(3px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex-1 min-w-0"
      role="article"
      aria-live={isStreaming ? 'polite' : 'off'}
      aria-busy={isStreaming}
    >
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

      {/* Phase Indicator with progress bar (NEW) */}
      {showPhaseIndicator && isStreaming && (
        <div className="mb-3">
          <PhaseIndicator
            phase={phase}
            progress={phaseProgress}
            showProgressBar
            elapsedSeconds={elapsed}
          />
        </div>
      )}

      {/* Sections (stacked) */}
      <div className="flex flex-col gap-3">{children}</div>
    </motion.div>
  );
}

export default AIBubble;
