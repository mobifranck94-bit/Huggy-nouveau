// ─── Pipeline SSE API Client ─────────────────────────────────────────────────
// Connects to the Express backend and streams real-time agent progress events.

export type AgentMode = 'code' | 'discussion' | 'question';
export type TodoStatus = 'pending' | 'in_progress' | 'done';

export interface TodoStepPayload {
  id: string;
  label: string;
  status?: TodoStatus;
}

export interface ActionLogPayload {
  id: string;
  tool: string;
  action: string;
  why?: string;
  next?: string;
}

export interface PipelineEvent {
  type?:
    | 'connected' | 'agent' | 'thinking' | 'reply' | 'complete' | 'error'
    | 'files_partial' | 'meta' | 'tool'
    // Phase C — Transparent Agent events
    | 'mode_announce' | 'question' | 'todo_init' | 'todo_update' | 'action_log';
  agent?: string;
  status?: 'active' | 'completed';
  index?: number;
  total?: number;
  description?: string;
  thinkingLine?: string;
  replyChunk?: string;
  message?: string;
  files?: Array<{ path: string; content: string }>;
  reply?: string;
  meta?: {
    securityScore?: number;
    qaScore?: number;
    securityApproved?: boolean;
    qaApproved?: boolean;
    complexity?: string;
    projectName?: string;
    chatOnly?: boolean;
    capabilityPlan?: {
      needsBackend?: boolean;
      backendReason?: string;
      needsDatabase?: boolean;
      databaseTables?: string[];
      needsAuth?: boolean;
      needsStorage?: boolean;
      needsPayments?: boolean;
      needsEmail?: boolean;
      needsExternalApi?: boolean;
      externalApis?: Array<{ name?: string; requiresKey?: boolean; envVar?: string; reason?: string; secretPlacement?: 'server' | 'client' }>;
      envVars?: string[];
      needsWebSearch?: boolean;
      webSearchQueries?: string[];
      webResearchUsed?: boolean;
      supabaseArtifacts?: string[];
      setupChecklist?: string[];
    };
  };
  // Tool events emitted by the Builder Agent as it writes files in stream
  kind?: 'start' | 'progress' | 'complete';
  path?: string;
  lines?: number;
  // Phase C — Transparent Agent payloads
  mode?: AgentMode;
  reason?: string;
  question?: string;
  options?: string[];
  steps?: TodoStepPayload[];
  stepId?: string;
  todoStatus?: TodoStatus;
  tool?: string;
  action?: string;
  why?: string;
  next?: string;
  actionId?: string;
}

/**
 * Start the build pipeline via SSE streaming.
 * Calls `onEvent` for each server-sent event (agent progress, completion, error).
 * Returns a Promise that resolves when the stream ends.
 * Supports cancellation via AbortSignal.
 */
export interface ChatHistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamingOptions {
  signal?: AbortSignal;
  onConnecting?: () => void;
}

// Robust SSE parser that handles fragmented JSON across chunks
function parseSSEEvents(buffer: string, jsonBuffer: string): {
  events: PipelineEvent[];
  newBuffer: string;
  newJsonBuffer: string;
} {
  const events: PipelineEvent[] = [];
  const parts = buffer.split('\n\n');
  const newBuffer = parts.pop() || '';
  let newJsonBuffer = jsonBuffer;

  for (const part of parts) {
    let dataStr = '';
    for (const line of part.split('\n')) {
      if (line.startsWith('data: ')) {
        dataStr = line.slice(6);
        break;
      }
    }

    if (!dataStr) continue;

    // Try to parse with accumulated buffer
    let parsed: PipelineEvent | null = null;
    const parseAttempt = newJsonBuffer + dataStr;

    try {
      parsed = JSON.parse(parseAttempt);
      newJsonBuffer = '';
    } catch (e) {
      const trimmed = parseAttempt.trim();
      // Check if this looks like incomplete JSON (starts with { but doesn't end with })
      if (trimmed.startsWith('{') && !trimmed.endsWith('}')) {
        newJsonBuffer = parseAttempt;
        continue;
      }
      // Try just the current data
      try {
        parsed = JSON.parse(dataStr);
        newJsonBuffer = '';
      } catch {
        newJsonBuffer = '';
        continue;
      }
    }

    if (parsed) {
      events.push(parsed);
    }
  }

  return { events, newBuffer, newJsonBuffer };
}

export async function startBuildPipeline(
  prompt: string,
  onEvent: (event: PipelineEvent) => void,
  existingFiles?: Array<{ path: string; content: string }>,
  mode: 'build' | 'plan' = 'build',
  model: string = 'claude-sonnet-4-6',
  projectId?: string | null,
  history?: ChatHistoryEntry[],
  options?: StreamingOptions & { conversationSummary?: string },
): Promise<void> {
  const { signal, onConnecting, conversationSummary = '' } = options || {};
  const MAX_RETRIES = 2;

  const attemptFetch = async (attempt: number): Promise<Response> => {
    try {
      onConnecting?.();
      return await fetch('/api/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          files: existingFiles,
          mode,
          model,
          projectId,
          history: history || [],
          conversationSummary,
        }),
        signal,
      });
    } catch (err) {
      // Retry on network-level errors (not on abort or if max retries reached)
      const isAborted = signal?.aborted || (err as Error).name === 'AbortError';
      const isNetworkErr = err instanceof TypeError;
      if (!isAborted && isNetworkErr && attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        return attemptFetch(attempt + 1);
      }
      throw err;
    }
  };

  const response = await attemptFetch(0);

  let errorData;
  if (!response.ok) {
    const text = await response.text();
    try {
      errorData = JSON.parse(text);
    } catch {
      errorData = { error: `Server error (${response.status}): ${text.slice(0, 100)}` };
    }
    throw new Error(errorData.error || `Build request failed: ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let jsonBuffer = ''; // Accumulates fragmented JSON

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    // Check for cancellation
    if (signal?.aborted) {
      throw new Error('Stream cancelled');
    }

    buffer += decoder.decode(value, { stream: true });

    const { events, newBuffer, newJsonBuffer } = parseSSEEvents(buffer, jsonBuffer);
    buffer = newBuffer;
    jsonBuffer = newJsonBuffer;

    for (const event of events) {
      onEvent(event);
    }
  }

  // Process any remaining buffer
  if (buffer.trim()) {
    const { events } = parseSSEEvents(buffer + '\n\n', jsonBuffer);
    for (const event of events) {
      onEvent(event);
    }
  }
}

/**
 * Check if the pipeline server is reachable.
 */
export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Phase 6: Compress older messages into a single paragraph summary via LLM.
 * Returns the new summary or the existing one on failure (graceful degradation).
 */
export async function requestSummary(
  messages: ChatHistoryEntry[],
  existingSummary = '',
): Promise<{ summary: string; compressed: boolean }> {
  try {
    const res = await fetch('/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, existingSummary }),
    });
    if (!res.ok) return { summary: existingSummary, compressed: false };
    const data = await res.json();
    return {
      summary: typeof data.summary === 'string' ? data.summary : existingSummary,
      compressed: !!data.compressed,
    };
  } catch {
    return { summary: existingSummary, compressed: false };
  }
}
