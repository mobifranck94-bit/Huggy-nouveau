/**
 * ActionLog — compact log of significant agent actions during execution.
 * Each entry shows:
 *   🛠️ tool — action          (what was done)
 *      ✅ why                  (reasoning behind it)
 *      ➡️ next                 (what comes next, optional)
 *
 * Helps the user follow the agent's reasoning without flooding the chat.
 */

import { motion, AnimatePresence } from 'motion/react';
import { Wrench, CheckCircle2, ArrowRight } from 'lucide-react';

export interface ActionEntry {
  id: string;
  tool: string;
  action: string;
  why?: string;
  next?: string;
}

interface ActionLogProps {
  entries: ActionEntry[];
  maxVisible?: number;
}

export function ActionLog({ entries, maxVisible = 5 }: ActionLogProps) {
  if (!entries || entries.length === 0) return null;

  // Keep the most recent actions visible
  const visible = entries.slice(-maxVisible);

  return (
    <div className="space-y-1.5" role="region" aria-label="Journal d'actions">
      <AnimatePresence initial={false}>
        {visible.map(entry => (
          <motion.div
            key={entry.id}
            layout
            initial={{ opacity: 0, x: -4, height: 0 }}
            animate={{ opacity: 1, x: 0, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="rounded-lg bg-zinc-900/50 border border-zinc-800/40 px-3 py-2 text-[11px]"
          >
            <div className="flex items-start gap-1.5">
              <Wrench className="w-3 h-3 text-zinc-500 mt-0.5 shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <span className="font-mono text-zinc-500">{entry.tool}</span>
                <span className="text-zinc-600 mx-1">—</span>
                <span className="text-zinc-200">{entry.action}</span>
              </div>
            </div>
            {entry.why && (
              <div className="flex items-start gap-1.5 mt-1 pl-4">
                <CheckCircle2 className="w-3 h-3 text-green-500/70 mt-0.5 shrink-0" aria-hidden="true" />
                <span className="text-zinc-400 leading-snug">{entry.why}</span>
              </div>
            )}
            {entry.next && (
              <div className="flex items-start gap-1.5 mt-1 pl-4">
                <ArrowRight className="w-3 h-3 text-blue-400/70 mt-0.5 shrink-0" aria-hidden="true" />
                <span className="text-zinc-500 italic leading-snug">{entry.next}</span>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default ActionLog;
