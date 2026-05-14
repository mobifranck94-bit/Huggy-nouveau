/**
 * BuildTimeline - Visual timeline of all builds with undo/redo navigation
 * 
 * Similar to Lovable's timeline:
 * - Vertical timeline with nodes
 * - Shows current position (live vs history)
 * - Click any version to jump to it
 * - Visual diff indicators
 */

import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  RotateCcw, 
  CheckCircle2, 
  GitCommit,
  ChevronRight,
  FileCode,
  Zap
} from 'lucide-react';
import type { Build } from '../lib/supabase';

interface BuildTimelineProps {
  builds: Build[];
  currentIndex: number; // -1 = live, 0+ = viewing that build
  onSelect: (index: number) => void;
  onResetToLive: () => void;
}

export function BuildTimeline({ builds, currentIndex, onSelect, onResetToLive }: BuildTimelineProps) {
  const isViewingLive = currentIndex === -1;

  if (builds.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500 text-xs">
        <Clock className="w-5 h-5 mx-auto mb-2 opacity-50" />
        <p>No build history yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Live / Current State */}
      <motion.button
        onClick={onResetToLive}
        className={`
          w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all
          ${isViewingLive 
            ? 'bg-blue-500/10 border border-blue-500/30' 
            : 'hover:bg-zinc-800/50'
          }
        `}
      >
        <div className={`
          w-2.5 h-2.5 rounded-full
          ${isViewingLive ? 'bg-blue-400 animate-pulse' : 'bg-zinc-600'}
        `} />
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-medium ${isViewingLive ? 'text-blue-300' : 'text-zinc-400'}`}>
            Current / Live
          </p>
          <p className="text-[10px] text-zinc-500">
            {isViewingLive ? 'Editing now' : 'Click to return'}
          </p>
        </div>
        {isViewingLive && (
          <Zap className="w-3.5 h-3.5 text-blue-400" />
        )}
      </motion.button>

      {/* Timeline connector */}
      <div className="relative">
        <div className="absolute left-[18px] top-0 bottom-0 w-px bg-zinc-800" />
        
        {/* Build versions */}
        <div className="space-y-1 py-1">
          {builds.map((build, index) => {
            const isSelected = currentIndex === index;
            const isOlder = index > currentIndex && currentIndex !== -1;
            const isNewer = index < currentIndex || (currentIndex === -1 && index >= 0);
            
            const filesCount = Array.isArray(build.files) ? build.files.length : 0;
            const date = new Date(build.created_at);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
            
            return (
              <motion.button
                key={build.id}
                onClick={() => onSelect(index)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`
                  w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all relative
                  ${isSelected 
                    ? 'bg-zinc-800 border border-zinc-700' 
                    : 'hover:bg-zinc-800/30'
                  }
                  ${isOlder ? 'opacity-50' : ''}
                `}
              >
                {/* Timeline node */}
                <div className="relative z-10 mt-1">
                  <div className={`
                    w-2.5 h-2.5 rounded-full border-2
                    ${isSelected 
                      ? 'bg-accent border-accent' 
                      : isNewer 
                        ? 'bg-zinc-600 border-zinc-600' 
                        : 'bg-zinc-800 border-zinc-600'
                    }
                  `} />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <GitCommit className="w-3 h-3 text-zinc-500" />
                    <span className="text-[10px] text-zinc-500">
                      {timeStr} · {dateStr}
                    </span>
                    {build.qa_score != null && (
                      <span className={`
                        text-[9px] px-1 py-0.5 rounded
                        ${build.qa_score >= 90 ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}
                      `}>
                        QA {build.qa_score}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-zinc-300 line-clamp-2 mt-0.5">
                    {build.prompt || '(no prompt)'}
                  </p>
                  
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <FileCode className="w-3 h-3" />
                      {filesCount} files
                    </span>
                    {isSelected && (
                      <span className="text-[9px] text-accent flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                        viewing
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Arrow if selected */}
                {isSelected && (
                  <ChevronRight className="w-4 h-4 text-zinc-500 mt-1" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
      
      {/* Instructions */}
      <div className="px-3 py-2 text-[10px] text-zinc-600 border-t border-zinc-800/50 mt-2">
        <p className="flex items-center gap-1">
          <RotateCcw className="w-3 h-3" />
          Ctrl+Z to undo, Ctrl+Shift+Z to redo
        </p>
      </div>
    </div>
  );
}

export default BuildTimeline;
