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

interface ClaudeCodeMessage {
  id: string;
  userPrompt: string;
  reply: string;
  replyVisible: string;
  isComplete: boolean;
  isStreaming: boolean;
  chatOnly?: boolean;
  toolEvents?: ToolEvent[];
  narration?: {
    question?: QuestionPayload;
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

export function ClaudeCodeStream({ message, isLatest, isConnecting, onAnswerQuestion }: ClaudeCodeStreamProps) {
  const tools = Array.isArray(message.toolEvents) ? message.toolEvents : [];
  const question = message.narration?.question;
  const replyText = stripCodeBlocks(message.replyVisible || '');
  const fullReplyText = stripCodeBlocks(message.reply || '');
  const isStillTyping = message.isStreaming && replyText.length < fullReplyText.length;
  const showThinking = isLatest && isConnecting && !message.isComplete && tools.length === 0 && !replyText;
  const isChatOnly = !!message.chatOnly;

  return (
    <div className="font-mono text-[13px] text-zinc-200 bg-black border border-zinc-900 rounded-md px-3 py-2 whitespace-pre-wrap leading-relaxed select-text">
      {/* User prompt echo */}
      {message.userPrompt && (
        <div className="text-zinc-500">
          <span className="text-zinc-600">&gt; </span>
          <span>{message.userPrompt}</span>
        </div>
      )}

      {/* Thinking spinner (only before any tool/reply arrived) */}
      {showThinking && (
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-zinc-100 animate-windsurf-cursor">●</span>
          <span className="text-zinc-400">Thinking...</span>
        </div>
      )}

      {/* Question (clarification) */}
      {question && !isChatOnly && (
        <div className="mt-2">
          <div className="text-amber-300">
            <span>? </span>
            <span>{question.question}</span>
          </div>
          {question.reason && (
            <div className="ml-3 text-zinc-500 text-[12px]">{question.reason}</div>
          )}
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

      {/* Tool calls (only when not chat-only) */}
      {!isChatOnly && tools.length > 0 && (
        <div className="mt-1">
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

      {/* Assistant reply text */}
      {(replyText || isStillTyping) && (
        <div className={`${tools.length > 0 || question ? 'mt-2' : 'mt-1'} text-zinc-200`}>
          <span>{replyText}</span>
          {isStillTyping && (
            <span className="windsurf-cursor animate-windsurf-cursor inline-block ml-0.5" />
          )}
        </div>
      )}

      {/* Completion footer (only for build runs with tools) */}
      {message.isComplete && !message.isStreaming && !isChatOnly && tools.length > 0 && (
        <div className="mt-2 text-zinc-600 text-[12px]">
          <span className="text-green-400">✓</span> Done
        </div>
      )}
    </div>
  );
}

export default ClaudeCodeStream;
