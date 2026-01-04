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
      <img class="card__img" src="${p.image}" alt="${p.name}" loading="lazy" />
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

    root.innerHTML = `
    <article class="project__inner" role="article">
      <div class="project__left">
        <img class="project__cover" src="${project.image}" alt="${project.name}" />
      </div>
      <div class="project__right">
        <header class="project__top">
          ${project.logo ? `<img class="project__logo" src="${project.logo}" alt="${project.name} logo" />` : ''}
          <div>
            <h1>${project.name}</h1>
            ${project.creator ? `<p class="muted">by ${project.creator}</p>` : ''}
          </div>
        </header>
        <p class="project__desc">${project.description}</p>

        ${
          project.tracks && project.tracks.length
            ? `
        <table class="tracks">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Title</th>
              <th scope="col">Duration</th>
            </tr>
          </thead>
          <tbody>
            ${project.tracks
              .map(
                (t, i) => `
              <tr>
                <th scope="row">${i + 1}</th>
                <td>${t.title}</td>
                <td>${t.duration}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
        `
            : ''
        }
      </div>
    </article>
  `;
  }

  async function initProjectPage() {
    const params = new URLSearchParams(window.location.search);
    const source = params.get('source');
    const id = params.get('id');

    if (!source || !id) {
      const root = document.getElementById('project-root');
      if (root) root.innerHTML = '<p class="muted">Project not found.</p>';
      return;
    }

    try {
      const projects = await loadProjects(source);
      const project = projects.find((p) => p.id === id);
      if (!project) {
        const root = document.getElementById('project-root');
        if (root) root.innerHTML = '<p class="muted">Project not found.</p>';
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