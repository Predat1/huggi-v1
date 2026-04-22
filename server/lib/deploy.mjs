import esbuild from 'esbuild';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { PREVIEW_ENTRY } from './projectsRepo.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..', '..');

/**
 * @param {Array<{ path: string, content: string }>} files
 * @param {string} outDir absolute path to publish (e.g. sites/abc123)
 * @param {Array<{key: string, value: string}>} secrets environment variables map
 */
export async function buildUserSiteToDir(files, outDir, secrets = []) {
  const map = Object.fromEntries(files.map((f) => [f.path.replace(/\\/g, '/'), f.content]));

  const entryPath = PREVIEW_ENTRY.replace(/\\/g, '/');
  if (!map[entryPath]) {
    const first = files.find((f) => f.path.endsWith('.tsx') || f.path.endsWith('.jsx'));
    if (!first) throw new Error(`Fichier d'entrée ${PREVIEW_ENTRY} introuvable.`);
    map[entryPath] = first.content;
  }

  const workId = `d-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const workDir = path.join(repoRoot, '.tmp-deploy', workId);
  await fs.mkdir(workDir, { recursive: true });

  try {
    // Write ALL project files so relative imports work across multiple files
    for (const [filePath, content] of Object.entries(map)) {
      // Skip internal huggy files
      if (filePath.startsWith('.huggy/')) continue;
      const dest = path.join(workDir, filePath);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.writeFile(dest, content, 'utf8');
    }

    // Main entry that mounts the React app
    const mainTsx = [
      `import React from 'react';`,
      `import { createRoot } from 'react-dom/client';`,
      `import App from './${entryPath}';`,
      ``,
      `createRoot(document.getElementById('root')!).render(`,
      `  <React.StrictMode><App /></React.StrictMode>`,
      `);`,
    ].join('\n');
    await fs.writeFile(path.join(workDir, 'main.tsx'), mainTsx, 'utf8');

    await fs.mkdir(outDir, { recursive: true });

    await esbuild.build({
      absWorkingDir: workDir,
      entryPoints: [path.join(workDir, 'main.tsx')],
      bundle: true,
      outfile: path.join(outDir, 'bundle.js'),
      format: 'esm',
      jsx: 'automatic',
      minify: true,
      legalComments: 'none',
      define: {
        'process.env.NODE_ENV': '"production"',
        ...secrets.reduce((acc, s) => {
          acc[`import.meta.env.${s.key}`] = JSON.stringify(s.value);
          return acc;
        }, {}),
      },
      nodePaths: [path.join(repoRoot, 'node_modules')],
    });

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Huggy · preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="m-0">
  <div id="root"></div>
  <script type="module" src="./bundle.js"></script>
</body>
</html>`;
    await fs.writeFile(path.join(outDir, 'index.html'), html, 'utf8');
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}
