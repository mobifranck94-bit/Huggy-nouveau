/**
 * VersionDiff - Side-by-side diff view comparing two versions
 * 
 * Similar to GitHub/Lovable diff view:
 * - Side-by-side file comparison
 * - Line numbers
 * - Add/remove/modify highlighting
 * - File tree navigation
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  FileCode, 
  Plus, 
  Minus, 
  GitCompare,
  X,
  Copy,
  Check
} from 'lucide-react';
import type { Build } from '../lib/supabase';

interface FileEntry {
  path: string;
  content: string;
}

interface VersionDiffProps {
  oldBuild: Build | null;
  newBuild: Build | null;
  onClose: () => void;
  onApply: (files: FileEntry[]) => void;
}

interface DiffResult {
  path: string;
  oldContent: string;
  newContent: string;
  status: 'added' | 'removed' | 'modified' | 'unchanged';
  changes: {
    oldLines: number[];
    newLines: number[];
  };
}

export function VersionDiff({ oldBuild, newBuild, onClose, onApply }: VersionDiffProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Compute diff between two builds
  const diffResults = useMemo<DiffResult[]>(() => {
    if (!oldBuild?.files || !newBuild?.files) return [];

    const oldFiles = oldBuild.files as FileEntry[];
    const newFiles = newBuild.files as FileEntry[];
    
    const allPaths = new Set([...oldFiles.map(f => f.path), ...newFiles.map(f => f.path)]);
    
    return Array.from(allPaths).map(path => {
      const oldFile = oldFiles.find(f => f.path === path);
      const newFile = newFiles.find(f => f.path === path);
      
      let status: DiffResult['status'] = 'unchanged';
      if (!oldFile && newFile) status = 'added';
      else if (oldFile && !newFile) status = 'removed';
      else if (oldFile && newFile && oldFile.content !== newFile.content) status = 'modified';
      
      return {
        path,
        oldContent: oldFile?.content || '',
        newContent: newFile?.content || '',
        status,
        changes: { oldLines: [], newLines: [] }, // Simplified
      };
    }).filter(d => d.status !== 'unchanged');
  }, [oldBuild, newBuild]);

  const selectedDiff = diffResults.find(d => d.path === selectedFile) || diffResults[0];

  // Simple line-by-line diff (simplified)
  const renderDiff = (diff: DiffResult) => {
    const oldLines = diff.oldContent.split('\n');
    const newLines = diff.newContent.split('\n');
    const maxLines = Math.max(oldLines.length, newLines.length);
    
    return Array.from({ length: maxLines }).map((_, i) => {
      const oldLine = oldLines[i] || '';
      const newLine = newLines[i] || '';
      const isChanged = oldLine !== newLine;
      
      return (
        <div key={i} className="flex text-xs font-mono">
          {/* Old version */}
          <div className="w-1/2 flex">
            <span className="w-10 text-right pr-2 text-zinc-600 select-none">
              {i < oldLines.length ? i + 1 : ''}
            </span>
            <span className={`flex-1 px-2 ${isChanged ? 'bg-red-500/10 text-red-300' : 'text-zinc-400'}`}>
              {oldLine || ' '}
            </span>
          </div>
          
          {/* New version */}
          <div className="w-1/2 flex border-l border-zinc-800">
            <span className="w-10 text-right pr-2 text-zinc-600 select-none">
              {i < newLines.length ? i + 1 : ''}
            </span>
            <span className={`flex-1 px-2 ${isChanged ? 'bg-green-500/10 text-green-300' : 'text-zinc-300'}`}>
              {newLine || ' '}
            </span>
          </div>
        </div>
      );
    });
  };

  const handleCopy = () => {
    if (selectedDiff?.newContent) {
      navigator.clipboard.writeText(selectedDiff.newContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!oldBuild || !newBuild) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md">
          <p className="text-zinc-400">Select two versions to compare</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-accent rounded-lg text-white">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0b]">
      {/* Header */}
      <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <GitCompare className="w-5 h-5 text-accent" />
          <h2 className="text-sm font-semibold text-zinc-100">Version Diff</h2>
          <span className="text-xs text-zinc-500">
            Comparing: {oldBuild.id.slice(0, 8)}... → {newBuild.id.slice(0, 8)}...
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => onApply((newBuild.files || []) as FileEntry[])}
            className="px-3 py-1.5 bg-accent text-white text-xs rounded-lg hover:bg-accent/90"
          >
            Apply This Version
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* File Tree */}
        <div className="w-64 border-r border-zinc-800 overflow-y-auto">
          <div className="p-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Changed Files ({diffResults.length})
          </div>
          
          {diffResults.map((diff) => (
            <button
              key={diff.path}
              onClick={() => setSelectedFile(diff.path)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                selectedFile === diff.path 
                  ? 'bg-zinc-800 text-zinc-100' 
                  : 'text-zinc-400 hover:bg-zinc-800/50'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span className="flex-1 truncate">{diff.path}</span>
              {diff.status === 'added' && <Plus className="w-3 h-3 text-green-400" />}
              {diff.status === 'removed' && <Minus className="w-3 h-3 text-red-400" />}
              {diff.status === 'modified' && <GitCompare className="w-3 h-3 text-amber-400" />}
            </button>
          ))}
        </div>

        {/* Diff View */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedDiff ? (
            <>
              {/* File Header */}
              <div className="h-10 border-b border-zinc-800 flex items-center justify-between px-4">
                <div className="flex items-center gap-4">
                  <span className="text-xs text-zinc-400">{selectedDiff.path}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded ${
                    selectedDiff.status === 'added' ? 'bg-green-500/20 text-green-400' :
                    selectedDiff.status === 'removed' ? 'bg-red-500/20 text-red-400' :
                    'bg-amber-500/20 text-amber-400'
                  }`}>
                    {selectedDiff.status}
                  </span>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {/* Split View */}
              <div className="flex-1 overflow-auto">
                <div className="flex text-xs font-medium text-zinc-500 border-b border-zinc-800">
                  <div className="w-1/2 p-2">Previous Version</div>
                  <div className="w-1/2 p-2 border-l border-zinc-800">Current Version</div>
                </div>
                <div className="font-mono text-xs">
                  {renderDiff(selectedDiff)}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
              Select a file to view differences
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VersionDiff;
