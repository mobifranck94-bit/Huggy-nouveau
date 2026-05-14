/**
 * useUndoRedo - Hook for managing undo/redo state in Huggy
 * 
 * Similar to Lovable/Bolt:
 * - Ctrl+Z / Cmd+Z: Undo (go to previous version)
 * - Ctrl+Shift+Z / Cmd+Shift+Z: Redo (go to next version)
 * - Visual timeline showing all versions
 * - Quick restore with one click
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Build } from '../lib/supabase';

interface VersionState {
  builds: Build[];
  currentIndex: number; // -1 means at latest/live state
}

interface UseUndoRedoOptions {
  projectId?: string;
  getBuilds: (projectId: string) => Promise<Build[]>;
  onRestore: (build: Build) => void;
  onResetToLive?: () => void;
}

export function useUndoRedo({
  projectId,
  getBuilds,
  onRestore,
  onResetToLive,
}: UseUndoRedoOptions) {
  const [versions, setVersions] = useState<VersionState>({ builds: [], currentIndex: -1 });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const loadedProjectRef = useRef<string | undefined>(undefined);

  // Load builds when project changes
  useEffect(() => {
    if (!projectId || projectId === loadedProjectRef.current) return;
    
    setIsLoading(true);
    getBuilds(projectId)
      .then(builds => {
        // Sort by created_at descending (newest first)
        const sorted = builds.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setVersions({ builds: sorted, currentIndex: -1 });
        loadedProjectRef.current = projectId;
      })
      .catch(err => console.warn('[useUndoRedo] Failed to load builds:', err))
      .finally(() => setIsLoading(false));
  }, [projectId, getBuilds]);

  // Update canUndo/canRedo whenever versions change
  useEffect(() => {
    const { builds, currentIndex } = versions;
    // Can undo if we're not at the newest build (index > -1 means viewing an older version)
    setCanUndo(currentIndex >= 0 && currentIndex < builds.length - 1);
    // Can redo if we're viewing an older version and there's a newer one
    setCanRedo(currentIndex >= 0);
  }, [versions]);

  /**
   * Undo - Go to the previous (older) version
   * Ctrl+Z behavior: goes back in time to older builds
   */
  const undo = useCallback(() => {
    const { builds, currentIndex } = versions;
    
    if (builds.length === 0) return;
    
    // Calculate next index (go to older build = increase index)
    const nextIndex = currentIndex === -1 ? 0 : Math.min(currentIndex + 1, builds.length - 1);
    
    const targetBuild = builds[nextIndex];
    if (targetBuild) {
      setVersions(prev => ({ ...prev, currentIndex: nextIndex }));
      onRestore(targetBuild);
    }
  }, [versions, onRestore]);

  /**
   * Redo - Go to the next (newer) version
   * Ctrl+Shift+Z behavior: goes forward in time to newer builds
   */
  const redo = useCallback(() => {
    const { builds, currentIndex } = versions;
    
    if (currentIndex <= -1 || builds.length === 0) {
      // Already at latest, reset to live
      if (onResetToLive) {
        setVersions(prev => ({ ...prev, currentIndex: -1 }));
        onResetToLive();
      }
      return;
    }
    
    // Calculate previous index (go to newer build = decrease index)
    const nextIndex = Math.max(currentIndex - 1, -1);
    
    if (nextIndex === -1) {
      // Going back to live state
      setVersions(prev => ({ ...prev, currentIndex: -1 }));
      if (onResetToLive) onResetToLive();
    } else {
      const targetBuild = builds[nextIndex];
      if (targetBuild) {
        setVersions(prev => ({ ...prev, currentIndex: nextIndex }));
        onRestore(targetBuild);
      }
    }
  }, [versions, onRestore, onResetToLive]);

  /**
   * Reset to live/current state
   */
  const resetToLive = useCallback(() => {
    setVersions(prev => ({ ...prev, currentIndex: -1 }));
    if (onResetToLive) onResetToLive();
  }, [onResetToLive]);

  /**
   * Jump to a specific version
   */
  const jumpToVersion = useCallback((index: number) => {
    const { builds } = versions;
    
    if (index === -1) {
      resetToLive();
      return;
    }
    
    if (index >= 0 && index < builds.length) {
      const targetBuild = builds[index];
      setVersions(prev => ({ ...prev, currentIndex: index }));
      onRestore(targetBuild);
    }
  }, [versions, onRestore, resetToLive]);

  /**
   * Refresh the builds list
   */
  const refresh = useCallback(async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    try {
      const builds = await getBuilds(projectId);
      const sorted = builds.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setVersions(prev => ({ builds: sorted, currentIndex: prev.currentIndex }));
    } catch (err) {
      console.warn('[useUndoRedo] Refresh failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, getBuilds]);

  // Get current viewing state
  const currentViewingBuild = versions.currentIndex >= 0 
    ? versions.builds[versions.currentIndex] 
    : null;
  
  const isViewingHistory = versions.currentIndex >= 0;

  return {
    // State
    builds: versions.builds,
    currentIndex: versions.currentIndex,
    canUndo,
    canRedo,
    isLoading,
    isViewingHistory,
    currentViewingBuild,
    
    // Actions
    undo,
    redo,
    resetToLive,
    jumpToVersion,
    refresh,
  };
}

export default useUndoRedo;
