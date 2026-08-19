const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');
const {
  app,
  applyHeroImageHtml,
  assertPublishableBranch,
  hasAudioTrack,
  deletePageMediaHtml,
  decodeHtml,
  escapeHtml,
  ffmpegPath,
  optimizeImage,
  optimizeVideo,
  parsePageMediaHtml,
  parseProjectHtml,
  plainText,
  reorderPageMediaHtml,
  responseOutputText,
  updatePageMediaCaptionHtml
} = require('./server');
const { safeArtUrl } = require('./generator');

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('HTML helpers round-trip editor text without double encoding', () => {
  const source = `Allen & RT/FX's <field>`;
  assert.equal(decodeHtml(escapeHtml(source)), source);
  assert.equal(plainText('<b>Live</b> &amp; local'), 'Live & local');
});

test('art media URLs are restricted to generated local assets', () => {
  assert.equal(safeArtUrl('../assets/art/art-123.webp'), '../assets/art/art-123.webp');
  assert.equal(safeArtUrl('javascript:alert(1)'), '');
  assert.equal(safeArtUrl('../assets/other/file.webp'), '');
});

test('media optimizer creates web images, H.264 video, poster, and fast-start metadata', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rtfx-studio-test-'));
  const sourceImage = path.join(tempDir, 'source.jpg');
  const sourceVideo = path.join(tempDir, 'source.avi');
  const webp = path.join(tempDir, 'image.webp');
  const jpeg = path.join(tempDir, 'image.jpg');
  const mp4 = path.join(tempDir, 'video.mp4');
  const poster = path.join(tempDir, 'poster.webp');

  try {
    execFileSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=0xFFB020:s=320x180:d=1', '-frames:v', '1', sourceImage]);
    execFileSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=640x360:rate=24:duration=1', '-c:v', 'mpeg4', sourceVideo]);

    optimizeImage(sourceImage, webp, jpeg);
    optimizeVideo(sourceVideo, mp4, poster);

    for (const file of [webp, jpeg, mp4, poster]) assert.ok(fs.statSync(file).size > 0, `${file} should not be empty`);
    const mp4Bytes = fs.readFileSync(mp4);
    assert.ok(mp4Bytes.indexOf(Buffer.from('avc1')) > -1, 'video should contain an H.264 track');
    assert.ok(mp4Bytes.indexOf(Buffer.from('moov')) < mp4Bytes.indexOf(Buffer.from('mdat')), 'fast-start metadata should precede media data');
    assert.equal(mp4Bytes.indexOf(Buffer.from('mp4a')), -1, 'default encode should strip audio');

    // art pieces keep their track: keepAudio preserves sound, and the probe
    // distinguishes sourced audio from silent clips
    const sourceWithAudio = path.join(tempDir, 'source-audio.mp4');
    const mp4Audio = path.join(tempDir, 'video-audio.mp4');
    execFileSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=640x360:rate=24:duration=1', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', '-c:v', 'mpeg4', '-c:a', 'aac', '-shortest', sourceWithAudio]);
    assert.equal(hasAudioTrack(sourceWithAudio), true, 'probe should find the audio track');
    assert.equal(hasAudioTrack(sourceVideo), false, 'probe should report silent sources');
    optimizeVideo(sourceWithAudio, mp4Audio, poster, { keepAudio: true });
    assert.ok(fs.readFileSync(mp4Audio).indexOf(Buffer.from('mp4a')) > -1, 'keepAudio should preserve an AAC track');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('project parser returns the project page fields', () => {
  const project = parseProjectHtml('throw-social');
  assert.equal(project.slug, 'throw-social');
  assert.equal(project.urlBase, 'work/throw-social');
  assert.ok(project.title);
  assert.ok(project.category);
  assert.ok(project.heroImg);
  // throw-social gained a Documentation section (curated-export fold-in,
  // see commit 0d58b3f), moving it from 3 sections/12 items to 4/23.
  assert.equal(project.pageMedia.length, 4);
  assert.equal(project.pageMedia.reduce((total, group) => total + group.items.length, 0), 23);
});

test('hero upload edits only the hero figure, and a video hero keeps its clip', () => {
  const page = `<figure class="hero-media vid"><span class="ph chamfer">`
    + `<video src="https://media.example/clip.mp4" poster="media/old-poster.webp" muted></video>`
    + `<button class="vplay" type="button">Play</button></span></figure>`
    + `<div class="fig-grid"><figure><span class="ph chamfer"><img src="media/body-figure.webp" alt=""></span></figure></div>`;
  const updated = applyHeroImageHtml(page, 'hero-demo');
  assert.match(updated, /poster="media\/hero-demo\.webp"/, 'video hero should adopt the upload as its poster');
  assert.match(updated, /clip\.mp4/, 'the hero clip must survive');
  assert.match(updated, /media\/body-figure\.webp/, 'body figures must not be rewritten');

  const imgPage = `<figure class="hero-media"><span class="ph chamfer"><img src="media/old-hero.webp" alt=""></span></figure>`
    + `<figure><img src="media/body-figure.webp" alt=""></figure>`;
  const imgUpdated = applyHeroImageHtml(imgPage, 'hero-demo');
  assert.match(imgUpdated, /<figure class="hero-media"[^>]*><span class="ph chamfer"><img src="media\/hero-demo\.webp"/);
  assert.match(imgUpdated, /media\/body-figure\.webp/);
});

test('root-level case studies parse as projects with their real url base', () => {
  const project = parseProjectHtml('revd-show-control');
  assert.ok(project, 'revd-show-control should resolve from the site root');
  assert.equal(project.slug, 'revd-show-control');
  assert.equal(project.urlBase, 'revd-show-control');
  assert.ok(project.heroImg);
  assert.ok(project.pageMedia.length > 0, 'page media groups should be found');
});

test('page media can be reordered within a section and deleted', () => {
  const fixture = `<section><h2>Playback</h2><div class="fig-grid">
    <figure><img src="media/a.webp"><figcaption>Alpha</figcaption></figure>
    <figure class="vid"><video src="media/b.mp4" poster="media/b-poster.webp"></video><figcaption>Beta</figcaption></figure>
  </div></section>`;
  const group = parsePageMediaHtml(fixture)[0];
  assert.equal(group.label, 'Playback');
  assert.deepEqual(group.items.map(item => item.caption), ['Alpha', 'Beta']);

  const reordered = reorderPageMediaHtml(fixture, group.id, [group.items[1].id, group.items[0].id]);
  assert.ok(reordered.indexOf('media/b.mp4') < reordered.indexOf('media/a.webp'));

  const reorderedGroup = parsePageMediaHtml(reordered)[0];
  const deleted = deletePageMediaHtml(reordered, reorderedGroup.items[0].id);
  assert.doesNotMatch(deleted.html, /media\/b\.mp4/);
  assert.match(deleted.html, /media\/a\.webp/);
  assert.deepEqual(deleted.removedSources.sort(), ['media/b-poster.webp', 'media/b.mp4']);
});

test('page media captions update safely and Responses output is extracted', () => {
  const fixture = `<div class="fig-grid"><figure><img src="media/a.webp"><figcaption>Old caption</figcaption></figure></div>`;
  const media = parsePageMediaHtml(fixture)[0].items[0];
  const updated = updatePageMediaCaptionHtml(fixture, media.id, `Allen's <signal> & light`);
  assert.match(updated, /Allen&#39;s &lt;signal&gt; &amp; light/);
  assert.equal(parsePageMediaHtml(updated)[0].items[0].caption, `Allen's <signal> & light`);
  assert.equal(responseOutputText({ output: [{ content: [{ type: 'output_text', text: '{"options":[]}' }] }] }), '{"options":[]}');
});

test('Studio serves the dashboard and read-only APIs', async () => {
  const [dashboard, art, projects, status] = await Promise.all([
    fetch(`${baseUrl}/`),
    fetch(`${baseUrl}/api/art`),
    fetch(`${baseUrl}/api/projects`),
    fetch(`${baseUrl}/api/status`)
  ]);

  assert.equal(dashboard.status, 200);
  assert.match(await dashboard.text(), /RTFX STUDIO/i);
  assert.equal(art.status, 200);
  assert.equal(projects.status, 200);
  assert.equal(status.status, 200);

  const projectPayload = await projects.json();
  assert.ok(projectPayload.projects.length >= 1);
});

test('caption generation requires a configured or session API key', async () => {
  const projectResponse = await fetch(`${baseUrl}/api/projects/throw-social`);
  const projectPayload = await projectResponse.json();
  const mediaId = projectPayload.project.pageMedia[0].items[0].id;
  const response = await fetch(`${baseUrl}/api/projects/throw-social/page-media/${mediaId}/caption-options`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
  });
  const payload = await response.json();
  assert.equal(response.status, 401);
  assert.match(payload.error, /OpenAI API key/);
});

test('publish branch guard only allows main', () => {
  assert.doesNotThrow(() => assertPublishableBranch('main'));
  assert.throws(() => assertPublishableBranch('agent/unfinished'), /Publishing is only allowed from main/);
  assert.throws(() => assertPublishableBranch(''), /detached HEAD/);
});
