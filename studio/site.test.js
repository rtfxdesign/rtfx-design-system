const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const siteDir = path.resolve(__dirname, '../site');

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && entry.name === '.netlify') return [];
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function localTarget(fromFile, rawUrl) {
  const url = rawUrl.trim().replace(/&amp;/g, '&').split(/[?#]/, 1)[0];
  if (!url || /^(?:[a-z]+:|#|\/\/)/i.test(url)) return null;
  let decoded;
  try { decoded = decodeURIComponent(url); }
  catch { return { rawUrl, resolved: 'invalid URL encoding' }; }
  const resolved = decoded.startsWith('/')
    ? path.join(siteDir, decoded.replace(/^\/+/, ''))
    : path.resolve(path.dirname(fromFile), decoded);
  return { rawUrl, resolved };
}

test('published HTML and CSS local media references resolve', () => {
  const missing = [];
  const files = walk(siteDir).filter((file) => /\.(?:html|css)$/i.test(file)
    && path.basename(file) !== '_preview.html'
    && !file.startsWith(path.join(siteDir, 'process') + path.sep));

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const references = [];
    for (const match of source.matchAll(/\b(?:src|poster|href)\s*=\s*["']([^"']+)["']/gi)) references.push(match[1]);
    for (const match of source.matchAll(/\bsrcset\s*=\s*["']([^"']+)["']/gi)) {
      match[1].split(',').forEach((entry) => references.push(entry.trim().split(/\s+/, 1)[0]));
    }
    for (const match of source.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) references.push(match[1]);

    for (const reference of references) {
      const target = localTarget(file, reference);
      if (!target) continue;
      const exists = fs.existsSync(target.resolved)
        || fs.existsSync(path.join(target.resolved, 'index.html'));
      if (!exists) missing.push(`${path.relative(siteDir, file)} -> ${target.rawUrl}`);
    }
  }

  assert.deepEqual(missing, [], `Missing local references:\n${missing.join('\n')}`);
});
