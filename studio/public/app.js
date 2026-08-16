document.addEventListener('DOMContentLoaded', () => {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const filePreview = document.getElementById('filePreview');
  const previewMedia = document.getElementById('previewMedia');
  const previewName = document.getElementById('previewName');
  const btnClearFile = document.getElementById('btnClearFile');
  const uploadForm = document.getElementById('uploadForm');
  const btnSubmit = document.getElementById('btnSubmit');
  const artList = document.getElementById('artList');
  const artCount = document.getElementById('artCount');
  
  const btnDeploy = document.getElementById('btnDeploy');
  const deployModal = document.getElementById('deployModal');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const deployLogs = document.getElementById('deployLogs');

  // 1. Load Artworks
  function loadArtworks() {
    fetch('/api/art')
      .then(res => res.json())
      .then(data => {
        if (!data.success) throw new Error(data.error);
        renderArtworks(data.artworks);
      })
      .catch(err => {
        artList.innerHTML = `<div class="error">Error loading artworks: ${err.message}</div>`;
      });
  }

  function renderArtworks(artworks) {
    artCount.textContent = artworks.length;
    if (artworks.length === 0) {
      artList.innerHTML = `<div class="empty-state">No artworks published yet. Upload your first piece on the left!</div>`;
      return;
    }

    artList.innerHTML = artworks.map(art => {
      const isVideo = art.mediaType === 'video';
      const mediaHtml = isVideo
        ? `<div class="card-media"><video src="${art.src}" poster="${art.poster || ''}" muted playsinline></video><span class="badge-video">VIDEO</span></div>`
        : `<div class="card-media"><img src="${art.src}" alt="${art.title}" loading="lazy"></div>`;

      return `
        <div class="art-card" data-id="${art.id}">
          ${mediaHtml}
          <div class="card-title">${art.title}</div>
          <div class="card-meta">${art.category} · ${art.year}</div>
          <div class="card-desc">${art.description || 'No description provided.'}</div>
          <div class="card-actions">
            <button class="btn-del" onclick="deleteArtwork('${art.id}', '${art.title.replace(/'/g, "\\'")}')">Remove ✗</button>
          </div>
        </div>
      `;
    }).join('');
  }

  window.deleteArtwork = function(id, title) {
    if (!confirm(`Are you sure you want to remove "${title}" from the art gallery?`)) return;
    fetch(`/api/art/${id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          loadArtworks();
        } else {
          alert('Error: ' + data.error);
        }
      });
  };

  // 2. Drag & Drop Handling
  ['dragenter', 'dragover'].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      fileInput.files = e.dataTransfer.files;
      handleFileSelected(fileInput.files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
      handleFileSelected(fileInput.files[0]);
    }
  });

  function handleFileSelected(file) {
    previewName.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
    previewMedia.innerHTML = '';

    if (file.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      previewMedia.appendChild(img);
    } else if (file.type.startsWith('video/')) {
      const vid = document.createElement('video');
      vid.src = URL.createObjectURL(file);
      vid.controls = true;
      vid.muted = true;
      previewMedia.appendChild(vid);
    }

    filePreview.hidden = false;
    dropzone.querySelector('.drop-prompt').hidden = true;
  }

  btnClearFile.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.value = '';
    filePreview.hidden = true;
    previewMedia.innerHTML = '';
    dropzone.querySelector('.drop-prompt').hidden = false;
  });

  // 3. Form Submit
  uploadForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!fileInput.files || !fileInput.files[0]) {
      alert('Please select or drop a media file first.');
      return;
    }

    const formData = new FormData(uploadForm);
    btnSubmit.disabled = true;
    btnSubmit.querySelector('.btn-text').hidden = true;
    btnSubmit.querySelector('.btn-loading').hidden = false;

    fetch('/api/upload', {
      method: 'POST',
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      if (!data.success) throw new Error(data.error);
      uploadForm.reset();
      filePreview.hidden = true;
      previewMedia.innerHTML = '';
      dropzone.querySelector('.drop-prompt').hidden = false;
      loadArtworks();
      alert(`Artwork "${data.artwork.title}" successfully processed and added to /art/!`);
    })
    .catch(err => {
      alert('Upload failed: ' + err.message);
    })
    .finally(() => {
      btnSubmit.disabled = false;
      btnSubmit.querySelector('.btn-text').hidden = false;
      btnSubmit.querySelector('.btn-loading').hidden = true;
    });
  });

  // 4. Deploy Trigger
  btnDeploy.addEventListener('click', () => {
    if (!confirm('Deploy latest changes & artworks directly to Netlify production (rtfxv2)?')) return;
    deployModal.hidden = false;
    deployLogs.textContent = 'Initializing deployment stream...\n';

    fetch('/api/deploy', { method: 'POST' })
      .then(response => {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        function readStream() {
          reader.read().then(({ done, value }) => {
            if (done) return;
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n\n');
            lines.forEach(line => {
              if (line.startsWith('data: ')) {
                try {
                  const payload = JSON.parse(line.replace('data: ', ''));
                  if (payload.log) {
                    deployLogs.textContent += payload.log + '\n';
                    deployLogs.scrollTop = deployLogs.scrollHeight;
                  }
                } catch(e){}
              }
            });
            readStream();
          });
        }
        readStream();
      })
      .catch(err => {
        deployLogs.textContent += `Deploy error: ${err.message}\n`;
      });
  });

  btnCloseModal.addEventListener('click', () => {
    deployModal.hidden = true;
  });

  // Initial load
  loadArtworks();
});
