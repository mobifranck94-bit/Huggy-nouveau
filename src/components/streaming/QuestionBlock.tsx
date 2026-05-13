/**
 * QuestionBlock — interactive block shown when the agent needs to clarify
 * something before proceeding. Format:
 *
 *   ❓ Question
 *   → [the question]
 *
 *   [ A ) option 1 ]
 *   [ B ) option 2 ]
 *   [ C ) option 3 ]
 *
 *   Pourquoi je demande : [justification]
 *
 * Clicking an option calls `onAnswer` with the chosen text so the parent
 * can pre-fill the chat input.
 */

import { motion } from 'motion/react';
import { HelpCircle } from 'lucide-react';

interface QuestionBlockProps {
  question: string;
  options?: string[];
  reason?: string;
  onAnswer?: (answer: string) => void;
}

export function QuestionBlock({ question, options = [], reason, onAnswer }: QuestionBlockProps) {
  if (!question) return null;

  const letters = ['A', 'B', 'C', 'D', 'E'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] px-3 py-2.5"
      role="region"
      aria-label="Question de l'agent"
    >
      <div className="flex items-center gap-2 mb-2">
        <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
        <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider">Question</span>
      </div>

      <p className="text-[12px] text-zinc-100 font-medium leading-relaxed mb-2 pl-1">
        → {question}
      </p>

      {options.length > 0 && (
        <div className="space-y-1 mb-2">
          {options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => onAnswer?.(opt)}
              className="w-full text-left flex items-start gap-2 rounded-md px-2.5 py-1.5 bg-zinc-900/50 border border-zinc-800/60 hover:border-amber-500/40 hover:bg-amber-500/[0.04] transition-all text-[11px] text-zinc-300 hover:text-zinc-100 group"
              aria-label={`Choisir l'option ${letters[idx]}: ${opt}`}
            >
              <span className="text-amber-400/80 font-bold font-mono text-[10px] shrink-0 mt-0.5">
                {letters[idx]})
              </span>
              <span className="leading-snug">{opt}</span>
            </button>
          ))}
        </div>
      )}

      {reason && (
        <p className="text-[10px] text-zinc-500 italic leading-snug border-l-2 border-amber-500/20 pl-2 ml-1">
          Pourquoi : {reason}
        </p>
      )}
    </motion.div>
  );
}

export default QuestionBlock;
