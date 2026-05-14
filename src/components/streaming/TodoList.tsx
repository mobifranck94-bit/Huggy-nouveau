/**
 * TodoList — visible checkbox plan that updates in real time as the agent
 * progresses through steps. Shows the user exactly where the agent stands.
 *
 *  ☑️ done       (green check)
 *  🔵 in_progress (animated spinner)
 *  ⬜ pending    (empty zinc box)
 */

import { motion, AnimatePresence } from 'motion/react';
import { Check, Loader2, Square } from 'lucide-react';

export type TodoStatus = 'pending' | 'in_progress' | 'done';

export interface TodoStep {
  id: string;
  label: string;
  status: TodoStatus;
}

interface TodoListProps {
  steps: TodoStep[];
  title?: string;
}

export function TodoList({ steps, title = "📋 Plan d'exécution" }: TodoListProps) {
  if (!steps || steps.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-3 py-2.5"
      role="region"
      aria-label="Plan d'exécution"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold text-zinc-300">{title}</p>
        <span className="text-[9px] text-zinc-600 font-mono">
          {steps.filter(s => s.status === 'done').length} / {steps.length}
        </span>
      </div>
      <ul className="space-y-1" role="list">
        <AnimatePresence initial={false}>
          {steps.map((step, idx) => (
            <motion.li
              key={step.id}
              layout
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.03 }}
              className="flex items-center gap-2 text-[11px]"
            >
              <StatusIcon status={step.status} />
              <span
                className={
                  step.status === 'done'
                    ? 'text-zinc-500 line-through decoration-zinc-700'
                    : step.status === 'in_progress'
                    ? 'text-zinc-100 font-medium'
                    : 'text-zinc-400'
                }
              >
                {step.label}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </motion.div>
  );
}

function StatusIcon({ status }: { status: TodoStatus }) {
  if (status === 'done') {
    return (
      <span
        className="w-4 h-4 rounded-md bg-green-500/15 border border-green-500/40 flex items-center justify-center shrink-0"
        aria-label="Étape terminée"
      >
        <Check className="w-2.5 h-2.5 text-green-400" />
      </span>
    );
  }
  if (status === 'in_progress') {
    return (
      <span
        className="w-4 h-4 rounded-md bg-blue-500/15 border border-blue-500/40 flex items-center justify-center shrink-0"
        aria-label="Étape en cours"
      >
        <Loader2 className="w-2.5 h-2.5 text-blue-400 animate-spin" />
      </span>
    );
  }
  return (
    <span
      className="w-4 h-4 rounded-md border border-zinc-700/60 flex items-center justify-center shrink-0"
      aria-label="Étape en attente"
    >
      <Square className="w-2 h-2 text-zinc-700" />
    </span>
  );
}

export default TodoList;
