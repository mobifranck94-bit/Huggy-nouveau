import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { runLovablePipeline } from './lib/lovablePipeline.mjs';

// Helper function to transform orchestrator events to legacy format
function transformToLegacyEvent(event) {
  if (!event?.data) {
    return event;
  }

  const typeMap = {
    'agent.start': 'agent',
    'agent.complete': 'agent',
    'agent.error': 'error',
    'thinking': 'thinking',
    'reply.chunk': 'reply',
    'files.ready': 'complete',
    'pipeline.complete': 'complete',
  };
  
  return {
    type: typeMap[event.type] || event.type,
    agent: event.agent,
    status: event.data?.agentStatus,
    index: event.data?.agentIndex,
    total: event.data?.totalAgents,
    description: event.data?.description,
    thinkingLine: event.data?.thinkingLine,
    replyChunk: event.data?.replyChunk,
    message: event.data?.error,
    files: event.data?.files,
    meta: event.data?.meta,
  };
}
import { buildPreviewHTML } from './lib/buildPreview.mjs';
import { validateFiles } from './lib/security.mjs';
import { sendEmail } from './lib/email.mjs';
import { generateUniqueSlug, generatePreviewUrl, createDeploymentRecord } from './lib/customDomain.mjs';

// Load environment variables (.env.local has priority, then .env)
dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();

// Trust proxy (required when behind Railway/Nginx/Vite proxy for rate-limit)
app.set('trust proxy', 1);

// ─── Security Middleware ────────────────────────────────────────────────────
// Skip Helmet entirely for the preview iframe route: the iframe is sandboxed
// on the client side and must load scripts/styles from esm.sh & cdn.tailwindcss.com.
app.use((req, res, next) => {
  if (req.path.startsWith('/api/preview/')) return next();
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://*.supabase.co", "https://esm.sh"],
        frameSrc: ["'self'"],
        fontSrc: ["'self'", "data:", "https:"],
      },
    },
  })(req, res, next);
});

app.use(cors({ 
  origin: process.env.APP_URL || true,
  credentials: true 
}));

// ─── Rate Limiting ───────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const buildLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 builds per minute
  message: { error: 'Build limit exceeded. Maximum 5 builds per minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const deployLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 deployments per 5 minutes
  message: { error: 'Deploy limit exceeded. Maximum 3 deployments per 5 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);
app.use(express.json({ limit: '50mb' }));
app.use(express.static('dist'));
app.use('/assets', express.static(path.resolve('public/assets')));

// ─── In-memory preview store (TTL: 30 min) ───────────────────────────────────
const previewStore = new Map(); // id → { html, expires }
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of previewStore) if (v.expires < now) previewStore.delete(k);
}, 5 * 60 * 1000);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ─── Build Pipeline (SSE Stream) ─────────────────────────────────────────────
app.post('/api/build', buildLimiter, async (req, res) => {
  const { prompt, files, mode = 'build', model = 'claude-sonnet-4-6', projectId, history = [], conversationSummary = '' } = req.body;

  if (!prompt?.trim()) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const MOCK_MODE = !process.env.ANTHROPIC_API_KEY && !process.env.OPENROUTER_API_KEY;
  if (MOCK_MODE) {
    console.log('⚠️  No AI key found (OPENROUTER_API_KEY or ANTHROPIC_API_KEY). Entering MOCK MODE.');
  } else {
    const provider = process.env.OPENROUTER_API_KEY ? 'OpenRouter' : 'Anthropic';
    console.log(`✅ Using ${provider} as LLM provider.`);
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering if behind a reverse proxy
  res.flushHeaders();

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Send initial connection event
  sendEvent({ type: 'connected', message: 'Pipeline stream connected' });

  try {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🚀 Pipeline started for prompt: "${prompt.slice(0, 80)}..."`);
    console.log(`${'═'.repeat(60)}\n`);

    let result;
    if (MOCK_MODE) {
      // Simulate pipeline progress with new orchestrator-style events
      const agents = [
        { name: 'Intent Parser', desc: 'Understanding product intent...' },
        { name: 'Builder Agent', desc: 'Generating working React files...' },
        { name: 'Preview Compiler', desc: 'Compiling live preview...' },
        { name: 'Repair Agent', desc: 'Repairing compile issues...' },
      ];
      
      for (let i = 0; i < agents.length; i++) {
        // Emit start
        sendEvent({ 
          type: 'agent', 
          index: i, 
          agent: agents[i].name, 
          status: 'active', 
          total: agents.length,
          description: agents[i].desc 
        });
        
        // Simulate thinking/progress
        sendEvent({
          type: 'thinking',
          agent: agents[i].name,
          thinkingLine: `🤖 ${agents[i].name} starting...`,
        });
        
        await new Promise(r => setTimeout(r, 600));
        
        // Emit complete
        sendEvent({ 
          type: 'agent', 
          index: i, 
          agent: agents[i].name, 
          status: 'completed', 
          total: agents.length,
          description: `${agents[i].name} completed` 
        });
      }
      
      result = {
        files: [
          { path: 'src/App.tsx', content: 'export default function App() { return <div className="min-h-screen bg-black text-white p-8"><h1 className="text-4xl font-bold">Lovable-like Mock Mode</h1><p className="mt-4 text-zinc-400">Set OPENROUTER_API_KEY to use real AI generation.</p></div>; }' },
          { path: 'src/index.css', content: 'body { background: #000; color: #fff; font-family: system-ui; }' }
        ],
        reply: '🎉 **Lovable-like architecture active!**\n\nThis is a simulated response because no AI key is configured.\n\n**Pipeline:**\n- Intent Parser\n- Builder Agent\n- Preview Compiler\n- Repair Agent\n\nConfigure OPENROUTER_API_KEY to enable real generation.',
        meta: { 
          secReport: { score: 100, approved: true }, 
          review: { score: 95, approved: true }, 
          pmPlan: { complexity: 'simple', projectName: 'Mock Project' } 
        }
      };
    } else {
      // Use simplified Lovable-like pipeline
      try {
        result = await runLovablePipeline(prompt, {
          mode,
          projectId,
          files,
          history,
          conversationSummary,
          onEvent: (event) => {
            // Forward files_partial immediately for progressive display
            if (event.type === 'files_partial') {
              sendEvent({ type: 'files_partial', files: event.files });
              return;
            }
            // Forward meta updates (e.g., early chatOnly flag) immediately
            if (event.type === 'meta') {
              sendEvent({ type: 'meta', meta: event.meta });
              return;
            }
            // Forward per-file tool events ({ type:'tool', kind:'start'|'progress'|'complete', path, lines })
            if (event.type === 'tool') {
              sendEvent({ type: 'tool', kind: event.kind, path: event.path, lines: event.lines });
              return;
            }
            // Phase C: Transparent Agent events — forward verbatim (no transformation)
            if (
              event.type === 'mode_announce' ||
              event.type === 'question' ||
              event.type === 'todo_init' ||
              event.type === 'todo_update' ||
              event.type === 'action_log'
            ) {
              sendEvent(event);
              return;
            }
            const legacyEvent = transformToLegacyEvent(event);
            sendEvent(legacyEvent);
          },
        });
      } catch (error) {
        console.error('[LovablePipeline] Error:', error.message);
        throw error;
      }
    }

    if (!result?.success) {
      const message = result?.error || result?.reply || 'Pipeline failed without details';
      sendEvent({ type: 'error', message });
      return;
    }

    if (!result.meta?.chatOnly && (!Array.isArray(result.files) || result.files.length === 0)) {
      sendEvent({ type: 'error', message: 'Pipeline completed but no files were generated.' });
      return;
    }

    // Send the final result
    sendEvent({
      type: 'complete',
      files: result.files,
      reply: result.reply,
      meta: {
        securityScore: result.meta?.secReport?.score,
        qaScore: result.meta?.review?.score,
        securityApproved: result.meta?.secReport?.approved,
        qaApproved: result.meta?.review?.approved,
        complexity: result.meta?.pmPlan?.complexity,
        projectName: result.meta?.pmPlan?.projectName,
        chatOnly: result.meta?.chatOnly,
      },
    });

    console.log(`\n✅ Pipeline completed ${MOCK_MODE ? '(MOCK)' : ''} successfully.`);
    console.log(`   Files generated: ${result.files?.length ?? 0}`);
    console.log(`   Security score: ${result.meta?.secReport?.score ?? 'N/A'}`);
    console.log(`   QA score: ${result.meta?.review?.score ?? 'N/A'}\n`);
  } catch (error) {
    console.error(`\n❌ Pipeline error:`, error.message);
    sendEvent({ type: 'error', message: error.message });
  } finally {
    res.end();
  }
});

// ─── Summarize: compress old conversation messages (Phase 6 memory) ──────────
app.post('/api/summarize', async (req, res) => {
  const { messages = [], existingSummary = '' } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  const hasKey = process.env.ANTHROPIC_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!hasKey) {
    // Graceful no-op: return existing summary (no compression possible without LLM)
    return res.json({ summary: existingSummary, compressed: false });
  }

  try {
    const { llmGateway } = await import('./lib/llm/gateway.mjs');

    const transcript = messages
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${(m.content || '').slice(0, 600)}`)
      .join('\n');

    const summarizerPrompt = `You are a conversation summarizer. Compress the following dialogue into a single dense paragraph (max 400 words) that preserves:
- What the user is building (project type, key features)
- Important architectural/design decisions made
- Open questions or things left to do
- User preferences (language, style, stack choices)

${existingSummary ? `Existing summary so far:\n${existingSummary}\n\nNew messages to incorporate:` : 'Conversation to summarize:'}
${transcript}

Output ONLY the updated summary paragraph, no preamble.`;

    const result = await llmGateway.streamGenerate('Web Research', summarizerPrompt, {
      temperature: 0.2,
      maxTokens: 600,
    }, 'You are a precise conversation summarizer. Output only the summary paragraph.');

    if (!result.success) {
      return res.json({ summary: existingSummary, compressed: false, error: result.error });
    }

    return res.json({ summary: (result.content || '').trim(), compressed: true });
  } catch (err) {
    console.warn('[Summarize] failed:', err.message);
    return res.json({ summary: existingSummary, compressed: false, error: err.message });
  }
});

// ─── Preview: bundle files server-side with esbuild ──────────────────────────
app.post('/api/preview', async (req, res) => {
  const { files, isEditMode } = req.body;
  if (!files?.length) return res.status(400).json({ error: 'No files provided' });

  try {
    const html = await buildPreviewHTML(files, isEditMode);
    const id   = crypto.randomUUID();
    previewStore.set(id, { html, expires: Date.now() + 30 * 60 * 1000 });
    res.json({ id });
  } catch (err) {
    res.status(500).json({
      error: err.message,
      details: 'Preview compilation failed. Check generated files or regenerate the app.',
    });
  }
});

app.get('/api/preview/:id', (req, res) => {
  const entry = previewStore.get(req.params.id);
  if (!entry) return res.status(404).send('Preview expired or not found');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Explicitly remove any inherited CSP so the preview iframe can load esm.sh/cdn.tailwindcss.com
  res.removeHeader('Content-Security-Policy');
  res.removeHeader('X-Frame-Options');
  res.send(entry.html);
});

// ─── Deploy: build with esbuild then push to Vercel ──────────────────────────
app.post('/api/deploy', deployLimiter, async (req, res) => {
  const { files, projectName = 'huggy-app', projectId = null, badgeEnabled = true } = req.body;
  if (!files?.length) return res.status(400).json({ error: 'No files to deploy' });

  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    return res.status(503).json({ error: 'VERCEL_TOKEN not configured. Add it to your .env file.' });
  }

  try {
    // 1. Validate files for security
    const validation = validateFiles(files);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Security validation failed', 
        details: validation.errors 
      });
    }

    // 2. Generate unique custom domain slug
    const slug = await generateUniqueSlug(projectName);
    const customDomain = process.env.HUGGY_DOMAIN || 'huggy.fun';
    const customUrl = generatePreviewUrl(slug, customDomain);

    // 3. Build the app with badge injection (for free tier branding)
    const html = await buildPreviewHTML(files, {
      injectBadge: badgeEnabled !== false,
      badgeOptions: {
        badgeEnabled: true,
        position: 'bottom-right',
      },
    });
    const content = Buffer.from(html, 'utf-8');
    const sha1    = crypto.createHash('sha1').update(content).digest('hex');

    // 4. Upload file to Vercel blob store
    const uploadRes = await fetch('https://api.vercel.com/v2/files', {
      method: 'POST',
      headers: {
        Authorization:      `Bearer ${token}`,
        'Content-Length':   String(content.length),
        'x-vercel-digest':  sha1,
        'Content-Type':     'text/html',
      },
      body: content,
    });
    if (!uploadRes.ok && uploadRes.status !== 409) {
      const txt = await uploadRes.text();
      throw new Error(`Vercel file upload failed (${uploadRes.status}): ${txt.slice(0, 200)}`);
    }

    // 5. Create deployment with custom alias
    const vercelSlug = slug.slice(0, 48); // Vercel project name limit
    const deployBody = {
      name:            vercelSlug,
      files:           [{ file: 'index.html', sha: sha1, size: content.length }],
      target:          'production',
      projectSettings: { framework: null, outputDirectory: '.' },
    };

    const deployRes = await fetch('https://api.vercel.com/v13/deployments', {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify(deployBody),
    });
    const deploy = await deployRes.json();
    if (!deployRes.ok) throw new Error(deploy.error?.message || `Deploy failed (${deployRes.status})`);

    // 6. Store deployment record (optional, for custom domain routing)
    try {
      const deploymentRecord = createDeploymentRecord({
        projectId,
        projectName,
        vercelDeploymentId: deploy.id,
        slug,
        domain: customDomain,
        badgeEnabled: badgeEnabled !== false,
      });
      // TODO: Store in Supabase when table created
      console.log('[Deploy] Record:', deploymentRecord.slug);
    } catch (e) {
      console.warn('[Deploy] Failed to store record:', e.message);
    }

    // 7. Poll until ready (max 90 s)
    const deployId = deploy.id;
    for (let i = 0; i < 45; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const statusRes = await fetch(`https://api.vercel.com/v13/deployments/${deployId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const status = await statusRes.json();
      if (status.readyState === 'READY') {
        const liveUrl = `https://${status.url}`;
        console.log(`[Deploy] ✅ ${liveUrl}`);
        return res.json({ 
          success: true, 
          url: liveUrl,
          vercelUrl: liveUrl,
          slug,
          badgeEnabled: badgeEnabled !== false,
        });
      }
      if (status.readyState === 'ERROR') throw new Error('Vercel build errored out');
    }
    throw new Error('Deploy timeout (90 s). Check Vercel dashboard.');

  } catch (err) {
    console.error('[Deploy] ❌', err.message);
    res.status(500).json({ error: err.message });
  }
});


// ─── Analytics Tracking ──────────────────────────────────────────────────────
app.post('/api/track', async (req, res) => {
  const { projectId, type, metadata = {} } = req.body;
  
  // Store in Supabase analytics table
  try {
    const { supabase } = await import('./lib/supabase.mjs');
    await supabase.from('analytics').insert({
      project_id: projectId,
      event_type: type,
      metadata: metadata,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[Analytics] Failed to store:', err.message);
  }
  
  console.log(`[Analytics] ${type} on project ${projectId}`);
  res.json({ success: true });
});

// ─── Email API ───────────────────────────────────────────────────────────────
app.post('/api/send-email', generalLimiter, async (req, res) => {
  const { to, subject, html, type = 'welcome' } = req.body;
  
  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
  }
  
  try {
    const result = await sendEmail({ to, subject, html, type });
    res.json({ success: true, messageId: result.messageId });
  } catch (err) {
    console.error('[Email] Failed:', err.message);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// ─── Admin stats (aggregated metrics) ────────────────────────────────────────
// Restricted to users whose email is in ADMIN_EMAILS env (comma-separated)
function isAdmin(email) {
  if (!email) return false;
  const allow = (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  return allow.includes(email.toLowerCase());
}

app.get('/api/admin/stats', generalLimiter, async (req, res) => {
  const email = req.query.email;
  if (!isAdmin(email)) {
    return res.status(403).json({ error: 'Admin access only' });
  }

  try {
    const { supabase } = await import('./lib/supabase.mjs');
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [{ count: buildsTotal }, { count: buildsLast30 }, { data: feedbackRows }, { data: recentBuilds }] = await Promise.all([
      supabase.from('builds').select('*', { count: 'exact', head: true }),
      supabase.from('builds').select('*', { count: 'exact', head: true }).gte('created_at', since),
      supabase.from('build_feedback').select('sentiment').gte('created_at', since),
      supabase.from('builds').select('id, prompt, status, qa_score, security_score, created_at').order('created_at', { ascending: false }).limit(20),
    ]);

    const up   = (feedbackRows || []).filter(r => r.sentiment === 'up').length;
    const down = (feedbackRows || []).filter(r => r.sentiment === 'down').length;

    res.json({
      buildsTotal: buildsTotal ?? 0,
      buildsLast30: buildsLast30 ?? 0,
      feedback: {
        up,
        down,
        ratio: (up + down) > 0 ? Math.round((up / (up + down)) * 100) : null,
      },
      recentBuilds: recentBuilds || [],
    });
  } catch (err) {
    console.error('[AdminStats] Failed:', err.message);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// ─── Build-level Feedback API (👍/👎 inline on each generated app) ───────────
app.post('/api/build-feedback', generalLimiter, async (req, res) => {
  const { userId, buildId, projectId, prompt, sentiment, comment } = req.body || {};

  if (!userId || !sentiment || !['up', 'down'].includes(sentiment)) {
    return res.status(400).json({ error: 'userId and sentiment ("up"|"down") are required' });
  }

  try {
    const { supabase } = await import('./lib/supabase.mjs');
    await supabase.from('build_feedback').insert({
      user_id: userId,
      build_id: buildId || null,
      project_id: projectId || null,
      prompt: prompt || null,
      sentiment,
      comment: comment || null,
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[BuildFeedback] Failed:', err.message);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

// ─── Feedback API ────────────────────────────────────────────────────────────
app.post('/api/feedback', generalLimiter, async (req, res) => {
  const { userId, type, message, rating, page } = req.body;
  
  try {
    const { supabase } = await import('./lib/supabase.mjs');
    await supabase.from('feedback').insert({
      user_id: userId,
      type,
      message,
      rating,
      page,
      created_at: new Date().toISOString()
    });
    
    // Send notification email to admin
    if (process.env.ADMIN_EMAIL) {
      await sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: `New Feedback: ${type}`,
        html: `<p><strong>User:</strong> ${userId}</p><p><strong>Type:</strong> ${type}</p><p><strong>Rating:</strong> ${rating}/5</p><p><strong>Message:</strong> ${message}</p>`,
        type: 'notification'
      });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('[Feedback] Failed:', err.message);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// ─── Health Check with Details ───────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    version: process.env.npm_package_version || '0.0.0',
    features: {
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      vercel: !!process.env.VERCEL_TOKEN,
      supabase: !!process.env.SUPABASE_URL,
      email: !!(process.env.RESEND_API_KEY || process.env.BREVO_API_KEY)
    }
  });
});

// ─── Start Server ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🤖 Huggy Pipeline Server`);
  console.log(`   → http://localhost:${PORT}`);
  console.log(`   → OpenRouter: ${process.env.OPENROUTER_API_KEY ? '✅ configured' : '—'}`);
  console.log(`   → Anthropic:  ${process.env.ANTHROPIC_API_KEY ? '✅ configured' : '—'}`);
  console.log(`   → Provider:   ${process.env.OPENROUTER_API_KEY ? 'OpenRouter' : process.env.ANTHROPIC_API_KEY ? 'Anthropic' : '❌ NONE - MOCK MODE'}`);
  console.log(`   → Endpoints:`);
  console.log(`      GET  /api/health`);
  console.log(`      POST /api/build  { prompt: "..." }\n`);
});

// ─── API 404 Handler ─────────────────────────────────────────────────────────
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Fallback for SPA routing
app.get('*', (_req, res) => {
  res.sendFile(path.resolve('dist', 'index.html'));
});
