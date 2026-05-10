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

// Load environment variables (.env.local has priority, then .env)
dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();

// ─── Security Middleware ────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://*.supabase.co"],
    },
  },
}));

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
  const { prompt, files, mode = 'build', model = 'claude-sonnet-4-6', projectId } = req.body;

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
          onEvent: (event) => {
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

    if (!Array.isArray(result.files) || result.files.length === 0) {
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
  res.send(entry.html);
});

// ─── Deploy: build with esbuild then push to Vercel ──────────────────────────
app.post('/api/deploy', deployLimiter, async (req, res) => {
  const { files, projectName = 'huggy-app' } = req.body;
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

    // 2. Build the app with esbuild
    const html    = await buildPreviewHTML(files);
    const content = Buffer.from(html, 'utf-8');
    const sha1    = crypto.createHash('sha1').update(content).digest('hex');

    // 2. Upload file to Vercel blob store
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

    // 3. Create deployment
    const slug       = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 48);
    const deployBody = {
      name:            slug,
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

    // 4. Poll until ready (max 90 s)
    const deployId = deploy.id;
    for (let i = 0; i < 45; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const statusRes = await fetch(`https://api.vercel.com/v13/deployments/${deployId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const status = await statusRes.json();
      if (status.readyState === 'READY') {
        const url = `https://${status.url}`;
        console.log(`[Deploy] ✅ ${url}`);
        return res.json({ success: true, url });
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
