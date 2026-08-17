const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');
const {
  app,
  assertPublishableBranch,
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
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('project parser returns the project page fields', () => {
  const project = parseProjectHtml('throw-social');
  assert.equal(project.slug, 'throw-social');
  assert.ok(project.title);
  assert.ok(project.category);
  assert.ok(project.heroImg);
  assert.equal(project.pageMedia.length, 3);
  assert.equal(project.pageMedia.reduce((total, group) => total + group.items.length, 0), 12);
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
