(function () {
  'use strict';

  async function loadProjects(source) {
    const res = await fetch(`assets/data/${source}.json`);
    if (!res.ok) throw new Error(`Failed to load ${source}.json`);
    return res.json();
  }

  function wrapLetters(text) {
    let globalIndex = 0;
    return text
      .split(' ')
      .map(word => {
        const letters = word.split('').map(ch => {
          const span = `<span class="letter" style="--i: ${globalIndex++}">${ch}</span>`;
          return span;
        }).join('');
        return `<span class="word">${letters}</span>`;
      })
      .join(' ');
  }

  function renderGrid(container, projects, limit) {
    const slice = limit ? projects.slice(0, limit) : projects;
    const tpl = document.getElementById('card-template');
    const placeholderTpl = document.getElementById('card-placeholder');
    const frag = document.createDocumentFragment();

    for (const p of slice) {
      if (tpl) {
        const node = tpl.content.cloneNode(true);
        const a = node.querySelector('.card');
        a.href = `project.html?source=${container.dataset.source}&id=${p.id}`;
        a.setAttribute('aria-label', `${p.name} — Open project`);
        const img = node.querySelector('.card__img');
        img.src = `assets/projects/${container.dataset.source}/${p.id}/cover.png`;
        img.alt = p.name;
        const title = node.querySelector('.card__title');
        title.innerHTML = wrapLetters(p.name);
        const creator = node.querySelector('.card__creator');
        if (creator) {
          if (p.creator) { creator.textContent = p.creator; creator.style.display = ''; }
          else { creator.style.display = 'none'; }
        }
        frag.appendChild(node);
      } else {
        // Fallback if template missing
        const a = document.createElement('a'); a.className = 'card'; a.href = `project.html?source=${container.dataset.source}&id=${p.id}`; a.setAttribute('aria-label', `${p.name} — Open project`);
        const img = document.createElement('img'); img.className = 'card__img'; img.src = `assets/projects/${container.dataset.source}/${p.id}/cover.png`; img.alt = p.name; img.loading = 'lazy';
        const overlay = document.createElement('div'); overlay.className = 'card__overlay'; const meta = document.createElement('div'); meta.className = 'card__meta'; const h3 = document.createElement('h3'); h3.className = 'card__title'; h3.innerHTML = wrapLetters(p.name);
        meta.appendChild(h3); if (p.creator) {const c=document.createElement('p'); c.className='card__creator'; c.textContent=p.creator; meta.appendChild(c);} overlay.appendChild(meta); a.appendChild(img); a.appendChild(overlay); frag.appendChild(a);
      }
    }

    const total = slice.length;

    // First render the actual project cards so we can measure the real layout (rows/columns)
    container.innerHTML = '';
    container.appendChild(frag);

    // Prefer the configured grid-template-columns from CSS (handles single-item cases like 'commissions')
    let columns = 1;
    try {
      const style = window.getComputedStyle(container);
      const colsProp = style.getPropertyValue('grid-template-columns');
      const cssColumns = colsProp ? colsProp.trim().split(/\s+/).length : 0;

      // Also measure first row count if multiple items exist (sanity check)
      const children = Array.from(container.children).filter((el) => el.nodeType === 1 && el.classList && el.classList.contains('card'));
      let measuredColumns = 0;
      if (children.length) {
        const firstTop = children[0].offsetTop;
        measuredColumns = children.filter((c) => c.offsetTop === firstTop).length || 0;
      }

      // Prefer CSS columns when defined (prevents single-item grids measuring as 1)
      if (cssColumns && cssColumns > 0) columns = cssColumns;
      else if (measuredColumns && measuredColumns > 0) columns = measuredColumns;
      else columns = 1;

    } catch (err) {
      columns = 4; // fallback
    }

    // Only add placeholders to finish the current row (avoid creating rows made only of placeholders)
    const needed = (columns - (total % columns)) % columns;

    for (let i = 0; i < needed; i++) {
      if (placeholderTpl) container.appendChild(placeholderTpl.content.cloneNode(true)); else { const d = document.createElement('div'); d.className='card placeholder'; container.appendChild(d); }
    }
  }

  async function initGrids() {
    const grids = document.querySelectorAll('.grid[data-source]');
    for (const grid of grids) {
      let source = grid.dataset.source;

      if (!source && grid.id === 'projects-grid') {
        const params = new URLSearchParams(window.location.search);
        source = params.get('source') || 'personal';
        grid.dataset.source = source;

        const heading = document.getElementById('projects-heading');
        if (heading) heading.textContent = source === 'commissions' ? 'Commissions' : 'Personal Projects';
      }

      const limit = grid.dataset.limit ? parseInt(grid.dataset.limit, 10) : null;
      try {
        const projects = await loadProjects(source);
        renderGrid(grid, projects, limit);

        // Re-render on resize to recalc placeholders when column count changes
        const debounced = (fn, wait=120) => {
          let t = null;
          return (...args) => { clearTimeout(t); t = setTimeout(()=>fn(...args), wait); };
        };
        const rerender = debounced(() => renderGrid(grid, projects, limit));
        window.addEventListener('resize', rerender);

      } catch (err) {
        console.error(`Failed to load grid for ${source}:`, err);
        grid.innerHTML = '<p class="muted">Failed to load projects.</p>';
      }
    }
  }

  function renderProjectDetail(project, source) {
    const root = document.getElementById('project-root');
    if (!root) return;

    function formatDuration(d) {
      if (!d && d !== 0) return '';
      if (typeof d === 'string') return d;
      // assume numeric seconds
      const s = Math.round(Number(d) || 0);
      const m = Math.floor(s / 60);
      const ss = String(s % 60).padStart(2, '0');
      return `${m}:${ss}`;
    }

    function loadTrackDuration(track, durationEl) {
      const tempAudio = new Audio();
      tempAudio.preload = 'metadata';
      tempAudio.src = track.path;
      tempAudio.addEventListener('loadedmetadata', () => {
        const dur = tempAudio.duration;
        durationEl.textContent = formatDuration(dur);
      });
      tempAudio.addEventListener('error', () => {
        durationEl.textContent = '—';
      });
    }

    const tracksHtml = project.tracks && project.tracks.length
      ? project.tracks
          .map((t, i) => `<li class="track" data-index="${i}" data-path="${t.path}">
              <button class="iconbtn play-track" aria-label="Play ${t.title}"><i class="fa-solid fa-play"></i></button>
              <span class="track-title">${t.title}</span>
              <span class="track-duration">—</span>
            </li>`)
          .join('')
      : '';

    // optional media/embeds
    const videoHtml = project.video
      ? `<div class="project__video">
          <div class="video__wrap">
            <iframe src="${project.video}" title="${project.name} video" allow="autoplay; encrypted-media" frameborder="0" allowfullscreen></iframe>
          </div>
        </div>`
      : '';

    const spotifyHtml = project.spotify
      ? `<div class="spotify-card">
          <iframe src="${project.spotify}" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>
        </div>`
      : '';

    const template = document.getElementById('project-template');
    const clone = template.content.cloneNode(true);

    // Populate fields
    clone.querySelector('[data-field="name"]').textContent = project.name;
    clone.querySelector('.tracklist-card__title [data-field="name"]').textContent = project.name;
    clone.querySelector('[data-field="image"]').src = `assets/projects/${source}/${project.id}/cover.png`;
    clone.querySelector('[data-field="image"]').alt = project.name;
    clone.querySelector('[data-field="description"]').textContent = project.description;

    if (project.creator) {
      clone.querySelector('[data-field="creator"]').textContent = 'by ' + project.creator;
      clone.querySelector('[data-field="creator"]').style.display = '';
    }

    const videoSection = clone.querySelector('[data-conditional="video"]');
    const noVideoSection = clone.querySelector('[data-conditional="no-video"]');
    if (project.video) {
      videoSection.style.display = '';
      noVideoSection.style.display = 'none';
      clone.querySelector('[data-field="videoHtml"]').innerHTML = videoHtml;
    } else {
      videoSection.style.display = 'none';
      noVideoSection.style.display = '';
    }

    const tracklist = clone.querySelector('.tracklist');
    const noTracks = clone.querySelector('.no-tracks');
    if (tracksHtml) {
      tracklist.innerHTML = tracksHtml;
      noTracks.style.display = 'none';
    } else {
      tracklist.style.display = 'none';
      noTracks.style.display = '';
    }

    // Hide player if no tracks
    let playerEl = clone.querySelector('#project-player');
    if (playerEl) {
      playerEl.style.display = tracksHtml ? '' : 'none';
    }

    root.innerHTML = '';
    root.appendChild(clone);
    // Apply per-letter accentuation to the hero title if available
    const titleEl = document.querySelector('.project-hero__title.accentuation-title');
    if (titleEl && typeof wrapSectionLetters === 'function') wrapSectionLetters(titleEl);

    // Load durations for tracks
    const trackItems = document.querySelectorAll('.track');
    trackItems.forEach((item, i) => {
      const durationEl = item.querySelector('.track-duration');
      loadTrackDuration(project.tracks[i], durationEl);
    });

    // Find player elements (they may not exist on all projects)
    playerEl = document.getElementById('project-player');
    if (!tracksHtml) return;  // No player setup needed if no tracks
    const playBtn = playerEl ? playerEl.querySelector('#play') : null;
    const prevBtn = playerEl ? playerEl.querySelector('#prev') : null;
    const nextBtn = playerEl ? playerEl.querySelector('#next') : null;
    // progress bar removed; no element to query
    const trackTitle = playerEl ? playerEl.querySelector('.player__track') : null;
    const timeline = playerEl ? playerEl.querySelector('.player__timeline') : null;
    const elapsedEl = playerEl ? playerEl.querySelector('.player__elapsed') : null;

    let audio = new Audio();
    // Help detect cutoffs: load metadata, allow CORS fetches, and log progress/errors
    audio.preload = 'metadata';
    try { audio.crossOrigin = 'anonymous'; } catch (e) {}

    let current = 0;
    let isPlaying = false;

    // Debug and resilience listeners
    audio.addEventListener('loadedmetadata', () => {
      console.log('Audio loadedmetadata', { index: current, duration: audio.duration });
      updateTimeline();
    });

    audio.addEventListener('progress', () => {
      try {
        const buf = audio.buffered;
        if (buf && buf.length) {
          const end = buf.end(buf.length - 1);
          console.log('Audio buffered end', end, 'of', audio.duration);
        }
      } catch (err) { /* ignore */ }
    });

    audio.addEventListener('stalled', () => console.warn('Audio stalled'));
    audio.addEventListener('suspend', () => console.warn('Audio suspend'));

    audio.addEventListener('error', (ev) => {
      console.error('Audio error', ev, audio.error);
      if (trackTitle) trackTitle.textContent = 'Audio error';
    });

    function updateActive() {
      trackItems.forEach((el) => el.classList.remove('active'));
      const cur = document.querySelector(`.track[data-index="${current}"]`);
      if (cur) cur.classList.add('active');
    }

    function updateTrackIcons() {
      trackItems.forEach((item) => {
        const btn = item.querySelector('.play-track i');
        if (!btn) return;
        const idx = parseInt(item.dataset.index, 10);
        if (idx === current && isPlaying) {
          btn.className = 'fa-solid fa-pause';
        } else {
          btn.className = 'fa-solid fa-play';
        }
      });
    }

    function loadTrack(i) {
      current = i;
      audio.src = project.tracks[i].path;
      audio.load();
      if (trackTitle) trackTitle.textContent = project.tracks[i].title || '';
      updateActive();
      updateTrackIcons();
    }

    function play() {
      audio.play();
      isPlaying = true;
      if (playBtn) playBtn.querySelector('i').className = 'fa-solid fa-pause';
      updateTrackIcons();
    }

    function pause() {
      audio.pause();
      isPlaying = false;
      if (playBtn) playBtn.querySelector('i').className = 'fa-solid fa-play';
      updateTrackIcons();
    }

    function toggle() {
      if (isPlaying) pause(); else play();
    }

    if (playBtn) playBtn.addEventListener('click', toggle);
    if (prevBtn) prevBtn.addEventListener('click', () => {
      if (current > 0) {
        loadTrack(current - 1);
        play();
      }
    });
    if (nextBtn) nextBtn.addEventListener('click', () => {
      if (current < project.tracks.length - 1) {
        loadTrack(current + 1);
        play();
      }
    });

    trackItems.forEach((item) => {
      const btn = item.querySelector('.play-track');
      if (!btn) return;
      btn.addEventListener('click', () => {
        const idx = parseInt(item.dataset.index, 10);
        if (idx === current && isPlaying) {
          pause();
        } else {
          loadTrack(idx);
          play();
        }
      });
    });


    audio.addEventListener('ended', () => {
      console.log('Audio ended', { index: current, currentTime: audio.currentTime, duration: audio.duration });
      if (current < project.tracks.length - 1) {
        loadTrack(current + 1);
        play();
      } else {
        pause();
        audio.currentTime = 0;
      }
    });
    // Update timeline visuals
    function updateTimeline() {
      if (!audio.duration || !elapsedEl || !timeline) return;
      const pct = (audio.currentTime / audio.duration) * 100;
      elapsedEl.style.width = pct + '%';
      timeline.setAttribute('aria-valuenow', Math.floor(pct));
    }

    if (audio) audio.addEventListener('timeupdate', updateTimeline);

    // click-to-seek
    if (timeline) timeline.addEventListener('click', (e) => {
      if (!audio.duration) return;
      const rect = timeline.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      audio.currentTime = pct * audio.duration;
      updateTimeline();
    });
    // load first track by default
    if (project.tracks && project.tracks.length) loadTrack(0);
  }

  async function initProjectPage() {
    const params = new URLSearchParams(window.location.search);
    const source = params.get('source');
    const id = params.get('id');

    if (!source || !id) {
      const root = document.getElementById('project-root');
      if (root) root.innerHTML = '<p class="muted">Project not found. <a href="projects.html">Browse projects</a>.</p>';
      return;
    }

    try {
      const projects = await loadProjects(source);
      const project = projects.find((p) => p.id === id);
      if (!project) {
        const root = document.getElementById('project-root');
        if (root) root.innerHTML = '<p class="muted">Project not found. <a href="projects.html">Browse projects</a>.</p>';
        return;
      }
      renderProjectDetail(project, source);
    } catch (err) {
      console.error('Failed to load project:', err);
      const root = document.getElementById('project-root');
      if (root) root.innerHTML = '<p class="muted">Failed to load project.</p>';
    }
  }

  window.loadProjects = loadProjects;
  window.initGrids = initGrids;
  window.initProjectPage = initProjectPage;
  window.renderProjectDetail = renderProjectDetail;
})();