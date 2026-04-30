// ─── Pipeline SSE API Client ─────────────────────────────────────────────────
// Connects to the Express backend and streams real-time agent progress events.

export interface PipelineEvent {
  type?: 'connected' | 'agent' | 'complete' | 'error';
  agent?: string;
  status?: 'active' | 'completed';
  index?: number;
  total?: number;
  description?: string;
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
  };
}

/**
 * Start the build pipeline via SSE streaming.
 * Calls `onEvent` for each server-sent event (agent progress, completion, error).
 * Returns a Promise that resolves when the stream ends.
 */
export async function startBuildPipeline(
  prompt: string,
  onEvent: (event: PipelineEvent) => void,
  existingFiles?: Array<{ path: string; content: string }>
): Promise<void> {
  const response = await fetch('/api/build', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, files: existingFiles }),
  });

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

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE messages are delimited by double newlines
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';

    for (const part of parts) {
      for (const line of part.split('\n')) {
        if (line.startsWith('data: ')) {
          try {
            const data: PipelineEvent = JSON.parse(line.slice(6));
            onEvent(data);
          } catch {
            // Ignore malformed JSON lines
          }
        }
      }
    }
  }

  // Process any remaining buffer
  if (buffer.trim()) {
    for (const line of buffer.split('\n')) {
      if (line.startsWith('data: ')) {
        try {
          const data: PipelineEvent = JSON.parse(line.slice(6));
          onEvent(data);
        } catch {
          // Ignore
        }
      }
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
