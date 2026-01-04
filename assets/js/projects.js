(function () {
  'use strict';

  async function loadProjects(source) {
    const res = await fetch(`assets/data/${source}.json`);
    if (!res.ok) throw new Error(`Failed to load ${source}.json`);
    return res.json();
  }

  function wrapLetters(text) {
    return text
      .split('')
      .map((char, i) => {
        if (char === ' ') return '<span class="letter" style="width: 0.3em;"> </span>';
        return `<span class="letter" style="transition-delay: ${i * 25}ms;">${char}</span>`;
      })
      .join('');
  }

  function renderGrid(container, projects, limit) {
    const slice = limit ? projects.slice(0, limit) : projects;
    container.innerHTML = slice
      .map(
        (p) => `
    <a class="card" href="project.html?source=${container.dataset.source}&id=${p.id}" aria-label="${p.name} — Open project">
      <img class="card__img" src="assets/projects/${container.dataset.source}/${p.id}/cover.png" alt="${p.name}" loading="lazy" />
      <div class="card__overlay">
        <div class="card__meta">
          <h3 class="card__title">${wrapLetters(p.name)}</h3>
          ${p.creator ? `<p class="card__creator">${p.creator}</p>` : ''}
        </div>
      </div>
    </a>
  `
      )
      .join('');
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
    const playerEl = document.getElementById('project-player');
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