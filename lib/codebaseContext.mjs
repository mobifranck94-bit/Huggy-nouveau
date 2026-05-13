// ─── Codebase Context — smart file selection for large projects ──────────────
// Phase 4: When a project has many files, we can't send them all to the LLM.
// Instead we:
//   1) Build a compact INDEX (path tree + exported symbols) → always sent (~500 tokens)
//   2) Rank files by relevance to the current prompt using cheap keyword scoring
//   3) Send the top-K most relevant files in full, plus the index of the rest
//
// This is a lightweight alternative to vector embeddings — no external API needed,
// instant, and works offline. For larger codebases we can later upgrade to
// embeddings via OpenRouter (e.g., voyage/voyage-3 or openai/text-embedding-3-small).

const MAX_FULL_FILES_DEFAULT = 8;
const MAX_FILE_CHARS_DEFAULT = 4000;
const SMALL_PROJECT_THRESHOLD = 5; // below this, just send everything

/**
 * Build a 1-line summary of a file: path + top-level exports + line count.
 */
function summarizeFile(file) {
  const content = file.content || '';
  const lines = content.split('\n').length;

  // Extract top-level exports (functions, classes, types, default)
  const exports = [];
  const exportPatterns = [
    /^export\s+default\s+(?:function|class|const|async function)?\s*(\w+)?/m,
    /^export\s+(?:async\s+)?function\s+(\w+)/gm,
    /^export\s+(?:const|let|var)\s+(\w+)/gm,
    /^export\s+(?:type|interface|enum|class)\s+(\w+)/gm,
  ];

  for (const pattern of exportPatterns) {
    if (pattern.global) {
      let m;
      while ((m = pattern.exec(content)) !== null) {
        if (m[1]) exports.push(m[1]);
      }
    } else {
      const m = content.match(pattern);
      if (m && m[1]) exports.push(m[1]);
      else if (m) exports.push('default');
    }
  }

  const exportStr = exports.length ? ` exports: ${[...new Set(exports)].slice(0, 6).join(', ')}` : '';
  return `${file.path} (${lines}L)${exportStr}`;
}

/**
 * Score how relevant a file is to a user prompt using lightweight keyword overlap.
 * Returns a score >= 0; higher = more relevant.
 */
function scoreFile(file, queryTokens) {
  const path = (file.path || '').toLowerCase();
  const content = (file.content || '').toLowerCase().slice(0, 8000); // sample only

  let score = 0;
  for (const token of queryTokens) {
    if (!token || token.length < 3) continue;

    // Path matches weigh more (e.g., user asks "fix header" → src/Header.tsx wins)
    if (path.includes(token)) score += 5;

    // Count occurrences in content (capped at 10 per token to avoid spam)
    let count = 0;
    let idx = 0;
    while ((idx = content.indexOf(token, idx)) !== -1 && count < 10) {
      count++;
      idx += token.length;
    }
    score += count;
  }

  // Always-relevant files get a boost so they're not displaced
  if (/src\/app\.tsx$/i.test(path)) score += 3;
  if (/src\/main\.tsx?$/i.test(path)) score += 2;
  if (/index\.html?$/i.test(path)) score += 1;

  return score;
}

/**
 * Tokenize a prompt into meaningful search terms (lowercase, alphanumeric, >2 chars).
 */
function tokenizePrompt(prompt) {
  return (prompt || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 3 && !STOPWORDS.has(t));
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'this', 'that', 'from', 'into', 'have', 'has',
  'are', 'was', 'were', 'will', 'can', 'should', 'would', 'could', 'use', 'using',
  'add', 'new', 'fix', 'change', 'make', 'create', 'build', 'app', 'application',
  'page', 'component', 'function', 'file', 'code', 'please',
  // French equivalents
  'avec', 'pour', 'dans', 'sur', 'les', 'des', 'une', 'que', 'qui', 'mais',
  'cette', 'ces', 'tout', 'tous', 'doit', 'peut', 'faire', 'créer', 'ajouter',
  'modifier', 'changer', 'utiliser', 'fichier', 'composant', 'application',
]);

/**
 * Build a smart codebase context block.
 *
 * @param {Array<{path: string, content: string}>} files
 * @param {string} prompt
 * @param {{maxFullFiles?: number, maxFileChars?: number}} [options]
 * @returns {{context: string, fullFilesCount: number, indexedCount: number, mode: string}}
 */
export function buildCodebaseContext(files, prompt, options = {}) {
  if (!Array.isArray(files) || files.length === 0) {
    return { context: '', fullFilesCount: 0, indexedCount: 0, mode: 'empty' };
  }

  // Small projects: just send everything as before (no need to be clever)
  if (files.length <= SMALL_PROJECT_THRESHOLD) {
    const block = files
      .map(f => `\`\`\`file:${f.path}\n${(f.content || '').slice(0, 6000)}\n\`\`\``)
      .join('\n\n');
    return {
      context: `# EXISTING FILES (${files.length})\n${block}`,
      fullFilesCount: files.length,
      indexedCount: 0,
      mode: 'small',
    };
  }

  const maxFullFiles = options.maxFullFiles ?? MAX_FULL_FILES_DEFAULT;
  const maxFileChars = options.maxFileChars ?? MAX_FILE_CHARS_DEFAULT;

  const tokens = tokenizePrompt(prompt);

  // Score and rank
  const scored = files
    .map(f => ({ file: f, score: scoreFile(f, tokens) }))
    .sort((a, b) => b.score - a.score);

  const topFiles = scored.slice(0, maxFullFiles).map(s => s.file);
  const otherFiles = scored.slice(maxFullFiles).map(s => s.file);

  // 1) Index (always sent — lightweight overview of the WHOLE codebase)
  const index = files
    .map(f => `- ${summarizeFile(f)}`)
    .join('\n');

  // 2) Full content of top-K most relevant
  const fullBlock = topFiles
    .map(f => `\`\`\`file:${f.path}\n${(f.content || '').slice(0, maxFileChars)}\n\`\`\``)
    .join('\n\n');

  // 3) Mention of unloaded files (so LLM knows they exist if it needs to reference them)
  const unloadedNote = otherFiles.length
    ? `\n\n# UNLOADED FILES (${otherFiles.length} more files exist — listed in INDEX above. Ask if you need to see their content)\n${otherFiles.map(f => `- ${f.path}`).join('\n')}`
    : '';

  return {
    context: `# CODEBASE INDEX (${files.length} files total)\n${index}\n\n# RELEVANT FILES (top ${topFiles.length} by relevance to your request)\n${fullBlock}${unloadedNote}`,
    fullFilesCount: topFiles.length,
    indexedCount: files.length,
    mode: 'smart',
  };
}
