import type { ToolKind, ToolStatus } from '../lib/api';

interface ToolEvent {
  id: string;
  kind: ToolKind;
  path: string;
  label?: string;
  detail?: string;
  lines?: number;
  status: ToolStatus;
  agentName?: string;
  timestamp: number;
}

interface QuestionPayload {
  question: string;
  options?: string[];
  reason?: string;
}

interface TodoStep {
  id: string;
  label: string;
  status?: 'pending' | 'in_progress' | 'done';
}

interface ActionEntry {
  id: string;
  tool: string;
  action: string;
  why?: string;
  next?: string;
}

interface FileLike {
  path: string;
  content: string;
}

interface ClaudeCodeMessage {
  id: string;
  userPrompt: string;
  reply: string;
  replyVisible: string;
  isComplete: boolean;
  isStreaming: boolean;
  chatOnly?: boolean;
  error?: string;
  cancelled?: boolean;
  startedAt?: number;
  completedAt?: number;
  thinkingLines?: string[];
  toolEvents?: ToolEvent[];
  files?: FileLike[];
  narration?: {
    question?: QuestionPayload;
    todos?: TodoStep[];
    actions?: ActionEntry[];
  };
}

interface ClaudeCodeStreamProps {
  message: ClaudeCodeMessage;
  isLatest: boolean;
  isConnecting: boolean;
  onAnswerQuestion?: (answer: string) => void;
}

const VERB_BY_KIND: Record<string, string> = {
  read: 'Read',
  write: 'Write',
  edit: 'Edit',
  create: 'Create',
  delete: 'Delete',
  search: 'Search',
  index: 'Index',
  analyze: 'Analyze',
  bundle: 'Bundle',
  install: 'Bash',
  test: 'Test',
  lint: 'Lint',
  format: 'Format',
  deploy: 'Deploy',
  touch: 'Touch',
  explore: 'Explore',
  query: 'Ask',
  web_search: 'WebSearch',
  api_call: 'ApiCall',
  scan: 'Scan',
  fix: 'Fix',
  design: 'Design',
  model: 'Model',
  error: 'Error',
};

// Heartbeat / noise lines from the LLM gateway we don't want to show in the terminal flow.
const NOISE_PATTERNS = [
  /^⏳\s/,                  // heartbeat lines ("⏳ Builder Agent en cours…")
  /^🤖\s.*starting/i,       // generic "starting" lines
  /^⚠️\s.*Retry attempt/i,  // retry chatter
  /heartbeat #\d+/i,
];

function isNoiseLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  return NOISE_PATTERNS.some((re) => re.test(trimmed));
}

function stripAgentPrefix(line: string): string {
  // Lines come in as "[Builder Agent] actual text" — drop the bracketed prefix.
  return line.replace(/^\[[^\]]+\]\s*/, '').trim();
}

function stripCodeBlocks(text: string): string {
  if (!text) return '';
  let out = text;
  const trimmed = out.trimStart();
  if (trimmed.startsWith('{')) {
    let depth = 0;
    let endIdx = -1;
    for (let i = 0; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) { endIdx = i; break; } }
    }
    if (endIdx > 0) out = trimmed.slice(endIdx + 1).trimStart();
  }
  out = out.replace(/```[\s\S]*?```/g, '');
  out = out.replace(/```[\s\S]*$/g, '');
  out = out.replace(/^\s*file:\S+\s*$/gim, '');
  out = out.replace(/\*\*([^*]+)\*\*/g, '$1');
  out = out.replace(/\*([^*]+)\*/g, '$1');
  out = out.replace(/__([^_]+)__/g, '$1');
  out = out.replace(/_([^_]+)_/g, '$1');
  out = out.replace(/`([^`]+)`/g, '$1');
  out = out.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  out = out.replace(/^#{1,6}\s+/gm, '');
  out = out.replace(/\n{3,}/g, '\n\n').trim();
  return out;
}

function dotClass(status: ToolStatus): string {
  if (status === 'completed') return 'text-green-400';
  if (status === 'error') return 'text-red-400';
  return 'text-zinc-100 animate-windsurf-cursor';
}

function detailFor(t: ToolEvent): string | null {
  if (t.detail) return t.detail;
  if (typeof t.lines === 'number') return `${t.lines} ${t.lines > 1 ? 'lines' : 'line'}`;
  return null;
}

function todoGlyph(status?: TodoStep['status']): { char: string; cls: string } {
  if (status === 'done') return { char: '☑', cls: 'text-green-400' };
  if (status === 'in_progress') return { char: '◐', cls: 'text-zinc-100 animate-windsurf-cursor' };
  return { char: '☐', cls: 'text-zinc-600' };
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const totalSec = ms / 1000;
  if (totalSec < 60) return `${totalSec.toFixed(1)}s`;
  const min = Math.floor(totalSec / 60);
  const sec = Math.round(totalSec - min * 60);
  return `${min}m ${sec}s`;
}

function countLines(files?: FileLike[]): number {
  if (!Array.isArray(files) || files.length === 0) return 0;
  return files.reduce((acc, f) => acc + ((f.content?.match(/\n/g)?.length || 0) + 1), 0);
}

export function ClaudeCodeStream({ message, isLatest, isConnecting, onAnswerQuestion }: ClaudeCodeStreamProps) {
  const tools = Array.isArray(message.toolEvents) ? message.toolEvents : [];
  const todos = message.narration?.todos || [];
  const actions = message.narration?.actions || [];
  const question = message.narration?.question;

  // Filter thinking lines to remove noise (heartbeats, starting banners, retry chatter)
  const rawThinking = Array.isArray(message.thinkingLines) ? message.thinkingLines : [];
  const thinking = rawThinking
    .map(stripAgentPrefix)
    .filter((l) => !isNoiseLine(l))
    .slice(-6); // keep the last 6 reasoning lines visible

  const replyText = stripCodeBlocks(message.replyVisible || '');
  const fullReplyText = stripCodeBlocks(message.reply || '');
  const isStillTyping = message.isStreaming && replyText.length < fullReplyText.length;
  const isChatOnly = !!message.chatOnly;
  const hasError = !!message.error;
  const isCancelled = !!message.cancelled;

  const showThinkingSpinner =
    isLatest && isConnecting && !message.isComplete && tools.length === 0 && todos.length === 0 && !replyText && thinking.length === 0;

  const fileCount = Array.isArray(message.files) ? message.files.length : 0;
  const lineCount = countLines(message.files);
  const elapsed =
    message.completedAt && message.startedAt ? formatDuration(message.completedAt - message.startedAt) : '';

  const showSummary =
    message.isComplete && !message.isStreaming && !hasError && !isCancelled && !isChatOnly && fileCount > 0;

  return (
    <div className="font-mono text-[13px] text-zinc-200 bg-black border border-zinc-900 rounded-md px-3 py-2 whitespace-pre-wrap leading-relaxed select-text">
      {/* User prompt echo */}
      {message.userPrompt && (
        <div className="text-zinc-500">
          <span className="text-zinc-600">&gt; </span>
          <span>{message.userPrompt}</span>
        </div>
      )}

      {/* Thinking spinner — only before anything else has arrived */}
      {showThinkingSpinner && (
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-zinc-100 animate-windsurf-cursor">●</span>
          <span className="text-zinc-400">Thinking...</span>
        </div>
      )}

      {/* TodoWrite-style checklist */}
      {!isChatOnly && todos.length > 0 && (
        <div className="mt-2">
          {todos.map((t) => {
            const g = todoGlyph(t.status);
            return (
              <div key={`${message.id}-todo-${t.id}`} className="flex items-baseline gap-2">
                <span className={g.cls}>{g.char}</span>
                <span className={t.status === 'done' ? 'text-zinc-500 line-through' : 'text-zinc-300'}>{t.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Reasoning lines (dim italic) */}
      {!isChatOnly && thinking.length > 0 && (
        <div className="mt-2">
          {thinking.map((line, i) => (
            <div key={`${message.id}-think-${i}`} className="flex items-baseline gap-2 italic text-zinc-500">
              <span className="text-zinc-700">·</span>
              <span className="truncate">{line}</span>
            </div>
          ))}
        </div>
      )}

      {/* Question (clarification) */}
      {question && !isChatOnly && (
        <div className="mt-2">
          <div className="text-amber-300">
            <span>? </span>
            <span>{question.question}</span>
          </div>
          {question.reason && <div className="ml-3 text-zinc-500 text-[12px]">{question.reason}</div>}
          {Array.isArray(question.options) && question.options.length > 0 && (
            <div className="mt-1 flex flex-col gap-0.5">
              {question.options.map((opt, i) => (
                <button
                  key={`${message.id}-q-${i}`}
                  type="button"
                  onClick={() => onAnswerQuestion?.(opt)}
                  className="text-left text-zinc-300 hover:text-green-400 focus:text-green-400 focus:outline-none cursor-pointer"
                >
                  <span className="text-zinc-600">  {i + 1}) </span>
                  <span>{opt}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tool calls */}
      {!isChatOnly && tools.length > 0 && (
        <div className="mt-2">
          {tools.map((t) => {
            const verb = VERB_BY_KIND[t.kind] || t.kind;
            const label = t.label || t.path || '';
            const detail = detailFor(t);
            return (
              <div key={`${message.id}-${t.id}`} className="leading-snug">
                <div className="flex items-baseline gap-2">
                  <span className={dotClass(t.status)}>●</span>
                  <span className="text-zinc-100">{verb}</span>
                  {label && <span className="text-zinc-400">{label}</span>}
                  {detail && <span className="text-zinc-500">({detail})</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compact action log */}
      {!isChatOnly && actions.length > 0 && (
        <div className="mt-2">
          {actions.slice(-4).map((a) => (
            <div key={`${message.id}-act-${a.id}`} className="flex items-baseline gap-2 text-zinc-400">
              <span className="text-zinc-600">→</span>
              <span>
                <span className="text-zinc-300">{a.action}</span>
                {a.why && <span className="text-zinc-600"> · {a.why}</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Assistant reply text */}
      {(replyText || isStillTyping) && (
        <div className={`${tools.length > 0 || todos.length > 0 || question || thinking.length > 0 ? 'mt-2' : 'mt-1'} text-zinc-200`}>
          <span>{replyText}</span>
          {isStillTyping && <span className="windsurf-cursor animate-windsurf-cursor inline-block ml-0.5" />}
        </div>
      )}

      {/* Error line */}
      {hasError && (
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-red-400">✗</span>
          <span className="text-red-400">Error:</span>
          <span className="text-zinc-300">{message.error}</span>
        </div>
      )}

      {/* Cancellation line */}
      {isCancelled && !hasError && (
        <div className="mt-2 flex items-baseline gap-2 text-zinc-500">
          <span>■</span>
          <span>Stopped by user{elapsed ? ` · ${elapsed}` : ''}</span>
        </div>
      )}

      {/* Completion summary */}
      {showSummary && (
        <div className="mt-2 flex items-baseline gap-2 text-zinc-500">
          <span className="text-green-400">✓</span>
          <span className="text-zinc-300">Done</span>
          <span className="text-zinc-600">·</span>
          <span>{fileCount} {fileCount > 1 ? 'files' : 'file'}</span>
          {lineCount > 0 && (
            <>
              <span className="text-zinc-600">·</span>
              <span>{lineCount} {lineCount > 1 ? 'lines' : 'line'}</span>
            </>
          )}
          {elapsed && (
            <>
              <span className="text-zinc-600">·</span>
              <span>{elapsed}</span>
            </>
          )}
        </div>
      )}

      {/* Minimal "✓ Done" for chat-only successful completion */}
      {message.isComplete && !message.isStreaming && !hasError && !isCancelled && !showSummary && tools.length > 0 && (
        <div className="mt-2 flex items-baseline gap-2 text-zinc-500">
          <span className="text-green-400">✓</span>
          <span>Done{elapsed ? ` · ${elapsed}` : ''}</span>
        </div>
      )}
    </div>
  );
}

export default ClaudeCodeStream;
