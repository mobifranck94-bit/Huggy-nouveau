import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import App from './App';
import './index.css';

// ── Auth disabled: free access to all routes ──────────────────────────────────

function Root() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/builder" element={<App />} />
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found in index.html');

try {
  createRoot(root).render(
    <StrictMode>
      <Root />
    </StrictMode>,
  );
} catch (err) {
  root.innerHTML = `
    <div style="min-height:100vh;background:#0a0a0b;color:#f87171;display:flex;align-items:center;justify-content:center;font-family:monospace;padding:24px">
      <div style="max-width:600px">
        <div style="font-size:18px;font-weight:bold;margin-bottom:12px">⚠ Huggy failed to start</div>
        <pre style="font-size:13px;white-space:pre-wrap;color:#fca5a5">${String(err)}</pre>
        <div style="margin-top:16px;font-size:12px;color:#71717a">
          Check your environment variables or console for details.
        </div>
      </div>
    </div>`;
}
