// ─── Streaming Hook ─────────────────────────────────────────────────────────
// Production-grade streaming with:
// - AbortController for cancellation
// - Throttled state updates (16ms ~ 60fps)
// - Robust SSE parsing with JSON recovery
// - Retry logic with exponential backoff
// - Optimistic UI states

import { useCallback, useRef, useEffect, useState } from 'react';
import type { PipelineEvent, ChatHistoryEntry } from '../lib/api';

interface StreamingState {
  isConnecting: boolean;
  isStreaming: boolean;
  error: string | null;
}

interface UseStreamingOptions {
  onEvent: (event: PipelineEvent) => void;
  onError?: (error: string) => void;
  onComplete?: () => void;
  maxRetries?: number;
  retryDelay?: number;
}

// Throttle utility - limits function execution to once per wait period
function throttle<T extends (...args: any[]) => void>(fn: T, wait: number): T {
  let lastTime = 0;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const throttled = (...args: Parameters<T>) => {
    const now = Date.now();
    lastArgs = args;

    if (now - lastTime >= wait) {
      lastTime = now;
      fn(...args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        lastTime = Date.now();
        timeout = null;
        if (lastArgs) fn(...lastArgs);
      }, wait - (now - lastTime));
    }
  };

  return throttled as T;
}

// Robust SSE parser that handles fragmented JSON
function parseSSEChunk(chunk: string): { events: PipelineEvent[]; remainder: string } {
  const events: PipelineEvent[] = [];
  const lines = chunk.split('\n');
  let currentData: string | null = null;
  let remainder = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this is the last line and might be incomplete
    if (i === lines.length - 1 && !chunk.endsWith('\n')) {
      remainder = line;
      break;
    }

    if (line.startsWith('data: ')) {
      currentData = line.slice(6);
    } else if (line === '' && currentData !== null) {
      // End of event - try to parse
      try {
        const parsed = JSON.parse(currentData);
        events.push(parsed);
      } catch (e) {
        // Try to recover from partial JSON by accumulating
        // This is handled by the caller via remainder
      }
      currentData = null;
    }
  }

  // If we were in the middle of a data line, save it as remainder
  if (currentData !== null && !remainder) {
    remainder = 'data: ' + currentData;
  }

  return { events, remainder };
}

export function useStreaming(options: UseStreamingOptions) {
  const { onEvent, onError, onComplete, maxRetries = 3, retryDelay = 1000 } = options;

  const [state, setState] = useState<StreamingState>({
    isConnecting: false,
    isStreaming: false,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const eventBufferRef = useRef<PipelineEvent[]>([]);

  // Throttled event handler - batches rapid updates to ~60fps
  const throttledOnEvent = useCallback(
    throttle((events: PipelineEvent[]) => {
      events.forEach(event => onEvent(event));
      eventBufferRef.current = [];
    }, 16),
    [onEvent]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(prev => ({ ...prev, isStreaming: false, isConnecting: false }));
  }, []);

  const startStream = useCallback(async (
    prompt: string,
    existingFiles?: Array<{ path: string; content: string }>,
    mode: 'build' | 'plan' = 'build',
    model: string = 'claude-sonnet-4-6',
    projectId?: string | null,
    history?: ChatHistoryEntry[]
  ): Promise<void> => {
    // Cancel any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState({ isConnecting: true, isStreaming: false, error: null });
    retryCountRef.current = 0;

    const attemptStream = async (): Promise<void> => {
      try {
        const response = await fetch('/api/build', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, files: existingFiles, mode, model, projectId, history: history || [] }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const text = await response.text();
          let errorData;
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
        let jsonBuffer = ''; // For recovering fragmented JSON

        setState({ isConnecting: false, isStreaming: true, error: null });
        retryCountRef.current = 0; // Reset retry count on successful connection

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Check if aborted
          if (controller.signal.aborted) {
            throw new Error('Stream cancelled');
          }

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE messages
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';

          for (const part of parts) {
            // Handle fragmented JSON accumulation
            let dataStr = '';
            for (const line of part.split('\n')) {
              if (line.startsWith('data: ')) {
                dataStr = line.slice(6);
                break; // Only process first data line per event
              }
            }

            if (dataStr) {
              // Try to parse, accumulate if fragmented
              let parsed: PipelineEvent | null = null;
              let parseAttempt = jsonBuffer + dataStr;

              try {
                parsed = JSON.parse(parseAttempt);
                jsonBuffer = ''; // Clear buffer on success
              } catch (e) {
                // Check if this looks like a complete JSON object
                const trimmed = parseAttempt.trim();
                if (trimmed.startsWith('{') && !trimmed.endsWith('}')) {
                  // Likely fragmented, accumulate
                  jsonBuffer = parseAttempt;
                  continue;
                }
                // Otherwise, try just the current data
                try {
                  parsed = JSON.parse(dataStr);
                  jsonBuffer = '';
                } catch {
                  // Truly malformed, skip
                  jsonBuffer = '';
                  continue;
                }
              }

              if (parsed) {
                eventBufferRef.current.push(parsed);
                throttledOnEvent([...eventBufferRef.current]);
              }
            }
          }
        }

        // Process remaining buffer
        if (buffer.trim()) {
          for (const line of buffer.split('\n')) {
            if (line.startsWith('data: ')) {
              try {
                const data: PipelineEvent = JSON.parse(line.slice(6));
                onEvent(data);
              } catch {
                // Ignore malformed final lines
              }
            }
          }
        }

        // Flush any remaining buffered events
        if (eventBufferRef.current.length > 0) {
          eventBufferRef.current.forEach(event => onEvent(event));
          eventBufferRef.current = [];
        }

        setState(prev => ({ ...prev, isStreaming: false }));
        onComplete?.();

      } catch (error) {
        // Don't retry if aborted intentionally
        if (controller.signal.aborted || (error as Error).message === 'Stream cancelled') {
          setState(prev => ({ ...prev, isStreaming: false, isConnecting: false }));
          return;
        }

        // Retry logic for network errors
        const isNetworkError =
          error instanceof TypeError ||
          (error as Error).message?.includes('network') ||
          (error as Error).message?.includes('fetch');

        if (isNetworkError && retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          const delay = retryDelay * Math.pow(2, retryCountRef.current - 1); // Exponential backoff

          setState(prev => ({
            ...prev,
            error: `Connection lost. Retrying ${retryCountRef.current}/${maxRetries}...`,
          }));

          await new Promise(resolve => setTimeout(resolve, delay));
          return attemptStream();
        }

        // Max retries reached or non-retryable error
        const errorMsg = error instanceof Error ? error.message : String(error);
        setState({ isConnecting: false, isStreaming: false, error: errorMsg });
        onError?.(errorMsg);
      }
    };

    return attemptStream();
  }, [onEvent, onError, onComplete, maxRetries, retryDelay, throttledOnEvent]);

  return {
    startStream,
    cancel,
    isConnecting: state.isConnecting,
    isStreaming: state.isStreaming,
    error: state.error,
  };
}

export default useStreaming;
