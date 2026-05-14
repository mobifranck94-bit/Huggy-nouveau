/**
 * UndoRedoToolbar - Quick undo/redo buttons with keyboard shortcuts
 * 
 * Features:
 * - Undo/Redo buttons with disabled states
 * - Keyboard shortcuts (Ctrl+Z / Ctrl+Shift+Z)
 * - Shows "Viewing history" badge when not at latest
 * - One-click reset to live
 */

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Undo2, Redo2, RotateCcw, History } from 'lucide-react';

interface UndoRedoToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  isViewingHistory: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onResetToLive?: () => void;
  onOpenHistory?: () => void;
}

export function UndoRedoToolbar({
  canUndo,
  canRedo,
  isViewingHistory,
  onUndo,
  onRedo,
  onResetToLive,
  onOpenHistory,
}: UndoRedoToolbarProps) {
  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Check for Ctrl/Cmd key
    const isMod = e.ctrlKey || e.metaKey;
    if (!isMod) return;

    // Ctrl+Z: Undo
    if (e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      if (canUndo) onUndo();
    }
    
    // Ctrl+Shift+Z or Ctrl+Y: Redo
    if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
      e.preventDefault();
      if (canRedo) onRedo();
    }
  }, [canUndo, canRedo, onUndo, onRedo]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex items-center gap-1">
      {/* Undo Button */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        className={`
          p-1.5 rounded-lg transition-all
          ${canUndo 
            ? 'text-zinc-300 hover:text-white hover:bg-zinc-800' 
            : 'text-zinc-600 cursor-not-allowed'
          }
        `}
      >
        <Undo2 className="w-4 h-4" />
      </button>

      {/* Redo Button */}
      <button
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Shift+Z)"
        className={`
          p-1.5 rounded-lg transition-all
          ${canRedo 
            ? 'text-zinc-300 hover:text-white hover:bg-zinc-800' 
            : 'text-zinc-600 cursor-not-allowed'
          }
        `}
      >
        <Redo2 className="w-4 h-4" />
      </button>

      <div className="w-px h-4 bg-zinc-800 mx-1" />

      {/* History Button */}
      <button
        onClick={onOpenHistory}
        title="View History"
        className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all"
      >
        <History className="w-4 h-4" />
      </button>

      {/* Viewing History Badge */}
      <AnimatePresence>
        {isViewingHistory && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-1.5 ml-2"
          >
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Viewing History
            </span>
            {onResetToLive && (
              <button
                onClick={onResetToLive}
                title="Return to current version"
                className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default UndoRedoToolbar;
