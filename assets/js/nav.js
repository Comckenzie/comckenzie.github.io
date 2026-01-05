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
    const links = document.querySelectorAll('.nav__links a, .nav__menu a');
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

    // Mobile nav toggle
    const navToggle = document.getElementById('nav-toggle');
    const navEl = document.getElementById('nav');
    if (navToggle && navEl) {
      function closeMenu() {
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Open menu');
        document.body.classList.remove('nav-open');
        navEl.classList.remove('nav-open');
      }
      function openMenu() {
        navToggle.setAttribute('aria-expanded', 'true');
        navToggle.setAttribute('aria-label', 'Close menu');
        document.body.classList.add('nav-open');
        navEl.classList.add('nav-open');
      }
      navToggle.addEventListener('click', () => {
        const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
        if (isOpen) closeMenu(); else openMenu();
      });

      document.addEventListener('keydown', ev => {
        if (ev.key === 'Escape' && document.body.classList.contains('nav-open')) {
          closeMenu();
          navToggle.focus();
        }
      });

      // Close menu on link click (mobile)
      const mobileLinks = document.querySelectorAll('#primary-nav a');
      mobileLinks.forEach(a => {
        a.addEventListener('click', () => {
          if (window.innerWidth <= 900) closeMenu();
        });
      });

      // Initialize dropdowns
      initDropdowns();
    }
  }

  // Initialize dropdowns
  function initDropdowns() {
    const dropdowns = document.querySelectorAll('[data-dropdown]');
    if (!dropdowns.length) return;
    const supportsHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    function closeAll() {
      dropdowns.forEach(dd => {
        const btn = dd.querySelector('[data-dropdown-button]') || dd.querySelector('.nav__dropbtn');
        if (btn) {
          btn.setAttribute('aria-expanded', 'false');
          dd.classList.remove('is-open');
        }
      });
    }

    dropdowns.forEach(dd => {
      const btn = dd.querySelector('[data-dropdown-button]') || dd.querySelector('.nav__dropbtn');
      const menu = dd.querySelector('[data-dropdown-menu]') || dd.querySelector('.nav__menu');
      if (!btn || !menu) return;

      // Open on focus
      dd.addEventListener('focusin', () => {
        closeAll();
        btn.setAttribute('aria-expanded', 'true');
        dd.classList.add('is-open');
      });

      // Hover for desktop
      if (supportsHover) {
        dd.addEventListener('mouseenter', () => {
          if (window.innerWidth <= 900) return;
          closeAll();
          btn.setAttribute('aria-expanded', 'true');
          dd.classList.add('is-open');
        });
        dd.addEventListener('mouseleave', () => {
          btn.setAttribute('aria-expanded', 'false');
          dd.classList.remove('is-open');
        });
      }

      // Click for mobile
      btn.addEventListener('click', e => {
        if (window.innerWidth <= 900) {
          const open = btn.getAttribute('aria-expanded') === 'true';
          if (open) {
            btn.setAttribute('aria-expanded', 'false');
            dd.classList.remove('is-open');
          } else {
            closeAll();
            btn.setAttribute('aria-expanded', 'true');
            dd.classList.add('is-open');
            const first = menu.querySelector('[role="menuitem"]');
            if (first) first.focus();
          }
        } else {
          e.preventDefault();
        }
      });

      // Keyboard navigation
      btn.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          btn.click();
        }
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          btn.click();
        }
        if (e.key === 'Escape') {
          dd.classList.remove('is-open');
          btn.setAttribute('aria-expanded', 'false');
          btn.focus();
        }
      });

      menu.addEventListener('keydown', e => {
        const items = Array.from(menu.querySelectorAll('[role="menuitem"]'));
        const idx = items.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          items[(idx + 1) % items.length].focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          items[(idx - 1 + items.length) % items.length].focus();
        } else if (e.key === 'Escape') {
          btn.setAttribute('aria-expanded', 'false');
          dd.classList.remove('is-open');
          btn.focus();
        }
      });

      // Close on outside click
      document.addEventListener('click', ev => {
        if (!dd.contains(ev.target)) {
          btn.setAttribute('aria-expanded', 'false');
          dd.classList.remove('is-open');
        }
      });

      // Close on focus out
      dd.addEventListener('focusout', ev => {
        if (!dd.contains(ev.relatedTarget)) {
          btn.setAttribute('aria-expanded', 'false');
          dd.classList.remove('is-open');
        }
      });
    });
  }

  window.initNav = initNav;
})();