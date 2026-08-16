const fs = require('fs');
const path = require('path');

const artJsonPath = path.resolve(__dirname, '../site/art/art.json');
const artHtmlPath = path.resolve(__dirname, '../site/art/index.html');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

function safeArtUrl(value) {
  const url = String(value || '').replace(/\\/g, '/');
  return /^\.\.\/assets\/art\/[a-zA-Z0-9_-]+\.(?:webp|jpe?g|mp4)$/i.test(url) ? url : '';
}

function generateArtPage() {
  let artworks = [];
  try {
    artworks = JSON.parse(fs.readFileSync(artJsonPath, 'utf8'));
  } catch (e) {
    console.error('Error reading art.json:', e.message);
  }

  // Generate artwork items
  let cardsHtml = '';
  artworks.forEach((art, i) => {
    const numDisplay = String(i + 1).padStart(2, '0');
    const isVideo = art.mediaType === 'video';
    const title = escapeHtml(art.title || 'Untitled Study');
    const category = escapeHtml(art.category || 'Generative & Spatial');
    const year = escapeHtml(art.year || '');
    const tools = escapeHtml(art.tools || '');
    const description = escapeHtml(art.description || '');
    const src = escapeHtml(safeArtUrl(art.src));
    const poster = escapeHtml(safeArtUrl(art.poster));

    let mediaTag = '';
    if (isVideo) {
      mediaTag = `
        <figure class="vid"><span class="ph chamfer">
          <video src="${src}" poster="${poster}" preload="metadata" muted loop playsinline aria-label="${title}"></video>
          <button class="vplay" type="button" aria-pressed="false">▶ Play clip</button>
        </span>
        <figcaption>
          <span class="micro">${numDisplay} · ${category} · ${year}</span>
          <b class="art-t">${title}</b>
          <span class="art-tools">${tools}</span>
          <p>${description}</p>
        </figcaption>
        </figure>`;
    } else {
      mediaTag = `
        <figure class="ai"><span class="in"><span class="ph chamfer">
          <img src="${src}" alt="${title}" loading="lazy">
        </span>
        <figcaption>
          <span class="micro">${numDisplay} · ${category} · ${year}</span>
          <b class="art-t">${title}</b>
          <span class="art-tools">${tools}</span>
          <p>${description}</p>
        </figcaption></span>
        </figure>`;
    }
    cardsHtml += `  ${mediaTag}\n`;
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Art Gallery — RT/FX</title>
<meta name="description" content="Personal art, generative visual studies, optical feedback systems, and spatial textures by Allen Grabo.">
<link rel="canonical" href="https://rtfx.space/art/">
<meta property="og:type" content="article">
<meta property="og:title" content="Art Gallery — RT/FX">
<meta property="og:description" content="Personal art, generative visual studies, optical feedback systems, and spatial textures by Allen Grabo.">
<meta property="og:image" content="../assets/og-image-1200x630.png">
<meta property="og:url" content="https://rtfx.space/art/">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#000000">
<link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="../assets/apple-touch-icon-180.png">
<link rel="stylesheet" href="../css/site.css">
<style>
.art-t { display: block; font-family: var(--f-display); font-size: 15px; font-weight: 700; color: var(--c-ink); margin: 6px 0 2px; }
.art-tools { display: block; font-family: var(--f-display); font-size: 10px; letter-spacing: .1em; color: var(--c-accent); text-transform: uppercase; margin-bottom: 6px; }
.art-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: var(--s-5); }
.art-grid figure { margin: 0; background: var(--c-panel); border: 1px solid var(--c-rule-soft); padding: 12px; }
.art-grid figure:hover { border-color: var(--c-accent); }
.art-grid figcaption { margin-top: 12px; }
.art-grid figcaption p { font-size: 13px; color: var(--c-ink-2); line-height: 1.5; margin-top: 4px; }
.art-grid .ph { aspect-ratio: 16/10; width: 100%; display: block; overflow: hidden; background: #0E0E0E; position: relative; }
.art-grid .ph img, .art-grid .ph video { width: 100%; height: 100%; object-fit: cover; display: block; }
.hero h1.fh { margin: 12px 0 16px; }
</style>
<script src="../js/site.js" defer></script>
<script src="../js/field.js" defer></script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="topbar">
<div class="topbar-in">
<a class="tb-logo" href="../index.html"><img src="../assets/rtfx-wordmark-white.svg" alt="RT/FX — home"></a>
<nav aria-label="Site">
  <a href="../index.html#work">← Selected work</a>
  <a href="index.html" aria-current="page" style="color:var(--c-accent)">Art</a>
  <a href="../gallery/index.html">Field Gallery</a>
  <a href="../archive/index.html">Archive</a>
  <a href="../index.html#contact">Contact</a>
</nav>
<span class="status st-ok tb-right"><span class="dot"></span>${artworks.length} works</span>
</div>
</header>
<main id="main">
<div class="hero bg-grid">
<div class="wrap">
<span class="label">Personal Works · Generative Studies · Autonomous Visuals</span>
<h1 class="fh"><canvas class="fieldh" data-text="ART GALLERY" aria-hidden="true"></canvas><span class="sr">Art Gallery</span></h1>
<p class="sub">Autonomous visual systems, optical feedback blooms, spatial textures, and cinematic forms crafted for architectural canvas and live space.</p>
<div class="tickrule" aria-hidden="true"></div>
</div>
</div>
<section aria-label="Art Gallery">
<div class="wrap">
<div class="art-grid">
${cardsHtml}
</div>
<div class="row mt-7">
  <a class="btn" href="../gallery/index.html">Field gallery →</a>
  <a class="btn btn--ghost" href="../index.html#contact">Something in mind? →</a>
</div>
</div>
</section>
</main>
<footer>
<div class="wrap foot">
<img src="../assets/rtfx-wordmark-white.svg" alt="RT/FX">
<span class="note">Art Gallery · RT/FX · Creative technology · Washington, DC</span>
<span class="links">
  <a href="../index.html">Home</a>
  <a href="index.html">Art</a>
  <a href="../gallery/index.html">Field Gallery</a>
  <a href="../archive/index.html">Archive</a>
  <a href="../index.html#contact">Contact</a>
</span>
</div>
</footer>
</body>
</html>
`;

  fs.writeFileSync(artHtmlPath, html, 'utf8');
  console.log(`Generated ${artHtmlPath} with ${artworks.length} artworks.`);
}

module.exports = { escapeHtml, generateArtPage, safeArtUrl };

if (require.main === module) {
  generateArtPage();
}
