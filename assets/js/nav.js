(function () {
  'use strict';

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

  function startRoll(element, durationMs = 1000) {
    const letters = Array.from(element.querySelectorAll('.nav-letter'));
    const originals = letters.map((l) => l.textContent);

    const now0 = performance.now();
    const end = now0 + durationMs;

    const cyrillicLower = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
    const cyrillicUpper = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';

    const states = letters
      .map((span, index) => {
        const orig = originals[index];
        const isSpace = orig === '\u00A0' || orig === ' ';
        if (isSpace) return null;
        // First: transparent Cyrillic uppercase
        // Second: random Cyrillic lowercase
        // Third: random Cyrillic uppercase
        // Fourth: original
        const randChars = [
          cyrillicUpper[Math.floor(Math.random() * cyrillicUpper.length)],
          cyrillicLower[Math.floor(Math.random() * cyrillicLower.length)],
          cyrillicUpper[Math.floor(Math.random() * cyrillicUpper.length)],
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
          firstShown: false,
        };
      })
      .filter(Boolean);

    let rafId = 0;
    let cancelled = false;

    function restore() {
      for (let i = 0; i < letters.length; i++) {
        letters[i].textContent = originals[i];
        letters[i].style.opacity = '';
      }
    }

    function tick(now) {
      if (cancelled) return;
      for (const st of states) {
        while (now >= st.next && now < end) {
          if (st.charIndex < st.randChars.length) {
            st.span.textContent = st.randChars[st.charIndex];
            if (st.charIndex === 0) {
              st.span.style.opacity = '0'; // transparent first
            } else if (st.charIndex === 1) {
              st.span.style.opacity = '1'; // lowercase
              st.span.textContent = st.randChars[st.charIndex].toLowerCase();
            } else if (st.charIndex === 2) {
              st.span.style.opacity = '1'; // uppercase
              st.span.textContent = st.randChars[st.charIndex].toUpperCase();
            } else if (st.charIndex === st.randChars.length - 1) {
              st.span.style.opacity = '1'; // original
            } else {
              st.span.style.opacity = '1';
            }
            st.charIndex++;
          }
          st.next += st.interval;
        }
      }

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
    const name = window.location.pathname.split('/').pop();
    return name && name.length ? name : 'index.html';
  }

  function initNav() {
    const page = getCurrentPageName();
    const links = document.querySelectorAll('.nav__links a, .nav__menu a');
    const currentParams = new URLSearchParams(window.location.search);

    for (const a of links) {
      const href = a.getAttribute('href');
      if (a.closest('.nav__links')) {
        wrapNavLetters(a);
        addRollHover(a);
      }
      if (!href) continue;
      const linkUrl = new URL(href, window.location.href);
      const target = linkUrl.pathname.split('/').pop() || 'index.html';
      const isHomeHash = page === 'index.html' && href && href.startsWith('index.html#');
      const isExact = target === page;

      if (isExact || isHomeHash) {
        if (page === 'projects.html' && linkUrl.searchParams.has('source')) {
          const linkSource = linkUrl.searchParams.get('source');
          const currentSource = currentParams.get('source') || 'personal';
          if (linkSource === currentSource) {
            a.classList.add('is-active');
          } else {
            a.classList.remove('is-active');
          }
        } else {
          a.classList.add('is-active');
        }
      } else {
        a.classList.remove('is-active');
      }
    }
  }

  function initMobileNav() {
    const nav = document.querySelector('.nav');
    const toggle = document.getElementById('nav-toggle');
    if (!nav || !toggle) return;

    let docKeydown, docClick;

    // Set initial aria-hidden
    const primaryNav = document.getElementById('primary-nav');
    if (primaryNav) primaryNav.setAttribute('aria-hidden', 'true');

    function openNav() {
      nav.classList.add('nav--open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Fermer la navigation');
      document.body.classList.add('nav-open');

      if (primaryNav) primaryNav.setAttribute('aria-hidden', 'false');

      // Focus management
      const first = nav.querySelector('.nav__links a, .nav__links button');
      if (first) first.focus();

      // Keyboard handling
      docKeydown = (e) => {
        if (e.key === 'Escape') {
          closeNav();
          toggle.focus();
        }
        if (e.key === 'Tab') {
          const focusables = Array.from(nav.querySelectorAll('a, button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
            .filter((el) => !el.hasAttribute('disabled'));
          if (!focusables.length) return;
          const firstEl = focusables[0];
          const lastEl = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          } else if (!e.shiftKey && document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      };
      document.addEventListener('keydown', docKeydown);

      // Close on outside click
      docClick = (e) => {
        if (!nav.contains(e.target) && e.target !== toggle) {
          closeNav();
        }
      };
      document.addEventListener('click', docClick);
    }

    function closeNav() {
      nav.classList.remove('nav--open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Afficher la navigation');
      document.body.classList.remove('nav-open');

      if (primaryNav) primaryNav.setAttribute('aria-hidden', 'true');

      if (docKeydown) document.removeEventListener('keydown', docKeydown);
      if (docClick) document.removeEventListener('click', docClick);
    }

    // Support both click and touch events
    const toggleFn = (e) => {
      e.preventDefault();
      if (nav.classList.contains('nav--open')) closeNav(); else openNav();
    };
    toggle.addEventListener('click', toggleFn);
    toggle.addEventListener('touchstart', toggleFn);

    // Close menu when a link is clicked
    nav.addEventListener('click', (ev) => {
      if (ev.target.closest('.nav__links a')) {
        closeNav();
      }
    });

    // Close on window resize if larger than mobile
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900 && nav.classList.contains('nav--open')) {
        closeNav();
      }
    });
  }

  window.initMobileNav = initMobileNav;
  window.initNav = initNav;
})();