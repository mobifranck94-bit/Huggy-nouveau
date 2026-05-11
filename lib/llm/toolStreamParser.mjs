/**
 * Incremental parser that watches a streaming LLM output and emits granular
 * `tool` events whenever the model starts / progresses / ends a `file:path`
 * block. This lets the frontend show per-file tool blocks (Claude-Code style)
 * without waiting for the full response.
 *
 * Usage:
 *   const parser = createToolStreamParser(toolEvent => {
 *     // toolEvent: { type, path, lines }
 *   });
 *   onChunk: chunk => { parser.push(chunk); }
 *   onComplete: () => parser.flush();
 *
 * Events emitted (passed to `onTool` as plain objects):
 *   { kind: 'start',    path }
 *   { kind: 'progress', path, lines }    // emitted every PROGRESS_STEP lines
 *   { kind: 'complete', path, lines }
 */

const FILE_FENCE_OPEN  = /```(?:[a-z]+\s+)?file:([^\n`]+)\n/;
const FILE_FENCE_CLOSE = /```/;
const PROGRESS_STEP    = 8;   // emit progress every 8 new lines

export function createToolStreamParser(onTool) {
  let buffer = '';
  let inFile = false;
  let currentPath = '';
  let currentContentStart = 0;  // index in `buffer` where the current file's content begins
  let lastReportedLines = 0;

  function emit(kind, extra = {}) {
    try {
      onTool?.({ kind, ...extra });
    } catch (err) {
      // never let a consumer error break the parser
      console.warn('[toolStreamParser] onTool consumer threw:', err.message);
    }
  }

  function countLines(s) {
    if (!s) return 0;
    let n = 0;
    for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) === 10) n++;
    return n + 1;
  }

  function tryAdvance() {
    while (true) {
      if (!inFile) {
        // Look for an opening fence in the buffer
        const m = buffer.match(FILE_FENCE_OPEN);
        if (!m) return;                       // no fence yet
        const path = (m[1] || '').trim();
        const openEnd = (m.index ?? 0) + m[0].length;
        if (!path) {
          // skip malformed fence
          buffer = buffer.slice(openEnd);
          continue;
        }
        inFile = true;
        currentPath = path;
        currentContentStart = openEnd;
        lastReportedLines = 0;
        emit('start', { path });
      } else {
        // Look for a closing fence after content
        const content = buffer.slice(currentContentStart);
        const closeIdx = content.search(FILE_FENCE_CLOSE);
        if (closeIdx === -1) {
          // No close yet. Maybe emit a progress tick.
          const lines = countLines(content);
          if (lines - lastReportedLines >= PROGRESS_STEP) {
            lastReportedLines = lines;
            emit('progress', { path: currentPath, lines });
          }
          return;
        }
        // Found closing fence
        const finalContent = content.slice(0, closeIdx);
        const lines = countLines(finalContent);
        emit('complete', { path: currentPath, lines });

        // Reset state and drop consumed bytes from the buffer
        buffer = content.slice(closeIdx + 3); // drop "```"
        inFile = false;
        currentPath = '';
        currentContentStart = 0;
        lastReportedLines = 0;
      }
    }
  }

  return {
    push(chunk) {
      if (!chunk) return;
      buffer += chunk;
      tryAdvance();
    },

    /** Call at the end of the stream; if a file is still open, emit a final complete. */
    flush() {
      if (inFile) {
        const content = buffer.slice(currentContentStart);
        const lines = countLines(content);
        emit('complete', { path: currentPath, lines });
        inFile = false;
      }
      buffer = '';
    },
  };
}

export default createToolStreamParser;
