import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { runFullPipeline } from './lib/pipeline.mjs';
import { buildPreviewHTML } from './lib/buildPreview.mjs';

// Load environment variables (.env.local has priority, then .env)
dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.static('dist'));

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
app.post('/api/build', async (req, res) => {
  const { prompt, files, mode = 'build', model = 'claude-sonnet-4-6', projectId } = req.body;

  if (!prompt?.trim()) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const MOCK_MODE = !process.env.ANTHROPIC_API_KEY;
  if (MOCK_MODE) {
    console.log('⚠️  ANTHROPIC_API_KEY missing. Entering MOCK MODE for testing.');
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
      // Simulate pipeline progress
      const agents = ['Web Research', 'Product Manager', 'DBA Architect', 'UX Designer', 'Coder Agent', 'Security Auditor', 'QA Reviewer', 'i18n Agent'];
      for (let i = 0; i < agents.length; i++) {
        sendEvent({ type: 'agent', index: i, agent: agents[i], status: 'active', description: `Simulation: ${agents[i]} working...` });
        await new Promise(r => setTimeout(r, 800));
        sendEvent({ type: 'agent', index: i, agent: agents[i], status: 'completed', description: `Simulation: ${agents[i]} done` });
      }
      result = {
        files: [
          { path: 'src/App.tsx', content: 'export default function App() { return <div className="p-8"><h1>Mock Mode Active</h1><p>Set ANTHROPIC_API_KEY to use real AI.</p></div>; }' },
          { path: 'src/index.css', content: 'body { background: #000; color: #fff; }' }
        ],
        reply: 'Ceci est une réponse simulée car la clé API Claude est absente. Configurez votre ANTHROPIC_API_KEY pour activer l\'intelligence réelle.',
        meta: { secReport: { score: 100, approved: true }, review: { score: 95, approved: true }, pmPlan: { complexity: 'simple', projectName: 'Mock Project' } }
      };
    } else {
      result = await runFullPipeline(prompt, {
        existingFiles: files,
        mode,
        model,
        projectId,
        onProgress: sendEvent,
      });
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
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/preview/:id', (req, res) => {
  const entry = previewStore.get(req.params.id);
  if (!entry) return res.status(404).send('Preview expired or not found');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(entry.html);
});

// ─── Deploy: build with esbuild then push to Vercel ──────────────────────────
app.post('/api/deploy', async (req, res) => {
  const { files, projectName = 'huggy-app' } = req.body;
  if (!files?.length) return res.status(400).json({ error: 'No files to deploy' });

  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    return res.status(503).json({ error: 'VERCEL_TOKEN not configured. Add it to your .env file.' });
  }

  try {
    // 1. Build the app with esbuild
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
  const { projectId, type } = req.body;
  // In a real app, we would insert into Supabase here
  // For now we just log it
  console.log(`[Analytics] ${type} on project ${projectId}`);
  res.json({ success: true });
});

// ─── Start Server ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🤖 Huggy Pipeline Server`);
  console.log(`   → http://localhost:${PORT}`);
  console.log(`   → API Key: ${process.env.ANTHROPIC_API_KEY ? '✅ configured' : '❌ MISSING'}`);
  console.log(`   → Endpoints:`);
  console.log(`      GET  /api/health`);
  console.log(`      POST /api/build  { prompt: "..." }\n`);
});

// Fallback for SPA routing
app.get('*', (_req, res) => {
  res.sendFile(path.resolve('dist', 'index.html'));
});
