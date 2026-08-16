const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { generateArtPage } = require('./generator');

const app = express();
const PORT = process.env.PORT || 3000;

const workspaceDir = path.resolve(__dirname, '..');
const siteDir = path.join(workspaceDir, 'site');
const artJsonPath = path.join(siteDir, 'art', 'art.json');
const artMediaDir = path.join(siteDir, 'assets', 'art');
const tempUploadDir = path.join(__dirname, 'temp_uploads');
const workDir = path.join(siteDir, 'work');
const productionSiteId = process.env.NETLIFY_SITE_ID || '570ae585-ebd5-4f35-a1ca-aa8f1c9b00e5';
const productionUrl = process.env.PRODUCTION_URL || 'https://rtfx.space';
const allowedImageExtensions = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.tif', '.tiff', '.webp']);
const allowedVideoExtensions = new Set(['.avi', '.m4v', '.mov', '.mp4', '.webm']);

function resolveFfmpegPath() {
  const candidates = [
    process.env.FFMPEG_PATH,
    'C:\\Program Files\\HeavyM 2\\ffmpeg_standalone\\ffmpeg.exe'
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  try {
    const command = process.platform === 'win32' ? 'where.exe' : 'which';
    return execFileSync(command, ['ffmpeg'], { encoding: 'utf8' }).split(/\r?\n/).find(Boolean).trim();
  } catch {
    return 'ffmpeg';
  }
}

const ffmpegPath = resolveFfmpegPath();

function runFile(command, args, options = {}) {
  try {
    return execFileSync(command, args, {
      cwd: options.cwd || workspaceDir,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      stdio: options.stdio || ['ignore', 'pipe', 'pipe']
    });
  } catch (error) {
    const detail = String(error.stderr || error.stdout || error.message).trim();
    throw new Error(detail || `${command} failed.`);
  }
}

function runFfmpeg(args) {
  return runFile(ffmpegPath, ['-hide_banner', '-loglevel', 'error', ...args]);
}

function optimizeImage(inputPath, webpPath, jpegPath, maxEdge = 1920) {
  const scale = `scale=${maxEdge}:${maxEdge}:force_original_aspect_ratio=decrease`;
  runFfmpeg(['-y', '-i', inputPath, '-vf', scale, '-frames:v', '1', '-c:v', 'libwebp', '-quality', '84', '-compression_level', '6', webpPath]);
  if (jpegPath) {
    runFfmpeg(['-y', '-i', inputPath, '-vf', scale, '-frames:v', '1', '-q:v', '3', jpegPath]);
  }
}

function optimizeVideo(inputPath, videoPath, posterPath) {
  const videoScale = 'scale=1920:1080:force_original_aspect_ratio=decrease:force_divisible_by=2';
  runFfmpeg(['-y', '-i', inputPath, '-vf', videoScale, '-c:v', 'libx264', '-crf', '24', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', videoPath]);
  runFfmpeg(['-y', '-ss', '0.5', '-i', inputPath, '-vf', 'scale=1280:1280:force_original_aspect_ratio=decrease', '-frames:v', '1', '-c:v', 'libwebp', '-quality', '82', '-compression_level', '6', posterPath]);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&#(\d+);/g, (match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (match, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function plainText(value) {
  return decodeHtml(String(value ?? '').replace(/<[^>]*>/g, '')).trim();
}

function safeSlug(value) {
  const slug = String(value || '');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new Error('Invalid project slug.');
  return slug;
}

function safeArtId(value) {
  const id = String(value || '');
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('Invalid artwork id.');
  return id;
}

function removeFileIfInside(filePath, parentDir) {
  const resolvedFile = path.resolve(filePath);
  const resolvedParent = path.resolve(parentDir) + path.sep;
  if (resolvedFile.startsWith(resolvedParent) && fs.existsSync(resolvedFile)) fs.unlinkSync(resolvedFile);
}

if (!fs.existsSync(artMediaDir)) fs.mkdirSync(artMediaDir, { recursive: true });
if (!fs.existsSync(tempUploadDir)) fs.mkdirSync(tempUploadDir, { recursive: true });

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(siteDir, 'assets')));
app.use('/site', express.static(siteDir));
// Serve work media files
app.use('/work', express.static(workDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tempUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E6);
    cb(null, `upload-${unique}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 2000 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowed = allowedImageExtensions.has(extension) || allowedVideoExtensions.has(extension);
    cb(allowed ? null : new Error('Unsupported media format.'), allowed);
  }
});

// =====================================================================
//  ART API
// =====================================================================

app.get('/api/art', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(artJsonPath, 'utf8'));
    res.json({ success: true, artworks: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/upload', upload.single('mediaFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No media file provided.' });
  }

  const { title, category, tools, year, description, featured } = req.body;
  const tempPath = req.file.path;
  const originalExt = path.extname(req.file.originalname).toLowerCase();
  const baseName = `art-${Date.now()}`;
  const isVideo = allowedVideoExtensions.has(originalExt);

  console.log(`[Upload] Processing ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(2)} MB)...`);

  try {
    let finalSrc = '';
    let finalPoster = '';
    const mediaType = isVideo ? 'video' : 'image';

    if (isVideo) {
      const destVideo = path.join(artMediaDir, `${baseName}.mp4`);
      const destPoster = path.join(artMediaDir, `${baseName}-poster.webp`);
      optimizeVideo(tempPath, destVideo, destPoster);
      finalSrc = `../assets/art/${baseName}.mp4`;
      finalPoster = `../assets/art/${baseName}-poster.webp`;
    } else {
      const destWebp = path.join(artMediaDir, `${baseName}.webp`);
      const destJpg = path.join(artMediaDir, `${baseName}.jpg`);
      optimizeImage(tempPath, destWebp, destJpg);
      finalSrc = `../assets/art/${baseName}.webp`;
      finalPoster = `../assets/art/${baseName}.webp`;
    }

    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

    const artworks = JSON.parse(fs.readFileSync(artJsonPath, 'utf8'));
    const newArt = {
      id: baseName,
      title: title || 'Untitled Study',
      category: category || 'Generative & Spatial',
      year: year || new Date().getFullYear().toString(),
      tools: tools || 'TouchDesigner · Generative Systems',
      description: description || '',
      mediaType,
      src: finalSrc,
      poster: finalPoster,
      featured: featured === 'true' || featured === true,
      createdAt: new Date().toISOString()
    };

    artworks.unshift(newArt);
    fs.writeFileSync(artJsonPath, JSON.stringify(artworks, null, 2), 'utf8');
    generateArtPage();

    console.log(`[Upload] Successfully added "${newArt.title}"!`);
    res.json({ success: true, artwork: newArt });
  } catch (err) {
    console.error('[Upload Error]', err.message);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/art/:id', (req, res) => {
  try {
    const id = safeArtId(req.params.id);
    let artworks = JSON.parse(fs.readFileSync(artJsonPath, 'utf8'));
    const artwork = artworks.find(a => a.id === id);
    if (!artwork) return res.status(404).json({ success: false, error: 'Artwork not found.' });
    artworks = artworks.filter(a => a.id !== id);
    fs.writeFileSync(artJsonPath, JSON.stringify(artworks, null, 2), 'utf8');
    [`${id}.webp`, `${id}.jpg`, `${id}.mp4`, `${id}-poster.webp`]
      .forEach(filename => removeFileIfInside(path.join(artMediaDir, filename), artMediaDir));
    generateArtPage();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================================================================
//  PROJECTS API
// =====================================================================

// Helper: parse a project index.html into structured data
function parseProjectHtml(slug) {
  const htmlPath = path.join(workDir, slug, 'index.html');
  if (!fs.existsSync(htmlPath)) return null;
  const html = fs.readFileSync(htmlPath, 'utf8');

  function extract(re, group) {
    const m = html.match(re);
    return m ? plainText(m[group || 1]) : '';
  }

  // Title
  const title = extract(/<h1[^>]*class="display-l"[^>]*>([\s\S]*?)<\/h1>/);
  // Tagline
  const tagline = extract(/<p class="display-m"[^>]*>([\s\S]*?)<\/p>/);
  // Index number
  const idx = extract(/<span class="idx">(\d+)<\/span>/) || extract(/(\d{3})\s*·/);
  // Category from breadcrumb
  const category = extract(/\d{3}\s*·\s*([^<]+)<\/span>/);
  // Location, Timeframe, Role from csh-grid
  const location = extract(/<span class="k">(?:Location|Venue)<\/span>\s*<span class="v">([\s\S]*?)<\/span>/);
  const timeframe = extract(/<span class="k">Timeframe<\/span>\s*<span class="v">([\s\S]*?)<\/span>/);
  const role = extract(/<span class="k">Role<\/span>\s*<span class="v">([\s\S]*?)<\/span>/);
  // Lede / description
  const description = extract(/<p class="lede">([\s\S]*?)<\/p>/);
  // Challenge / Response / Outcome
  const challenge = extract(/<span class="micro k">Challenge<\/span>\s*<p>([\s\S]*?)<\/p>/);
  const response = extract(/<span class="micro k">Response<\/span>\s*<p>([\s\S]*?)<\/p>/);
  const outcome = extract(/<span class="micro k">Outcome<\/span>\s*<p>([\s\S]*?)<\/p>/);

  // Hero image src
  const heroImg = extract(/<figure class="hero-media[^>]*>[\s\S]*?<img src="([^"]+)"/)
    || extract(/<figure class="hero-media[^>]*>[\s\S]*?<video[^>]*poster="([^"]+)"/)
    || extract(/<figure class="hero-media[^>]*>[\s\S]*?<video[^>]*src="([^"]+)"/);

  // Stats
  const stats = [];
  const statRe = /<div><b>([\s\S]*?)<\/b><span>([\s\S]*?)<\/span><\/div>/g;
  let sm;
  while ((sm = statRe.exec(html)) !== null) {
    stats.push({ value: plainText(sm[1]), label: plainText(sm[2]) });
  }

  // Media files in the media/ subdirectory
  const mediaDir = path.join(workDir, slug, 'media');
  let mediaFiles = [];
  if (fs.existsSync(mediaDir)) {
    mediaFiles = fs.readdirSync(mediaDir)
      .filter(f => /\.(webp|jpg|jpeg|png|mp4|mov|webm)$/i.test(f))
      .map(f => ({
        filename: f,
        src: `media/${f}`,
        isVideo: /\.(mp4|mov|webm)$/i.test(f),
        poster: /\.mp4$/i.test(f) && fs.existsSync(path.join(mediaDir, f.replace(/\.mp4$/i, '-poster.webp')))
          ? `media/${f.replace(/\.mp4$/i, '-poster.webp')}`
          : ''
      }));
  }

  // Sections (after overview)
  const sections = [];
  const secRe = /<span class="sec-num">([\s\S]*?)<\/span>\s*<h2[^>]*class="display-m"[^>]*>([\s\S]*?)<\/h2>/g;
  let secm;
  while ((secm = secRe.exec(html)) !== null) {
    const num = plainText(secm[1]);
    const heading = plainText(secm[2]);
    if (num !== '00') {
      sections.push({ num, heading });
    }
  }

  return {
    slug, title, tagline, idx, category, location, timeframe, role,
    description, challenge, response, outcome, heroImg, stats,
    mediaFiles, sections
  };
}

// GET /api/projects — list all projects
app.get('/api/projects', (req, res) => {
  try {
    const slugs = fs.readdirSync(workDir).filter(d => {
      const p = path.join(workDir, d);
      return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'index.html'));
    });

    const projects = slugs.map(slug => parseProjectHtml(slug)).filter(Boolean);
    res.json({ success: true, projects });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/projects/:slug — get one project
app.get('/api/projects/:slug', (req, res) => {
  try {
    const project = parseProjectHtml(safeSlug(req.params.slug));
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/projects/:slug — update project fields
app.post('/api/projects/:slug', (req, res) => {
  try {
    const slug = safeSlug(req.params.slug);
    const htmlPath = path.join(workDir, slug, 'index.html');
    if (!fs.existsSync(htmlPath)) return res.status(404).json({ success: false, error: 'Project not found' });
    let html = fs.readFileSync(htmlPath, 'utf8');
    const d = req.body;

    function has(field) {
      return Object.prototype.hasOwnProperty.call(d, field) && typeof d[field] === 'string';
    }

    function replaceValue(re, value) {
      html = html.replace(re, (match, before, current, after) => `${before}${escapeHtml(value)}${after}`);
    }

    if (has('title')) {
      replaceValue(/(<h1[^>]*class="display-l"[^>]*>)([\s\S]*?)(<\/h1>)/, d.title);
      replaceValue(/(<title>)([\s\S]*?)(<\/title>)/, `${d.title} — RT/FX`);
      replaceValue(/(og:title"[^>]*content=")([\s\S]*?)(")/, `${d.title} — RT/FX`);
    }
    if (has('tagline')) replaceValue(/(<p class="display-m"[^>]*>)([\s\S]*?)(<\/p>)/, d.tagline);
    if (has('category')) replaceValue(/(\d{3}\s*·\s*)([^<]+)(<\/span>)/, d.category);
    if (has('location')) replaceValue(/(<span class="k">(?:Location|Venue)<\/span>\s*<span class="v">)([\s\S]*?)(<\/span>)/, d.location);
    if (has('timeframe')) replaceValue(/(<span class="k">Timeframe<\/span>\s*<span class="v">)([\s\S]*?)(<\/span>)/, d.timeframe);
    if (has('role')) replaceValue(/(<span class="k">Role<\/span>\s*<span class="v">)([\s\S]*?)(<\/span>)/, d.role);
    if (has('description')) {
      replaceValue(/(<p class="lede">)([\s\S]*?)(<\/p>)/, d.description);
      replaceValue(/(name="description"[^>]*content=")([\s\S]*?)(")/, d.description);
      replaceValue(/(og:description"[^>]*content=")([\s\S]*?)(")/, d.description);
    }
    if (has('challenge')) replaceValue(/(<span class="micro k">Challenge<\/span>\s*<p>)([\s\S]*?)(<\/p>)/, d.challenge);
    if (has('response')) replaceValue(/(<span class="micro k">Response<\/span>\s*<p>)([\s\S]*?)(<\/p>)/, d.response);
    if (has('outcome')) replaceValue(/(<span class="micro k">Outcome<\/span>\s*<p>)([\s\S]*?)(<\/p>)/, d.outcome);

    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log(`[Projects] Updated ${slug}`);

    // Also update homepage card if title or description changed
    if (has('title') || has('description') || has('category')) {
      updateHomepageCard(slug, d);
    }

    res.json({ success: true, project: parseProjectHtml(slug) });
  } catch (err) {
    console.error('[Projects Error]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper: update the homepage work card for a given slug
function updateHomepageCard(slug, data) {
  const homePath = path.join(siteDir, 'index.html');
  if (!fs.existsSync(homePath)) return;
  let home = fs.readFileSync(homePath, 'utf8');

  // Find the card block for this slug
  const cardRe = new RegExp(`(<a class="work" href="work/${slug}/index\\.html">)([\\s\\S]*?)(</a>)`);
  const match = home.match(cardRe);
  if (!match) return;

  let card = match[2];

  if (Object.prototype.hasOwnProperty.call(data, 'title')) {
    card = card.replace(/(<span class="wt">)([\s\S]*?)(<\/span>)/,
      (whole, before, current, after) => `${before}${escapeHtml(data.title)}${after}`);
  }
  if (Object.prototype.hasOwnProperty.call(data, 'description')) {
    card = card.replace(/(<span class="wd">)([\s\S]*?)(<\/span>)/,
      (whole, before, current, after) => `${before}${escapeHtml(data.description)}${after}`);
  }
  if (Object.prototype.hasOwnProperty.call(data, 'category')) {
    card = card.replace(/(<span class="micro cat">)([\s\S]*?)(<\/span>)/,
      (whole, before, current, after) => `${before}${escapeHtml(data.category)}${after}`);
  }

  home = home.replace(cardRe, (whole, before, current, after) => `${before}${card}${after}`);
  fs.writeFileSync(homePath, home, 'utf8');
  console.log(`[Projects] Updated homepage card for ${slug}`);
}

// POST /api/projects/:slug/hero — upload hero image
app.post('/api/projects/:slug/hero', upload.single('heroFile'), (req, res) => {
  try {
    const slug = safeSlug(req.params.slug);
    const projectDir = path.join(workDir, slug);
    if (!fs.existsSync(path.join(projectDir, 'index.html'))) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }
    if (!req.file) return res.status(400).json({ success: false, error: 'No file' });
    const mediaDir = path.join(projectDir, 'media');
    if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });
    const tempPath = req.file.path;
    const baseName = `hero-${slug}`;
    const destWebp = path.join(mediaDir, `${baseName}.webp`);
    const destJpg = path.join(mediaDir, `${baseName}.jpg`);
    const destCard = path.join(mediaDir, `${baseName}-card.webp`);

    optimizeImage(tempPath, destWebp, destJpg, 1920);
    optimizeImage(tempPath, destCard, null, 1200);

    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

    // Update project page hero
    const htmlPath = path.join(projectDir, 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    if (/<figure class="hero-media[^>]*>[\s\S]*?<img src="/.test(html)) {
      html = html.replace(/(<figure class="hero-media[^>]*>[\s\S]*?<img src=")([\s\S]*?)(")/,
        (whole, before, current, after) => `${before}media/${baseName}.webp${after}`);
    } else {
      html = html.replace(/(<figure class="hero-media[^>]*>[\s\S]*?<span class="ph chamfer">)[\s\S]*?(<\/span>)/,
        (whole, before, after) => `${before}<img src="media/${baseName}.webp" alt="Project hero" loading="eager">${after}`);
    }
    html = html.replace(/(og:image"[^>]*content=")([\s\S]*?)(")/,
      (whole, before, current, after) => `${before}${productionUrl}/work/${slug}/media/${baseName}.jpg${after}`);
    fs.writeFileSync(htmlPath, html, 'utf8');

    // Update homepage card thumbnail
    const homePath = path.join(siteDir, 'index.html');
    let home = fs.readFileSync(homePath, 'utf8');
    const thumbRe = new RegExp(`(href="work/${slug}/index\\.html">[\\s\\S]*?<img src=")(.*?)(")`);
    home = home.replace(thumbRe,
      (whole, before, current, after) => `${before}work/${slug}/media/${baseName}-card.webp${after}`);
    fs.writeFileSync(homePath, home, 'utf8');

    console.log(`[Projects] Updated hero for ${slug}`);
    res.json({ success: true, heroSrc: `media/${baseName}.webp`, cardSrc: `work/${slug}/media/${baseName}-card.webp` });
  } catch (err) {
    console.error('[Hero Upload Error]', err.message);
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/projects/:slug/media — upload additional media
app.post('/api/projects/:slug/media', upload.single('mediaFile'), (req, res) => {
  try {
    const slug = safeSlug(req.params.slug);
    const projectDir = path.join(workDir, slug);
    if (!fs.existsSync(path.join(projectDir, 'index.html'))) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }
    if (!req.file) return res.status(400).json({ success: false, error: 'No file' });
    const mediaDir = path.join(projectDir, 'media');
    if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });
    const tempPath = req.file.path;
    const originalExt = path.extname(req.file.originalname).toLowerCase();
    const cleanName = path.basename(req.file.originalname, originalExt).replace(/[^a-zA-Z0-9_-]/g, '_');
    const baseName = `${cleanName}-${Date.now()}`;
    const isVideo = allowedVideoExtensions.has(originalExt);
    let result = {};
    if (isVideo) {
      const destVideo = path.join(mediaDir, `${baseName}.mp4`);
      const destPoster = path.join(mediaDir, `${baseName}-poster.webp`);
      optimizeVideo(tempPath, destVideo, destPoster);
      result = { filename: `${baseName}.mp4`, poster: `${baseName}-poster.webp`, isVideo: true, src: `media/${baseName}.mp4` };
    } else {
      const destWebp = path.join(mediaDir, `${baseName}.webp`);
      const destJpg = path.join(mediaDir, `${baseName}.jpg`);
      optimizeImage(tempPath, destWebp, destJpg);
      result = { filename: `${baseName}.webp`, isVideo: false, src: `media/${baseName}.webp` };
    }

    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    console.log(`[Projects] Added media ${result.filename} to ${slug}`);
    res.json({ success: true, media: result });
  } catch (err) {
    console.error('[Media Upload Error]', err.message);
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================================================================
//  DEPLOY API
// =====================================================================

function parseCliJson(output) {
  const start = output.indexOf('{');
  const end = output.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('Netlify did not return deployment details.');
  return JSON.parse(output.slice(start, end + 1));
}

function deployToNetlify(production = false) {
  const netlifyArgs = ['netlify', 'deploy'];
  if (production) netlifyArgs.push('--prod');
  netlifyArgs.push('--site', productionSiteId, '--dir', '.', '--json');
  const command = process.platform === 'win32' ? 'cmd.exe' : 'npx';
  const args = process.platform === 'win32' ? ['/d', '/s', '/c', 'npx', ...netlifyArgs] : netlifyArgs;
  return parseCliJson(runFile(command, args, { cwd: siteDir }));
}

function assertPublishableBranch(branch) {
  if (branch !== 'main') {
    throw new Error(`Publishing is only allowed from main. Current branch: ${branch || 'detached HEAD'}.`);
  }
}

async function verifyDeploy(url) {
  for (const route of ['/', '/art/']) {
    const response = await fetch(`${url}${route}`, { redirect: 'follow' });
    if (!response.ok) throw new Error(`Preview validation failed for ${route} with HTTP ${response.status}.`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) throw new Error(`Preview validation returned the wrong content type for ${route}.`);
  }
}

app.get('/api/status', (req, res) => {
  try {
    const branch = runFile('git', ['branch', '--show-current']).trim();
    res.json({ success: true, branch, ffmpegPath, productionUrl, productionSiteId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/deploy', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  function sendLog(message) {
    res.write(`data: ${JSON.stringify({ log: message })}\n\n`);
  }

  sendLog('Starting guarded publish pipeline...');

  try {
    const branch = runFile('git', ['branch', '--show-current']).trim();
    assertPublishableBranch(branch);

    const status = runFile('git', ['status', '--porcelain', '--untracked-files=all']);
    const changes = status.split(/\r?\n/).filter(Boolean);
    const outsideSite = changes.filter(line => {
      const changedPath = line.slice(3).replace(/^"|"$/g, '').replace(/\\/g, '/');
      return !changedPath.startsWith('site/');
    });
    if (outsideSite.length) {
      throw new Error('There are changes outside the site folder. Commit or set them aside before publishing from Studio.');
    }

    if (changes.length) {
      sendLog('Staging site changes...');
      runFile('git', ['add', '--', 'site']);
      const staged = runFile('git', ['diff', '--cached', '--name-only']).trim();
      if (staged) {
        runFile('git', ['commit', '-m', 'Update site from RTFX Studio']);
        sendLog('Committed site changes.');
      }
    } else {
      sendLog('No uncommitted site changes found.');
    }

    sendLog('Checking GitHub for newer changes...');
    runFile('git', ['fetch', 'origin', 'main']);
    const behind = Number(runFile('git', ['rev-list', '--count', 'HEAD..origin/main']).trim() || 0);
    if (behind > 0) throw new Error('GitHub has newer changes. Update the local checkout before publishing.');

    sendLog('Pushing main to GitHub...');
    runFile('git', ['push', 'origin', 'main']);
    sendLog('GitHub push complete.');

    sendLog('Creating Netlify preview...');
    const preview = deployToNetlify(false);
    const previewUrl = preview.deploy_url || preview.deploy_ssl_url;
    if (!previewUrl) throw new Error('Netlify preview URL was not returned.');
    sendLog(`Preview ready: ${previewUrl}`);

    sendLog('Validating homepage and art gallery...');
    await verifyDeploy(previewUrl);
    sendLog('Preview validation passed.');

    sendLog(`Publishing to ${productionUrl}...`);
    const production = deployToNetlify(true);
    const liveUrl = production.url || productionUrl;
    await verifyDeploy(liveUrl);
    sendLog(`Publish complete: ${liveUrl}`);
    res.write(`data: ${JSON.stringify({ done: true, success: true, url: liveUrl })}\n\n`);
    res.end();
  } catch (err) {
    sendLog(`Publish stopped: ${err.message}`);
    res.write(`data: ${JSON.stringify({ done: true, success: false, error: err.message })}\n\n`);
    res.end();
  }
});

app.use((error, req, res, next) => {
  if (!error) return next();
  if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
  const status = error instanceof multer.MulterError || error.message === 'Unsupported media format.' ? 400 : 500;
  res.status(status).json({ success: false, error: error.message });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log('  RTFX STUDIO DASHBOARD RUNNING');
    console.log(`  Open: http://localhost:${PORT}`);
    console.log(`======================================================\n`);
    generateArtPage();
  });
}

module.exports = {
  app,
  assertPublishableBranch,
  decodeHtml,
  escapeHtml,
  ffmpegPath,
  optimizeImage,
  optimizeVideo,
  parseProjectHtml,
  plainText
};
