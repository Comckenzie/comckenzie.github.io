(function () {
  'use strict';

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const INTERACTIVE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    '[role="button"]',
    '.player__timeline'
  ].join(', ');
  let audioContext;
  let masterGain;
  let soundEnabled = false;
  let hasUserInteracted = false;
  let lastPointerDown = 0;
  const lastPlayed = new Map();
  let lastHoverNote = null;

  try {
    soundEnabled = localStorage.getItem('sound-enabled') === 'true';
  } catch {
    try { soundEnabled = sessionStorage.getItem('sound-enabled') === 'true'; }
    catch { /* Sound remains off when storage is unavailable. */ }
  }

  function getAudioContext() {
    if (!AudioContextClass) return null;
    if (audioContext) return audioContext;

    try {
      audioContext = new AudioContextClass();
      masterGain = audioContext.createGain();
      masterGain.gain.value = 1;

      const lowPass = audioContext.createBiquadFilter();
      lowPass.type = 'lowpass';
      lowPass.frequency.value = 5000;
      lowPass.Q.value = 0.4;
      masterGain.connect(lowPass).connect(audioContext.destination);
    } catch {
      return null;
    }

    return audioContext;
  }

  function unlockAudio() {
    if (!soundEnabled) return;
    hasUserInteracted = true;
    const context = getAudioContext();
    if (context?.state === 'suspended') context.resume().catch(() => {});
  }

  function updateSoundToggle() {
    const button = document.getElementById('sound-toggle');
    if (!button) return;
    button.setAttribute('aria-pressed', String(soundEnabled));
    button.setAttribute('aria-label', soundEnabled ? 'Disable sound' : 'Enable sound');
    button.title = soundEnabled ? 'Disable sound' : 'Enable sound';
    const icon = button.querySelector('.sound-toggle__icon');
    if (icon) icon.dataset.icon = soundEnabled ? 'sound-on' : 'sound-off';
  }

  function canPlay(name, cooldown) {
    const now = performance.now();
    const lastTime = lastPlayed.get(name) || 0;
    if (now - lastTime < cooldown) return false;
    lastPlayed.set(name, now);
    return true;
  }

  function addVoice(context, {
    frequency,
    duration,
    volume,
    type = 'sine',
    delay = 0,
    attack = 0.012,
    filterFrequency = type === 'square' ? 1700 : 4200
  }) {
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFrequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(filter).connect(gain).connect(masterGain);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.04);
  }

  function playSound(name, cooldown, createSound) {
    if (!soundEnabled || !hasUserInteracted || !canPlay(name, cooldown)) return;

    const context = getAudioContext();
    if (!context) return;
    if (context.state !== 'running') {
      context.resume().then(() => createSound(context)).catch(() => {});
      return;
    }

    createSound(context);
  }

  function playVoices(name, cooldown, voices) {
    playSound(name, cooldown, context => {
      voices.forEach(voice => addVoice(context, voice));
    });
  }

  function playHover() {
    const notes = [220, 261.63, 293.66, 329.63, 392];
    const choices = notes.filter(note => note !== lastHoverNote);
    const frequency = choices[Math.floor(Math.random() * choices.length)];
    lastHoverNote = frequency;

    playVoices('hover', 140, [{
      frequency,
      duration: 0.07,
      volume: 0.02,
      type: 'triangle',
      attack: 0.005,
      filterFrequency: 1000
    }]);
  }

  function playSelect() {
    playVoices('select', 80, [
      { frequency: 329.63, duration: 0.15, volume: 0.07, type: 'triangle' },
      { frequency: 493.88, duration: 0.11, volume: 0.035, type: 'sine', delay: 0.014 }
    ]);
  }

  function playThemeToggle(control) {
    const isDark = control.getAttribute('aria-pressed') === 'true';
    const notes = isDark ? [392, 293.66] : [293.66, 392];
    playVoices('theme', 120, notes.map((frequency, index) => ({
      frequency,
      duration: 0.13,
      volume: 0.045,
      type: 'triangle',
      delay: index * 0.045,
      filterFrequency: 1800
    })));
  }

  function getInteractiveControl(target) {
    if (!(target instanceof Element)) return null;
    const control = target.closest(INTERACTIVE_SELECTOR);
    if (!control || control.closest('[data-sound="off"]')) return null;
    return control;
  }

  function playControlClick(control) {
    if (control.matches('.play-track, .player__timeline')) playSelect();
    else if (control.matches('#theme-toggle')) playThemeToggle(control);
  }

  function startsPageTransition(control, event) {
    const link = control.closest('a[href]');
    if (!link || link.matches('.nav__projects-toggle') || event.defaultPrevented) return false;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
    if (link.hasAttribute('download') || link.relList.contains('external')) return false;
    if (link.target && link.target.toLowerCase() !== '_self') return false;

    try {
      const destination = new URL(link.href, window.location.href);
      const current = new URL(window.location.href);
      if (destination.origin !== current.origin) return false;
      destination.hash = '';
      current.hash = '';
      return destination.href !== current.href;
    } catch {
      return false;
    }
  }

  document.addEventListener('pointerdown', event => {
    lastPointerDown = performance.now();
    unlockAudio();

    // Play pointer sounds from the activating event itself. Some browsers
    // suspend audio again between pointerdown and the later click event.
    const control = getInteractiveControl(event.target);
    if (control && !startsPageTransition(control, event)) playControlClick(control);
  }, { capture: true, passive: true });

  document.addEventListener('keydown', () => {
    if (soundEnabled) unlockAudio();
  }, { capture: true });

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : event.target.parentElement;
    const button = target?.closest('#sound-toggle');
    if (!button) return;

    soundEnabled = !soundEnabled;
    try { localStorage.setItem('sound-enabled', String(soundEnabled)); } catch {}
    try { sessionStorage.setItem('sound-enabled', String(soundEnabled)); } catch {}
    if (soundEnabled) unlockAudio();
    else hasUserInteracted = false;
    updateSoundToggle();
  }, { capture: true });

  document.addEventListener('pointerover', event => {
    const control = getInteractiveControl(event.target);
    const previous = getInteractiveControl(event.relatedTarget);
    if (!control || control === previous) return;
    // Hover is not a user activation in browsers. Keep the context unopened
    // until pointerdown, click, or a keyboard gesture unlocks it.
    playHover();
  });

  document.addEventListener('focusin', event => {
    if (performance.now() - lastPointerDown < 200) return;
    if (getInteractiveControl(event.target)) playHover();
  });

  document.addEventListener('click', event => {
    // Pointer clicks were handled at pointerdown; retain click for keyboard
    // activation, which does not produce a pointerdown event.
    if (event.detail !== 0) return;
    const control = getInteractiveControl(event.target);
    if (!control || startsPageTransition(control, event)) return;
    playControlClick(control);
  }, { capture: true });

  window.initSoundToggle = updateSoundToggle;

  updateSoundToggle();
})();
