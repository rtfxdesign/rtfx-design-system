// Gallery frame management for Studio.
//
// A frame number is an accession number: it belongs to its media file
// permanently. Numbers are never renumbered and never reused, so a link or a
// tag written against one stays valid.
//
// Metadata lives in frames.json, not inside the image files. The web copies are
// resized through ffmpeg, which drops EXIF, and thumbnails are generated with
// -strip - anything stored in the file itself is lost on the next pass. So EXIF
// is read from the ORIGINAL upload before any processing touches it.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const workspaceDir = path.resolve(__dirname, '..');
const siteDir = path.join(workspaceDir, 'site');
const galleryHtmlPath = path.join(siteDir, 'gallery', 'index.html');
const framesPath = path.join(siteDir, 'gallery', 'frames.json');
const galleryMediaDir = path.join(siteDir, 'assets', 'gallery');
const galleryThumbDir = path.join(galleryMediaDir, 'thumbs');

const PUBLIC = 'https://rtfx.space/';

function readFrames() {
  return JSON.parse(fs.readFileSync(framesPath, 'utf8'));
}
function writeFrames(data) {
  fs.writeFileSync(framesPath, JSON.stringify(data, null, 1));
}

// ---- metadata -------------------------------------------------------------

function magick(args) {
  try {
    return execFileSync('magick', args, { stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 20 })
      .toString().trim();
  } catch (e) { return ''; }
}

function dmsToDecimal(dms, ref) {
  // ImageMagick reports GPS as "39/1, 17/1, 2934/100"
  const parts = String(dms).split(',').map(p => {
    const [a, b] = p.trim().split('/').map(Number);
    return b ? a / b : a;
  });
  if (!parts.length || parts.some(isNaN)) return null;
  const dec = (parts[0] || 0) + (parts[1] || 0) / 60 + (parts[2] || 0) / 3600;
  if (!isFinite(dec)) return null;
  return /^[SW]$/i.test(ref || '') ? -dec : dec;
}

// Read date and GPS from the untouched upload, before ffmpeg discards them.
// originalName matters: the upload is sitting under a generated temp name, so
// the filename fallback has to read the name the file arrived with.
function extractMeta(originalPath, originalName) {
  const raw = magick(['identify', '-format',
    '%[EXIF:DateTimeOriginal]|%[EXIF:DateTime]|%[EXIF:GPSLatitude]|%[EXIF:GPSLatitudeRef]|%[EXIF:GPSLongitude]|%[EXIF:GPSLongitudeRef]',
    originalPath]);
  const [dto, dt, lat, latRef, lon, lonRef] = raw.split('|');

  let date = null, dateSource = null;
  const stamp = (dto || dt || '').trim();
  const m = /^(\d{4}):(\d{2}):(\d{2})/.exec(stamp);
  if (m) { date = `${m[1]}-${m[2]}-${m[3]}`; dateSource = 'exif'; }

  let gps = null;
  if (lat && lon) {
    const la = dmsToDecimal(lat, latRef), lo = dmsToDecimal(lon, lonRef);
    if (la !== null && lo !== null) gps = { lat: +la.toFixed(6), lon: +lo.toFixed(6) };
  }

  // fall back to a date encoded in the filename
  if (!date) {
    const base = path.basename(originalName || originalPath);
    const f = /(\d{4})(\d{2})(\d{2})/.exec(base);
    if (f && +f[1] >= 1990 && +f[1] <= 2100) { date = `${f[1]}-${f[2]}-${f[3]}`; dateSource = 'filename'; }
  }
  return { date, dateSource, gps };
}

// ---- html ------------------------------------------------------------------

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function figureHtml({ num, thumbUrl, w, h, alt, cat }) {
  return `<figure class="ai" data-cat="${esc(cat || 'studio')}" id="f${num}" data-frame="${num}">`
    + `<span class="in"><span class="ph">`
    + `<img src="${esc(thumbUrl)}" width="${w}" height="${h}" decoding="async" alt="${esc(alt)}" loading="lazy">`
    + `</span><figcaption><span class="micro">${num}</span></figcaption></span></figure>`;
}

function insertFigure(html, figure) {
  // newest first, so a fresh upload is visible without scrolling 254 frames
  const open = html.indexOf('<div class="arch">');
  if (open === -1) throw new Error('gallery grid container not found');
  const at = html.indexOf('>', open) + 1;
  return html.slice(0, at) + '\n' + figure + html.slice(at);
}

function removeFigure(html, num) {
  const re = new RegExp(`\\n?<figure class="ai"[^>]*data-frame="${num}"[\\s\\S]*?<\\/figure>`);
  if (!re.test(html)) return null;
  return html.replace(re, '');
}

function syncCount(html) {
  const n = (html.match(/<figure class="ai"/g) || []).length;
  return html.replace(/(<span class="dot"><\/span>)\s*\d+\s*frames/, `$1${n} frames`);
}

function dims(file) {
  const out = magick(['identify', '-format', '%w %h', file]).split(/\s+/);
  const w = +out[0], h = +out[1];
  return (w && h) ? { w, h } : null;
}

// ---- operations ------------------------------------------------------------

function nextNumber(data) {
  // never reuse: take the highest ever issued, not the count
  const used = Object.keys(data.frames).map(Number).filter(n => !isNaN(n));
  const declared = parseInt(data.nextFree, 10);
  const high = used.length ? Math.max(...used) : 0;
  return String(Math.max(high + 1, isNaN(declared) ? 0 : declared)).padStart(3, '0');
}

/**
 * Add one image to the gallery.
 * @param optimizeImage (input, webpOut, jpgOut|null, maxEdge) - injected from server.js
 */
function addFrame({ tempPath, originalName, alt, cat, location, tags, optimizeImage }) {
  if (!fs.existsSync(tempPath)) throw new Error('upload not found');
  fs.mkdirSync(galleryMediaDir, { recursive: true });
  fs.mkdirSync(galleryThumbDir, { recursive: true });

  // BEFORE any processing - ffmpeg will not preserve this
  const meta = extractMeta(tempPath, originalName);

  const data = readFrames();
  const num = nextNumber(data);
  const slug = path.basename(originalName || 'frame', path.extname(originalName || ''))
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'frame';
  const name = `${num}-${slug}.webp`;

  const fullPath = path.join(galleryMediaDir, name);
  const thumbPath = path.join(galleryThumbDir, name);

  optimizeImage(tempPath, fullPath, null, 1920);
  optimizeImage(tempPath, thumbPath, null, 640);
  if (!fs.existsSync(fullPath) || !fs.existsSync(thumbPath)) throw new Error('image processing failed');

  const d = dims(thumbPath) || { w: 640, h: 427 };
  const rel = `assets/gallery/${name}`;
  const thumbUrl = `${PUBLIC}assets/gallery/thumbs/${name}`;

  let html = fs.readFileSync(galleryHtmlPath, 'utf8');
  html = insertFigure(html, figureHtml({
    num, thumbUrl, w: d.w, h: d.h,
    alt: alt || slug.replace(/-/g, ' '), cat: cat || 'studio'
  }));
  html = syncCount(html);
  fs.writeFileSync(galleryHtmlPath, html);

  data.frames[num] = {
    file: rel,
    date: meta.date,
    dateSource: meta.dateSource,
    location: location || null,
    gps: meta.gps || null,
    tags: Array.isArray(tags) ? tags : (tags ? String(tags).split(',').map(s => s.trim()).filter(Boolean) : [])
  };
  data.nextFree = String(Number(num) + 1).padStart(3, '0');
  writeFrames(data);

  return { frame: num, record: data.frames[num], exifFound: !!meta.date || !!meta.gps };
}

function updateFrame(num, patch) {
  const data = readFrames();
  const rec = data.frames[num];
  if (!rec) throw new Error(`frame ${num} not found`);
  if ('date' in patch) { rec.date = patch.date || null; rec.dateSource = patch.date ? 'manual' : null; }
  if ('location' in patch) rec.location = patch.location || null;
  if ('tags' in patch) {
    rec.tags = Array.isArray(patch.tags) ? patch.tags
      : String(patch.tags || '').split(',').map(s => s.trim()).filter(Boolean);
  }
  writeFrames(data);
  return rec;
}

function deleteFrame(num) {
  const data = readFrames();
  const rec = data.frames[num];
  if (!rec) throw new Error(`frame ${num} not found`);

  let html = fs.readFileSync(galleryHtmlPath, 'utf8');
  const next = removeFigure(html, num);
  if (next === null) throw new Error(`frame ${num} is not on the page`);
  fs.writeFileSync(galleryHtmlPath, syncCount(next));

  // only delete media this frame introduced, and only if nothing else uses it
  if (/^assets\/gallery\//.test(rec.file)) {
    const still = Object.entries(data.frames).some(([k, v]) => k !== num && v.file === rec.file);
    if (!still) {
      const base = path.basename(rec.file);
      for (const p of [path.join(galleryMediaDir, base), path.join(galleryThumbDir, base)]) {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
    }
  }
  // the record is retired, not removed, so the number can never be reissued
  delete data.frames[num];
  data.retired = Array.from(new Set([...(data.retired || []), num])).sort();
  writeFrames(data);
  return { frame: num, removed: true };
}

function listFrames() {
  const data = readFrames();
  return {
    nextFree: data.nextFree,
    count: Object.keys(data.frames).length,
    frames: Object.entries(data.frames)
      .sort((a, b) => Number(b[0]) - Number(a[0]))
      .map(([num, r]) => ({ frame: num, ...r }))
  };
}

module.exports = { listFrames, addFrame, updateFrame, deleteFrame, extractMeta, readFrames };
