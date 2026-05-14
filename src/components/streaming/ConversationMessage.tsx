/**
 * ConversationMessage — Claude Code–style chat-only AI message.
 *
 * Design principles:
 *  - No heavy bubble. Text flows directly on the canvas.
 *  - Small Huggy avatar to the left, name and timestamp on hover only.
 *  - Custom mini-markdown renderer (bold, italic, inline code, code blocks, lists, links).
 *  - Thin blinking caret while streaming (not a fat block).
 *  - Hover toolbar with Copy / 👍 / 👎 / Regenerate.
 *  - Subtle 1px divider above for rhythm between turns.
 *  - Generous typography (14px, line-height 1.65) for comfortable reading.
 */

import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Copy, Check, ThumbsUp, ThumbsDown, RotateCcw, Sparkles } from 'lucide-react';

interface ConversationMessageProps {
  id: string;
  text: string;
  isStreaming: boolean;
  timestamp: number;
  theme: 'dark' | 'light';
  onCopy: () => void;
  copied: boolean;
  onRegenerate?: () => void;
  onFeedback?: (kind: 'up' | 'down') => void;
}

export function ConversationMessage({
  text,
  isStreaming,
  timestamp,
  theme,
  onCopy,
  copied,
  onRegenerate,
  onFeedback,
}: ConversationMessageProps) {
  const isDark = theme === 'dark';
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  const handleFeedback = (kind: 'up' | 'down') => {
    setFeedback(kind);
    onFeedback?.(kind);
  };

  // Parse markdown into renderable blocks ONCE per text change.
  const blocks = useMemo(() => parseMarkdown(text), [text]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="group relative w-full"
    >
      {/* Subtle top divider for rhythm */}
      <div className={`absolute -top-3 left-0 right-0 h-px ${isDark ? 'bg-zinc-800/40' : 'bg-zinc-200/60'}`} />

      <div className="flex gap-3 pt-1">
        {/* Avatar */}
        <div className="flex-shrink-0 pt-0.5">
          <div
            className={`w-6 h-6 rounded-md flex items-center justify-center ${
              isDark
                ? 'bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/30'
                : 'bg-gradient-to-br from-violet-100 to-blue-100 border border-violet-200'
            }`}
          >
            <Sparkles className={`w-3 h-3 ${isDark ? 'text-violet-300' : 'text-violet-600'}`} strokeWidth={2.2} />
          </div>
        </div>

        {/* Content column */}
        <div className="flex-1 min-w-0">
          {/* Header: name (hidden until hover) + timestamp (hidden until hover) */}
          <div className="flex items-center gap-2 mb-1 h-3.5">
            <span
              className={`text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
                isDark ? 'text-zinc-300' : 'text-zinc-700'
              }`}
            >
              Huggy
            </span>
            <span
              className={`text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
                isDark ? 'text-zinc-600' : 'text-zinc-400'
              }`}
            >
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Rendered markdown content */}
          <div
            className={`conversation-prose text-[13.5px] leading-[1.65] select-text ${
              isDark ? 'text-zinc-200' : 'text-zinc-800'
            }`}
          >
            {blocks.map((block, i) => (
              <MarkdownBlock key={i} block={block} isDark={isDark} />
            ))}
            {isStreaming && (
              <span
                className={`inline-block w-[2px] h-[14px] ml-[1px] align-middle ${
                  isDark ? 'bg-violet-400' : 'bg-violet-600'
                } animate-windsurf-cursor`}
                aria-hidden="true"
              />
            )}
          </div>

          {/* Hover toolbar — only when streaming is done */}
          {!isStreaming && text.length > 0 && (
            <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <ToolbarButton
                onClick={onCopy}
                title={copied ? 'Copié' : 'Copier'}
                isDark={isDark}
                active={copied}
              >
                {copied ? <Check className="w-3 h-3" strokeWidth={2.5} /> : <Copy className="w-3 h-3" strokeWidth={2} />}
              </ToolbarButton>

              {onFeedback && (
                <>
                  <ToolbarButton
                    onClick={() => handleFeedback('up')}
                    title="Bonne réponse"
                    isDark={isDark}
                    active={feedback === 'up'}
                  >
                    <ThumbsUp className="w-3 h-3" strokeWidth={2} />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => handleFeedback('down')}
                    title="Mauvaise réponse"
                    isDark={isDark}
                    active={feedback === 'down'}
                  >
                    <ThumbsDown className="w-3 h-3" strokeWidth={2} />
                  </ToolbarButton>
                </>
              )}

              {onRegenerate && (
                <ToolbarButton onClick={onRegenerate} title="Régénérer" isDark={isDark}>
                  <RotateCcw className="w-3 h-3" strokeWidth={2} />
                </ToolbarButton>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Toolbar button (subtle, hover-revealed) ─────────────────────────────────
function ToolbarButton({
  onClick,
  title,
  children,
  isDark,
  active = false,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  isDark: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`p-1.5 rounded-md transition-all duration-150 ${
        active
          ? isDark
            ? 'bg-violet-500/15 text-violet-300'
            : 'bg-violet-100 text-violet-700'
          : isDark
          ? 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60'
          : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'
      }`}
    >
      {children}
    </button>
  );
}

// ─── Mini markdown parser ────────────────────────────────────────────────────
type Block =
  | { kind: 'p'; text: string }
  | { kind: 'code'; lang: string; content: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'h'; level: number; text: string }
  | { kind: 'quote'; text: string };

function parseMarkdown(raw: string): Block[] {
  if (!raw) return [];

  const blocks: Block[] = [];
  const lines = raw.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block ```lang ... ```
    const fenceMatch = line.match(/^```(\w+)?/);
    if (fenceMatch) {
      const lang = fenceMatch[1] || '';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push({ kind: 'code', lang, content: codeLines.join('\n') });
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({ kind: 'h', level: headingMatch[1].length, text: headingMatch[2] });
      i++;
      continue;
    }

    // Blockquote
    const quoteMatch = line.match(/^>\s+(.+)$/);
    if (quoteMatch) {
      const quoteLines: string[] = [quoteMatch[1]];
      i++;
      while (i < lines.length) {
        const m = lines[i].match(/^>\s?(.*)$/);
        if (!m) break;
        quoteLines.push(m[1]);
        i++;
      }
      blocks.push({ kind: 'quote', text: quoteLines.join(' ') });
      continue;
    }

    // List (- item OR 1. item)
    const ulMatch = line.match(/^[-*]\s+(.+)$/);
    const olMatch = line.match(/^\d+\.\s+(.+)$/);
    if (ulMatch || olMatch) {
      const ordered = !!olMatch;
      const items: string[] = [ulMatch?.[1] || olMatch![1]];
      i++;
      while (i < lines.length) {
        const um = lines[i].match(/^[-*]\s+(.+)$/);
        const om = lines[i].match(/^\d+\.\s+(.+)$/);
        if (ordered && om) items.push(om[1]);
        else if (!ordered && um) items.push(um[1]);
        else break;
        i++;
      }
      blocks.push({ kind: 'list', ordered, items });
      continue;
    }

    // Empty line: skip
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph: collect consecutive non-empty non-special lines
    const paraLines: string[] = [line];
    i++;
    while (i < lines.length) {
      const next = lines[i];
      if (
        next.trim() === '' ||
        next.startsWith('```') ||
        next.match(/^#{1,3}\s+/) ||
        next.match(/^>\s+/) ||
        next.match(/^[-*]\s+/) ||
        next.match(/^\d+\.\s+/)
      ) {
        break;
      }
      paraLines.push(next);
      i++;
    }
    blocks.push({ kind: 'p', text: paraLines.join('\n') });
  }

  return blocks;
}

// ─── Block renderer ──────────────────────────────────────────────────────────
function MarkdownBlock({ block, isDark }: { block: Block; isDark: boolean }) {
  if (block.kind === 'code') return <CodeBlock lang={block.lang} content={block.content} isDark={isDark} />;

  if (block.kind === 'h') {
    const sizes = ['text-lg', 'text-base', 'text-sm'];
    const size = sizes[block.level - 1] || 'text-sm';
    return (
      <div className={`font-bold ${size} mt-3 mb-1.5 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
        <InlineText text={block.text} isDark={isDark} />
      </div>
    );
  }

  if (block.kind === 'quote') {
    return (
      <blockquote
        className={`border-l-2 pl-3 my-2 italic ${
          isDark ? 'border-violet-500/40 text-zinc-300' : 'border-violet-300 text-zinc-600'
        }`}
      >
        <InlineText text={block.text} isDark={isDark} />
      </blockquote>
    );
  }

  if (block.kind === 'list') {
    const ListTag = block.ordered ? 'ol' : 'ul';
    return (
      <ListTag
        className={`my-1.5 space-y-1 ${block.ordered ? 'list-decimal' : 'list-disc'} pl-5 marker:${
          isDark ? 'text-zinc-600' : 'text-zinc-400'
        }`}
      >
        {block.items.map((item, idx) => (
          <li key={idx}>
            <InlineText text={item} isDark={isDark} />
          </li>
        ))}
      </ListTag>
    );
  }

  // Paragraph
  return (
    <p className="my-1.5 whitespace-pre-wrap">
      <InlineText text={block.text} isDark={isDark} />
    </p>
  );
}

// ─── Inline renderer: bold, italic, code, links ──────────────────────────────
function InlineText({ text, isDark }: { text: string; isDark: boolean }) {
  // Tokenize: protect inline code spans first so ** inside them isn't touched
  // Pattern matches: `code`, **bold**, *italic*, [text](url)
  const parts: Array<{ kind: 'text' | 'code' | 'bold' | 'italic' | 'link'; value: string; href?: string }> = [];
  const regex = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)|(\[[^\]]+\]\([^)]+\))/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push({ kind: 'text', value: text.slice(lastIdx, match.index) });
    }
    const token = match[0];
    if (token.startsWith('`')) {
      parts.push({ kind: 'code', value: token.slice(1, -1) });
    } else if (token.startsWith('**')) {
      parts.push({ kind: 'bold', value: token.slice(2, -2) });
    } else if (token.startsWith('*')) {
      parts.push({ kind: 'italic', value: token.slice(1, -1) });
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        parts.push({ kind: 'link', value: linkMatch[1], href: linkMatch[2] });
      } else {
        parts.push({ kind: 'text', value: token });
      }
    }
    lastIdx = regex.lastIndex;
  }

  if (lastIdx < text.length) {
    parts.push({ kind: 'text', value: text.slice(lastIdx) });
  }

  return (
    <>
      {parts.map((p, i) => {
        if (p.kind === 'text') return <span key={i}>{p.value}</span>;
        if (p.kind === 'bold')
          return (
            <strong key={i} className={`font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              {p.value}
            </strong>
          );
        if (p.kind === 'italic')
          return (
            <em key={i} className="italic">
              {p.value}
            </em>
          );
        if (p.kind === 'code')
          return (
            <code
              key={i}
              className={`font-mono text-[0.85em] px-1 py-px rounded ${
                isDark
                  ? 'bg-zinc-800/70 text-amber-300 border border-zinc-700/40'
                  : 'bg-zinc-100 text-amber-700 border border-zinc-200'
              }`}
            >
              {p.value}
            </code>
          );
        if (p.kind === 'link')
          return (
            <a
              key={i}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`underline underline-offset-2 ${
                isDark ? 'text-violet-300 hover:text-violet-200' : 'text-violet-600 hover:text-violet-700'
              }`}
            >
              {p.value}
            </a>
          );
        return null;
      })}
    </>
  );
}

// ─── Code block with copy button ─────────────────────────────────────────────
function CodeBlock({ lang, content, isDark }: { lang: string; content: string; isDark: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className={`my-3 rounded-lg overflow-hidden border ${
        isDark ? 'border-zinc-800 bg-zinc-950/60' : 'border-zinc-200 bg-zinc-50'
      }`}
    >
      <div
        className={`flex items-center justify-between px-3 py-1.5 border-b ${
          isDark ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-200 bg-zinc-100/80'
        }`}
      >
        <span
          className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${
            isDark ? 'text-zinc-500' : 'text-zinc-500'
          }`}
        >
          {lang || 'code'}
        </span>
        <button
          onClick={copy}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
            isDark
              ? 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
              : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              Copié
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copier
            </>
          )}
        </button>
      </div>
      <pre className={`p-3 overflow-x-auto text-[12px] leading-relaxed ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
        <code className="font-mono">{content}</code>
      </pre>
    </div>
  );
}

export default ConversationMessage;
