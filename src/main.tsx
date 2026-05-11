import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';
import Help from './pages/Help';
import Admin from './pages/Admin';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// ── Auth integration ─────────────────────────────────────────────────────────

function Root() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ErrorBoundary><LandingPage /></ErrorBoundary>} />
          <Route path="/auth" element={<ErrorBoundary><Auth /></ErrorBoundary>} />
          <Route path="/dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
          <Route path="/builder" element={<ErrorBoundary><App /></ErrorBoundary>} />
          <Route path="/help" element={<ErrorBoundary><Help /></ErrorBoundary>} />
          <Route path="/admin" element={<ErrorBoundary><Admin /></ErrorBoundary>} />
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
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
