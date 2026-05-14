/**
 * TodoList — compact animated plan with design system colors
 * Single accent color (orange) for all states
 */

import { motion, AnimatePresence } from 'motion/react';
import { Check, Loader2, Circle } from 'lucide-react';

export type TodoStatus = 'pending' | 'in_progress' | 'done';

export interface TodoStep {
  id: string;
  label: string;
  status: TodoStatus;
}

interface TodoListProps {
  steps: TodoStep[];
  title?: string;
  compact?: boolean;
}

export function TodoList({ steps, title = "Plan", compact = true }: TodoListProps) {
  if (!steps || steps.length === 0) return null;

  const doneCount = steps.filter(s => s.status === 'done').length;
  const progress = Math.round((doneCount / steps.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="rounded-md border border-border-subtle bg-bg-surface/50 p-2"
      role="region"
      aria-label={title}
    >
      {/* Header with progress */}
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] font-semibold text-text-secondary">{title}</p>
        <div className="flex items-center gap-1.5">
          <div className="w-12 h-1 rounded-full bg-bg-elevated overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="h-full bg-accent rounded-full"
            />
          </div>
          <span className="text-[9px] text-text-muted font-mono">
            {doneCount}/{steps.length}
          </span>
        </div>
      </div>

      {/* Steps */}
      <ul className={compact ? "space-y-0.5" : "space-y-1"} role="list">
        <AnimatePresence initial={false} mode="popLayout">
          {steps.map((step, idx) => (
            <motion.li
              key={step.id}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15, delay: idx * 0.02 }}
              className="flex items-center gap-2 text-[11px]"
            >
              <StatusIcon status={step.status} />
              <span
                className={
                  step.status === 'done'
                    ? 'text-text-muted line-through decoration-border-default'
                    : step.status === 'in_progress'
                    ? 'text-text-primary font-medium'
                    : 'text-text-secondary'
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
      <motion.span
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        className="w-3.5 h-3.5 rounded bg-accent-dim border border-accent-border flex items-center justify-center shrink-0"
        aria-label="Done"
      >
        <Check className="w-2 h-2 text-accent" strokeWidth={2.5} />
      </motion.span>
    );
  }
  if (status === 'in_progress') {
    return (
      <span
        className="w-3.5 h-3.5 rounded bg-accent-dim border border-accent-border flex items-center justify-center shrink-0"
        aria-label="In progress"
      >
        <Loader2 className="w-2 h-2 text-accent animate-spin" strokeWidth={2.5} />
      </span>
    );
  }
  return (
    <span
      className="w-3.5 h-3.5 rounded border border-border-default flex items-center justify-center shrink-0"
      aria-label="Pending"
    >
      <Circle className="w-1.5 h-1.5 text-text-muted" strokeWidth={2} />
    </span>
  );
}

export default TodoList;
