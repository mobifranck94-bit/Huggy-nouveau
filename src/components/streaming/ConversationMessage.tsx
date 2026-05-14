/**
 * ConversationMessage — Claude Code–style chat-only AI message.
 * Design System: dark-first, single accent color (orange)
 */

import { useMemo, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Copy, Check, ThumbsUp, ThumbsDown, RotateCcw, Sparkles } from 'lucide-react';

interface ConversationMessageProps {
  id: string;
  text: string;
  isStreaming: boolean;
  timestamp: number;
  theme?: 'dark' | 'light';
  onCopy: () => void;
  copied: boolean;
  onRegenerate?: () => void;
  onFeedback?: (kind: 'up' | 'down') => void;
}

export function ConversationMessage({
  text,
  isStreaming,
  timestamp,
  theme = 'dark',
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
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className="group relative w-full"
    >
      {/* Subtle top divider for rhythm */}
      <div className="absolute -top-3 left-0 right-0 h-px bg-border-subtle" />

      <div className="flex gap-3 pt-1">
        {/* Avatar - Design System accent */}
        <div className="flex-shrink-0 pt-0.5">
          <div className="w-6 h-6 rounded-md bg-accent-dim border border-accent-border flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-accent" strokeWidth={2.2} />
          </div>
        </div>

        {/* Content column */}
        <div className="flex-1 min-w-0">
          {/* Header: name + timestamp on hover */}
          <div className="flex items-center gap-2 mb-1 h-3.5">
            <span className="text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-text-secondary">
              Huggy
            </span>
            <span className="text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-text-muted">
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Rendered markdown content */}
          <div className="conversation-prose text-[13.5px] leading-[1.65] select-text text-text-primary">
            {blocks.map((block, i) => (
              <MarkdownBlock key={i} block={block} />
            ))}
            {isStreaming && (
              <span
                className="inline-block w-[2px] h-[14px] ml-[1px] align-middle bg-accent animate-windsurf-cursor"
                aria-hidden="true"
              />
            )}
          </div>

          {/* Hover toolbar */}
          {!isStreaming && text.length > 0 && (
            <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <ToolbarButton onClick={onCopy} title={copied ? 'Copied' : 'Copy'} active={copied}>
                {copied ? <Check className="w-3 h-3" strokeWidth={2.5} /> : <Copy className="w-3 h-3" strokeWidth={2} />}
              </ToolbarButton>

              {onFeedback && (
                <>
                  <ToolbarButton
                    onClick={() => handleFeedback('up')}
                    title="Good response"
                    active={feedback === 'up'}
                  >
                    <ThumbsUp className="w-3 h-3" strokeWidth={2} />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => handleFeedback('down')}
                    title="Bad response"
                    active={feedback === 'down'}
                  >
                    <ThumbsDown className="w-3 h-3" strokeWidth={2} />
                  </ToolbarButton>
                </>
              )}

              {onRegenerate && (
                <ToolbarButton onClick={onRegenerate} title="Regenerate">
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
  active = false,
}: {
  onClick: () => void;
  title: string;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`p-1.5 rounded-md transition-all duration-150 ${
        active
          ? 'bg-accent-dim text-accent-text border border-accent-border'
          : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
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
function MarkdownBlock({ block }: { block: Block }) {
  if (block.kind === 'code') return <CodeBlock lang={block.lang} content={block.content} />;

  if (block.kind === 'h') {
    const sizes = ['text-lg', 'text-base', 'text-sm'];
    const size = sizes[block.level - 1] || 'text-sm';
    return (
      <div className={`font-bold ${size} mt-3 mb-1.5 text-text-primary`}>
        <InlineText text={block.text} />
      </div>
    );
  }

  if (block.kind === 'quote') {
    return (
      <blockquote className="border-l-2 pl-3 my-2 italic border-accent-border text-text-secondary">
        <InlineText text={block.text} />
      </blockquote>
    );
  }

  if (block.kind === 'list') {
    const ListTag = block.ordered ? 'ol' : 'ul';
    return (
      <ListTag className="my-1.5 space-y-1 pl-5 marker:text-text-muted">
        {block.items.map((item, idx) => (
          <li key={idx}>
            <InlineText text={item} />
          </li>
        ))}
      </ListTag>
    );
  }

  // Paragraph
  return (
    <p className="my-1.5 whitespace-pre-wrap">
      <InlineText text={block.text} />
    </p>
  );
}

// ─── Inline renderer: bold, italic, code, links ──────────────────────────────
function InlineText({ text }: { text: string }) {
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
            <strong key={i} className="font-semibold text-text-primary">
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
              className="font-mono text-[0.85em] px-1 py-px rounded bg-bg-elevated text-accent-text border border-border-subtle"
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
              className="underline underline-offset-2 text-accent hover:text-accent-text"
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
function CodeBlock({ lang, content }: { lang: string; content: string }) {
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
    <div className="my-3 rounded-lg overflow-hidden border border-border-default bg-bg-surface">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border-subtle bg-bg-elevated">
        <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-text-muted">
          {lang || 'code'}
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors text-text-muted hover:text-text-primary hover:bg-bg-hover"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-[12px] leading-relaxed text-text-primary">
        <code className="font-mono">{content}</code>
      </pre>
    </div>
  );
}

export default ConversationMessage;
