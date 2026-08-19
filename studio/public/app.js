document.addEventListener('DOMContentLoaded', () => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = { projects: [], selectedProject: null, aiKey: '', aiReady: false, captionModel: '' };

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[character]);
  }

  function encodePath(value = '') {
    return String(value).split('/').filter((segment) => segment && segment !== '.')
      .map((segment) => encodeURIComponent(segment)).join('/');
  }

  function projectMediaUrl(project, source) {
    if (!source) return '';
    if (/^https?:\/\//i.test(source) || source.startsWith('/')) return source;
    return `/${encodePath(projectUrlBase(project))}/${encodePath(source)}`;
  }

  // Root-level case studies live at /<slug>/ rather than /work/<slug>/;
  // the server reports which via urlBase.
  function projectUrlBase(project) {
    return project.urlBase || `work/${project.slug}`;
  }

  async function requestJson(url, options) {
    const response = await fetch(url, options);
    let data;
    try { data = await response.json(); }
    catch { throw new Error(`Request failed with HTTP ${response.status}.`); }
    if (!response.ok || !data.success) throw new Error(data.error || `Request failed with HTTP ${response.status}.`);
    return data;
  }

  function setButtonBusy(button, busy, busyText = 'Working...') {
    button.disabled = busy;
    const normal = $('.btn-text', button);
    const loading = $('.btn-loading', button);
    if (normal) normal.hidden = busy;
    if (loading) {
      loading.hidden = !busy;
      if (busy) loading.textContent = busyText;
    }
  }

  function updateAiKeyStatus() {
    const status = $('#aiKeyStatus');
    if (!status) return;
    if (state.aiReady) status.textContent = `Ready · ${state.captionModel || 'vision model'} configured on this computer`;
    else if (state.aiKey) status.textContent = `Ready · ${state.captionModel || 'vision model'} · key held for this browser session`;
    else status.textContent = 'Add an OpenAI API key for content-aware options.';
  }

  async function loadAiStatus() {
    try {
      const data = await requestJson('/api/status');
      state.aiReady = Boolean(data.captionAiReady);
      state.captionModel = data.captionModel || '';
      try { state.aiKey = sessionStorage.getItem('rtfxCaptionApiKey') || ''; } catch { /* Session storage may be disabled. */ }
      $('#aiKeyInput').value = state.aiKey;
      if (state.aiReady) {
        $('#aiKeyInput').hidden = true;
        $('#btnUseAiKey').hidden = true;
      }
      updateAiKeyStatus();
    } catch { /* Caption editing still works if status is unavailable. */ }
  }

  $('#btnUseAiKey').addEventListener('click', () => {
    state.aiKey = $('#aiKeyInput').value.trim();
    try {
      if (state.aiKey) sessionStorage.setItem('rtfxCaptionApiKey', state.aiKey);
      else sessionStorage.removeItem('rtfxCaptionApiKey');
    } catch { /* Keep the key in memory for this page if storage is disabled. */ }
    updateAiKeyStatus();
  });

  // Tabs
  $$('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      $$('.tab').forEach((item) => item.classList.toggle('active', item === tab));
      $('#tab-art').hidden = tabName !== 'art';
      $('#tab-projects').hidden = tabName !== 'projects';
      $('#tab-gallery').hidden = tabName !== 'gallery';
      // always refetch on entry — pages change outside Studio (inbox routine,
      // direct edits), and a cached list shows stale media and captions
      if (tabName === 'projects') loadProjects();
      if (tabName === 'gallery') loadGallery();
    });
  });

  // Art gallery
  const dropzone = $('#dropzone');
  const fileInput = $('#fileInput');
  const filePreview = $('#filePreview');
  const previewMedia = $('#previewMedia');
  const previewName = $('#previewName');
  const uploadForm = $('#uploadForm');
  const btnSubmit = $('#btnSubmit');
  const artList = $('#artList');
  const artCount = $('#artCount');

  async function loadArtworks() {
    try {
      const data = await requestJson('/api/art');
      renderArtworks(data.artworks);
    } catch (error) {
      artList.innerHTML = `<div class="error">${escapeHtml(error.message)}</div>`;
    }
  }

  function renderArtworks(artworks) {
    artCount.textContent = artworks.length;
    if (artworks.length === 0) {
      artList.innerHTML = '<div class="empty-state">No artworks published yet. Upload the first piece on the left.</div>';
      return;
    }
    artList.innerHTML = artworks.map((art) => {
      const title = escapeHtml(art.title || 'Untitled Study');
      const source = escapeHtml(art.src || '');
      const poster = escapeHtml(art.poster || '');
      const media = art.mediaType === 'video'
        ? `<div class="card-media"><video src="${source}" poster="${poster}" muted playsinline preload="metadata"></video><span class="badge-video">VIDEO</span></div>`
        : `<div class="card-media"><img src="${source}" alt="${title}" loading="lazy"></div>`;
      return `<article class="art-card" data-id="${escapeHtml(art.id)}">
        ${media}<div class="card-title">${title}</div>
        <div class="card-meta">${escapeHtml(art.category)} · ${escapeHtml(art.year)}</div>
        <div class="card-desc">${escapeHtml(art.description || 'No description provided.')}</div>
        <div class="card-actions"><a class="btn-view" href="/site/art/" target="_blank" rel="noopener">View ↗</a>
        <button class="btn-del" type="button" data-action="delete-art" data-title="${title}">Remove ✗</button></div>
      </article>`;
    }).join('');
  }

  artList.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action="delete-art"]');
    if (!button) return;
    const card = button.closest('[data-id]');
    const title = button.dataset.title || 'this artwork';
    if (!confirm(`Remove "${title}" and its generated media from the art gallery?`)) return;
    button.disabled = true;
    try {
      await requestJson(`/api/art/${encodeURIComponent(card.dataset.id)}`, { method: 'DELETE' });
      await loadArtworks();
    } catch (error) {
      alert(`Remove failed: ${error.message}`);
      button.disabled = false;
    }
  });

  ['dragenter', 'dragover'].forEach((name) => dropzone.addEventListener(name, (event) => {
    event.preventDefault();
    dropzone.classList.add('dragover');
  }));
  ['dragleave', 'drop'].forEach((name) => dropzone.addEventListener(name, (event) => {
    event.preventDefault();
    dropzone.classList.remove('dragover');
  }));
  dropzone.addEventListener('drop', (event) => {
    if (!event.dataTransfer.files?.[0]) return;
    fileInput.files = event.dataTransfer.files;
    showFilePreview(event.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files?.[0]) showFilePreview(fileInput.files[0]);
  });

  function showFilePreview(file) {
    previewName.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
    previewMedia.replaceChildren();
    const objectUrl = URL.createObjectURL(file);
    const media = document.createElement(file.type.startsWith('video/') ? 'video' : 'img');
    media.src = objectUrl;
    media.addEventListener('load', () => URL.revokeObjectURL(objectUrl), { once: true });
    media.addEventListener('loadedmetadata', () => URL.revokeObjectURL(objectUrl), { once: true });
    if (media.tagName === 'VIDEO') { media.controls = true; media.muted = true; }
    previewMedia.appendChild(media);
    filePreview.hidden = false;
    $('.drop-prompt', dropzone).hidden = true;
  }

  $('#btnClearFile').addEventListener('click', (event) => {
    event.stopPropagation();
    fileInput.value = '';
    filePreview.hidden = true;
    previewMedia.replaceChildren();
    $('.drop-prompt', dropzone).hidden = false;
  });

  uploadForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!fileInput.files?.[0]) { alert('Select or drop a media file first.'); return; }
    setButtonBusy(btnSubmit, true, 'Processing & optimizing...');
    try {
      const data = await requestJson('/api/upload', { method: 'POST', body: new FormData(uploadForm) });
      uploadForm.reset();
      filePreview.hidden = true;
      previewMedia.replaceChildren();
      $('.drop-prompt', dropzone).hidden = false;
      await loadArtworks();
      alert(`"${data.artwork.title}" is ready in the local /art/ page. Publish when you are ready.`);
    } catch (error) { alert(`Upload failed: ${error.message}`); }
    finally { setButtonBusy(btnSubmit, false); }
  });

  // Project editor
  const projectList = $('#projList');
  const projectCount = $('#projCount');
  const projectSelect = $('#projSelect');
  const projectForm = $('#projForm');
  const btnSaveProject = $('#btnSaveProject');

  async function loadProjects(preferredSlug = state.selectedProject?.slug) {
    try {
      const data = await requestJson('/api/projects');
      state.projects = data.projects;
      projectCount.textContent = data.projects.length;
      projectSelect.innerHTML = '<option value="">— Choose a project —</option>' + data.projects
        .map((project) => `<option value="${escapeHtml(project.slug)}">${escapeHtml(project.title || project.slug)}</option>`).join('');
      renderProjects();
      if (preferredSlug && data.projects.some((project) => project.slug === preferredSlug)) selectProject(preferredSlug);
    } catch (error) { projectList.innerHTML = `<div class="error">${escapeHtml(error.message)}</div>`; }
  }

  function renderProjects() {
    if (state.projects.length === 0) {
      projectList.innerHTML = '<div class="empty-state">No editable project pages found.</div>';
      return;
    }
    projectList.innerHTML = state.projects.map((project) => {
      const hero = projectMediaUrl(project, project.heroImg);
      const media = hero
        ? `<div class="card-media"><img src="${escapeHtml(hero)}" alt="" loading="lazy"></div>`
        : '<div class="card-media card-media-empty"><span>NO HERO</span></div>';
      const selected = state.selectedProject?.slug === project.slug ? ' selected' : '';
      return `<article class="art-card${selected}" data-project="${escapeHtml(project.slug)}">
        ${media}<div class="card-title">${escapeHtml(project.title || project.slug)}</div>
        <div class="card-meta">${escapeHtml(project.category || 'Project page')}</div>
        <div class="card-desc">${escapeHtml(project.description || 'No overview text found.')}</div>
        <div class="card-actions"><button class="btn-edit" type="button" data-action="edit-project">Edit</button>
        <a class="btn-view" href="/site/${encodePath(projectUrlBase(project))}/" target="_blank" rel="noopener">Preview ↗</a></div>
      </article>`;
    }).join('');
  }

  function selectProject(slug) {
    const project = state.projects.find((item) => item.slug === slug);
    if (!project) {
      state.selectedProject = null;
      projectForm.hidden = true;
      projectSelect.value = '';
      renderProjects();
      return;
    }
    state.selectedProject = project;
    projectSelect.value = project.slug;
    projectForm.hidden = false;
    $('#pTitle').value = project.title || '';
    $('#pIdx').value = project.idx || '';
    $('#pTagline').value = project.tagline || '';
    $('#pCategory').value = project.category || '';
    $('#pLocation').value = project.location || '';
    $('#pTimeframe').value = project.timeframe || '';
    $('#pRole').value = project.role || '';
    $('#pDesc').value = project.description || '';
    $('#pChallenge').value = project.challenge || '';
    $('#pResponse').value = project.response || '';
    $('#pOutcome').value = project.outcome || '';
    const hero = projectMediaUrl(project, project.heroImg);
    $('#projHeroPreview').innerHTML = hero
      ? `<img src="${escapeHtml(hero)}" alt="Current hero for ${escapeHtml(project.title)}">`
      : '<span class="dim">No hero image detected.</span>';
    renderProjectMedia(project);
    renderProjects();
  }

  function renderProjectMedia(project) {
    const list = $('#projMediaList');
    if (!project.pageMedia?.some((group) => group.items.length)) {
      list.innerHTML = '<span class="dim">No rearrangeable page media detected.</span>';
      return;
    }
    list.innerHTML = project.pageMedia.filter((group) => group.items.length).map((group) => {
      const items = group.items.map((media, index) => {
        const source = projectMediaUrl(project, media.isVideo ? (media.poster || media.src) : media.src);
        const preview = source
          ? `<img src="${escapeHtml(source)}" alt="" loading="lazy">`
          : `<span class="pm-kind">${media.isVideo ? 'VIDEO' : 'MEDIA'}</span>`;
        const label = media.caption || media.filename;
        return `<article class="pm-item" draggable="true" data-media-id="${escapeHtml(media.id)}">
          <div class="pm-thumb">${preview}<span class="pm-index">${String(index + 1).padStart(2, '0')}</span></div>
          <div class="pm-copy"><span class="pm-label">${escapeHtml(label)}</span><span class="pm-file">${escapeHtml(media.filename)}</span></div>
          <div class="pm-actions">
            <button type="button" data-action="media-up" aria-label="Move ${escapeHtml(media.filename)} earlier" ${index === 0 ? 'disabled' : ''}>↑</button>
            <button type="button" data-action="media-down" aria-label="Move ${escapeHtml(media.filename)} later" ${index === group.items.length - 1 ? 'disabled' : ''}>↓</button>
            <button type="button" class="pm-remove" data-action="media-remove" aria-label="Remove ${escapeHtml(media.filename)}">Remove</button>
          </div>
          <div class="pm-caption-edit">
            <textarea rows="2" maxlength="300" data-caption-input aria-label="Caption for ${escapeHtml(media.filename)}">${escapeHtml(media.caption || '')}</textarea>
            <div class="pm-caption-buttons">
              <button type="button" data-action="caption-save">Save caption</button>
              <button type="button" data-action="caption-generate">Generate 3 options</button>
            </div>
            <div class="pm-suggestions" hidden></div>
          </div>
        </article>`;
      }).join('');
      return `<section class="pm-group" data-group-id="${escapeHtml(group.id)}">
        <div class="pm-group-head"><span>${escapeHtml(group.label)}</span><span>${group.items.length} item${group.items.length === 1 ? '' : 's'}</span></div>
        <div class="pm-items">${items}</div>
      </section>`;
    }).join('');
  }

  async function savePageMediaOrder(group) {
    if (!state.selectedProject) return;
    const orderedIds = $$('.pm-item', group).map((item) => item.dataset.mediaId);
    projectList.classList.add('is-busy');
    try {
      await requestJson(`/api/projects/${encodeURIComponent(state.selectedProject.slug)}/page-media/order`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: group.dataset.groupId, orderedIds })
      });
      await loadProjects(state.selectedProject.slug);
    } catch (error) {
      alert(`Reorder failed: ${error.message}`);
      await loadProjects(state.selectedProject.slug);
    } finally { projectList.classList.remove('is-busy'); }
  }

  $('#projMediaList').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button || !state.selectedProject) return;
    const item = button.closest('.pm-item');
    const group = button.closest('.pm-group');
    if (button.dataset.action === 'caption-option') {
      $('[data-caption-input]', item).value = button.dataset.option || '';
      return;
    }
    if (button.dataset.action === 'caption-save') {
      button.disabled = true;
      try {
        await requestJson(`/api/projects/${encodeURIComponent(state.selectedProject.slug)}/page-media/${encodeURIComponent(item.dataset.mediaId)}/caption`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caption: $('[data-caption-input]', item).value })
        });
        await loadProjects(state.selectedProject.slug);
      } catch (error) { alert(`Caption save failed: ${error.message}`); button.disabled = false; }
      return;
    }
    if (button.dataset.action === 'caption-generate') {
      if (!state.aiReady && !state.aiKey) {
        $('#aiKeyInput').focus();
        alert('Add an OpenAI API key in the AI Captions row first. It stays in this browser session only.');
        return;
      }
      const suggestions = $('.pm-suggestions', item);
      button.disabled = true;
      button.textContent = 'Inspecting media...';
      suggestions.hidden = true;
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (state.aiKey) headers['x-openai-api-key'] = state.aiKey;
        const data = await requestJson(`/api/projects/${encodeURIComponent(state.selectedProject.slug)}/page-media/${encodeURIComponent(item.dataset.mediaId)}/caption-options`, {
          method: 'POST', headers, body: '{}'
        });
        suggestions.innerHTML = data.options.map((option, optionIndex) =>
          `<button type="button" data-action="caption-option" data-option="${escapeHtml(option)}"><span>${optionIndex + 1}</span>${escapeHtml(option)}</button>`).join('');
        suggestions.hidden = false;
      } catch (error) { alert(`Caption generation failed: ${error.message}`); }
      finally { button.disabled = false; button.textContent = 'Generate 3 options'; }
      return;
    }
    if (button.dataset.action === 'media-remove') {
      const label = $('.pm-label', item)?.textContent || 'this media item';
      if (!confirm(`Remove "${label}" from this project page? Unused local files will also be deleted.`)) return;
      button.disabled = true;
      try {
        await requestJson(`/api/projects/${encodeURIComponent(state.selectedProject.slug)}/page-media/${encodeURIComponent(item.dataset.mediaId)}`, { method: 'DELETE' });
        await loadProjects(state.selectedProject.slug);
      } catch (error) { alert(`Remove failed: ${error.message}`); button.disabled = false; }
      return;
    }
    if (!['media-up', 'media-down'].includes(button.dataset.action)) return;
    const sibling = button.dataset.action === 'media-up' ? item.previousElementSibling : item.nextElementSibling;
    if (!sibling) return;
    if (button.dataset.action === 'media-up') item.parentElement.insertBefore(item, sibling);
    else item.parentElement.insertBefore(sibling, item);
    await savePageMediaOrder(group);
  });

  let draggedMedia = null;
  $('#projMediaList').addEventListener('dragstart', (event) => {
    if (event.target.closest('button, input, textarea')) {
      event.preventDefault();
      return;
    }
    draggedMedia = event.target.closest('.pm-item');
    if (!draggedMedia) return;
    draggedMedia.classList.add('is-dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', draggedMedia.dataset.mediaId);
  });
  $('#projMediaList').addEventListener('dragover', (event) => {
    const target = event.target.closest('.pm-item');
    if (!draggedMedia || !target || target === draggedMedia
      || target.closest('.pm-group') !== draggedMedia.closest('.pm-group')) return;
    event.preventDefault();
    const bounds = target.getBoundingClientRect();
    target.parentElement.insertBefore(draggedMedia, event.clientY < bounds.top + bounds.height / 2 ? target : target.nextSibling);
  });
  $('#projMediaList').addEventListener('drop', async (event) => {
    if (!draggedMedia) return;
    event.preventDefault();
    const group = draggedMedia.closest('.pm-group');
    draggedMedia.classList.remove('is-dragging');
    draggedMedia = null;
    await savePageMediaOrder(group);
  });
  $('#projMediaList').addEventListener('dragend', () => {
    if (draggedMedia) draggedMedia.classList.remove('is-dragging');
    draggedMedia = null;
  });

  projectSelect.addEventListener('change', () => selectProject(projectSelect.value));
  projectList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="edit-project"]');
    if (!button) return;
    selectProject(button.closest('[data-project]').dataset.project);
    projectForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  projectForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!state.selectedProject) return;
    const payload = {
      title: $('#pTitle').value, tagline: $('#pTagline').value, category: $('#pCategory').value,
      location: $('#pLocation').value, timeframe: $('#pTimeframe').value, role: $('#pRole').value,
      description: $('#pDesc').value, challenge: $('#pChallenge').value,
      response: $('#pResponse').value, outcome: $('#pOutcome').value
    };
    setButtonBusy(btnSaveProject, true, 'Saving page...');
    try {
      await requestJson(`/api/projects/${encodeURIComponent(state.selectedProject.slug)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      await loadProjects(state.selectedProject.slug);
      alert('Project page saved locally. Use Preview Site to review it, then publish when ready.');
    } catch (error) { alert(`Save failed: ${error.message}`); }
    finally { setButtonBusy(btnSaveProject, false); }
  });

  $('#heroFileInput').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file || !state.selectedProject) return;
    const data = new FormData();
    data.append('heroFile', file);
    event.target.disabled = true;
    try {
      await requestJson(`/api/projects/${encodeURIComponent(state.selectedProject.slug)}/hero`, { method: 'POST', body: data });
      await loadProjects(state.selectedProject.slug);
    } catch (error) { alert(`Hero upload failed: ${error.message}`); }
    finally { event.target.value = ''; event.target.disabled = false; }
  });

  $('#mediaFileInput').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file || !state.selectedProject) return;
    const data = new FormData();
    data.append('mediaFile', file);
    event.target.disabled = true;
    try {
      await requestJson(`/api/projects/${encodeURIComponent(state.selectedProject.slug)}/media`, { method: 'POST', body: data });
      await loadProjects(state.selectedProject.slug);
      alert('Media optimized and added to this project’s media library.');
    } catch (error) { alert(`Media upload failed: ${error.message}`); }
    finally { event.target.value = ''; event.target.disabled = false; }
  });

  // Publish pipeline
  const btnDeploy = $('#btnDeploy');
  const deployModal = $('#deployModal');
  const deployLogs = $('#deployLogs');
  btnDeploy.addEventListener('click', async () => {
    if (!confirm('Commit the current site changes, validate a Netlify preview, and publish them to rtfx.space?')) return;
    deployModal.hidden = false;
    deployLogs.textContent = 'Initializing publish pipeline...\n';
    btnDeploy.disabled = true;
    try {
      const response = await fetch('/api/deploy', { method: 'POST' });
      if (!response.ok || !response.body) throw new Error(`Publish request failed with HTTP ${response.status}.`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        const messages = buffer.split('\n\n');
        buffer = messages.pop() || '';
        messages.forEach((message) => {
          if (!message.startsWith('data: ')) return;
          try {
            const payload = JSON.parse(message.slice(6));
            if (payload.log) {
              deployLogs.textContent += `${payload.log}\n`;
              deployLogs.scrollTop = deployLogs.scrollHeight;
            }
          } catch { /* Ignore partial event data. */ }
        });
        if (done) break;
      }
    } catch (error) { deployLogs.textContent += `Publish failed: ${error.message}\n`; }
    finally { btnDeploy.disabled = false; }
  });

  $('#btnCloseModal').addEventListener('click', () => { deployModal.hidden = true; });

  // ---- gallery ------------------------------------------------------------
  async function loadGallery() {
    const list = $('#galleryList');
    list.textContent = 'Loading…';
    try {
      const data = await (await fetch('/api/gallery')).json();
      if (!data.success) throw new Error(data.error || 'failed');
      $('#galleryCount').textContent = `${data.count} · next number ${data.nextFree}`;
      $('#eventList').innerHTML = (data.events || []).length
        ? '<b class="hint">Events</b>' + data.events.map((e) => `
            <div class="gallery-row event-row">
              <b>${escapeHtml(e.name || e.key)}</b>
              <span class="path">${escapeHtml(e.date || 'no date')} · ${escapeHtml(e.location || 'no location')}</span>
              <span class="path">${escapeHtml(e.summary || '')}</span>
            </div>`).join('')
        : '<span class="hint">No events yet.</span>';
      list.innerHTML = data.frames.map((f) => `
        <div class="gallery-row" data-frame="${escapeHtml(f.frame)}">
          <b>${escapeHtml(f.frame)}</b>
          <span class="path">${escapeHtml(f.file)}</span>
          <input class="g-date" value="${escapeHtml(f.date || '')}" placeholder="YYYY-MM-DD" size="11">
          <input class="g-loc" value="${escapeHtml(f.location || '')}" placeholder="location">
          <input class="g-tags" value="${escapeHtml((f.tags || []).join(', '))}" placeholder="tags">
          <button class="g-save">Save</button>
          <button class="g-del" title="Remove this frame">✕</button>
        </div>`).join('');
    } catch (e) {
      list.textContent = 'Could not load frames: ' + e.message;
    }
  }

  $('#galleryList').addEventListener('click', async (event) => {
    const row = event.target.closest('.gallery-row');
    if (!row) return;
    const frame = row.dataset.frame;

    if (event.target.classList.contains('g-save')) {
      const body = {
        date: $('.g-date', row).value.trim(),
        location: $('.g-loc', row).value.trim(),
        tags: $('.g-tags', row).value
      };
      const res = await (await fetch(`/api/gallery/${frame}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      })).json();
      event.target.textContent = res.success ? 'Saved' : 'Failed';
      setTimeout(() => { event.target.textContent = 'Save'; }, 1500);
    }

    if (event.target.classList.contains('g-del')) {
      // the number is retired, not freed - say so, because it is irreversible
      if (!confirm(`Remove frame ${frame}? Its number is retired permanently and will not be reused.`)) return;
      const res = await (await fetch(`/api/gallery/${frame}`, { method: 'DELETE' })).json();
      if (res.success) loadGallery(); else alert(res.error || 'Delete failed');
    }
  });

  $('#galleryForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const file = $('#galleryFile').files[0];
    if (!file) return;
    const status = $('#galleryStatus'), button = $('#gallerySubmit');
    button.disabled = true; status.textContent = 'Processing…';
    const form = new FormData();
    form.append('mediaFile', file);
    form.append('alt', $('#galleryAlt').value);
    form.append('location', $('#galleryLocation').value);
    form.append('tags', $('#galleryTags').value);
    form.append('cat', $('#galleryCat').value);
    try {
      const res = await (await fetch('/api/gallery', { method: 'POST', body: form })).json();
      if (!res.success) throw new Error(res.error || 'upload failed');
      status.textContent = res.exifFound
        ? `Added as frame ${res.frame} — date ${res.record.date} (${res.record.dateSource})`
        : `Added as frame ${res.frame} — no date found in the file, add one below`;
      $('#galleryForm').reset();
      $('#galleryCat').value = 'studio';
      loadGallery();
    } catch (e) {
      status.textContent = 'Failed: ' + e.message;
    } finally {
      button.disabled = false;
    }
  });

  $('#importForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = $('#impStatus'), button = $('#impSubmit');
    button.disabled = true;
    status.textContent = 'Importing… this processes every image, so give it a moment.';
    try {
      const res = await (await fetch('/api/gallery/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder: $('#impFolder').value.trim(),
          event: $('#impEvent').value.trim(),
          date: $('#impDate').value.trim(),
          location: $('#impLocation').value.trim(),
          client: $('#impClient').value.trim(),
          summary: $('#impSummary').value.trim(),
          tags: $('#impTags').value
        })
      })).json();
      if (!res.success) throw new Error(res.error || 'import failed');
      status.textContent = `${res.event}: imported ${res.added} of ${res.total}`
        + (res.failed ? `, ${res.failed} failed` : '')
        + `. ${res.withDate} had a usable date in the file; the rest inherit the event date.`;
      loadGallery();
    } catch (e) {
      status.textContent = 'Failed: ' + e.message;
    } finally {
      button.disabled = false;
    }
  });

  loadArtworks();
  loadAiStatus();
});
