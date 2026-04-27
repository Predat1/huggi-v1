import esbuild from 'esbuild';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { PREVIEW_ENTRY } from './projectsRepo.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..', '..');

/**
 * Extracts React Router paths from files content.
 * @param {Array<{ path: string, content: string }>} files
 * @returns {string[]}
 */
function extractRoutesFromFiles(files) {
  const routes = new Set(['/']);
  for (const f of files) {
    if (!f.path.endsWith('.tsx') && !f.path.endsWith('.jsx')) continue;
    const routeRegex = /<Route[^>]*path=["']([^"']+)["']/g;
    let match;
    while ((match = routeRegex.exec(f.content)) !== null) {
      const p = match[1];
      if (!p.includes('*') && !p.includes(':')) {
        routes.add(p.startsWith('/') ? p : `/${p}`);
      }
    }
  }
  return Array.from(routes);
}

/**
 * Generates sitemap.xml content.
 * @param {string} domain
 * @param {string[]} routes
 * @returns {string}
 */
function generateSitemapXml(domain, routes) {
  const baseUrl = domain ? `https://${domain}` : 'https://votre-domaine.com';
  const urls = routes.map(r => `  <url>\n    <loc>${baseUrl}${r}</loc>\n    <changefreq>daily</changefreq>\n    <priority>${r === '/' ? '1.0' : '0.8'}</priority>\n  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

/**
 * Build user files into {html, bundle} strings.
 * @param {Array<{ path: string, content: string }>} files
 * @param {Array<{key: string, value: string}>} secrets
 * @param {boolean} showBadge - inject "Built with Huggy" badge (free tier)
 * @returns {Promise<{html: string, bundle: string}>}
 */
export async function buildUserSite(files, secrets = [], showBadge = false) {
  const map = Object.fromEntries(files.map((f) => [f.path.replace(/\\/g, '/'), f.content]));

  const entryPath = PREVIEW_ENTRY.replace(/\\/g, '/');
  if (!map[entryPath]) {
    const first = files.find((f) => f.path.endsWith('.tsx') || f.path.endsWith('.jsx'));
    if (!first) throw new Error(`Fichier d'entrée ${PREVIEW_ENTRY} introuvable.`);
    map[entryPath] = first.content;
  }

  const workId = `d-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const workDir = path.join(repoRoot, '.tmp-deploy', workId);
  const tempOut = path.join(workDir, '_out');
  await fs.mkdir(workDir, { recursive: true });
  await fs.mkdir(tempOut, { recursive: true });

  try {
    for (const [filePath, content] of Object.entries(map)) {
      if (filePath.startsWith('.huggy/')) continue;
      const dest = path.join(workDir, filePath);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.writeFile(dest, content, 'utf8');
    }

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

    await esbuild.build({
      absWorkingDir: workDir,
      entryPoints: [path.join(workDir, 'main.tsx')],
      bundle: true,
      outfile: path.join(tempOut, 'bundle.js'),
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

    const bundle = await fs.readFile(path.join(tempOut, 'bundle.js'), 'utf8');

    const badge = showBadge ? `
  <a href="https://huggy.app" target="_blank" rel="noopener" title="Built with Huggy AI"
     style="position:fixed;bottom:16px;right:16px;z-index:9999;display:flex;align-items:center;gap:6px;padding:6px 12px;background:rgba(15,23,42,0.85);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.1);border-radius:999px;text-decoration:none;font-family:system-ui,sans-serif;font-size:11px;font-weight:700;color:#fff;letter-spacing:0.03em;box-shadow:0 4px 20px rgba(0,0,0,0.3);transition:opacity 0.2s" onmouseover="this.style.opacity=0.8" onmouseout="this.style.opacity=1">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
    Built with Huggy
  </a>` : '';

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
  <script type="module" src="./bundle.js"></script>${badge}
</body>
</html>`;

    // Génération du sitemap
    const customDomainSecret = secrets.find(s => s.key === 'VITE_CUSTOM_DOMAIN');
    const domain = customDomainSecret ? customDomainSecret.value : '';
    const routes = extractRoutesFromFiles(files);
    const sitemap = generateSitemapXml(domain, routes);

    return { html, bundle, sitemap };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

/**
 * Build and write to a directory (filesystem cache).
 * @param {Array<{ path: string, content: string }>} files
 * @param {string} outDir
 * @param {Array<{key: string, value: string}>} secrets
 * @returns {Promise<{html: string, bundle: string, sitemap: string}>}
 */
export async function buildUserSiteToDir(files, outDir, secrets = [], showBadge = false) {
  const { html, bundle, sitemap } = await buildUserSite(files, secrets, showBadge);
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'index.html'), html, 'utf8');
  await fs.writeFile(path.join(outDir, 'bundle.js'), bundle, 'utf8');
  await fs.writeFile(path.join(outDir, 'sitemap.xml'), sitemap, 'utf8');
  return { html, bundle, sitemap };
}
