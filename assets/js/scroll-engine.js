/* ============================================
   CWS Poetic Artistry — Scroll Engine
   "Approach Stage" architecture — no camera transform.
   Active services come to the viewer.
   Centering is structural: position:fixed + GSAP xPercent/yPercent.

   vTarget integers: 0 → MAX_VP
     0  = hero
     1  = overview
     2  = Corporate Identity
     3  = Websites
     ...
     7  = Other Services
   ============================================ */

(function () {

  /* ── Elements ── */
  const logo               = document.getElementById('logo');
  const tagline            = document.getElementById('tagline');
  const heroSub            = document.getElementById('hero-sub');
  const scrollHint         = document.getElementById('scroll-hint');
  const hero               = document.getElementById('hero');
  const services           = document.getElementById('services');
  const servicesNav        = document.getElementById('services-nav');
  const servicesScrollHint = document.getElementById('services-scroll-hint');
  const overview           = document.getElementById('services-overview');
  const detail             = document.getElementById('service-detail');
  const detailCounter      = document.getElementById('detail-counter');
  const navLogo            = document.getElementById('nav-logo');
  const navLinks           = Array.from(document.querySelectorAll('.svc-nav-link'));
  const hamburger          = document.getElementById('nav-hamburger');
  const mobileMenu         = document.getElementById('nav-mobile-menu');
  const mobileLinks        = Array.from(document.querySelectorAll('.nav-mobile-link'));
  const svcs               = Array.from(document.querySelectorAll('.svc'));
  const svcCards           = svcs.map(s => Array.from(s.querySelectorAll('.svc__card')));
  const svcCtas            = svcs.map(s => s.querySelector('.svc__cta'));

  /* ── Guard — bail out if required DOM is missing ── */
  if (!logo || !hero || !services || !servicesNav || !overview ||
      !hamburger || !mobileMenu || !svcs.length) return;

  /* ── Mobile position overrides ──
     On narrow screens (≤480px) percentage-based --sx/--sy positions can
     push services too close to the nav bar or scroll-hint.        */
  if (window.innerWidth <= 480) {
    const mobilePos = [
      { sx: '50%', sy: '32%' }, // Corporate Identity — centred, clear of nav
      { sx: '72%', sy: '58%' }, // Websites
      { sx: '28%', sy: '48%' }, // Event Visuals
      { sx: '70%', sy: '38%' }, // Music Artwork
      { sx: '36%', sy: '68%' }, // CRM Systems
      { sx: '66%', sy: '22%' }, // Other Services
    ];
    svcs.forEach((svc, i) => {
      if (!mobilePos[i]) return;
      svc.style.setProperty('--sx', mobilePos[i].sx);
      svc.style.setProperty('--sy', mobilePos[i].sy);
    });
  }

  /* ── Service data ── */
  const SERVICES = [
    { name: 'Corporate Identity', sub: 'Logos · Brand Systems · Collateral', num: '01' },
    { name: 'Websites',           sub: 'Design · Development · CMS',          num: '02' },
    { name: 'Event Visuals',      sub: 'Branding · Flyers · Posters',         num: '03' },
    { name: 'Music Artwork',      sub: 'Albums · Singles · EP Covers',        num: '04' },
    { name: 'CRM Systems',        sub: 'Pipelines · Automation · Dashboards', num: '05' },
    { name: 'Other Services',     sub: 'AR · Activations · Mockups',          num: '06' },
  ];

  const MAX_VP = 1 + SERVICES.length; // 7

  /* ── Initial states ──
     xPercent/yPercent are set once and owned by GSAP from here forward.
     They survive every subsequent tween — centering is never re-read from CSS. */
  gsap.set(services,           { opacity: 0 });
  gsap.set(servicesNav,        { opacity: 0 });
  gsap.set(servicesScrollHint, { opacity: 0 });
  gsap.set(overview,           { opacity: 0 });
  gsap.set(svcs,               { xPercent: -50, yPercent: -50, opacity: 0, scale: 1, x: 0, y: 0 });
  gsap.set(detail,             { opacity: 0 });
  svcCards.forEach(c  => gsap.set(c,   { opacity: 0 }));
  svcCtas.forEach(cta => { if (cta) gsap.set(cta, { opacity: 0, y: 8 }); });

  /* ── Hero zoom timeline ── */
  const zoomTL = gsap.timeline({ paused: true });
  zoomTL
    .to([tagline, heroSub, scrollHint], { opacity: 0, y: -14, duration: 0.15, ease: 'power1.in' }, 0)
    .to(logo,  { scale: 22,  ease: 'power3.in',  duration: 0.78 }, 0)
    .to(logo,  { opacity: 0, ease: 'power1.in',  duration: 0.28 }, 0.55);

  /* ── State ── */
  let currentState  = 'hero';
  let currentSvcIdx = -1;

  function updateFromProgress(vp) {
    zoomTL.progress(Math.min(Math.max(vp, 0), 1));
    hero.style.pointerEvents = vp < 1 ? 'auto' : 'none';
    logo.style.pointerEvents = vp < 1 ? 'auto' : 'none';

    if (vp < 1) {
      if (currentState !== 'hero') { currentState = 'hero'; currentSvcIdx = -1; enterHero(); }
      return;
    }
    if (vp < 2) {
      if (currentState !== 'overview') {
        const p = currentState;
        currentState  = 'overview';
        currentSvcIdx = -1;
        enterOverview(p);
      }
      return;
    }

    const newIdx = Math.min(Math.floor(vp - 2), SERVICES.length - 1);
    if (newIdx !== currentSvcIdx) {
      const prevIdx = currentSvcIdx;
      const prev    = currentState;
      currentState  = 'service';
      currentSvcIdx = newIdx;
      enterService(newIdx, prevIdx, prev);
    }
  }

  /* ═══════════════════════════════════════
     ENTER / EXIT FOCUS — approach stage
     No camera. Each service comes to the viewer.
     enterFocus: service grows from its overview direction toward center.
     exitFocus:  service flies past (forward) or recedes (back).
     ═══════════════════════════════════════ */

  function enterFocus(idx) {
    const svc = svcs[idx];

    // Pin to viewport center via CSS (position:fixed; left:50%; top:50%)
    svc.classList.add('is-focused');

    // Approach vector: start from the direction the service occupies in the overview
    const cs = getComputedStyle(svc);
    const sx = parseFloat(cs.getPropertyValue('--sx')) || 50;
    const sy = parseFloat(cs.getPropertyValue('--sy')) || 50;
    const ax = (sx - 50) * 0.08 * window.innerWidth  / 100;
    const ay = (sy - 50) * 0.08 * window.innerHeight / 100;

    gsap.set(svc, { x: ax, y: ay, scale: 0.4, opacity: 0, filter: 'blur(10px)' });
    gsap.to(svc, {
      x: 0, y: 0, scale: 1, opacity: 1, filter: 'blur(0px)',
      duration: 0.85, delay: 0.2, ease: 'power2.out',
    });
  }

  function exitFocus(idx, dir) {
    const svc = svcs[idx];
    gsap.to(svc, {
      scale:   dir === 'forward' ? 4.0 : 0.4,
      opacity: 0,
      filter:  'blur(8px)',
      duration: 0.55,
      ease:    'power2.in',
      onComplete: () => {
        svc.classList.remove('is-focused');
        gsap.set(svc, { x: 0, y: 0, scale: 1, opacity: 0, clearProps: 'filter' });
      },
    });
  }

  /* ═══════════════════════════════════════
     GALAXY DRIFT — floating in space (overview only)
     ═══════════════════════════════════════ */
  const DRIFT = [
    { ampY: 10, ampX:  4, dur: 3.8, yDir: -1, xDir:  1 },
    { ampY:  7, ampX:  3, dur: 4.4, yDir:  1, xDir: -1 },
    { ampY:  5, ampX:  2, dur: 3.2, yDir: -1, xDir:  1 },
    { ampY:  4, ampX:  2, dur: 5.0, yDir:  1, xDir: -1 },
    { ampY:  3, ampX:  1, dur: 4.1, yDir: -1, xDir:  1 },
    { ampY:  3, ampX:  1, dur: 3.6, yDir:  1, xDir: -1 },
  ];
  const driftTweens = [];
  let   overviewEntryTween = null;

  function startDrift() {
    stopDrift();
    svcs.forEach((svc, i) => {
      const d = DRIFT[i] || DRIFT[DRIFT.length - 1];
      driftTweens.push(gsap.to(svc, {
        y: d.ampY * d.yDir, x: d.ampX * d.xDir,
        duration: d.dur, ease: 'sine.inOut',
        yoyo: true, repeat: -1, delay: i * 0.55,
      }));
    });
  }

  function stopDrift() {
    driftTweens.forEach(t => t.kill());
    driftTweens.length = 0;
    if (overviewEntryTween) { overviewEntryTween.kill(); overviewEntryTween = null; }
  }

  /* ── Hide all in-svc cards + CTAs ── */
  function hideAllCards() {
    svcCards.forEach(cards => {
      gsap.killTweensOf(cards);
      gsap.to(cards, { opacity: 0, y: 8, duration: 0.2 });
    });
    svcCtas.forEach(cta => {
      if (!cta) return;
      gsap.killTweensOf(cta);
      gsap.to(cta, { opacity: 0, y: 8, duration: 0.15 });
    });
  }

  /* ── Update active nav link (desktop + mobile) ── */
  function updateNavActive(idx) {
    navLinks.forEach((link, i)    => link.classList.toggle('is-active', i === idx));
    mobileLinks.forEach((link, i) => link.classList.toggle('is-active', i === idx));
  }

  /* ── Close mobile menu ── */
  function closeMobileMenu() {
    mobileMenu.classList.remove('is-open');
    hamburger.classList.remove('is-open');
  }

  /* ── Remove is-focused from all services ── */
  function clearFocusedClass() {
    svcs.forEach(s => s.classList.remove('is-focused'));
  }

  /* ═══════════════════════════════════════
     TRANSITIONS
     ═══════════════════════════════════════ */

  function enterHero() {
    stopDrift();
    clearFocusedClass();
    hideAllCards();
    gsap.to(detail,             { opacity: 0, duration: 0.3 });
    gsap.to(servicesScrollHint, { opacity: 0, duration: 0.2 });
    gsap.to(services,           { opacity: 0, duration: 0.4 });
    updateNavActive(-1);
    closeMobileMenu();
    gsap.killTweensOf(svcs);
    svcs.forEach(s => {
      gsap.killTweensOf(s.querySelector('.svc__name'));
      gsap.killTweensOf(s.querySelector('.svc__sub'));
      gsap.set(s, { scale: 1, opacity: 1, x: 0, y: 0, clearProps: 'filter' });
      s.style.translate = '';
    });
    services.style.pointerEvents = 'none';
    detail.style.pointerEvents   = 'none';
  }

  function enterOverview(fromState) {
    stopDrift();
    services.style.pointerEvents = 'none';
    detail.style.pointerEvents   = 'none';

    gsap.to(services,    { opacity: 1, duration: 0.3 });
    gsap.to(servicesNav, { opacity: 1, duration: 0.5, delay: 0.1 });
    gsap.to(detail,      { opacity: 0, duration: 0.25 });
    gsap.to(servicesScrollHint, { opacity: 1, duration: 0.5, delay: 0.4 });
    hideAllCards();
    clearFocusedClass();
    updateNavActive(-1);
    closeMobileMenu();

    if (fromState === 'service') {
      // Kill any in-flight focus/exit tweens; reset everything to constellation state
      gsap.killTweensOf(svcs);
      svcs.forEach(s => {
        gsap.set(s, { scale: 1, opacity: 0, x: 0, y: 0, clearProps: 'filter' });
        s.style.translate = '';
      });
      gsap.to(overview, { opacity: 1, duration: 0.3 });
      overviewEntryTween = gsap.to(svcs, {
        opacity: 1,
        stagger: 0.055, duration: 0.5, ease: 'power2.out', delay: 0.2,
        onComplete: startDrift,
      });
    } else {
      // From hero — scatter in fresh
      gsap.to(overview, { opacity: 1, duration: 0.4 });
      overviewEntryTween = gsap.to(svcs, {
        opacity: 1, scale: 1, y: 0, x: 0,
        stagger: 0.07, duration: 0.6, ease: 'power2.out', delay: 0.15,
        onComplete: startDrift,
      });
    }
  }

  function enterService(idx, prevIdx, fromState) {
    stopDrift();
    gsap.set(services, { opacity: 1 });
    gsap.to(servicesNav, { opacity: 1, duration: 0.4 });
    services.style.pointerEvents = 'auto';
    detail.style.pointerEvents   = 'auto';

    const dir = (prevIdx >= 0 && idx > prevIdx) ? 'forward' : 'back';

    detailCounter.textContent = SERVICES[idx].num + ' / 0' + SERVICES.length;
    updateNavActive(idx);

    // Fade out all non-participating services immediately
    svcs.forEach((s, i) => {
      if (i !== idx && i !== prevIdx) {
        gsap.killTweensOf(s);
        gsap.to(s, { opacity: 0, duration: 0.3 });
        s.style.translate = '';
      }
    });

    // Exit outgoing service
    if (prevIdx >= 0) {
      gsap.to(svcCards[prevIdx], { opacity: 0, y: 8, duration: 0.2 });
      if (svcCtas[prevIdx]) gsap.to(svcCtas[prevIdx], { opacity: 0, y: 8, duration: 0.15 });
      exitFocus(prevIdx, dir);
    }

    // Enter incoming service (0.2s delay built into enterFocus lets exit get a head start)
    enterFocus(idx);

    // Counter, cards, CTA timed to land as the approach completes (~1.05s total)
    gsap.to(detail, { opacity: 1, duration: 0.35, delay: 0.70 });
    gsap.fromTo(svcCards[idx],
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, stagger: 0.09, duration: 0.45, ease: 'power2.out', delay: 0.72 }
    );
    if (svcCtas[idx]) gsap.fromTo(svcCtas[idx],
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', delay: 0.90 }
    );
  }

  /* ═══════════════════════════════════════
     VIRTUAL SCROLL — one tick = one section
     ═══════════════════════════════════════ */
  let vTarget     = 0;
  let vProgress   = 0;
  let activeTween = null;

  function seekTo(newTarget) {
    const clamped = Math.max(0, Math.min(MAX_VP, newTarget));
    if (clamped === vTarget && activeTween && activeTween.isActive()) return;
    vTarget = clamped;
    if (activeTween) activeTween.kill();
    const proxy = { p: vProgress };
    activeTween = gsap.to(proxy, {
      p:        vTarget,
      duration: 0.80,
      delay:    0.22,
      ease:     'power2.inOut',
      onUpdate() {
        vProgress = proxy.p;
        updateFromProgress(proxy.p);
      },
    });
  }

  /* Wheel */
  let wheelLocked = false;
  window.addEventListener('wheel', e => {
    if (wheelLocked) return;
    const dir = Math.sign(e.deltaY);
    if (!dir) return;
    seekTo(Math.round(vTarget) + dir);
    wheelLocked = true;
    setTimeout(() => { wheelLocked = false; }, 1100);
  }, { passive: true });

  /* Touch */
  let touchStartY  = 0;
  let touchHandled = false;
  window.addEventListener('touchstart', e => {
    touchStartY  = e.touches[0].clientY;
    touchHandled = false;
  }, { passive: true });
  window.addEventListener('touchmove', e => {
    if (touchHandled) return;
    const dy = touchStartY - e.touches[0].clientY;
    if (Math.abs(dy) < 35) return;
    seekTo(Math.round(vTarget) + Math.sign(dy));
    touchHandled = true;
  }, { passive: true });

  /* Keyboard */
  window.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === ' ') {
      e.preventDefault(); seekTo(Math.round(vTarget) + 1);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault(); seekTo(Math.round(vTarget) - 1);
    }
  });

  /* ═══════════════════════════════════════
     CLICK-TO-JUMP — clicking any service
     jumps directly to it
     ═══════════════════════════════════════ */
  svcs.forEach((svc, i) => {
    svc.addEventListener('click', () => {
      if (currentState === 'hero') return;
      seekTo(i + 2);
    });
  });

  /* ═══════════════════════════════════════
     MOUSE PARALLAX — services drift with cursor
     Only active in overview (suppressed on focused service).
     Uses CSS `translate` so it composes with GSAP's transform independently.
     ═══════════════════════════════════════ */
  const PAR_FACTOR = [1.0, 0.68, 0.45, 0.28, 0.15]; // depth 1→5
  const PAR_X      = 26;
  const PAR_Y      = 16;
  const PAR_EASE   = 0.07;

  let pmx = 0, pmy = 0;
  let pcx = Array(svcs.length).fill(0);
  let pcy = Array(svcs.length).fill(0);
  let praf = null;

  function parLoop() {
    let running = false;
    svcs.forEach((svc, i) => {
      // Suppress parallax on the focused service — any offset shifts it from center
      if (currentState === 'service' && i === currentSvcIdx) {
        if (pcx[i] !== 0 || pcy[i] !== 0) {
          pcx[i] = 0;
          pcy[i] = 0;
          svc.style.translate = '';
        }
        return;
      }
      const depth  = parseInt(svc.dataset.depth) || 1;
      const factor = PAR_FACTOR[depth - 1] || 0.15;
      const tx = pmx * PAR_X * factor;
      const ty = pmy * PAR_Y * factor;
      pcx[i] += (tx - pcx[i]) * PAR_EASE;
      pcy[i] += (ty - pcy[i]) * PAR_EASE;
      if (Math.abs(pcx[i] - tx) > 0.08 || Math.abs(pcy[i] - ty) > 0.08) running = true;
      svc.style.translate = `${pcx[i].toFixed(2)}px ${pcy[i].toFixed(2)}px`;
    });
    praf = running ? requestAnimationFrame(parLoop) : null;
  }

  window.addEventListener('mousemove', e => {
    pmx = (e.clientX / window.innerWidth  - 0.5);
    pmy = (e.clientY / window.innerHeight - 0.5);
    if (!praf) praf = requestAnimationFrame(parLoop);
  }, { passive: true });

  /* ═══════════════════════════════════════
     ANCHOR MAP — id → service index
     ═══════════════════════════════════════ */
  const ANCHOR_MAP = {
    'corporate-identity': 2,
    'websites':           3,
    'event-visuals':      4,
    'music-artwork':      5,
    'crm-systems':        6,
    'other-services':     7,
  };

  function seekToHash(hash) {
    const id = (hash || '').replace('#', '');
    const vp = ANCHOR_MAP[id];
    if (vp !== undefined) seekTo(vp);
  }

  if (window.location.hash) seekToHash(window.location.hash);
  window.addEventListener('hashchange', () => seekToHash(window.location.hash));

  /* ═══════════════════════════════════════
     NAV LOGO — click returns to hero
     ═══════════════════════════════════════ */
  if (navLogo) {
    navLogo.addEventListener('click', () => {
      closeMobileMenu();
      seekTo(0);
    });
  }

  /* ═══════════════════════════════════════
     DESKTOP NAV LINKS — jump directly to service
     ═══════════════════════════════════════ */
  navLinks.forEach((link, i) => {
    link.addEventListener('click', e => {
      e.preventDefault();
      seekTo(i + 2);
    });
  });

  /* ═══════════════════════════════════════
     MOBILE HAMBURGER + DROPDOWN MENU
     ═══════════════════════════════════════ */
  hamburger.addEventListener('click', () => {
    mobileMenu.classList.toggle('is-open');
    hamburger.classList.toggle('is-open');
  });

  mobileLinks.forEach((link, i) => {
    link.addEventListener('click', e => {
      e.preventDefault();
      closeMobileMenu();
      seekTo(i + 2);
    });
  });

})();
