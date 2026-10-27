(function () {
  'use strict';

  const PROJECT_SOURCES = new Set(['personal', 'commissions']);
  const EMBED_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'www.youtube-nocookie.com']);
  const projectCache = new Map();
  const PROJECT_PAGE_META = {
    commissions: {
      title: 'Commissions — Charlie McKenzie | Game Music Composer for Hire',
      description: 'Commission custom music and sound design from Charlie McKenzie — RPG themes, retro soundtracks, atmospheric tracks, and full OSTs for indie games, fan games, and ROM hacks.'
    },
    personal: {
      title: 'Personal Projects — Charlie McKenzie | Indie & Fan Game Soundtracks',
      description: 'Original soundtracks and personal compositions by Charlie McKenzie — including Super Mario Galaxy 2 mods, RPG fan games, and passion projects. Retro, orchestral, and electronic styles.'
    }
  };

  async function loadProjects(source) {
    if (!PROJECT_SOURCES.has(source)) throw new Error('Invalid project source');
    if (!projectCache.has(source)) {
      const request = fetch(`assets/data/${source}.json`)
        .then(response => {
          if (!response.ok) throw new Error(`Failed to load ${source}.json`);
          return response.json();
        });
      projectCache.set(source, request);
    }

    try {
      return await projectCache.get(source);
    } catch (error) {
      projectCache.delete(source);
      throw error;
    }
  }

  function projectAssetPath(source, project, file) {
    return `assets/projects/${source}/${encodeURIComponent(project.id)}/${encodeURIComponent(file)}`;
  }

  function projectPagePath(source, id) {
    return `project.html?${new URLSearchParams({ source, id })}`;
  }

  function wrapLetters(element, text) {
    const value = String(text ?? '').trim();
    element.replaceChildren();
    if (!value) return;

    let globalIndex = 0;
    const words = value.split(/\s+/);

    words.forEach((word, wordIndex) => {
      const wordElement = document.createElement('span');
      wordElement.className = 'word';
      for (const character of word) {
        const letter = document.createElement('span');
        letter.className = 'letter';
        letter.style.setProperty('--i', String(globalIndex++));
        letter.textContent = character;
        wordElement.appendChild(letter);
      }
      element.appendChild(wordElement);
      if (wordIndex < words.length - 1) element.appendChild(document.createTextNode(' '));
    });
  }

  function renderGrid(container, projects, limit) {
    const slice = limit ? projects.slice(0, limit) : projects;
    const template = document.getElementById('card-template');
    const placeholderTpl = document.getElementById('card-placeholder');
    if (!template) return;

    const frag = document.createDocumentFragment();
    const source = container.dataset.source;

    for (const p of slice) {
      if (!p.tracks || !p.tracks.length) continue;
      const node = template.content.cloneNode(true);
      const card = node.querySelector('.card');
      card.href = projectPagePath(source, p.id);
      card.setAttribute('aria-label', `${p.name} — Open project`);

      const image = node.querySelector('.card__img');
      image.src = projectAssetPath(source, p, 'cover.png');
      image.alt = p.name;
      image.loading = 'lazy';
      image.decoding = 'async';
      wrapLetters(node.querySelector('.card__title'), p.name);

      const creator = node.querySelector('.card__creator');
      if (creator) {
        creator.classList.toggle('hidden', !p.creator);
        if (p.creator) creator.textContent = p.creator;
      }

      frag.appendChild(node);
    }

    container.replaceChildren(frag);
    const cards = [...container.children];
    const columnCount = getComputedStyle(container).gridTemplateColumns.trim().split(/\s+/).length || 1;
    const emptySlots = (columnCount - (cards.length % columnCount)) % columnCount;
    const needed = limit ? Math.max(0, limit - cards.length) : emptySlots;
    for (let i = 0; i < needed; i++) {
      if (placeholderTpl) container.appendChild(placeholderTpl.content.cloneNode(true));
    }
  }

  function updateProjectPageMeta(source) {
    const meta = PROJECT_PAGE_META[source];
    const heading = document.getElementById('projects-heading');
    const description = document.querySelector('meta[name="description"]');
    const canonical = document.querySelector('link[rel="canonical"]');

    document.title = meta.title;
    if (heading) heading.textContent = source === 'commissions' ? 'Commissions' : 'Personal Projects';
    if (description) description.content = meta.description;
    if (canonical) canonical.href = `https://www.charliemckenziemusic.com/projects.html?source=${source}`;
  }

  async function initGrid(grid) {
    const requestedSource = grid.dataset.source || new URLSearchParams(location.search).get('source');
    const source = PROJECT_SOURCES.has(requestedSource) ? requestedSource : 'personal';
    const limit = Number(grid.dataset.limit) || null;
    grid.dataset.source = source;

    if (grid.id === 'projects-grid') updateProjectPageMeta(source);

    try {
      const projects = await loadProjects(source);
      renderGrid(grid, projects, limit);

      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => renderGrid(grid, projects, limit), 120);
      }, { passive: true });
    } catch (error) {
      console.error(`Failed to load grid for ${source}:`, error);
      const message = document.createElement('p');
      message.className = 'muted';
      message.textContent = 'Failed to load projects.';
      grid.replaceChildren(message);
    }
  }

  async function initGrids() {
    const grids = [...document.querySelectorAll('.grid[data-source]')];
    await Promise.all(grids.map(initGrid));
  }

  function formatDuration(duration) {
    if (!duration && duration !== 0) return '';
    if (typeof duration === 'string') return duration;

    const seconds = Math.round(Number(duration) || 0);
    const minutes = Math.floor(seconds / 60);
    const remainder = String(seconds % 60).padStart(2, '0');
    return `${minutes}:${remainder}`;
  }

  function loadTrackDuration(track, durationEl) {
    const tempAudio = new Audio();
    tempAudio.preload = 'metadata';
    tempAudio.src = track.url;
    tempAudio.addEventListener('loadedmetadata', () => {
      durationEl.textContent = formatDuration(tempAudio.duration);
    });
    tempAudio.addEventListener('error', () => {
      durationEl.textContent = '—';
    });
  }

  function createProjectVideo(url, projectName) {
    let videoUrl;
    try {
      videoUrl = new URL(url);
    } catch {
      return null;
    }
    if (videoUrl.protocol !== 'https:' || !EMBED_HOSTS.has(videoUrl.hostname)) return null;

    const iframe = document.createElement('iframe');
    iframe.src = videoUrl.href;
    iframe.title = `${projectName} video`;
    iframe.allow = 'autoplay; encrypted-media';
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.setAttribute('allowfullscreen', '');
    return iframe;
  }

  function renderProjectDetail(project, source) {
    const root = document.getElementById('project-root');
    if (!root) return;

    const tracks = (project.tracks || []).map(track => ({
      ...track,
      url: projectAssetPath(source, project, track.file)
    }));
    const videoIframe = project.video ? createProjectVideo(project.video, project.name) : null;

    const template = document.getElementById('project-template');
    const clone = template.content.cloneNode(true);

    clone.querySelector('[data-field="name"]').textContent = project.name;
    clone.querySelector('.tracklist-card__title [data-field="name"]').textContent = project.name;
    const imgEl = clone.querySelector('[data-field="image"]');
    imgEl.src = projectAssetPath(source, project, 'cover.png');
    imgEl.alt = project.name;
    imgEl.loading = 'lazy';
    imgEl.decoding = 'async';
    clone.querySelectorAll('[data-field="description"]').forEach(el => {
      el.textContent = project.description || '';
    });

    const creatorEl = clone.querySelector('[data-field="creator"]');
    if (project.creator) {
      creatorEl.textContent = 'by ' + project.creator;
      creatorEl.classList.remove('hidden');
    }

    const videoSection = clone.querySelector('[data-conditional="video"]');
    const noVideoSection = clone.querySelector('[data-conditional="no-video"]');
    if (videoIframe) {
      videoSection.classList.remove('hidden');
      noVideoSection.classList.add('hidden');
      const videoWrap = document.createElement('div');
      videoWrap.className = 'video__wrap';
      videoWrap.appendChild(videoIframe);
      const videoContainer = document.createElement('div');
      videoContainer.className = 'project__video';
      videoContainer.appendChild(videoWrap);
      clone.querySelector('[data-field="videoHtml"]').replaceChildren(videoContainer);
    } else {
      videoSection.classList.add('hidden');
      noVideoSection.classList.toggle('hidden', !project.description?.trim());
    }

    const tracklist = clone.querySelector('.tracklist');
    const noTracks = clone.querySelector('.no-tracks');
    if (tracks.length) {
      const fragment = document.createDocumentFragment();
      tracks.forEach((track, index) => {
        const item = document.createElement('li');
        item.className = 'track';
        const button = document.createElement('button');
        button.className = 'iconbtn play-track';
        button.type = 'button';
        button.setAttribute('aria-label', `Play ${track.title}`);
        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-play';
        button.appendChild(icon);

        const title = document.createElement('span');
        title.className = 'track-title';
        title.textContent = track.title;
        const duration = document.createElement('span');
        duration.className = 'track-duration';
        duration.textContent = '—';

        item.append(button, title, duration);
        fragment.appendChild(item);
      });
      tracklist.replaceChildren(fragment);
      noTracks.style.display = 'none';
    } else {
      tracklist.style.display = 'none';
      noTracks.style.display = '';
    }

    const playerEl = clone.querySelector('#project-player');
    if (playerEl) playerEl.style.display = tracks.length ? '' : 'none';

    root.replaceChildren(clone);

    const titleEl = document.querySelector('.project-hero__title.accentuation-effect');
    if (titleEl && typeof wrapSectionLetters === 'function') wrapSectionLetters(titleEl);

    const trackItems = [...root.querySelectorAll('.track')];
    trackItems.forEach((item, i) => {
      const durationEl = item.querySelector('.track-duration');
      loadTrackDuration(tracks[i], durationEl);
    });

    if (!tracks.length) return;

    const playBtn = playerEl?.querySelector('#play');
    const prevBtn = playerEl?.querySelector('#prev');
    const nextBtn = playerEl?.querySelector('#next');
    const trackTitle = playerEl?.querySelector('.player__track');
    const timeline = playerEl?.querySelector('.player__timeline');
    const elapsedEl = playerEl?.querySelector('.player__elapsed');
    const timeElapsedText = playerEl?.querySelector('.player__time-elapsed');
    const timeTotalText = playerEl?.querySelector('.player__time-total');

    const audio = new Audio();
    audio.preload = 'metadata';

    let current = 0;
    let isPlaying = false;

    const updateActive = () => trackItems.forEach((item, index) => {
      item.classList.toggle('active', index === current);
    });

    const updateTrackIcons = () => {
      trackItems.forEach((item, index) => {
        const btn = item.querySelector('.play-track i');
        if (!btn) return;
        btn.className = index === current && isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play';
      });
    };

    const loadTrack = index => {
      current = index;
      audio.src = tracks[index].url;
      audio.load();
      if (trackTitle) trackTitle.textContent = tracks[index].title || '';
      updateActive();
      updateTrackIcons();
    };

    const play = async () => {
      try {
        await audio.play();
        isPlaying = true;
      } catch {
        isPlaying = false;
      }
      updateTrackIcons();
    };

    const pause = () => {
      audio.pause();
      isPlaying = false;
      if (playBtn) playBtn.querySelector('i').className = 'fa-solid fa-play';
      updateTrackIcons();
    };

    const toggle = () => isPlaying ? pause() : play();

    if (playBtn) playBtn.addEventListener('click', toggle);
    if (prevBtn) prevBtn.addEventListener('click', () => {
      if (current > 0) { loadTrack(current - 1); play(); }
    });
    if (nextBtn) nextBtn.addEventListener('click', () => {
      if (current < tracks.length - 1) { loadTrack(current + 1); play(); }
    });

    trackItems.forEach((item, index) => {
      const btn = item.querySelector('.play-track');
      if (!btn) return;
      btn.addEventListener('click', () => {
        if (index === current && isPlaying) pause();
        else { loadTrack(index); play(); }
      });
    });

    audio.addEventListener('ended', () => {
      if (current < tracks.length - 1) { loadTrack(current + 1); play(); }
      else { pause(); audio.currentTime = 0; }
    });

    const updateTimeline = () => {
      if (!elapsedEl || !timeline) return;
      const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
      elapsedEl.style.width = `${pct}%`;
      timeline.setAttribute('aria-valuenow', Math.floor(pct));
      if (timeElapsedText) timeElapsedText.textContent = formatDuration(audio.currentTime || 0);
      if (timeTotalText) timeTotalText.textContent = audio.duration ? formatDuration(audio.duration) : '—';
    };

    audio.addEventListener('timeupdate', updateTimeline);
    audio.addEventListener('loadedmetadata', () => {
      if (timeTotalText) timeTotalText.textContent = formatDuration(audio.duration);
      updateTimeline();
    });

    if (timeline) {
      timeline.addEventListener('click', event => {
        if (!audio.duration) return;
        const rect = timeline.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        audio.currentTime = progress * audio.duration;
        updateTimeline();
      });
    }

    if (tracks.length) loadTrack(0);
  }

  async function initProjectPage() {
    const params = new URLSearchParams(location.search);
    const source = params.get('source');
    const id = params.get('id');

    const showMessage = message => {
      const root = document.getElementById('project-root');
      if (!root) return;
      const paragraph = document.createElement('p');
      paragraph.className = 'muted';
      paragraph.textContent = message;
      root.replaceChildren(paragraph);
    };

    if (!PROJECT_SOURCES.has(source) || !id || !/^[a-z0-9.-]+$/i.test(id)) {
      showMessage(id ? `Project ${id} not found.` : 'Project not found.');
      return;
    }

    try {
      const projects = await loadProjects(source);
      const project = projects.find(p => p.id === id);
      if (!project) {
        showMessage(`Project ${id} not found.`);
        return;
      }
      document.title = `${project.name} — Charlie McKenzie`;
      const descEl = document.querySelector('meta[name="description"]');
      if (descEl) descEl.setAttribute('content', project.description ? project.description.slice(0, 160) : `${project.name} — music and sound design by Charlie McKenzie.`);
      const canonicalEl = document.querySelector('link[rel="canonical"]');
      if (canonicalEl) {
        const canonicalUrl = new URL('https://www.charliemckenziemusic.com/project.html');
        canonicalUrl.searchParams.set('source', source);
        canonicalUrl.searchParams.set('id', project.id);
        canonicalEl.setAttribute('href', canonicalUrl.href);
      }
      renderProjectDetail(project, source);
    } catch (err) {
      console.error('Failed to load project:', err);
      showMessage('Failed to load project.');
    }
  }

  window.initGrids = initGrids;
  window.initProjectPage = initProjectPage;
})();
