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

      document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape' && document.body.classList.contains('nav-open')) {
          closeMenu();
          navToggle.focus();
        }
      });

      // close menu when a link is clicked (mobile)
      const mobileLinks = document.querySelectorAll('#primary-nav a');
      mobileLinks.forEach((a) => {
        a.addEventListener('click', () => {
          if (window.innerWidth <= 900) closeMenu();
        });
      });

      // Initialize dropdowns after the header partial is loaded
      initDropdowns();
    }
  }

  // Dropdowns: accessible toggle + keyboard support
  function initDropdowns() {
    const dropdowns = document.querySelectorAll('[data-dropdown]');
    if (!dropdowns.length) return;
    const supportsHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches; // desktop-like devices


    function closeAll() {
      dropdowns.forEach(dd => {
        const btn = dd.querySelector('[data-dropdown-button]') || dd.querySelector('.nav__dropbtn');
        if (!btn) return;
        btn.setAttribute('aria-expanded', 'false');
        dd.classList.remove('is-open');
      });
    }

    dropdowns.forEach((dd) => {
      const btn = dd.querySelector('[data-dropdown-button]') || dd.querySelector('.nav__dropbtn');
      const menu = dd.querySelector('[data-dropdown-menu]') || dd.querySelector('.nav__menu');
      if (!btn || !menu) return;

      // Open on focus (keyboard navigation)
      dd.addEventListener('focusin', () => {
        closeAll();
        btn.setAttribute('aria-expanded', 'true');
        dd.classList.add('is-open');
      });

      // Open on hover for hover-capable devices (desktop)
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

      // Click toggles only on small screens (mobile)
      btn.addEventListener('click', (e) => {
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
            first && first.focus();
          }
        } else {
          // prevent click toggling on desktop where hover is preferred
          e.preventDefault();
        }
      });

      btn.addEventListener('keydown', (e) => {
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

      menu.addEventListener('keydown', (e) => {
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

      // close when clicking outside
      document.addEventListener('click', (ev) => {
        if (!dd.contains(ev.target)) {
          btn.setAttribute('aria-expanded', 'false');
          dd.classList.remove('is-open');
        }
      });

      // close on focus out
      dd.addEventListener('focusout', (ev) => {
        if (!dd.contains(ev.relatedTarget)) {
          btn.setAttribute('aria-expanded', 'false');
          dd.classList.remove('is-open');
        }
      });
    });
  }

  window.initNav = initNav;
})();