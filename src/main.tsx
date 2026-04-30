import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/useAuth';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import App from './App';
import './index.css';

function Root() {
  const { isAuthenticated, loading, signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithGitHub } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={
            isAuthenticated ? 
              <Navigate to="/dashboard" replace /> : 
              <LandingPage 
                onSignIn={signInWithEmail} 
                onSignUp={signUpWithEmail} 
                onGoogleSignIn={signInWithGoogle} 
                onGithubSignIn={signInWithGitHub} 
              />
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            isAuthenticated ? <Dashboard /> : <Navigate to="/" replace />
          } 
        />
        <Route 
          path="/builder" 
          element={
            isAuthenticated ? <App /> : <Navigate to="/" replace />
          } 
        />
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
