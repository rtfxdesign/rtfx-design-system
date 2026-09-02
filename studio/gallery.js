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

// Video frames live on R2 and are served from media.rtfx.space - an mp4 never
// ships inside site/ (it would ride every Netlify deploy). Only the poster
// still is kept locally, like any other gallery image.
const R2_REMOTE = 'r2:rtfx-portfolio';
const R2_PUBLIC = 'https://media.rtfx.space/';

// The config path is passed explicitly. When Studio runs as a Windows service
// (LocalSystem) it cannot read the per-user rclone.conf inside the profile even
// with APPDATA overridden, so a copy lives in C:\ProgramData\rtfx (ACL'd to
// allen + SYSTEM + Administrators). Falls back to the per-user default when the
// ProgramData copy is absent (running Studio by hand on another machine).
const RCLONE_CONF = [
  'C:\\ProgramData\\rtfx\\rclone.conf',
  path.join(process.env.APPDATA || '', 'rclone', 'rclone.conf')
].find(p => { try { return fs.existsSync(p); } catch { return false; } }) || 'C:\\ProgramData\\rtfx\\rclone.conf';

function r2Copy(localPath, key) {
  execFileSync('rclone', ['--config', RCLONE_CONF, 'copyto', localPath, `${R2_REMOTE}/${key}`],
    { stdio: ['ignore', 'ignore', 'pipe'], maxBuffer: 1 << 20 });
}
function r2Delete(key) {
  try {
    execFileSync('rclone', ['--config', RCLONE_CONF, 'deletefile', `${R2_REMOTE}/${key}`], { stdio: 'ignore' });
  } catch { /* already gone */ }
}

const VIDEO_EXT = /\.(mp4|mov|m4v|webm|avi)$/i;

const eventsPath = path.join(siteDir, 'gallery', 'events.json');

function readFrames() {
  return JSON.parse(fs.readFileSync(framesPath, 'utf8'));
}
function writeFrames(data) {
  fs.writeFileSync(framesPath, JSON.stringify(data, null, 1));
}

// ---- events ----------------------------------------------------------------
// An event is the unit that actually carries meaning: date, location and a
// short summary, taken from the invoice for the job. That beats per-photo EXIF
// on every count - it is authoritative, it is already written down, and it
// survives the fact that these files carry no EXIF at all. A frame inherits
// from its event and only stores its own value when it genuinely differs.

function readEvents() {
  if (!fs.existsSync(eventsPath)) {
    return { note: 'Events for the gallery. Date, location and summary come from the invoice for the job, not from photo metadata. Frames reference an event by key and inherit its values.', events: {} };
  }
  return JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
}
function writeEvents(data) {
  fs.writeFileSync(eventsPath, JSON.stringify(data, null, 1));
}

function eventKey(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function upsertEvent({ key, name, date, location, summary, client }) {
  const data = readEvents();
  const k = key || eventKey(name);
  if (!k) throw new Error('event needs a name');
  const prev = data.events[k] || {};
  data.events[k] = {
    name: name || prev.name || k,
    date: date !== undefined ? (date || null) : (prev.date || null),
    location: location !== undefined ? (location || null) : (prev.location || null),
    summary: summary !== undefined ? (summary || null) : (prev.summary || null),
    client: client !== undefined ? (client || null) : (prev.client || null)
  };
  writeEvents(data);
  return { key: k, ...data.events[k] };
}

function deleteEvent(key) {
  const data = readEvents();
  if (!data.events[key]) throw new Error('event not found: ' + key);
  const frames = readFrames();
  const inUse = Object.values(frames.frames).filter(f => f.event === key).length;
  if (inUse) throw new Error(`${inUse} frame(s) still reference this event`);
  delete data.events[key];
  writeEvents(data);
  return { key, removed: true };
}

// what a frame effectively shows, after inheriting from its event
function resolveFrame(num, rec, events) {
  const ev = rec.event ? events[rec.event] : null;
  return {
    frame: num, ...rec,
    eventName: ev ? ev.name : null,
    resolvedDate: rec.date || (ev && ev.date) || null,
    resolvedLocation: rec.location || (ev && ev.location) || null,
    inherited: {
      date: !rec.date && !!(ev && ev.date),
      location: !rec.location && !!(ev && ev.location)
    }
  };
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

// Matches the markup the live video frames (272+) already use: the figure
// stays class="ai" so the count/remove regexes and filters treat it like any
// frame; the inner .ph picks up .vid so site.js wires the play button.
function videoFigureHtml({ num, videoUrl, posterUrl, alt, cat, sound }) {
  return `<figure class="ai" data-cat="${esc(cat || 'studio')}" id="f${num}" data-frame="${num}">`
    + `<span class="in"><span class="ph vid">`
    + `<video src="${esc(videoUrl)}" poster="${esc(posterUrl)}" preload="metadata"${sound ? ' data-sound="1"' : ' muted'} loop playsinline aria-label="${esc(alt)}"></video>`
    + `<button class="vplay" type="button" aria-pressed="false">▶ Play clip</button>`
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
function addFrame({ tempPath, originalName, alt, cat, location, tags, eventName, optimizeImage }) {
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
  // an event import names the frame after the event; a loose upload falls
  // back to the filename (a camera name like "img-0215" is still better than nothing)
  html = insertFigure(html, figureHtml({
    num, thumbUrl, w: d.w, h: d.h,
    alt: alt || (eventName ? `${eventName} — frame ${num}` : slug.replace(/-/g, ' ')), cat: cat || 'studio'
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

/**
 * Add one video clip to the gallery. The processed mp4 is pushed to R2 before
 * anything on the page or in frames.json mentions it - if the upload fails,
 * the frame simply never existed. keepAudio follows the source: a clip with a
 * track keeps it and is marked sound, so site.js lets it play audible.
 * @param optimizeVideo (input, mp4Out, posterOut, {keepAudio}) - injected from server.js
 * @param hasAudioTrack (input) => bool - injected from server.js
 */
function addVideoFrame({ tempPath, originalName, alt, cat, location, tags, eventName, optimizeVideo, hasAudioTrack }) {
  if (!fs.existsSync(tempPath)) throw new Error('upload not found');
  fs.mkdirSync(galleryMediaDir, { recursive: true });

  // filename date fallback still applies; video files carry no EXIF magick can read
  const meta = extractMeta(tempPath, originalName);

  const data = readFrames();
  const num = nextNumber(data);
  const slug = path.basename(originalName || 'clip', path.extname(originalName || ''))
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'clip';
  const base = `${num}-${slug}`;

  const posterPath = path.join(galleryMediaDir, `${base}-poster.webp`);
  const tmpMp4 = path.join(require('os').tmpdir(), `rtfx-gallery-${base}.mp4`);
  const sound = hasAudioTrack(tempPath);
  try {
    optimizeVideo(tempPath, tmpMp4, posterPath, { keepAudio: sound });
    if (!fs.existsSync(tmpMp4) || !fs.existsSync(posterPath)) throw new Error('video processing failed');
    r2Copy(tmpMp4, `assets/gallery/${base}.mp4`);
  } catch (e) {
    if (fs.existsSync(posterPath)) fs.unlinkSync(posterPath);
    throw e;
  } finally {
    if (fs.existsSync(tmpMp4)) fs.unlinkSync(tmpMp4);
  }

  let html = fs.readFileSync(galleryHtmlPath, 'utf8');
  html = insertFigure(html, videoFigureHtml({
    num,
    videoUrl: `${R2_PUBLIC}assets/gallery/${base}.mp4`,
    posterUrl: `${PUBLIC}assets/gallery/${base}-poster.webp`,
    alt: alt || (eventName ? `${eventName} — motion` : slug.replace(/-/g, ' ')), cat: cat || 'studio', sound
  }));
  html = syncCount(html);
  fs.writeFileSync(galleryHtmlPath, html);

  data.frames[num] = {
    file: `assets/gallery/${base}.mp4`,
    date: meta.date,
    dateSource: meta.dateSource,
    location: location || null,
    gps: meta.gps || null,
    sound,
    tags: Array.isArray(tags) ? tags : (tags ? String(tags).split(',').map(s => s.trim()).filter(Boolean) : [])
  };
  data.nextFree = String(Number(num) + 1).padStart(3, '0');
  writeFrames(data);

  return { frame: num, record: data.frames[num], exifFound: !!meta.date, video: true, sound };
}

function updateFrame(num, patch) {
  const data = readFrames();
  const rec = data.frames[num];
  if (!rec) throw new Error(`frame ${num} not found`);
  if ('date' in patch) { rec.date = patch.date || null; rec.dateSource = patch.date ? 'manual' : null; }
  if ('location' in patch) rec.location = patch.location || null;
  if ('event' in patch) rec.event = patch.event || null;
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
      if (VIDEO_EXT.test(rec.file)) {
        // the clip lives on R2; the poster is the only local file
        r2Delete(rec.file);
        const poster = path.basename(rec.file, path.extname(rec.file)) + '-poster.webp';
        for (const p of [path.join(galleryMediaDir, poster), path.join(galleryThumbDir, poster)]) {
          if (fs.existsSync(p)) fs.unlinkSync(p);
        }
      } else {
        const base = path.basename(rec.file);
        for (const p of [path.join(galleryMediaDir, base), path.join(galleryThumbDir, base)]) {
          if (fs.existsSync(p)) fs.unlinkSync(p);
        }
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
  const events = readEvents().events;
  return {
    nextFree: data.nextFree,
    count: Object.keys(data.frames).length,
    events: Object.entries(events).map(([key, e]) => ({ key, ...e })),
    frames: Object.entries(data.frames)
      .sort((a, b) => Number(b[0]) - Number(a[0]))
      .map(([num, r]) => resolveFrame(num, r, events))
  };
}

/**
 * Bulk-import a folder of images as one event.
 *
 * Built for Lightroom collections: export a collection to its own folder with
 * "Metadata: All" and location info left in, then point this at the folder. The
 * folder name becomes the event unless one is given. Reading the folder locally
 * beats a browser multi-upload - Studio is a local tool, and these run to
 * hundreds of files.
 */
function importFolder({ folder, event, date, location, summary, client, tags, cat, optimizeImage, optimizeVideo, hasAudioTrack, onProgress }) {
  if (!folder || !fs.existsSync(folder)) throw new Error('folder not found: ' + folder);
  const stat = fs.statSync(folder);
  if (!stat.isDirectory()) throw new Error('not a folder: ' + folder);

  const eventName = (event || path.basename(folder)).trim();
  // create or update the event from the invoice details supplied with the import
  const ev = upsertEvent({ name: eventName, date, location, summary, client });
  // video clips ride along when the processors are supplied (they always are
  // from the server route; older callers that pass only optimizeImage still work)
  const files = fs.readdirSync(folder)
    .filter(f => /\.(jpe?g|png|webp|tiff?)$/i.test(f) || (optimizeVideo && VIDEO_EXT.test(f)))
    .sort();
  if (!files.length) throw new Error('no media in ' + folder);

  const added = [], failed = [];
  files.forEach((name, idx) => {
    const src = path.join(folder, name);
    try {
      // copy to a temp path so addFrame's cleanup never touches the source
      const tmp = path.join(require('os').tmpdir(), `rtfx-import-${Date.now()}-${idx}${path.extname(name)}`);
      fs.copyFileSync(src, tmp);
      let out;
      try {
        // location is left on the event, not copied onto every frame
        out = VIDEO_EXT.test(name)
          ? addVideoFrame({ tempPath: tmp, originalName: name, alt: '', cat, location: null, tags, eventName: ev.name, optimizeVideo, hasAudioTrack })
          : addFrame({ tempPath: tmp, originalName: name, alt: '', cat, location: null, tags, eventName: ev.name, optimizeImage });
      } finally {
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      }
      // stamp the event key on the record the import created
      const data = readFrames();
      data.frames[out.frame].event = ev.key;
      writeFrames(data);
      added.push({ frame: out.frame, name, date: out.record.date, exif: out.exifFound });
    } catch (e) {
      failed.push({ name, error: e.message });
    }
    if (onProgress) onProgress(idx + 1, files.length, name);
  });

  return {
    event: ev.name, eventKey: ev.key, folder, total: files.length,
    added: added.length, failed: failed.length,
    withDate: added.filter(a => a.date).length,
    frames: added, errors: failed
  };
}

// Distinct events currently in use, for grouping and for the UI.
function listEvents() {
  const frames = readFrames().frames;
  const defs = readEvents().events;
  const counts = {};
  for (const r of Object.values(frames)) {
    const e = r.event || "(unfiled)";
    counts[e] = (counts[e] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({ key, count, ...(defs[key] || {}) }));
}

module.exports = { listFrames, addFrame, addVideoFrame, updateFrame, deleteFrame, extractMeta, readFrames,
  importFolder, listEvents, readEvents, upsertEvent, deleteEvent, eventKey };
