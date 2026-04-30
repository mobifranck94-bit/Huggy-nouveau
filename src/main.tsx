import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found in index.html');

try {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (err) {
  // Show a visible error instead of a blank black page
  root.innerHTML = `
    <div style="min-height:100vh;background:#0a0a0b;color:#f87171;display:flex;align-items:center;justify-content:center;font-family:monospace;padding:24px">
      <div style="max-width:600px">
        <div style="font-size:18px;font-weight:bold;margin-bottom:12px">⚠ Huggy failed to start</div>
        <pre style="font-size:13px;white-space:pre-wrap;color:#fca5a5">${String(err)}</pre>
        <div style="margin-top:16px;font-size:12px;color:#71717a">
          Check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in Railway variables.
        </div>
      </div>
    </div>`;
}
