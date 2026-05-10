/**
 * BuildHistoryDrawer - slide-in panel listing all builds of the current project
 * with a one-click "Restore" action to load that version back into the editor.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, History, RotateCcw, Check } from 'lucide-react';
import type { Build } from '../lib/supabase';

interface BuildHistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  projectId?: string;
  currentBuildId?: string;
  /** Called when user clicks "Restore" on an older build */
  onRestore: (build: Build) => void;
  getBuilds: (projectId: string) => Promise<Build[]>;
}

export function BuildHistoryDrawer({ open, onClose, projectId, currentBuildId, onRestore, getBuilds }: BuildHistoryDrawerProps) {
  const [builds, setBuilds] = useState<Build[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoredId, setRestoredId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !projectId) return;
    let cancelled = false;
    setLoading(true);
    getBuilds(projectId)
      .then(data => {
        if (!cancelled) setBuilds(data);
      })
      .catch(err => {
        if (!cancelled) console.warn('[BuildHistory] failed to load:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [open, projectId, getBuilds]);

  const handleRestore = (b: Build) => {
    onRestore(b);
    setRestoredId(b.id);
    setTimeout(() => setRestoredId(null), 1800);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50"
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-[#0a0a0b] border-l border-zinc-800 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-bold text-zinc-100">Historique des versions</h2>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  {builds.length}
                </span>
              </div>
              <button
                onClick={onClose}
                aria-label="Fermer"
                className="p-1.5 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {loading && (
                <div className="text-center text-xs text-zinc-500 py-8">Chargement...</div>
              )}
              {!loading && builds.length === 0 && (
                <div className="text-center text-xs text-zinc-500 py-8">
                  Aucune version enregistrée pour ce projet.
                </div>
              )}
              {builds.map((b) => {
                const isCurrent = b.id === currentBuildId;
                const isRestored = restoredId === b.id;
                const filesCount = Array.isArray(b.files) ? b.files.length : 0;
                return (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-xl border p-3 transition-all ${
                      isCurrent
                        ? 'border-blue-500/40 bg-blue-500/5'
                        : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-xs text-zinc-200 line-clamp-2 flex-1">
                        {b.prompt || '(sans prompt)'}
                      </p>
                      {isCurrent && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                          Actuelle
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-zinc-500 mb-2">
                      <span>{new Date(b.created_at).toLocaleString()}</span>
                      <span>·</span>
                      <span>{filesCount} fichier{filesCount > 1 ? 's' : ''}</span>
                      {b.qa_score != null && (
                        <>
                          <span>·</span>
                          <span>QA {b.qa_score}</span>
                        </>
                      )}
                    </div>

                    {!isCurrent && (
                      <button
                        onClick={() => handleRestore(b)}
                        disabled={isRestored}
                        className="w-full flex items-center justify-center gap-1.5 text-[11px] py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors disabled:opacity-60"
                      >
                        {isRestored ? (
                          <>
                            <Check className="w-3 h-3 text-green-400" />
                            Restauré
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-3 h-3" />
                            Restaurer cette version
                          </>
                        )}
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export default BuildHistoryDrawer;
