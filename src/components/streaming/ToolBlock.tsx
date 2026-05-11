/**
 * ToolBlock - granular sub-action card (Claude Code / Bolt style).
 * Examples:
 *   ✏️  Writing src/App.tsx · 124 lines (active, with shimmer)
 *   📖  Reading existing files (done)
 *   🔧  Editing Button.tsx · +12 -3 (done)
 *   📦  Bundling 6 components (active)
 */

import { motion } from 'motion/react';
import {
  FileEdit,
  FilePlus,
  BookOpen,
  Package,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

export type ToolKind = 'read' | 'write' | 'edit' | 'bundle' | 'error';
export type ToolStatus = 'active' | 'completed' | 'error';

interface ToolBlockProps {
  kind: ToolKind;
  label: string;          // primary text, e.g. file path or action label
  detail?: string;        // secondary text, e.g. "124 lines" or "+12 -3"
  status?: ToolStatus;
}

const KIND_CONFIG: Record<ToolKind, { Icon: typeof FilePlus; color: string; bg: string }> = {
  read:   { Icon: BookOpen,  color: 'text-cyan-300',   bg: 'bg-cyan-500/5' },
  write:  { Icon: FilePlus,  color: 'text-blue-300',   bg: 'bg-blue-500/5' },
  edit:   { Icon: FileEdit,  color: 'text-violet-300', bg: 'bg-violet-500/5' },
  bundle: { Icon: Package,   color: 'text-amber-300',  bg: 'bg-amber-500/5' },
  error:  { Icon: AlertTriangle, color: 'text-red-300', bg: 'bg-red-500/5' },
};

export function ToolBlock({ kind, label, detail, status = 'active' }: ToolBlockProps) {
  const cfg = KIND_CONFIG[kind];
  const isActive = status === 'active';
  const isError = status === 'error';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8, filter: 'blur(2px)' }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`relative flex items-center gap-2 rounded-md border border-zinc-800/60 ${cfg.bg} px-2.5 py-1.5 overflow-hidden`}
    >
      {/* Shimmer overlay when active */}
      {isActive && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 huggy-shimmer"
        />
      )}

      {/* Icon */}
      <span className={`relative shrink-0 ${cfg.color}`}>
        {isActive ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : isError ? (
          <AlertTriangle className="w-3 h-3" />
        ) : status === 'completed' ? (
          <CheckCircle2 className="w-3 h-3 text-green-400" />
        ) : (
          <cfg.Icon className="w-3 h-3" />
        )}
      </span>

      {/* Label */}
      <span className="relative font-mono text-[11px] text-zinc-200 truncate flex-1">
        {label}
      </span>

      {/* Detail */}
      {detail && (
        <span className="relative shrink-0 text-[9px] text-zinc-500 font-mono">
          {detail}
        </span>
      )}
    </motion.div>
  );
}

export default ToolBlock;
