import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { runFullPipeline } from './lib/pipeline.mjs';

// Load environment variables (.env.local has priority, then .env)
dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ─── Build Pipeline (SSE Stream) ─────────────────────────────────────────────
app.post('/api/build', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt?.trim()) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server.' });
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

    const result = await runFullPipeline(prompt, {
      onProgress: (event) => {
        sendEvent(event);
      },
    });

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

    console.log(`\n✅ Pipeline completed successfully.`);
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
