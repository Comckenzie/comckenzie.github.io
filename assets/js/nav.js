(function () {
  'use strict';

  function wrapNavLetters(el) {
    const text = el.textContent.trim();
    if (!text) return;

    const fragment = document.createDocumentFragment();
    const words = text.split(/\s+/);
    let globalIndex = 0;
    words.forEach((word, wordIndex) => {
      const wordSpan = document.createElement('span');
      wordSpan.className = 'nav-word';
      for (const character of word) {
        const span = document.createElement('span');
        span.className = 'nav-letter';
        span.style.setProperty('--i', String(globalIndex++));
        span.textContent = character;
        wordSpan.appendChild(span);
      }
      fragment.appendChild(wordSpan);
      if (wordIndex < words.length - 1) fragment.appendChild(document.createTextNode(' '));
    });
    el.replaceChildren(fragment);
  }

  const CYRILLIC_LOWER = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
  const CYRILLIC_UPPER = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';

  function startRoll(element, durationMs = 1000) {
    const letters = Array.from(element.querySelectorAll('.nav-letter'));
    const originals = letters.map(l => l.textContent);
    const start = performance.now();
    const end = start + durationMs;
    const randomCharacter = characters => characters[Math.floor(Math.random() * characters.length)];
    const states = letters.map((span, index) => ({
      span,
      next: start + index * 30,
      characters: [
        randomCharacter(CYRILLIC_UPPER),
        randomCharacter(CYRILLIC_LOWER),
        randomCharacter(CYRILLIC_UPPER),
        randomCharacter(CYRILLIC_LOWER),
        originals[index]
      ],
      characterIndex: 0
    }));

    let rafId = 0;
    let cancelled = false;

    function restore() {
      letters.forEach((letter, index) => {
        letter.textContent = originals[index];
        letter.style.opacity = '';
      });
    }

    function tick(now) {
      if (cancelled) return;
      states.forEach(state => {
        while (now >= state.next && now < end) {
          if (state.characterIndex < state.characters.length) {
            state.span.textContent = state.characters[state.characterIndex];
            state.span.style.opacity = state.characterIndex === 0 ? '0' : '1';
            state.characterIndex++;
          }
          state.next += 20 + state.characterIndex * 20;
        }
      });

      if (now < end) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      restore();
      element.__navRollState = null;
    }

    rafId = requestAnimationFrame(tick);

    return {
      cancel() {
        cancelled = true;
        if (rafId) cancelAnimationFrame(rafId);
        restore();
      }
    };
  }

  function addRollHover(element) {
    element.addEventListener('mouseenter', () => {
      if (element.__navRollState) element.__navRollState.cancel();
      element.__navRollState = startRoll(element, 1500);
    });

    element.addEventListener('mouseleave', () => {
      if (!element.__navRollState) return;
      element.__navRollState.cancel();
      element.__navRollState = null;
    });
  }

  function getCurrentPageName() {
    return window.location.pathname.split('/').pop() || 'index.html';
  }

  function initNav() {
    const page = getCurrentPageName();
    const links = document.querySelectorAll('.nav__desktop-menu a, .nav__mobile-menu a, .nav__submenu a');
    const currentParams = new URLSearchParams(window.location.search);

    links.forEach(a => {
      const href = a.getAttribute('href');
      const isTopLevelDesktopLink = a.closest('.nav__desktop-menu') && !a.closest('.nav__dropdown');
      const isSubmenuLink = a.closest('.nav__submenu');
      const isMobileLink = a.closest('.nav__mobile-menu');

      if (isTopLevelDesktopLink || isSubmenuLink || isMobileLink) wrapNavLetters(a);
      if (isTopLevelDesktopLink || isSubmenuLink) addRollHover(a);
      if (!href) return;
      const linkUrl = new URL(href, window.location.href);
      const target = linkUrl.pathname.split('/').pop() || 'index.html';
      const isHomeHash = page === 'index.html' && href.startsWith('index.html#');
      const isExact = target === page;

      if (isExact || isHomeHash) {
        if (page === 'projects.html' && linkUrl.searchParams.has('source')) {
          const linkSource = linkUrl.searchParams.get('source');
          const currentSource = currentParams.get('source') || 'personal';
          a.classList.toggle('is-active', linkSource === currentSource);
        } else if (!a.closest('.nav__dropdown') && !a.classList.contains('nav__projects-toggle')) {
          a.classList.add('is-active');
        }
      } else a.classList.remove('is-active');
    });

    const dropdown = document.querySelector('.nav__dropdown');
    const submenu = document.querySelector('.nav__submenu');
    if (dropdown && submenu) {
      let hideTimeout;
      function showSubmenu() {
        if (window.innerWidth <= 900) return;
        clearTimeout(hideTimeout);
        submenu.style.display = 'block';
      }
      function hideSubmenu() {
        if (window.innerWidth <= 900) return;
        hideTimeout = setTimeout(() => { submenu.style.display = 'none'; }, 200);
      }
      dropdown.addEventListener('mouseenter', showSubmenu);
      dropdown.addEventListener('mouseleave', hideSubmenu);
      submenu.addEventListener('mouseenter', showSubmenu);
      submenu.addEventListener('mouseleave', hideSubmenu);
    }

    const navToggle = document.getElementById('nav-toggle');
    const navRoot = document.getElementById('nav');
    const projectsToggle = document.querySelector('.nav__projects-toggle');

    function setNavOpen(open) {
      if (!navToggle || !navRoot) return;
      navToggle.setAttribute('aria-expanded', String(open));
      navRoot.classList.toggle('is-open', open);
      document.body.classList.toggle('nav-open', open);
      if (!open) navRoot.classList.remove('show-projects-menu');
    }

    if (navToggle && navRoot) {
      navToggle.addEventListener('click', () => {
        if (navRoot.classList.contains('show-projects-menu')) navRoot.classList.remove('show-projects-menu');
        else setNavOpen(!navRoot.classList.contains('is-open'));
      });

      if (projectsToggle) {
        projectsToggle.addEventListener('click', event => {
          event.preventDefault();
          navRoot.classList.add('show-projects-menu');
        });
      }

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navRoot.classList.contains('is-open')) {
          if (navRoot.classList.contains('show-projects-menu')) navRoot.classList.remove('show-projects-menu');
          else setNavOpen(false);
        }
      });

      document.addEventListener('click', (e) => {
        if (!navRoot.classList.contains('is-open')) return;
        const target = e.target;
        if (window.innerWidth <= 900 && target.closest('.nav__projects-toggle')) return;
        if (target.closest('.nav__panel a')) setNavOpen(false);
        else if (!navRoot.contains(target) && !navToggle.contains(target)) setNavOpen(false);
      });
    }
  }

  window.initNav = initNav;
})();
