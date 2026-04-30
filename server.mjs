import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { runFullPipeline } from './lib/pipeline.mjs';

// Load environment variables (.env.local has priority, then .env)
dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '50mb' })); // Increased limit for larger projects
app.use(express.static('dist'));

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ─── Build Pipeline (SSE Stream) ─────────────────────────────────────────────
app.post('/api/build', async (req, res) => {
  const { prompt, files, mode = 'build' } = req.body;

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
        onProgress: (event) => {
          sendEvent(event);
        },
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
