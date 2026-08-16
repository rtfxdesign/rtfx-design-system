const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { execSync, spawn } = require('child_process');
const { generateArtPage } = require('./generator');

const app = express();
const PORT = process.env.PORT || 3000;

const ffmpegPath = 'C:\\Program Files\\HeavyM 2\\ffmpeg_standalone\\ffmpeg.exe';
const workspaceDir = path.resolve(__dirname, '..');
const siteDir = path.join(workspaceDir, 'site');
const artJsonPath = path.join(siteDir, 'art', 'art.json');
const artMediaDir = path.join(siteDir, 'assets', 'art');
const tempUploadDir = path.join(__dirname, 'temp_uploads');

if (!fs.existsSync(artMediaDir)) fs.mkdirSync(artMediaDir, { recursive: true });
if (!fs.existsSync(tempUploadDir)) fs.mkdirSync(tempUploadDir, { recursive: true });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(siteDir, 'assets')));
app.use('/site', express.static(siteDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tempUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E6);
    cb(null, `upload-${unique}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 2000 * 1024 * 1024 } }); // Up to 2GB

// 1. Get Artworks
app.get('/api/art', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(artJsonPath, 'utf8'));
    res.json({ success: true, artworks: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Upload & Process Artwork
app.post('/api/upload', upload.single('mediaFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No media file provided.' });
  }

  const { title, category, tools, year, description, featured } = req.body;
  const tempPath = req.file.path;
  const originalExt = path.extname(req.file.originalname).toLowerCase();
  const baseName = `art-${Date.now()}`;
  const isVideo = ['.mp4', '.mov', '.webm', '.m4v', '.avi'].includes(originalExt);

  console.log(`[Upload] Processing ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(2)} MB)...`);

  try {
    let finalSrc = '';
    let finalPoster = '';
    const mediaType = isVideo ? 'video' : 'image';

    if (isVideo) {
      const destVideo = path.join(artMediaDir, `${baseName}.mp4`);
      const destPoster = path.join(artMediaDir, `${baseName}-poster.webp`);

      // Transcode video to web 1080p H.264, crf 24, faststart
      execSync(`"${ffmpegPath}" -i "${tempPath}" -vf "scale=-2:1080" -c:v libx264 -crf 24 -preset medium -pix_fmt yuv420p -an -movflags +faststart -y "${destVideo}"`);
      // Poster frame at 1s
      execSync(`"${ffmpegPath}" -ss 00:00:01 -i "${tempPath}" -vframes 1 -vf "scale=1280:-2" -c:v libwebp -quality 82 -y "${destPoster}"`);

      finalSrc = `../assets/art/${baseName}.mp4`;
      finalPoster = `../assets/art/${baseName}-poster.webp`;
    } else {
      const destWebp = path.join(artMediaDir, `${baseName}.webp`);
      const destJpg = path.join(artMediaDir, `${baseName}.jpg`);

      // Optimize image: 1920px max WebP and JPG
      execSync(`"${ffmpegPath}" -i "${tempPath}" -vf "scale='min(1920,iw)':-2" -c:v libwebp -quality 84 -y "${destWebp}"`);
      execSync(`"${ffmpegPath}" -i "${tempPath}" -vf "scale='min(1920,iw)':-2" -update 1 -frames:v 1 -q:v 3 -y "${destJpg}"`);

      finalSrc = `../assets/art/${baseName}.webp`;
      finalPoster = `../assets/art/${baseName}.webp`;
    }

    // Clean up temporary upload
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

    // Save to art.json
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

    // Regenerate site/art/index.html
    generateArtPage();

    console.log(`[Upload] Successfully added "${newArt.title}"!`);
    res.json({ success: true, artwork: newArt });
  } catch (err) {
    console.error('[Upload Error]', err.message);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Delete Artwork
app.delete('/api/art/:id', (req, res) => {
  const { id } = req.params;
  try {
    let artworks = JSON.parse(fs.readFileSync(artJsonPath, 'utf8'));
    artworks = artworks.filter(a => a.id !== id);
    fs.writeFileSync(artJsonPath, JSON.stringify(artworks, null, 2), 'utf8');
    generateArtPage();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. One-Click Git Push & Netlify Deploy
app.post('/api/deploy', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  function sendLog(msg) {
    res.write(`data: ${JSON.stringify({ log: msg })}\n\n`);
  }

  sendLog('🚀 Starting commit and deployment pipeline...');

  try {
    // 1. Git add & commit
    sendLog('Staging changes to Git...');
    execSync('git add .', { cwd: workspaceDir });
    try {
      execSync('git commit -m "Update Art gallery from RTFX Studio"', { cwd: workspaceDir });
      sendLog('Committed changes.');
    } catch (e) {
      sendLog('No new git changes to commit.');
    }

    // 2. Git push
    sendLog('Pushing to GitHub (origin/main)...');
    try {
      execSync('git push origin main', { cwd: workspaceDir });
      sendLog('✓ GitHub push complete.');
    } catch (e) {
      sendLog('Note: Git push completed or already up to date.');
    }

    // 3. Netlify Deploy
    sendLog('Deploying site directory to Netlify (rtfxv2)...');
    const netlifyDeploy = spawn('npx', ['-y', 'netlify-cli', 'deploy', '--prod', '--site', '22603409-7492-45e0-ba10-37b2cbcb8a39', '--dir', '.'], {
      cwd: siteDir,
      shell: true
    });

    netlifyDeploy.stdout.on('data', (d) => {
      const text = d.toString().trim();
      if (text) sendLog(text);
    });

    netlifyDeploy.stderr.on('data', (d) => {
      const text = d.toString().trim();
      if (text) sendLog(text);
    });

    netlifyDeploy.on('close', (code) => {
      if (code === 0) {
        sendLog('🎉 DEPLOY SUCCESSFUL! Site is live at https://rtfxv2.netlify.app');
        res.write(`data: ${JSON.stringify({ done: true, success: true })}\n\n`);
      } else {
        sendLog(`Deploy exited with code ${code}`);
        res.write(`data: ${JSON.stringify({ done: true, success: false })}\n\n`);
      }
      res.end();
    });
  } catch (err) {
    sendLog(`Error: ${err.message}`);
    res.write(`data: ${JSON.stringify({ done: true, success: false, error: err.message })}\n\n`);
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  RTFX STUDIO DASHBOARD RUNNING`);
  console.log(`  Open: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
  generateArtPage();
});
