import { llmGateway } from './llm/gateway.mjs';
import { buildPreviewHTML } from './buildPreview.mjs';
import { SYSTEM_BUILDER_PROMPT, INTENT_SYSTEM_PROMPT, REPAIR_SYSTEM_PROMPT } from './prompts/systemBuilderPrompt.mjs';

const STEPS = [
  { name: 'Intent Parser', description: 'Understanding product intent...' },
  { name: 'Builder Agent', description: 'Generating working React files...' },
  { name: 'Preview Compiler', description: 'Compiling live preview...' },
  { name: 'Repair Agent', description: 'Repairing compile issues...' },
];

function sendAgent(onEvent, index, status, description) {
  const step = STEPS[index];
  onEvent?.({
    type: 'agent',
    agent: step.name,
    index,
    total: STEPS.length,
    status,
    description,
  });
}

function sendThinking(onEvent, agent, thinkingLine) {
  onEvent?.({ type: 'thinking', agent, thinkingLine });
}

function parseIntent(content, prompt) {
  try {
    return llmGateway.parseJSON(content);
  } catch {
    return {
      intent: looksLikeBuildRequest(prompt) ? 'create' : 'conversation',
      appType: 'web app',
      requirements: looksLikeBuildRequest(prompt) ? [prompt] : [],
      constraints: ['React', 'TypeScript', 'Tailwind CSS'],
      targetFiles: ['src/App.tsx'],
      shouldGenerateCode: looksLikeBuildRequest(prompt),
      reply: createConversationReply(prompt),
    };
  }
}

function looksLikeBuildRequest(prompt) {
  const text = prompt.toLowerCase().trim();
  if (!text) return false;

  const buildWords = [
    'crée', 'cree', 'créer', 'creer', 'génère', 'genere', 'générer', 'generer',
    'code', 'coder', 'développe', 'developpe', 'construis', 'build', 'create',
    'generate', 'make', 'app', 'application', 'site', 'page', 'landing',
    'dashboard', 'component', 'composant', 'formulaire', 'saas', 'frontend',
    'modifie', 'modifier', 'change', 'ajoute', 'corrige', 'fix', 'bug',
  ];

  const casualOnly = /^(salut|bonjour|hello|hi|hey|coucou|merci|ok|d'accord|ça va|ca va|tu es qui|qui es-tu)[\s!.?]*$/i;
  if (casualOnly.test(text)) return false;

  return buildWords.some(word => text.includes(word));
}

function shouldGenerateFromIntent(intent, prompt) {
  if (intent?.shouldGenerateCode === true) return true;
  if (intent?.shouldGenerateCode === false) return false;

  const buildIntents = new Set(['create', 'edit', 'fix']);
  if (buildIntents.has(String(intent?.intent || '').toLowerCase())) return true;

  return looksLikeBuildRequest(prompt);
}

function createConversationReply(prompt) {
  const text = prompt.toLowerCase().trim();
  if (/^(salut|bonjour|hello|hi|hey|coucou)/i.test(text)) {
    return 'Bonjour 👋 Je suis Huggy. Dis-moi ce que tu veux créer, modifier ou corriger, et je lancerai la génération seulement quand ta demande concerne vraiment une application.';
  }

  if (/merci/i.test(text)) {
    return 'Avec plaisir 😊 Quand tu veux, décris l’application ou la modification à réaliser.';
  }

  return 'Je suis là pour t’aider. Décris l’application, la page ou la modification que tu veux construire, et je m’occupe du reste.';
}

function isObviousConversation(prompt) {
  const text = prompt.toLowerCase().trim();
  if (!text) return true;
  if (looksLikeBuildRequest(prompt)) return false;
  return text.length < 80 || /^(salut|bonjour|hello|hi|hey|coucou|merci|ok|d'accord|ça va|ca va|tu es qui|qui es-tu)/i.test(text);
}

function normalizeFiles(files, prompt, rawContent) {
  const clean = (Array.isArray(files) ? files : [])
    .filter(file => file?.path && typeof file.content === 'string')
    .map(file => ({
      path: file.path.replace(/^\/+/, '').replace(/\\/g, '/'),
      content: file.content.trim(),
    }));

  if (clean.some(file => file.path === 'src/App.tsx' || file.path === 'src/App.jsx')) {
    return clean;
  }

  const safePrompt = prompt.replace(/`/g, '').replace(/\$/g, '');
  clean.unshift({
    path: 'src/App.tsx',
    content: `export default function App() {
  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white flex items-center justify-center p-8">
      <section className="max-w-2xl rounded-3xl border border-blue-500/20 bg-zinc-950 p-10 shadow-2xl text-center">
        <p className="text-sm text-blue-300 mb-4">Huggy Builder</p>
        <h1 className="text-4xl font-black mb-4">${safePrompt}</h1>
        <p className="text-zinc-400">The builder couldn't produce structured files this time. Please rephrase your request or try again.</p>
      </section>
    </main>
  );
}
`,
  });

  return clean;
}

async function runLLM(agentName, prompt, systemPrompt, onEvent, index) {
  sendAgent(onEvent, index, 'active', STEPS[index].description);
  const result = await llmGateway.streamGenerate(agentName, prompt, {
    onThinking: line => sendThinking(onEvent, STEPS[index].name, line),
    onChunk: chunk => onEvent?.({ type: 'reply', agent: STEPS[index].name, replyChunk: chunk }),
  }, systemPrompt);

  if (!result.success) {
    throw new Error(result.error || `${STEPS[index].name} failed`);
  }

  sendAgent(onEvent, index, 'completed', `${STEPS[index].name} completed`);
  return result.content;
}

export async function runLovablePipeline(prompt, options = {}) {
  const onEvent = options.onEvent;
  const existingFiles = Array.isArray(options.files) ? options.files : [];

  onEvent?.({ type: 'connected', message: 'Lovable-like pipeline connected' });

  if (isObviousConversation(prompt)) {
    sendAgent(onEvent, 0, 'active', 'Classifying as conversation...');
    sendThinking(onEvent, 'Intent Parser', 'No app generation requested.');
    sendAgent(onEvent, 0, 'completed', 'Conversation detected');
    return {
      success: true,
      files: [],
      reply: createConversationReply(prompt),
      meta: {
        pmPlan: { projectName: 'Conversation', complexity: 'none' },
        review: { score: 100, approved: true },
        secReport: { score: 100, approved: true },
        chatOnly: true,
      },
    };
  }

  const intentContent = await runLLM(
    'Product Manager',
    `User prompt: ${prompt}`,
    INTENT_SYSTEM_PROMPT,
    onEvent,
    0,
  );
  const intent = parseIntent(intentContent, prompt);

  if (!shouldGenerateFromIntent(intent, prompt)) {
    return {
      success: true,
      files: [],
      reply: intent.reply || createConversationReply(prompt),
      meta: {
        pmPlan: { projectName: 'Conversation', complexity: 'none' },
        review: { score: 100, approved: true },
        secReport: { score: 100, approved: true },
        chatOnly: true,
      },
    };
  }

  const context = [
    `# USER REQUEST\n${prompt}`,
    `# INTENT\n${JSON.stringify(intent, null, 2)}`,
    existingFiles.length ? `# EXISTING FILES\n${existingFiles.map(f => `file:${f.path}\n${f.content}`).join('\n---\n')}` : '',
  ].filter(Boolean).join('\n\n');

  const builderContent = await runLLM(
    'Coder Agent',
    `${context}\n\nGenerate the app now.`,
    SYSTEM_BUILDER_PROMPT,
    onEvent,
    1,
  );

  let parsed = llmGateway.parseFiles(builderContent);

  if (!parsed.length) {
    sendThinking(onEvent, 'Builder Agent', 'Output had no file blocks, retrying with stricter instructions...');
    const retryContent = await runLLM(
      'Coder Agent',
      `${context}\n\nIMPORTANT: Your previous response did not use the required \`\`\`file:<path> format. Re-output ALL files now using ONLY that format. No prose, no plain \`\`\`tsx fences.`,
      SYSTEM_BUILDER_PROMPT,
      onEvent,
      1,
    );
    parsed = llmGateway.parseFiles(retryContent);
  }

  let files = normalizeFiles(parsed, prompt, builderContent);
  let previewError = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    sendAgent(onEvent, 2, 'active', attempt === 0 ? 'Compiling generated app...' : `Recompiling after repair (${attempt}/2)...`);
    try {
      await buildPreviewHTML(files);
      sendAgent(onEvent, 2, 'completed', 'Preview compiled successfully');
      previewError = null;
      break;
    } catch (error) {
      previewError = error instanceof Error ? error.message : String(error);
      sendThinking(onEvent, 'Preview Compiler', previewError);
      sendAgent(onEvent, 2, 'completed', 'Preview compiler reported errors');

      if (attempt >= 2) break;

      const repairPrompt = [
        `# ORIGINAL USER REQUEST\n${prompt}`,
        `# PREVIEW ERROR\n${previewError}`,
        `# FILES TO FIX\n${files.map(f => `\`\`\`file:${f.path}\n${f.content}\n\`\`\``).join('\n\n')}`,
      ].join('\n\n');

      const repairContent = await runLLM(
        'Coder Agent',
        repairPrompt,
        REPAIR_SYSTEM_PROMPT,
        onEvent,
        3,
      );
      const repairedFiles = llmGateway.parseFiles(repairContent);
      if (repairedFiles.length) {
        const byPath = new Map(files.map(file => [file.path, file]));
        for (const file of repairedFiles) byPath.set(file.path, file);
        files = normalizeFiles([...byPath.values()], prompt, repairContent);
      }
    }
  }

  if (previewError) {
    onEvent?.({ type: 'error', message: `Preview still has errors after repair: ${previewError}` });
  }

  return {
    success: true,
    files,
    reply: previewError
      ? `Generated files, but preview still needs attention: ${previewError}`
      : '✅ Application generated and compiled successfully.',
    meta: {
      pmPlan: { projectName: intent.appType || 'Generated App', complexity: 'simple' },
      review: { score: previewError ? 70 : 95, approved: !previewError },
      secReport: { score: 90, approved: true },
    },
  };
}
