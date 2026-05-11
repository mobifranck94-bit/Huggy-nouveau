/**
 * SandpackPreview — alternative preview powered by @codesandbox/sandpack-react.
 * Provides instant hot reload + in-browser bundling, no server round-trip needed.
 *
 * Used as an OPTIONAL mode alongside the existing esbuild iframe preview.
 * Falls back gracefully on errors.
 */

import { useMemo } from 'react';
import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview as SP,
  SandpackCodeEditor,
} from '@codesandbox/sandpack-react';

interface FileEntry {
  path: string;
  content: string;
}

interface SandpackPreviewProps {
  files: FileEntry[];
  showEditor?: boolean;
  /** If true, the preview takes the full container height */
  fullHeight?: boolean;
}

// Files Sandpack should NOT receive (server-side / not bundleable)
function isClientFile(filePath: string): boolean {
  if (filePath.startsWith('supabase/')) return false;
  if (filePath === 'README.md') return false;
  if (filePath.endsWith('.sql')) return false;
  return true;
}

// Files Sandpack always needs to render a working React app
const REQUIRED_FILES = {
  '/index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://cdn.tailwindcss.com"></script>
    <style>body{margin:0;font-family:Inter,system-ui,sans-serif;background:#0a0a0b;color:#f4f4f5;}</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
  '/src/main.tsx': `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
const root = document.getElementById('root');
if (root) createRoot(root).render(<React.StrictMode><App /></React.StrictMode>);`,
};

export default function SandpackPreview({ files, showEditor = false, fullHeight = true }: SandpackPreviewProps) {
  // Build the Sandpack file map: prepend "/" for absolute paths Sandpack expects.
  const sandpackFiles = useMemo(() => {
    const map: Record<string, { code: string }> = { ...Object.fromEntries(
      Object.entries(REQUIRED_FILES).map(([k, v]) => [k, { code: v }])
    ) };

    for (const f of files) {
      if (!isClientFile(f.path)) continue;
      const key = f.path.startsWith('/') ? f.path : `/${f.path}`;
      map[key] = { code: f.content };
    }

    // Sandpack expects /src/App.tsx; if user generated /App.tsx, alias it.
    if (!map['/src/App.tsx'] && map['/App.tsx']) {
      map['/src/App.tsx'] = map['/App.tsx'];
    }

    return map;
  }, [files]);

  // If we couldn't find an App.tsx, render a friendly placeholder
  if (!sandpackFiles['/src/App.tsx']) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0a0b] text-zinc-400 text-sm">
        <div className="text-center">
          <p className="mb-1">Aucun src/App.tsx trouvé.</p>
          <p className="text-xs text-zinc-600">Génère une app pour activer le preview Sandpack.</p>
        </div>
      </div>
    );
  }

  return (
    <SandpackProvider
      template="react-ts"
      theme="dark"
      files={sandpackFiles}
      customSetup={{
        dependencies: {
          'react': '^19.0.0',
          'react-dom': '^19.0.0',
          'lucide-react': 'latest',
          'motion': '^12.0.0',
          '@supabase/supabase-js': '^2.0.0',
        },
      }}
      options={{
        recompileMode: 'delayed',
        recompileDelay: 400,
      }}
      style={fullHeight ? { height: '100%' } : undefined}
    >
      <SandpackLayout style={fullHeight ? { height: '100%' } : undefined}>
        {showEditor && (
          <SandpackCodeEditor
            showTabs
            showLineNumbers
            showInlineErrors
            wrapContent
            style={{ height: '100%' }}
          />
        )}
        <SP
          showNavigator
          showRefreshButton
          showOpenInCodeSandbox={false}
          style={{ height: '100%' }}
        />
      </SandpackLayout>
    </SandpackProvider>
  );
}
