import fetch from 'node-fetch';

async function testGeneration() {
  const prompt = "Create a professional QR Code generator with a sleek dark theme, allow users to enter text/URL, customize colors, and download the QR code as PNG.";
  
  console.log("🚀 Testing QR Code Generator generation...");
  
  try {
    const response = await fetch('http://localhost:3001/api/build', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, mode: 'build' })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API Error:", errorText);
      return;
    }

    // Since it's an SSE stream, we read it chunk by chunk
    const body = response.body;
    body.on('data', (chunk) => {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'agent_start') {
              console.log(`  [Agent] Starting: ${event.agent}`);
            } else if (event.type === 'complete') {
              console.log("✅ Generation Complete!");
              console.log("📄 Files generated:", event.files.map(f => f.path));
              process.exit(0);
            } else if (event.type === 'error') {
              console.error("❌ Pipeline Error:", event.message);
              process.exit(1);
            }
          } catch (e) {
            // Partial JSON or heartbeat
          }
        }
      }
    });

  } catch (err) {
    console.error("❌ Connection Error:", err.message);
  }
}

testGeneration();
