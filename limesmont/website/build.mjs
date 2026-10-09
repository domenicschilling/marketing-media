// Statischer Seitengenerator für limesmont.de – ohne Abhängigkeiten.
// Aufruf: node build.mjs   →  schreibt alle HTML-Seiten nach ./public
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE } from './src/config.mjs';
import { layout, makeCtx } from './src/layout.mjs';
import { PAGES } from './src/pages.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(root, 'public');
const write = (rel, content) => {
  const file = path.join(out, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
};

const warnings = [];
for (const page of PAGES) {
  const html = layout(page, makeCtx(page));
  const rel = page.file || path.join(page.path, 'index.html');
  write(rel, html);
  const todos = html.match(/class="todo"/g)?.length || 0;
  if (todos) warnings.push(`${rel}: ${todos} offene Pflichtangabe(n)`);
}

const today = new Date().toISOString().slice(0, 10);
const indexable = PAGES.filter((p) => !p.noindex);
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable.map((p) => `  <url><loc>${SITE.url}/${p.path}</loc><lastmod>${today}</lastmod><priority>${p.path === '' ? '1.0' : p.path.split('/').length > 2 ? '0.8' : '0.6'}</priority></url>`).join('\n')}
</urlset>
`);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`);
write('site.webmanifest', JSON.stringify({
  name: SITE.name, short_name: SITE.brand, lang: 'de', start_url: '/', display: 'standalone',
  background_color: '#10221A', theme_color: '#10221A',
  icons: [{ src: '/assets/img/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/assets/img/icon-512.png', sizes: '512x512', type: 'image/png' }],
}, null, 2));

console.log(`✓ ${PAGES.length} Seiten nach ${path.relative(process.cwd(), out) || '.'} geschrieben`);
if (warnings.length) console.warn('⚠ Vor dem Go-live ergänzen:\n  ' + warnings.join('\n  '));
