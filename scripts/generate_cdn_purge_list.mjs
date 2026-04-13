/**
 * Generate CDN purge URLs from current dist build.
 * Usage:
 *   node scripts/generate_cdn_purge_list.mjs --base https://www.example.com[/subpath]
 *
 * Outputs a list of URLs (index.html + referenced hashed assets) one per line.
 */
import fs from 'node:fs';
import path from 'node:path';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--base') {
      out.base = args[i + 1]; i++;
    } else if (a.startsWith('--base=')) {
      out.base = a.split('=')[1];
    }
  }
  return out;
}

function normalizeBase(base) {
  let b = String(base || '').trim();
  if (!b) throw new Error('Missing --base. Example: --base https://www.a1go.top');
  if (!/^https?:\/\//i.test(b)) throw new Error('Base must start with http:// or https://');
  // ensure single trailing slash
  if (b.endsWith('/')) b = b.replace(/\/+$/, '/');
  else b = b + '/';
  return b;
}

function readIndex(distDir) {
  const p = path.join(distDir, 'index.html');
  const s = fs.readFileSync(p, 'utf-8');
  return s;
}

function extractAssets(html) {
  const urls = new Set();
  // <script type="module" crossorigin src="/assets/index-XXXX.js"></script>
  for (const m of html.matchAll(/<script[^>]*\ssrc="([^"]+)"/gi)) {
    urls.add(m[1]);
  }
  // <link rel="stylesheet" crossorigin href="/assets/index-XXXX.css">
  for (const m of html.matchAll(/<link[^>]*\shref="([^"]+)"/gi)) {
    urls.add(m[1]);
  }
  return Array.from(urls).filter(u => u.startsWith('/assets/'));
}

function main() {
  const { base } = parseArgs();
  const B = normalizeBase(base);
  const distDir = path.join(process.cwd(), 'dist');
  const html = readIndex(distDir);
  const assets = extractAssets(html);
  const list = [B + 'index.html', ...assets.map(a => (B.endsWith('/') ? B.slice(0, -1) : B) + a)];
  for (const u of list) process.stdout.write(u + '\n');
}

try {
  main();
} catch (err) {
  process.stderr.write((err && err.message) ? String(err.message) : String(err) + '\n');
  process.exit(1);
}

