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
    shouldGenerateCode: isBuild,
    appType: 'web app',
    requirements: isBuild ? [prompt] : [],
    constraints: ['React', 'TypeScript', 'Tailwind CSS'],
    targetFiles: ['src/App.tsx'],
    needsClarification: false,
    clarificationQuestion: '',
    reply: isBuild ? '' : "Bonjour \uD83D\uDC4B Je suis Huggy, ton assistant app builder. Décris ce que tu veux créer et je génère l'application instantanément.",
    complexity: 'simple',
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
async function runLLM(agentName, userPrompt, systemPrompt, onEvent, stepIndex, temperature = 0.2) {
  sendAgent(onEvent, stepIndex, 'active', STEPS[stepIndex].description);

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`${STEPS[stepIndex].name} timed out after ${LLM_TIMEOUT_MS / 1000}s`)), LLM_TIMEOUT_MS)
  );

  const llmPromise = llmGateway.streamGenerate(agentName, userPrompt, {
    onThinking: line => sendThinking(onEvent, STEPS[stepIndex].name, line),
    onChunk:    chunk => onEvent?.({ type: 'reply', agent: STEPS[stepIndex].name, replyChunk: chunk }),
    temperature,
  }, systemPrompt);

  const result = await Promise.race([llmPromise, timeoutPromise]);
  if (!result.success) throw new Error(result.error || `${STEPS[stepIndex].name} failed`);
  sendAgent(onEvent, stepIndex, 'completed', `${STEPS[stepIndex].name} done`);
  return result.content;
}

// ─── Build chat history context ───────────────────────────────────────────────
function buildChatContext(history = []) {
  if (!history.length) return '';
  const lines = history.slice(-6).map(h => `${h.role === 'user' ? 'User' : 'Huggy'}: ${(h.content || '').slice(0, 400)}`);
  return `# CONVERSATION HISTORY (last ${lines.length} turns)\n${lines.join('\n')}`;
}

// ─── Conversation handler (no code gen) ──────────────────────────────────────
async function handleConversation(prompt, onEvent) {
  // Announce chatOnly early so frontend switches to chat-bubble mode immediately
  onEvent?.({ type: 'meta', meta: { chatOnly: true } });
  sendAgent(onEvent, 0, 'active', 'Reading your message...');
  // Mark remaining pipeline agents as skipped so UI shows clean state instead of 0/4
  const markSkipped = () => {
    for (let i = 1; i < STEPS.length; i++) {
      onEvent?.({ type: 'agent', agent: STEPS[i].name, index: i, total: STEPS.length, status: 'skipped', description: 'Not needed for conversation' });
    }
  };

  try {
    const result = await llmGateway.streamGenerate('Conversation', prompt, {
      onChunk: chunk => onEvent?.({ type: 'reply', agent: 'Intent Parser', replyChunk: chunk }),
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
  const onEvent       = options.onEvent;
  const existingFiles = Array.isArray(options.files) ? options.files : [];
  const chatHistory   = Array.isArray(options.history) ? options.history : [];
  const mode          = options.mode || 'build';

  onEvent?.({ type: 'connected', message: 'Pipeline connected' });

  // ── Fast path: obvious conversation without calling LLM ─────────────────
  const casual = /^(salut|bonjour|hello|hi|hey|coucou|merci|ok|d'accord|ça va|ca va|tu es qui|qui es-tu|bonsoir|au revoir|bye)[\s!.?]*$/i;
  if (casual.test((prompt || '').trim())) {
    return await handleConversation(prompt, onEvent);
  }

  // ── Step 0: Intent Parser ────────────────────────────────────────────────
  const historyCtx = buildChatContext(chatHistory);
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

  // ── Conversation / Clarify short-circuit ─────────────────────────────────
  if (!intent.shouldGenerateCode) {
    if (intent.intent === 'clarify' || intent.needsClarification) {
      return chatOnly(intent.clarificationQuestion || intent.reply || 'Peux-tu préciser ce que tu veux créer ?');
    }
    return await handleConversation(prompt, onEvent);
  }

  // ── Step 1: Builder or Diff/Patch ────────────────────────────────────────
  const isEdit = (intent.intent === 'edit' || mode === 'edit') && existingFiles.length > 0;
  const builderSystemPrompt = isEdit ? DIFF_SYSTEM_PROMPT : SYSTEM_BUILDER_PROMPT;
  const builderTemp = intent.complexity === 'complex' ? 0.4 : 0.3;

  const fileContext = existingFiles.length
    ? `# EXISTING FILES\n${existingFiles.map(f => `\`\`\`file:${f.path}\n${f.content.slice(0, 3000)}\n\`\`\``).join('\n\n')}`
    : '';

  const builderMsg = [
    historyCtx,
    `# USER REQUEST\n${prompt}`,
    `# INTENT\n${JSON.stringify({ appType: intent.appType, requirements: intent.requirements, complexity: intent.complexity }, null, 2)}`,
    fileContext,
    isEdit ? 'Apply the requested changes to the existing files above.' : 'Generate the complete application now.',
  ].filter(Boolean).join('\n\n');

  let builderContent;
  try {
    builderContent = await runLLM('Builder Agent', builderMsg, builderSystemPrompt, onEvent, 1, builderTemp);
  } catch (err) {
    throw new Error(`Builder Agent failed: ${err.message}`);
  }

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

  // ── Steps 2-3: Preview Compiler + Repair loop ────────────────────────────
  let previewError = null;
  const MAX_REPAIR = 3;

  for (let attempt = 0; attempt < MAX_REPAIR; attempt++) {
    const label = attempt === 0 ? 'Compiling...' : `Repair attempt ${attempt}/${MAX_REPAIR - 1}...`;
    sendAgent(onEvent, 2, 'active', label);

    try {
      await buildPreviewHTML(files);
      sendAgent(onEvent, 2, 'completed', 'Compiled successfully ✓');
      previewError = null;
      break;
    } catch (err) {
      previewError = err instanceof Error ? err.message : String(err);
      sendThinking(onEvent, 'Preview Compiler', `Error: ${previewError.slice(0, 200)}`);
      sendAgent(onEvent, 2, 'completed', `Compilation error (attempt ${attempt + 1})`);

      if (attempt >= MAX_REPAIR - 1) break;

      // Repair
      const repairMsg = [
        `# ORIGINAL REQUEST\n${prompt}`,
        `# BUILD ERROR\n${previewError.slice(0, 800)}`,
        `# FILES TO FIX\n${files.map(f => `\`\`\`file:${f.path}\n${f.content.slice(0, 2000)}\n\`\`\``).join('\n\n')}`,
      ].join('\n\n');

      try {
        const repairContent = await runLLM('Repair Agent', repairMsg, REPAIR_SYSTEM_PROMPT, onEvent, 3, 0.1);
        const repaired = llmGateway.parseFiles(repairContent);
        if (repaired.length) {
          files = mergeFiles(files, repaired);
          onEvent?.({ type: 'files_partial', files });
        }
      } catch (repairErr) {
        sendThinking(onEvent, 'Repair Agent', `Repair failed: ${repairErr.message}`);
      }
    }
  }

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
