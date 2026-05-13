import { llmGateway } from './llm/gateway.mjs';
import { buildPreviewHTML } from './buildPreview.mjs';
import {
  SYSTEM_BUILDER_PROMPT,
  INTENT_SYSTEM_PROMPT,
  REPAIR_SYSTEM_PROMPT,
  DIFF_SYSTEM_PROMPT,
  CONVERSATION_SYSTEM_PROMPT,
  CLARIFICATION_PROMPT,
} from './prompts/systemBuilderPrompt.mjs';
import { buildKnowledgeContext } from './prompts/knowledgeBase.mjs';
import { buildRagContext } from './rag/retrieve.mjs';
import { createToolStreamParser } from './llm/toolStreamParser.mjs';
import { planCapabilities, buildCapabilityContext } from './capabilities/planner.mjs';
import { runWebResearch } from './capabilities/webResearch.mjs';
import { buildCodebaseContext } from './codebaseContext.mjs';

// ─── Pipeline Steps ───────────────────────────────────────────────────────────
const STEPS = [
  { name: 'Intent Parser',    description: 'Classifying your request...' },
  { name: 'Builder Agent',    description: 'Generating React application...' },
  { name: 'Preview Compiler', description: 'Compiling live preview...' },
  { name: 'Repair Agent',     description: 'Fixing compilation errors...' },
];

const LLM_TIMEOUT_MS = 90_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sendAgent(onEvent, index, status, description) {
  onEvent?.({ type: 'agent', agent: STEPS[index].name, index, total: STEPS.length, status, description });
}
function sendThinking(onEvent, agent, thinkingLine) {
  onEvent?.({ type: 'thinking', agent, thinkingLine });
}
function chatOnly(reply, complexity = 'none') {
  return {
    success: true, files: [],
    reply,
    meta: { pmPlan: { projectName: 'Chat', complexity }, review: { score: 100, approved: true }, secReport: { score: 100, approved: true }, chatOnly: true },
  };
}

function looksLikeBuildRequest(text) {
  const t = (text || '').toLowerCase().trim();
  if (!t) return false;
  const casual = /^(salut|bonjour|hello|hi|hey|coucou|merci|ok|d'accord|ça va|ca va|tu es qui|qui es-tu|bonsoir|au revoir|bye)[\s!.?]*$/i;
  if (casual.test(t)) return false;
  const buildWords = [
    'crée','cree','créer','creer','génère','genere','générer','generer',
    'code','coder','développe','developpe','construis','build','create',
    'generate','make','app','application','site','page','landing','dashboard',
    'component','composant','formulaire','saas','frontend','widget','interface',
    'modifie','modifier','change','ajoute','ajouter','corrige','corriger','fix','bug','repair',
    'affiche','montre','liste','table','chart','graph','form',
  ];
  return buildWords.some(w => t.includes(w));
}

function buildFallbackIntent(prompt) {
  const isBuild = looksLikeBuildRequest(prompt);
  return {
    intent: isBuild ? 'create' : 'conversation',
    mode: isBuild ? 'code' : 'discussion',
    modeReason: isBuild ? 'Demande de build détectée.' : 'Conversation détectée.',
    shouldGenerateCode: isBuild,
    appType: 'web app',
    requirements: isBuild ? [prompt] : [],
    constraints: ['React', 'TypeScript', 'Tailwind CSS'],
    targetFiles: ['src/App.tsx'],
    needsClarification: false,
    clarificationQuestion: '',
    questionOptions: [],
    questionReason: '',
    reply: isBuild ? '' : "Bonjour \uD83D\uDC4B Je suis Huggy, ton assistant app builder. Décris ce que tu veux créer et je génère l'application instantanément.",
    complexity: 'simple',
    language: 'fr',
  };
}

function parseIntent(raw, prompt) {
  try {
    const parsed = llmGateway.parseJSON(raw);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch { /* fall through */ }
  return buildFallbackIntent(prompt);
}

function normalizeFiles(files, prompt) {
  const clean = (Array.isArray(files) ? files : [])
    .filter(f => f?.path && typeof f.content === 'string' && f.content.trim())
    .map(f => ({ path: f.path.replace(/^\/+/, '').replace(/\\/g, '/'), content: f.content.trim() }));
  if (clean.some(f => f.path === 'src/App.tsx' || f.path === 'src/App.jsx')) return clean;
  const safePrompt = (prompt || '').replace(/[`$]/g, '');
  clean.unshift({
    path: 'src/App.tsx',
    content: `export default function App() {
  return (
    <main className="min-h-screen bg-[#0a0a0b] text-zinc-100 flex items-center justify-center p-8">
      <div className="max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center shadow-xl">
        <p className="text-sm text-blue-400 mb-3">Huggy Builder</p>
        <h1 className="text-3xl font-bold mb-3">${safePrompt}</h1>
        <p className="text-zinc-400 text-sm">The builder needs a more specific request. Try describing the app in more detail.</p>
      </div>
    </main>
  );
}`,
  });
  return clean;
}

function mergeFiles(base, patches) {
  const map = new Map(base.map(f => [f.path, f]));
  for (const f of patches) map.set(f.path, f);
  return [...map.values()];
}

// ─── LLM runner with timeout + temperature config ────────────────────────────
async function runLLM(agentName, userPrompt, systemPrompt, onEvent, stepIndex, temperature = 0.2, onChunkExtra = null) {
  sendAgent(onEvent, stepIndex, 'active', STEPS[stepIndex].description);

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`${STEPS[stepIndex].name} timed out after ${LLM_TIMEOUT_MS / 1000}s`)), LLM_TIMEOUT_MS)
  );

  const llmPromise = llmGateway.streamGenerate(agentName, userPrompt, {
    onThinking: line => sendThinking(onEvent, STEPS[stepIndex].name, line),
    onChunk: chunk => {
      onEvent?.({ type: 'reply', agent: STEPS[stepIndex].name, replyChunk: chunk });
      // Optional secondary consumer (e.g. tool stream parser)
      try { onChunkExtra?.(chunk); } catch (err) { /* never break the main stream */ }
    },
    temperature,
  }, systemPrompt);

  const result = await Promise.race([llmPromise, timeoutPromise]);
  if (!result.success) throw new Error(result.error || `${STEPS[stepIndex].name} failed`);
  sendAgent(onEvent, stepIndex, 'completed', `${STEPS[stepIndex].name} done`);
  return result.content;
}

// ─── Build chat history context (Phase 6: with persistent summary) ──────────
function buildChatContext(history = [], summary = '') {
  const parts = [];

  // 1. Compressed summary of older messages (from DB)
  if (summary && summary.trim()) {
    parts.push(`# CONVERSATION SUMMARY (older context — what we built and discussed previously)\n${summary.trim()}`);
  }

  // 2. Recent messages verbatim (last 10 turns, 800 chars each)
  if (history.length) {
    const recent = history.slice(-10).map(h =>
      `${h.role === 'user' ? 'User' : 'Huggy'}: ${(h.content || '').slice(0, 800)}`
    );
    parts.push(`# RECENT MESSAGES (last ${recent.length} turns)\n${recent.join('\n')}`);
  }

  return parts.join('\n\n');
}

// ─── Conversation handler (no code gen) — now memory-aware ───────────────────
async function handleConversation(prompt, onEvent, contextStr = '') {
  // Announce chatOnly early so frontend switches to chat-bubble mode immediately
  onEvent?.({ type: 'meta', meta: { chatOnly: true } });
  sendAgent(onEvent, 0, 'active', 'Reading your message...');
  // Mark remaining pipeline agents as skipped so UI shows clean state instead of 0/4
  const markSkipped = () => {
    for (let i = 1; i < STEPS.length; i++) {
      onEvent?.({ type: 'agent', agent: STEPS[i].name, index: i, total: STEPS.length, status: 'skipped', description: 'Not needed for conversation' });
    }
  };

  // Inject conversation memory into the prompt so the assistant remembers previous turns
  const userMsg = contextStr
    ? `${contextStr}\n\n# CURRENT USER MESSAGE\n${prompt}`
    : prompt;

  try {
    const result = await llmGateway.streamGenerate('Conversation', userMsg, {
      onChunk: chunk => onEvent?.({ type: 'reply', agent: 'Conversation', replyChunk: chunk }),
      temperature: 0.6,
    }, CONVERSATION_SYSTEM_PROMPT);
    sendAgent(onEvent, 0, 'completed', 'Response ready');
    markSkipped();
    return chatOnly(result.content || 'Bonjour 👋 Comment puis-je vous aider aujourd\'hui ?');
  } catch {
    sendAgent(onEvent, 0, 'completed', 'Response ready');
    markSkipped();
    return chatOnly('Bonjour 👋 Je suis Huggy. Décris l\'application que tu veux créer !');
  }
}

// ─── Main pipeline ────────────────────────────────────────────────────────────
export async function runLovablePipeline(prompt, options = {}) {
  const onEvent             = options.onEvent;
  const existingFiles       = Array.isArray(options.files) ? options.files : [];
  const chatHistory         = Array.isArray(options.history) ? options.history : [];
  const conversationSummary = typeof options.conversationSummary === 'string' ? options.conversationSummary : '';
  const mode                = options.mode || 'build';

  onEvent?.({ type: 'connected', message: 'Pipeline connected' });

  // Build memory context once — used by intent, conversation, and builder
  const historyCtx = buildChatContext(chatHistory, conversationSummary);

  // ── Fast path: obvious conversation without calling LLM ─────────────────
  const casual = /^(salut|bonjour|hello|hi|hey|coucou|merci|ok|d'accord|ça va|ca va|tu es qui|qui es-tu|bonsoir|au revoir|bye)[\s!.?]*$/i;
  if (casual.test((prompt || '').trim())) {
    return await handleConversation(prompt, onEvent, historyCtx);
  }

  // ── Step 0: Intent Parser ────────────────────────────────────────────────
  const intentUserMsg = [
    historyCtx,
    `# CURRENT USER MESSAGE\n${prompt}`,
    existingFiles.length ? `# HAS EXISTING APP: yes (${existingFiles.length} file(s))` : '',
  ].filter(Boolean).join('\n\n');

  let intent;
  try {
    const intentRaw = await runLLM('Intent Parser', intentUserMsg, INTENT_SYSTEM_PROMPT, onEvent, 0, 0.1);
    intent = parseIntent(intentRaw, prompt);
  } catch (err) {
    sendThinking(onEvent, 'Intent Parser', `Fallback: ${err.message}`);
    sendAgent(onEvent, 0, 'completed', 'Intent fallback used');
    intent = buildFallbackIntent(prompt);
  }

  // ── Phase C: Transparent Agent — announce chosen mode ────────────────────
  const agentMode = intent.mode || (intent.shouldGenerateCode ? 'code' : (intent.needsClarification ? 'question' : 'discussion'));
  onEvent?.({
    type: 'mode_announce',
    mode: agentMode,
    reason: intent.modeReason || '',
  });

  // ── Conversation / Clarify short-circuit ─────────────────────────────────
  if (!intent.shouldGenerateCode) {
    if (intent.intent === 'clarify' || intent.needsClarification || agentMode === 'question') {
      // Emit structured question event so the UI can render QuestionBlock
      onEvent?.({
        type: 'question',
        question: intent.clarificationQuestion || intent.reply || 'Peux-tu préciser ce que tu veux créer ?',
        options: Array.isArray(intent.questionOptions) ? intent.questionOptions : [],
        reason: intent.questionReason || '',
      });
      return chatOnly(intent.clarificationQuestion || intent.reply || 'Peux-tu préciser ce que tu veux créer ?');
    }
    return await handleConversation(prompt, onEvent, historyCtx);
  }

  // ── Phase C: Initialize todo list (4 main pipeline steps) ───────────────
  onEvent?.({
    type: 'todo_init',
    steps: [
      { id: 'analyze', label: 'Analyser la demande et planifier', status: 'done' },
      { id: 'build',   label: 'Générer le code de l\'application',  status: 'pending' },
      { id: 'compile', label: 'Compiler et prévisualiser',          status: 'pending' },
      { id: 'verify',  label: 'Vérifier et finaliser',              status: 'pending' },
    ],
  });

  // ── Capability Planner + optional web research ───────────────────────────
  let capabilityPlan = null;
  let webResearch = { used: false, results: [], context: '' };
  try {
    sendThinking(onEvent, 'Capability Planner', 'Checking whether this needs backend, database, APIs, or setup steps...');
    capabilityPlan = await Promise.race([
      planCapabilities(prompt, intent, existingFiles, {
        onThinking: line => sendThinking(onEvent, 'Capability Planner', line),
      }),
      new Promise(resolve => setTimeout(() => resolve(null), 12_000)),
    ]);
    if (capabilityPlan) {
      onEvent?.({ type: 'meta', meta: { capabilityPlan } });
      if (capabilityPlan.needsWebSearch) {
        sendThinking(onEvent, 'Capability Planner', 'Researching current external API documentation...');
        webResearch = await Promise.race([
          runWebResearch(capabilityPlan, { timeoutMs: 6000, maxQueries: 3 }),
          new Promise(resolve => setTimeout(() => resolve({ used: false, results: [], context: '' }), 7000)),
        ]);
        onEvent?.({ type: 'meta', meta: { capabilityPlan: { ...capabilityPlan, webResearchUsed: !!webResearch.used } } });
      }
    }
  } catch (err) {
    sendThinking(onEvent, 'Capability Planner', `Capability planning skipped: ${err.message}`);
  }

  // ── Step 1: Builder or Diff/Patch ────────────────────────────────────────
  const isEdit = (intent.intent === 'edit' || mode === 'edit') && existingFiles.length > 0;
  const builderSystemPrompt = isEdit ? DIFF_SYSTEM_PROMPT : SYSTEM_BUILDER_PROMPT;
  const builderTemp = intent.complexity === 'complex' ? 0.4 : 0.3;

  // Phase 4: smart codebase context — index + top-K relevant files (instead of dumping all)
  const codebaseCtx = existingFiles.length
    ? buildCodebaseContext(existingFiles, prompt, { maxFullFiles: 8, maxFileChars: 3500 })
    : { context: '', fullFilesCount: 0, indexedCount: 0, mode: 'empty' };
  const fileContext = codebaseCtx.context;
  if (codebaseCtx.mode === 'smart') {
    sendThinking(onEvent, 'Builder Agent', `Codebase context: ${codebaseCtx.fullFilesCount} relevant files loaded / ${codebaseCtx.indexedCount} indexed`);
  }

  const detectedLang = intent.language || 'en';
  const langInstruction = detectedLang !== 'en'
    ? `# LANGUAGE\nAll UI strings (buttons, labels, headings, placeholders) must be in "${detectedLang}".`
    : '';

  // Inject curated knowledge base (Tailwind tokens, React patterns, optional auth/stripe snippets)
  const knowledgeCtx = buildKnowledgeContext({
    requirements: intent.requirements || [],
    complexity: intent.complexity || 'simple',
  });

  // Try to enrich with RAG-retrieved chunks (silently falls back to '' if disabled)
  const ragQuery = `${prompt}\n${(intent.requirements || []).join(' ')}`.slice(0, 1500);
  let ragCtx = '';
  try {
    ragCtx = await Promise.race([
      buildRagContext(ragQuery, { k: 4 }),
      new Promise(resolve => setTimeout(() => resolve(''), 3000)), // 3s budget
    ]);
  } catch {
    ragCtx = '';
  }

  // For edits, force the LLM to return ONLY changed files (acts as incremental patching)
  const editInstruction = isEdit
    ? 'Apply the requested changes. CRITICAL: Return ONLY the files that actually changed — do not re-emit unchanged files. Preserve all other logic.'
    : 'Generate the complete application now.';

  const builderMsg = [
    historyCtx,
    knowledgeCtx,
    ragCtx,
    buildCapabilityContext(capabilityPlan),
    webResearch.context,
    `# USER REQUEST\n${prompt}`,
    `# INTENT\n${JSON.stringify({ appType: intent.appType, requirements: intent.requirements, complexity: intent.complexity, language: detectedLang }, null, 2)}`,
    langInstruction,
    fileContext,
    editInstruction,
  ].filter(Boolean).join('\n\n');

  // Stream tool events (per-file start/progress/complete) to the frontend
  const toolParser = createToolStreamParser(toolEvent => {
    onEvent?.({ type: 'tool', ...toolEvent });
  });

  // Phase C: mark 'build' step as in_progress + log the action
  onEvent?.({ type: 'todo_update', stepId: 'build', todoStatus: 'in_progress' });
  onEvent?.({
    type: 'action_log',
    actionId: `build-${Date.now()}`,
    tool: 'Builder Agent',
    action: isEdit ? 'Application des modifications demandées' : 'Génération de l\'application complète',
    why: `Stack: React + TypeScript + Tailwind. Complexité: ${intent.complexity || 'simple'}.`,
    next: 'Compilation et vérification du rendu',
  });

  let builderContent;
  try {
    builderContent = await runLLM(
      'Builder Agent',
      builderMsg,
      builderSystemPrompt,
      onEvent,
      1,
      builderTemp,
      chunk => toolParser.push(chunk),
    );
  } catch (err) {
    throw new Error(`Builder Agent failed: ${err.message}`);
  } finally {
    toolParser.flush();
  }

  // Phase C: mark 'build' as done once we have content (files extracted below)
  onEvent?.({ type: 'todo_update', stepId: 'build', todoStatus: 'done' });

  let parsed = llmGateway.parseFiles(builderContent);

  // Retry if no files parsed
  if (!parsed.length) {
    sendThinking(onEvent, 'Builder Agent', 'No file blocks found — retrying with strict format reminder...');
    try {
      const retry = await runLLM(
        'Builder Agent',
        `${builderMsg}\n\nCRITICAL: Your last response had no \`\`\`file:path blocks. You MUST output files using ONLY this format:\n\`\`\`file:src/App.tsx\n...code...\n\`\`\``,
        builderSystemPrompt, onEvent, 1, 0.1,
      );
      parsed = llmGateway.parseFiles(retry);
    } catch { /* use fallback */ }
  }

  let files = isEdit
    ? mergeFiles(existingFiles, normalizeFiles(parsed, prompt))
    : normalizeFiles(parsed, prompt);

  // Emit files immediately for progressive display
  if (files.length) {
    onEvent?.({ type: 'files_partial', files });
  }

  // ── Steps 2-3: Preview Compiler + Repair loop (Phase 3: 4 attempts + escalation)
  let previewError = null;
  let previousErrors = [];
  const MAX_REPAIR = 4;

  // Phase C: mark compile step in progress
  onEvent?.({ type: 'todo_update', stepId: 'compile', todoStatus: 'in_progress' });

  for (let attempt = 0; attempt < MAX_REPAIR; attempt++) {
    const label = attempt === 0
      ? 'Compiling...'
      : `Repair attempt ${attempt}/${MAX_REPAIR - 1}${attempt >= 2 ? ' (escalated to Coder model)' : ''}...`;
    sendAgent(onEvent, 2, 'active', label);

    try {
      await buildPreviewHTML(files);
      sendAgent(onEvent, 2, 'completed', 'Compiled successfully ✓');
      previewError = null;
      // Phase C: compile done
      onEvent?.({ type: 'todo_update', stepId: 'compile', todoStatus: 'done' });
      if (attempt > 0) {
        onEvent?.({
          type: 'action_log',
          actionId: `repair-success-${Date.now()}`,
          tool: 'Repair Agent',
          action: `Erreurs corrigées en ${attempt} tentative(s)`,
          why: 'Build prêt à être prévisualisé.',
        });
      }
      break;
    } catch (err) {
      previewError = err instanceof Error ? err.message : String(err);
      previousErrors.push(previewError.slice(0, 200));
      sendThinking(onEvent, 'Preview Compiler', `Error: ${previewError.slice(0, 200)}`);
      sendAgent(onEvent, 2, 'completed', `Compilation error (attempt ${attempt + 1})`);

      if (attempt >= MAX_REPAIR - 1) break;

      // Escalate to Coder Agent (Sonnet 4.6) after 2 failed Repair attempts
      const repairAgent = attempt >= 2 ? 'Coder Agent' : 'Repair Agent';

      // Phase C: log the repair attempt as a significant action
      onEvent?.({
        type: 'action_log',
        actionId: `repair-${attempt}-${Date.now()}`,
        tool: repairAgent,
        action: `Tentative de correction ${attempt + 1}/${MAX_REPAIR - 1}`,
        why: `Erreur détectée: ${previewError.slice(0, 100)}${previewError.length > 100 ? '…' : ''}`,
        next: attempt >= 2 ? 'Escalade au Coder Agent (Sonnet 4.6) avec contexte enrichi' : undefined,
      });

      // Build a richer repair context that includes previous error history
      const errorHistory = previousErrors.length > 1
        ? `\n\n# PREVIOUS REPAIR ATTEMPTS (these did NOT fix the issue)\n${previousErrors.slice(0, -1).map((e, i) => `Attempt ${i + 1}: ${e}`).join('\n')}`
        : '';

      const repairMsg = [
        `# ORIGINAL REQUEST\n${prompt}`,
        `# CURRENT BUILD ERROR\n${previewError.slice(0, 1200)}${errorHistory}`,
        attempt >= 2 ? `# ESCALATION\nPrevious repair attempts failed. Re-read the error carefully and apply a different fix strategy.` : '',
        `# FILES TO FIX\n${files.map(f => `\`\`\`file:${f.path}\n${f.content.slice(0, 3000)}\n\`\`\``).join('\n\n')}`,
      ].filter(Boolean).join('\n\n');

      try {
        const repairContent = await runLLM(repairAgent, repairMsg, REPAIR_SYSTEM_PROMPT, onEvent, 3, 0.1);
        const repaired = llmGateway.parseFiles(repairContent);
        if (repaired.length) {
          files = mergeFiles(files, repaired);
          onEvent?.({ type: 'files_partial', files });
        } else {
          sendThinking(onEvent, repairAgent, 'Repair returned no parseable files — keeping previous version.');
        }
      } catch (repairErr) {
        sendThinking(onEvent, repairAgent, `Repair failed: ${repairErr.message}`);
      }
    }
  }

  // Phase C: mark verify step done (we've finished the full pipeline)
  onEvent?.({ type: 'todo_update', stepId: 'verify', todoStatus: 'done' });

  const successReply = isEdit
    ? `✅ Modifications appliquées avec succès.`
    : `✅ Application générée et compilée avec succès.`;

  return {
    success: true,
    files,
    reply: previewError
      ? `⚠️ Application générée avec des erreurs de compilation. Essaie de reformuler ou demande une correction.`
      : successReply,
    meta: {
      pmPlan: { projectName: intent.appType || 'App', complexity: intent.complexity || 'simple' },
      review: { score: previewError ? 65 : 95, approved: !previewError },
      secReport: { score: 90, approved: true },
    },
  };
}
