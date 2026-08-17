const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
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

function safeMediaId(value) {
  const id = String(value || '');
  if (!/^group-\d+-[a-f0-9]{12}$/.test(id)) throw new Error('Invalid page media id.');
  return id;
}

function findFigGridBlocks(html) {
  const blocks = [];
  const opening = /<div\b[^>]*class=(['"])[^'"]*\bfig-grid\b[^'"]*\1[^>]*>/gi;
  let match;
  while ((match = opening.exec(html)) !== null) {
    const token = /<\/?div\b[^>]*>/gi;
    token.lastIndex = opening.lastIndex;
    let depth = 1;
    let closing;
    while ((closing = token.exec(html)) !== null) {
      depth += /^<\/div/i.test(closing[0]) ? -1 : 1;
      if (depth === 0) {
        blocks.push({
          start: match.index,
          openEnd: opening.lastIndex,
          closeStart: closing.index,
          end: token.lastIndex
        });
        opening.lastIndex = token.lastIndex;
        break;
      }
    }
    if (depth !== 0) throw new Error('Could not parse a project media grid.');
  }
  return blocks;
}

function figureSources(figureHtml) {
  const sources = [];
  for (const match of figureHtml.matchAll(/\b(?:src|poster)\s*=\s*(['"])(.*?)\1/gi)) sources.push(match[2]);
  for (const match of figureHtml.matchAll(/\bsrcset\s*=\s*(['"])(.*?)\1/gi)) {
    match[2].split(',').forEach(entry => sources.push(entry.trim().split(/\s+/, 1)[0]));
  }
  return [...new Set(sources.filter(Boolean))];
}

function parsePageMediaHtml(html) {
  return findFigGridBlocks(html).map((block, groupIndex) => {
    const groupId = `group-${groupIndex + 1}`;
    const before = html.slice(0, block.start);
    const headings = [...before.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)];
    const label = headings.length ? plainText(headings.at(-1)[1]) : `Media group ${groupIndex + 1}`;
    const inner = html.slice(block.openEnd, block.closeStart);
    const figurePattern = /<figure\b[\s\S]*?<\/figure>/gi;
    const items = [...inner.matchAll(figurePattern)].map((figureMatch, itemIndex) => {
      const figureHtml = figureMatch[0];
      const sources = figureSources(figureHtml);
      const primary = (figureHtml.match(/<video\b[^>]*\bsrc=(['"])(.*?)\1/i)
        || figureHtml.match(/<img\b[^>]*\bsrc=(['"])(.*?)\1/i)
        || figureHtml.match(/<source\b[^>]*\bsrcset=(['"])(.*?)\1/i));
      const src = primary ? primary[2].split(',')[0].trim().split(/\s+/, 1)[0] : sources[0] || '';
      const posterMatch = figureHtml.match(/<video\b[^>]*\bposter=(['"])(.*?)\1/i);
      const captionMatch = figureHtml.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i);
      const digest = crypto.createHash('sha1').update(figureHtml).digest('hex').slice(0, 12);
      return {
        id: `${groupId}-${digest}`,
        order: itemIndex,
        src,
        poster: posterMatch ? posterMatch[2] : '',
        filename: src ? path.basename(src.split(/[?#]/, 1)[0]) : `Media ${itemIndex + 1}`,
        isVideo: /<video\b/i.test(figureHtml),
        caption: captionMatch ? plainText(captionMatch[1]) : '',
        sources,
        html: figureHtml
      };
    });
    return { id: groupId, label, items, block, inner };
  });
}

function replaceMediaGroup(html, group, figures) {
  const withoutFigures = group.inner.replace(/<figure\b[\s\S]*?<\/figure>/gi, '').trim();
  if (withoutFigures) throw new Error('This media grid contains unsupported custom markup.');
  if (figures.length === 0) return html.slice(0, group.block.start) + html.slice(group.block.end);
  const leading = group.inner.match(/^\s*/)[0];
  const trailing = group.inner.match(/\s*$/)[0];
  const replacement = `${leading}${figures.join('\n')}${trailing}`;
  return html.slice(0, group.block.openEnd) + replacement + html.slice(group.block.closeStart);
}

function reorderPageMediaHtml(html, groupId, orderedIds) {
  const group = parsePageMediaHtml(html).find(item => item.id === groupId);
  if (!group) throw new Error('Page media group not found.');
  const currentIds = group.items.map(item => item.id);
  if (!Array.isArray(orderedIds) || orderedIds.length !== currentIds.length
    || new Set(orderedIds).size !== currentIds.length
    || currentIds.some(id => !orderedIds.includes(id))) {
    throw new Error('The media order does not match the current page. Refresh Studio and try again.');
  }
  const byId = new Map(group.items.map(item => [item.id, item.html]));
  return replaceMediaGroup(html, group, orderedIds.map(id => byId.get(id)));
}

function deletePageMediaHtml(html, mediaId) {
  const groups = parsePageMediaHtml(html);
  const group = groups.find(item => item.items.some(media => media.id === mediaId));
  if (!group) throw new Error('Page media item not found. Refresh Studio and try again.');
  const target = group.items.find(item => item.id === mediaId);
  return {
    html: replaceMediaGroup(html, group, group.items.filter(item => item.id !== mediaId).map(item => item.html)),
    removedSources: target.sources
  };
}

function updatePageMediaCaptionHtml(html, mediaId, caption) {
  const groups = parsePageMediaHtml(html);
  const group = groups.find(item => item.items.some(media => media.id === mediaId));
  if (!group) throw new Error('Page media item not found. Refresh Studio and try again.');
  const target = group.items.find(item => item.id === mediaId);
  const updatedFigure = /<figcaption\b[^>]*>[\s\S]*?<\/figcaption>/i.test(target.html)
    ? target.html.replace(/(<figcaption\b[^>]*>)[\s\S]*?(<\/figcaption>)/i,
      (match, before, after) => `${before}${escapeHtml(caption)}${after}`)
    : target.html.replace(/<\/figure>$/i, `<figcaption>${escapeHtml(caption)}</figcaption></figure>`);
  const figures = group.items.map(item => item.id === mediaId ? updatedFigure : item.html);
  return replaceMediaGroup(html, group, figures);
}

function responseOutputText(response) {
  if (typeof response.output_text === 'string') return response.output_text;
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && typeof content.text === 'string') return content.text;
    }
  }
  return '';
}

function mediaMimeType(filePath) {
  return ({ '.gif': 'image/gif', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' })[path.extname(filePath).toLowerCase()] || '';
}

function captionImageInput(slug, media) {
  let source = media.poster || media.src;
  if (/^https:\/\//i.test(source)) return source;
  const htmlPath = path.join(workDir, slug, 'index.html');
  let localPath = sourceToLocalPath(htmlPath, source);
  if (!localPath || !localPath.startsWith(path.resolve(siteDir) + path.sep) || !fs.existsSync(localPath)) {
    throw new Error('The media preview could not be found locally.');
  }

  let temporaryFrame = '';
  let mimeType = mediaMimeType(localPath);
  if (!mimeType) {
    temporaryFrame = path.join(tempUploadDir, `caption-frame-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.jpg`);
    runFfmpeg(['-y', '-ss', '1', '-i', localPath, '-vf', 'scale=1280:1280:force_original_aspect_ratio=decrease', '-frames:v', '1', '-q:v', '3', temporaryFrame]);
    localPath = temporaryFrame;
    mimeType = 'image/jpeg';
  }

  try {
    return `data:${mimeType};base64,${fs.readFileSync(localPath).toString('base64')}`;
  } finally {
    if (temporaryFrame && fs.existsSync(temporaryFrame)) fs.unlinkSync(temporaryFrame);
  }
}

async function generateCaptionOptions({ apiKey, project, group, media }) {
  if (!apiKey || apiKey.length < 20) throw new Error('Add an OpenAI API key in Studio to generate caption options.');
  const imageUrl = captionImageInput(project.slug, media);
  const model = process.env.OPENAI_CAPTION_MODEL || 'gpt-5.6-luna';
  const prompt = [
    'Write exactly three distinct portfolio caption options grounded only in the supplied image.',
    'Each caption must be 8 to 18 words, one sentence, plainspoken, specific, and visually observable.',
    'Use RT/FX voice: technical, calm, human, and understated. Avoid hype, invented facts, and generic phrases.',
    'Option 1 should be observational, option 2 should emphasize the visual system or technical relationship, and option 3 should emphasize the room or audience experience.',
    `Project: ${project.title || project.slug}`,
    `Page section: ${group.label}`,
    `Current caption: ${media.caption || 'None'}`,
    `Media type: ${media.isVideo ? 'video representative frame' : 'still image'}`
  ].join('\n');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      store: false,
      input: [{
        role: 'user',
        content: [
          { type: 'input_text', text: prompt },
          { type: 'input_image', image_url: imageUrl, detail: 'low' }
        ]
      }],
      max_output_tokens: 300,
      text: {
        format: {
          type: 'json_schema',
          name: 'rtfx_caption_options',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              options: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string', minLength: 1, maxLength: 300 } }
            },
            required: ['options'],
            additionalProperties: false
          }
        }
      }
    }),
    signal: AbortSignal.timeout(45000)
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || `Caption generation failed with HTTP ${response.status}.`);
  const outputText = responseOutputText(payload);
  if (!outputText) throw new Error('The caption model did not return any options.');
  const parsed = JSON.parse(outputText);
  if (!Array.isArray(parsed.options) || parsed.options.length !== 3) throw new Error('The caption model returned an unexpected response.');
  return { model, options: parsed.options.map(option => plainText(option)).filter(Boolean) };
}

function walkHtmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === '.netlify') return [];
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkHtmlFiles(fullPath);
    return /\.html$/i.test(entry.name) && entry.name !== '_preview.html' ? [fullPath] : [];
  });
}

function sourceToLocalPath(htmlPath, source) {
  const clean = String(source || '').split(/[?#]/, 1)[0];
  if (!clean || /^(?:[a-z]+:|\/\/|#)/i.test(clean)) return null;
  let decoded;
  try { decoded = decodeURIComponent(clean); } catch { return null; }
  return decoded.startsWith('/')
    ? path.resolve(siteDir, decoded.replace(/^\/+/, ''))
    : path.resolve(path.dirname(htmlPath), decoded);
}

function removeUnreferencedProjectFiles(slug, sources) {
  const projectDir = path.join(workDir, slug);
  const mediaDir = path.join(projectDir, 'media');
  const candidates = [...new Set(sources.map(source => sourceToLocalPath(path.join(projectDir, 'index.html'), source)).filter(Boolean))]
    .filter(file => file.startsWith(path.resolve(mediaDir) + path.sep));
  const htmlFiles = walkHtmlFiles(siteDir);
  const referenced = new Set();
  for (const htmlFile of htmlFiles) {
    const source = fs.readFileSync(htmlFile, 'utf8');
    for (const mediaSource of figureSources(source)) {
      const resolved = sourceToLocalPath(htmlFile, mediaSource);
      if (resolved) referenced.add(path.normalize(resolved).toLowerCase());
    }
  }
  const deleted = [];
  for (const candidate of candidates) {
    if (!referenced.has(path.normalize(candidate).toLowerCase()) && fs.existsSync(candidate)) {
      fs.unlinkSync(candidate);
      deleted.push(path.basename(candidate));
    }
  }
  return deleted;
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

  const pageMedia = parsePageMediaHtml(html).map(group => ({
    id: group.id,
    label: group.label,
    items: group.items.map(({ html: figureHtml, sources, ...item }) => item)
  }));

  return {
    slug, title, tagline, idx, category, location, timeframe, role,
    description, challenge, response, outcome, heroImg, stats,
    mediaFiles, pageMedia, sections
  };
}

// ---- gallery ---------------------------------------------------------------
// Unfiled photos. Each frame gets a permanent accession number; metadata is
// kept in frames.json because the processed image files cannot hold it.
const gallery = require('./gallery');

app.get('/api/gallery', (req, res) => {
  try { res.json({ success: true, ...gallery.listFrames() }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/gallery', upload.single('mediaFile'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No image provided.' });
  const ext = path.extname(req.file.originalname).toLowerCase();
  if (!allowedImageExtensions.has(ext)) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({ success: false, error: 'Gallery frames are images only.' });
  }
  try {
    const out = gallery.addFrame({
      tempPath: req.file.path,
      originalName: req.file.originalname,
      alt: req.body.alt,
      cat: req.body.cat,
      location: req.body.location,
      tags: req.body.tags,
      optimizeImage
    });
    res.json({ success: true, ...out });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  } finally {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
  }
});

app.patch('/api/gallery/:frame', express.json(), (req, res) => {
  try { res.json({ success: true, record: gallery.updateFrame(req.params.frame, req.body || {}) }); }
  catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

app.delete('/api/gallery/:frame', (req, res) => {
  try { res.json({ success: true, ...gallery.deleteFrame(req.params.frame) }); }
  catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

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

// POST /api/projects/:slug/page-media/order — reorder figures within one page section
app.post('/api/projects/:slug/page-media/order', (req, res) => {
  try {
    const slug = safeSlug(req.params.slug);
    const htmlPath = path.join(workDir, slug, 'index.html');
    if (!fs.existsSync(htmlPath)) return res.status(404).json({ success: false, error: 'Project not found.' });
    const groupId = String(req.body.groupId || '');
    if (!/^group-\d+$/.test(groupId)) return res.status(400).json({ success: false, error: 'Invalid page media group.' });
    const html = fs.readFileSync(htmlPath, 'utf8');
    const updated = reorderPageMediaHtml(html, groupId, req.body.orderedIds);
    fs.writeFileSync(htmlPath, updated, 'utf8');
    res.json({ success: true, project: parseProjectHtml(slug) });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/projects/:slug/page-media/:mediaId — remove a figure and unreferenced local files
app.delete('/api/projects/:slug/page-media/:mediaId', (req, res) => {
  try {
    const slug = safeSlug(req.params.slug);
    const mediaId = safeMediaId(req.params.mediaId);
    const htmlPath = path.join(workDir, slug, 'index.html');
    if (!fs.existsSync(htmlPath)) return res.status(404).json({ success: false, error: 'Project not found.' });
    const html = fs.readFileSync(htmlPath, 'utf8');
    const result = deletePageMediaHtml(html, mediaId);
    fs.writeFileSync(htmlPath, result.html, 'utf8');
    const deletedFiles = removeUnreferencedProjectFiles(slug, result.removedSources);
    res.json({ success: true, deletedFiles, project: parseProjectHtml(slug) });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PATCH /api/projects/:slug/page-media/:mediaId/caption — edit the visible figure caption
app.patch('/api/projects/:slug/page-media/:mediaId/caption', (req, res) => {
  try {
    const slug = safeSlug(req.params.slug);
    const mediaId = safeMediaId(req.params.mediaId);
    const caption = String(req.body.caption ?? '').trim();
    if (caption.length > 300) return res.status(400).json({ success: false, error: 'Keep captions at 300 characters or fewer.' });
    const htmlPath = path.join(workDir, slug, 'index.html');
    if (!fs.existsSync(htmlPath)) return res.status(404).json({ success: false, error: 'Project not found.' });
    const html = fs.readFileSync(htmlPath, 'utf8');
    fs.writeFileSync(htmlPath, updatePageMediaCaptionHtml(html, mediaId, caption), 'utf8');
    res.json({ success: true, project: parseProjectHtml(slug) });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/projects/:slug/page-media/:mediaId/caption-options — generate three visual caption choices
app.post('/api/projects/:slug/page-media/:mediaId/caption-options', async (req, res) => {
  try {
    const slug = safeSlug(req.params.slug);
    const mediaId = safeMediaId(req.params.mediaId);
    const project = parseProjectHtml(slug);
    if (!project) return res.status(404).json({ success: false, error: 'Project not found.' });
    const html = fs.readFileSync(path.join(workDir, slug, 'index.html'), 'utf8');
    const group = parsePageMediaHtml(html).find(item => item.items.some(media => media.id === mediaId));
    if (!group) return res.status(404).json({ success: false, error: 'Page media item not found.' });
    const media = group.items.find(item => item.id === mediaId);
    const apiKey = process.env.OPENAI_API_KEY || req.get('x-openai-api-key') || '';
    const result = await generateCaptionOptions({ apiKey, project, group, media });
    res.json({ success: true, ...result });
  } catch (error) {
    const status = /API key|Incorrect API key|authentication/i.test(error.message) ? 401 : 400;
    res.status(status).json({ success: false, error: error.message });
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
    res.json({
      success: true,
      branch,
      ffmpegPath,
      productionUrl,
      productionSiteId,
      captionAiReady: Boolean(process.env.OPENAI_API_KEY),
      captionModel: process.env.OPENAI_CAPTION_MODEL || 'gpt-5.6-luna'
    });
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
  deletePageMediaHtml,
  decodeHtml,
  escapeHtml,
  ffmpegPath,
  findFigGridBlocks,
  generateCaptionOptions,
  optimizeImage,
  optimizeVideo,
  parsePageMediaHtml,
  parseProjectHtml,
  plainText,
  reorderPageMediaHtml,
  responseOutputText,
  updatePageMediaCaptionHtml
};
