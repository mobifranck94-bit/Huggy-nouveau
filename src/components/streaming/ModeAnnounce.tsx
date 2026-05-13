/**
 * ModeAnnounce — 1-line badge announcing the agent's chosen mode:
 *   ⚙️ Mode Code      (blue)    — actionable request
 *   💬 Mode Discussion (violet)  — architectural choice / advice
 *   ❓ Mode Question   (amber)   — info needed before proceeding
 *
 * Always shown at the top of a build message so the user instantly knows
 * what the agent is going to do.
 */

import { motion } from 'motion/react';
import { Wrench, MessageSquare, HelpCircle } from 'lucide-react';

export type AgentMode = 'code' | 'discussion' | 'question';

interface ModeAnnounceProps {
  mode: AgentMode;
  reason?: string;
}

const STYLES: Record<AgentMode, {
  label: string;
  icon: typeof Wrench;
  border: string;
  bg: string;
  text: string;
  iconColor: string;
}> = {
  code: {
    label: '⚙️ Mode Code',
    icon: Wrench,
    border: 'border-blue-500/20',
    bg: 'bg-blue-500/[0.06]',
    text: 'text-blue-300',
    iconColor: 'text-blue-400',
  },
  discussion: {
    label: '💬 Mode Discussion',
    icon: MessageSquare,
    border: 'border-violet-500/20',
    bg: 'bg-violet-500/[0.06]',
    text: 'text-violet-300',
    iconColor: 'text-violet-400',
  },
  question: {
    label: '❓ Mode Question',
    icon: HelpCircle,
    border: 'border-amber-500/20',
    bg: 'bg-amber-500/[0.06]',
    text: 'text-amber-300',
    iconColor: 'text-amber-400',
  },
};

export function ModeAnnounce({ mode, reason }: ModeAnnounceProps) {
  const style = STYLES[mode];

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`rounded-lg border ${style.border} ${style.bg} px-3 py-2`}
      role="status"
      aria-label={`Agent mode: ${style.label}`}
    >
      <div className="flex items-center gap-2">
        <span className={`text-[11px] font-bold ${style.text}`}>{style.label}</span>
      </div>
      {reason && (
        <p className="text-[10px] text-zinc-500 italic mt-0.5 leading-snug">{reason}</p>
      )}
    </motion.div>
  );
}

export default ModeAnnounce;
