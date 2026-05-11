/**
 * LiveCodeStream - minimal inline code preview for a file currently being written.
 * Features:
 *  - Numbered lines
 *  - Subtle keyword tinting (no heavy parser)
 *  - Blinking cursor at the end while streaming
 *  - Auto-scroll to bottom
 *  - Max height with custom scrollbar
 */

import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { FileCode } from 'lucide-react';

interface LiveCodeStreamProps {
  path: string;
  content: string;
  isStreaming: boolean;
  /** Max visible height before scrolling (default 180px) */
  maxHeight?: number;
}

// Very lightweight token highlighter — colors common keywords without a real lexer.
const KEYWORD_PATTERN = /\b(import|from|export|default|const|let|var|function|return|if|else|async|await|new|class|interface|type|extends|implements)\b/g;
const STRING_PATTERN = /(["'`])(.*?)\1/g;
const COMMENT_PATTERN = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g;
const JSX_TAG_PATTERN = /(&lt;\/?[A-Za-z][\w.-]*)/g;

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlight(line: string): string {
  let out = escapeHtml(line);
  out = out.replace(COMMENT_PATTERN, '<span style="color:#71717a">$1</span>');
  out = out.replace(STRING_PATTERN, '<span style="color:#fbbf24">$1$2$1</span>');
  out = out.replace(KEYWORD_PATTERN, '<span style="color:#c084fc">$1</span>');
  out = out.replace(JSX_TAG_PATTERN, '<span style="color:#60a5fa">$1</span>');
  return out;
}

export function LiveCodeStream({ path, content, isStreaming, maxHeight = 180 }: LiveCodeStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lines = content.split('\n');

  // Auto-scroll to bottom while streaming
  useEffect(() => {
    if (!isStreaming) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [content, isStreaming]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-lg border border-zinc-800/60 bg-[#0b0b0c]"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/60 bg-[#0e0e10] px-3 py-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <FileCode className="w-3 h-3 text-blue-400 shrink-0" />
          <span className="font-mono text-[10px] text-zinc-300 truncate">{path}</span>
        </div>
        <span className="text-[9px] text-zinc-500 font-mono shrink-0">
          {lines.length} {lines.length > 1 ? 'lines' : 'line'}
        </span>
      </div>

      {/* Body */}
      <div
        ref={scrollRef}
        className="windsurf-scrollbar overflow-y-auto"
        style={{ maxHeight }}
      >
        <pre className="m-0 p-0 font-mono text-[10.5px] leading-[1.5] text-zinc-200">
          {lines.map((line, idx) => (
            <div key={idx} className="flex">
              <span className="select-none w-8 shrink-0 pl-2 pr-2 text-right text-zinc-700 border-r border-zinc-800/40 mr-2">
                {idx + 1}
              </span>
              <span
                className="flex-1 whitespace-pre-wrap break-words pr-2"
                dangerouslySetInnerHTML={{
                  __html: highlight(line) + (isStreaming && idx === lines.length - 1 ? '<span class="windsurf-cursor animate-windsurf-cursor"></span>' : ''),
                }}
              />
            </div>
          ))}
        </pre>
      </div>
    </motion.div>
  );
}

export default LiveCodeStream;
