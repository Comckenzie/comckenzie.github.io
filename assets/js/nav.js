(function () {
  'use strict';

  // Wrap navigation letters
  function wrapNavLetters(el) {
    const text = (el.textContent || '').trim();
    if (!text) return;
    el.textContent = '';
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const span = document.createElement('span');
      span.className = 'nav-letter';
      span.style.setProperty('--i', String(i));
      span.textContent = ch === ' ' ? '\u00A0' : ch;
      el.appendChild(span);
    }
  }

  // Constants for rolling animation
  const CYRILLIC_LOWER = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
  const CYRILLIC_UPPER = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';

  // Start rolling animation
  function startRoll(element, durationMs = 1000) {
    const letters = Array.from(element.querySelectorAll('.nav-letter'));
    const originals = letters.map(l => l.textContent);

    const now0 = performance.now();
    const end = now0 + durationMs;

    const states = letters
      .map((span, index) => {
        const orig = originals[index];
        const isSpace = orig === '\u00A0' || orig === ' ';
        if (isSpace) return null;
        const randChars = [
          CYRILLIC_UPPER[Math.floor(Math.random() * CYRILLIC_UPPER.length)],
          CYRILLIC_LOWER[Math.floor(Math.random() * CYRILLIC_LOWER.length)],
          CYRILLIC_UPPER[Math.floor(Math.random() * CYRILLIC_UPPER.length)],
          orig,
        ];
        return {
          span,
          index,
          orig,
          next: now0 + index * 40,
          interval: 50,
          randChars,
          charIndex: 0,
        };
      })
      .filter(Boolean);

    let rafId = 0;
    let cancelled = false;

    function restore() {
      letters.forEach((l, i) => {
        l.textContent = originals[i];
        l.style.opacity = '';
      });
    }

    function tick(now) {
      if (cancelled) return;
      states.forEach(st => {
        while (now >= st.next && now < end) {
          if (st.charIndex < st.randChars.length) {
            st.span.textContent = st.randChars[st.charIndex];
            st.span.style.opacity = st.charIndex === 0 ? '0' : '1';
            if (st.charIndex === 1) st.span.textContent = st.randChars[st.charIndex].toLowerCase();
            else if (st.charIndex === 2) st.span.textContent = st.randChars[st.charIndex].toUpperCase();
            st.charIndex++;
          }
          st.next += st.interval;
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
      },
    };
  }

  // Add hover rolling effect
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

  // Get current page name
  function getCurrentPageName() {
    const name = window.location.pathname.split('/').pop();
    return name && name.length ? name : 'index.html';
  }

  // Initialize navigation
  function initNav() {
    const page = getCurrentPageName();
    const links = document.querySelectorAll('.nav__links a, .nav__menu a, .nav__submenu a');
    const currentParams = new URLSearchParams(window.location.search);

    links.forEach(a => {
      const href = a.getAttribute('href');
      if (a.closest('.nav__links')) {
        wrapNavLetters(a);
        addRollHover(a);
      }
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
        } else {
          a.classList.add('is-active');
        }
      } else {
        a.classList.remove('is-active');
      }
    });

    // Dropdown hover
    const dropdown = document.querySelector('.nav__dropdown');
    const submenu = document.querySelector('.nav__submenu');
    if (dropdown && submenu) {
      let hideTimeout;
      function showSubmenu() {
        clearTimeout(hideTimeout);
        submenu.style.display = 'block';
      }
      function hideSubmenu() {
        hideTimeout = setTimeout(() => {
          submenu.style.display = 'none';
        }, 200);
      }
      dropdown.addEventListener('mouseenter', showSubmenu);
      dropdown.addEventListener('mouseleave', hideSubmenu);
      submenu.addEventListener('mouseenter', showSubmenu);
      submenu.addEventListener('mouseleave', hideSubmenu);
    }

    // Mobile nav toggle: open/close and accessibility updates
    const navToggle = document.getElementById('nav-toggle');
    const navRoot = document.getElementById('nav');

    function setNavOpen(open) {
      if (!navToggle || !navRoot) return;
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      navRoot.classList.toggle('is-open', open);
      document.body.classList.toggle('nav-open', open);
    }

    if (navToggle && navRoot) {
      navToggle.addEventListener('click', (e) => {
        const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
        setNavOpen(!isOpen);
      });

      // Close on Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
          setNavOpen(false);
        }
      });

      // Close when clicking a nav link (use delegation) or clicking outside
      document.addEventListener('click', (e) => {
        const target = e.target;
        if (navToggle.getAttribute('aria-expanded') === 'true') {
          if (target.closest && (target.closest('.nav__links a') || target.closest('.nav__menu a') || target.closest('.nav__mobile-extras a') || target.closest('.nav__submenu a'))) {
            setNavOpen(false);
          } else if (!navRoot.contains(target) && !navToggle.contains(target)) {
            // Click outside nav closes it
            setNavOpen(false);
          }
        }
      });

      // Also attach explicit click handlers to all nav links so they always close the menu
      // Use a small timeout so navigation (if any) can proceed while the UI updates
      const linkSelectors = '.nav__links a, .nav__menu a, .nav__panel a, .nav__mobile-extras a, .nav__submenu a';
      const navLinks = navRoot.querySelectorAll(linkSelectors);
      navLinks.forEach(link => {
        link.addEventListener('click', () => {
          setTimeout(() => setNavOpen(false), 0);
        }, { passive: true });
      });
    }

  }

  window.initNav = initNav;
})();