import * as esbuild from 'esbuild';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const IMPORT_MAP = {
  imports: {
    'react':                 'https://esm.sh/react@19',
    'react-dom':             'https://esm.sh/react-dom@19',
    'react/jsx-runtime':     'https://esm.sh/react@19/jsx-runtime',
    'react-dom/client':      'https://esm.sh/react-dom@19/client',
    'framer-motion':         'https://esm.sh/framer-motion@12',
    'motion':                'https://esm.sh/motion@12',
    'motion/react':          'https://esm.sh/motion@12/react',
    'lucide-react':          'https://esm.sh/lucide-react',
    '@supabase/supabase-js': 'https://esm.sh/@supabase/supabase-js@2',
  },
};

const EXTERNALS = [
  'react', 'react-dom', 'react/jsx-runtime', 'react-dom/client',
  'framer-motion', 'motion', 'motion/react',
  'lucide-react', '@supabase/supabase-js',
];

// Plugin that silently drops CSS imports (Tailwind CDN handles styling)
const cssNoopPlugin = {
  name: 'css-noop',
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, () => ({ contents: '', loader: 'js' }));
  },
};

// Files that exist in the project but should NOT be bundled for the browser preview
function isBundleable(filePath) {
  if (filePath.startsWith('supabase/')) return false; // edge functions + migrations are server-side
  if (filePath === 'README.md') return false;
  if (filePath === '.env.example') return false;
  if (filePath.endsWith('.sql')) return false;
  if (filePath.startsWith('public/')) return false;   // static assets, not part of the JS graph
  return true;
}

import { injectBadge } from './badgeInjector.mjs';

export async function buildPreviewHTML(files, options = {}) {
  const { isEditMode = false, injectBadge: shouldInjectBadge = false, badgeOptions = {} } = options;
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'huggy-prev-'));
  try {
    // Only write bundleable files to the temp dir
    const bundleableFiles = files.filter(f => isBundleable(f.path));
    for (const file of bundleableFiles) {
      const fullPath = path.join(tmpDir, file.path);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, file.content, 'utf-8');
    }

    // Resolve entry point
    const mainFile = files.find(f => f.path === 'src/main.tsx' || f.path === 'src/main.ts');
    const appFile  = files.find(f => f.path === 'src/App.tsx'  || f.path === 'src/App.ts');

    if (!mainFile && !appFile) {
      throw new Error('No src/main.tsx or src/App.tsx found in generated files');
    }

    let entryPath;
    if (mainFile) {
      entryPath = path.join(tmpDir, mainFile.path);
    } else {
      // Synthetic entry that mounts the App component
      const synthetic = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
const el = document.getElementById('root');
if (el) createRoot(el).render(React.createElement(App));
`;
      const synthPath = path.join(tmpDir, 'src', '__entry.tsx');
      await fs.writeFile(synthPath, synthetic, 'utf-8');
      entryPath = synthPath;
    }

    const result = await esbuild.build({
      entryPoints: [entryPath],
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'browser',
      jsx: 'automatic',
      jsxImportSource: 'react',
      external: EXTERNALS,
      define: {
        'process.env.NODE_ENV':                  '"production"',
        'import.meta.env.VITE_SUPABASE_URL':     JSON.stringify(process.env.VITE_SUPABASE_URL     || ''),
        'import.meta.env.VITE_SUPABASE_ANON_KEY':JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY|| ''),
        'import.meta.env.MODE':                  '"production"',
        'import.meta.env.DEV':                   'false',
        'import.meta.env.PROD':                  'true',
        'import.meta.env.BASE_URL':              '"/"',
      },
      loader: { '.tsx': 'tsx', '.ts': 'ts', '.jsx': 'jsx', '.js': 'js' },
      plugins: [cssNoopPlugin],
      logLevel: 'silent',
    });

    const js = result.outputFiles[0]?.text ?? '';
    let html = wrapInHTML(js, isEditMode);
    
    // Inject badge if requested (for deployments)
    if (shouldInjectBadge) {
      html = injectBadge(html, badgeOptions);
    }
    
    return html;

  } catch (err) {
    const error = new Error(err?.message || 'Preview build failed');
    error.previewHtml = errorHTML(error.message);
    throw error;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

function wrapInHTML(js, isEditMode = false) {
  const visualEditScript = isEditMode ? `
    <script>
      document.addEventListener('mouseover', (e) => {
        const target = e.target.closest('*');
        if (target) target.classList.add('huggy-hover');
      });
      document.addEventListener('mouseout', (e) => {
        const target = e.target.closest('*');
        if (target) target.classList.remove('huggy-hover');
      });
      document.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const target = e.target.closest('*');
        window.parent.postMessage({
          type: 'visual-edit-select',
          selector: target.tagName.toLowerCase(),
          text: target.innerText?.slice(0, 50) || ''
        }, '*');
      }, true);
    </script>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script type="importmap">${JSON.stringify(IMPORT_MAP)}</script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    *,body{margin:0;box-sizing:border-box;font-family:Inter,system-ui,sans-serif}
    .huggy-hover { outline: 2px solid #3b82f6 !important; cursor: pointer !important; }
  </style>
  ${visualEditScript}
</head>
<body>
  <div id="root"></div>
  <script type="module">
${js}
  </script>
</body>
</html>`;
}

function errorHTML(message) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body{margin:0;background:#0a0a0b;color:#f87171;font-family:monospace;padding:24px}
  pre{white-space:pre-wrap;word-break:break-word;font-size:13px}
  h2{margin:0 0 12px;font-size:14px;color:#fca5a5}
</style></head>
<body>
  <h2>⚠ Preview build error</h2>
  <pre>${message.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>
</body>
</html>`;
}
