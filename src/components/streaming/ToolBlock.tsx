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
  PlusCircle,
  Trash2,
  Search,
  Library,
  Brain,
  Download,
  FlaskConical,
  ScanLine,
  Sparkles,
  Rocket,
  Hand,
  Compass,
  HelpCircle,
  Globe,
  Plug,
  Shield,
  Wrench,
  Palette,
  Database,
  Target,
  ClipboardList,
  Layout,
  Code2,
  Zap,
} from 'lucide-react';

/** Extended ToolKind matching api.ts ToolKind */
export type ToolKind =
  | 'read'              // 📖 Reading files
  | 'write'             // 📝 Writing new files
  | 'edit'              // ✏️  Editing existing files
  | 'create'            // ➕ Creating resources
  | 'delete'            // 🗑️  Deleting files
  | 'search'            // 🔍 Searching codebase
  | 'index'             // 📚 Indexing project
  | 'analyze'           // 🧠 Analyzing code
  | 'bundle'            // 📦 Bundling/Building
  | 'install'           // 📥 Installing dependencies
  | 'test'              // 🧪 Running tests
  | 'lint'              // 🔎 Linting code
  | 'format'            // ✨ Formatting code
  | 'deploy'            // 🚀 Deploying
  | 'touch'             // 👆 Touching/accessing files
  | 'explore'           // 🔎 Exploring structure
  | 'query'             // ❓ Asking clarifying questions
  | 'web_search'        // 🌐 Web research
  | 'api_call'          // 🔌 API integration
  | 'scan'              // 🔒 Security scanning
  | 'fix'               // 🔧 Fixing issues
  | 'design'            // 🎨 Designing UI
  | 'model'             // 🗄️  Database modeling
  | 'error';            // ⚠️  Error occurred

export type ToolStatus = 'pending' | 'active' | 'completed' | 'error';

interface ToolBlockProps {
  kind: ToolKind;
  label: string;          // primary text, e.g. file path or action label
  detail?: string;        // secondary text, e.g. "124 lines" or "+12 -3"
  status?: ToolStatus;
}

const KIND_CONFIG: Record<ToolKind, { Icon: typeof FilePlus; color: string; bg: string }> = {
  // File operations
  read:      { Icon: BookOpen,      color: 'text-cyan-300',   bg: 'bg-cyan-500/5' },
  write:     { Icon: FilePlus,      color: 'text-blue-300',   bg: 'bg-blue-500/5' },
  edit:      { Icon: FileEdit,      color: 'text-violet-300', bg: 'bg-violet-500/5' },
  create:    { Icon: PlusCircle,    color: 'text-emerald-300', bg: 'bg-emerald-500/5' },
  delete:    { Icon: Trash2,        color: 'text-red-300',    bg: 'bg-red-500/5' },

  // Search & Analysis
  search:    { Icon: Search,        color: 'text-yellow-300', bg: 'bg-yellow-500/5' },
  index:     { Icon: Library,       color: 'text-zinc-300',   bg: 'bg-zinc-500/5' },
  analyze:   { Icon: Brain,         color: 'text-purple-300', bg: 'bg-purple-500/5' },

  // Build & Deploy
  bundle:    { Icon: Package,       color: 'text-amber-300',  bg: 'bg-amber-500/5' },
  install:   { Icon: Download,      color: 'text-cyan-300',   bg: 'bg-cyan-500/5' },
  test:      { Icon: FlaskConical,  color: 'text-green-300',  bg: 'bg-green-500/5' },
  lint:      { Icon: ScanLine,      color: 'text-orange-300', bg: 'bg-orange-500/5' },
  format:    { Icon: Sparkles,      color: 'text-pink-300',   bg: 'bg-pink-500/5' },
  deploy:    { Icon: Rocket,        color: 'text-indigo-300', bg: 'bg-indigo-500/5' },

  // Interaction
  touch:     { Icon: Hand,          color: 'text-zinc-300',   bg: 'bg-zinc-500/5' },
  explore:   { Icon: Compass,       color: 'text-teal-300',   bg: 'bg-teal-500/5' },
  query:     { Icon: HelpCircle,    color: 'text-sky-300',    bg: 'bg-sky-500/5' },

  // External
  web_search:{ Icon: Globe,         color: 'text-cyan-300',   bg: 'bg-cyan-500/5' },
  api_call:  { Icon: Plug,          color: 'text-lime-300',   bg: 'bg-lime-500/5' },

  // Security & Fix
  scan:      { Icon: Shield,        color: 'text-amber-300',  bg: 'bg-amber-500/5' },
  fix:       { Icon: Wrench,        color: 'text-orange-300', bg: 'bg-orange-500/5' },

  // Design
  design:    { Icon: Palette,       color: 'text-pink-300',   bg: 'bg-pink-500/5' },
  model:     { Icon: Database,      color: 'text-blue-300',   bg: 'bg-blue-500/5' },

  // Error
  error:     { Icon: AlertTriangle, color: 'text-red-300',    bg: 'bg-red-500/5' },
};

export function ToolBlock({ kind, label, detail, status = 'active' }: ToolBlockProps) {
  const cfg = KIND_CONFIG[kind];
  const isPending = status === 'pending';
  const isActive = status === 'active';
  const isError = status === 'error';
  const isCompleted = status === 'completed';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8, filter: 'blur(2px)' }}
      animate={{ opacity: isPending ? 0.5 : 1, x: 0, filter: 'blur(0px)' }}
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
        ) : isCompleted ? (
          <CheckCircle2 className="w-3 h-3 text-green-400" />
        ) : (
          <cfg.Icon className="w-3 h-3" />
        )}
      </span>

      {/* Label */}
      <span className={`relative font-mono text-[11px] truncate flex-1 ${isPending ? 'text-zinc-500' : 'text-zinc-200'}`}>
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
