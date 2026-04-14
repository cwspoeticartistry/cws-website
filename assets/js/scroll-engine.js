/* ============================================
   CWS Poetic Artistry — Scroll Engine
   Camera flies through space toward each service.
   Past services fly off-screen like the logo.
   Dynamic blur: sharp on focus, heavy behind you.

   vTarget integers: 0 → MAX_VP
     0  = hero
     1  = overview
     2  = Corporate Identity
     3  = Websites
     ...
     7  = Other Services
     8  = Ready to Make Magic (CTA)
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
  const navLinks           = Array.from(document.querySelectorAll('.svc-nav-link'));
  const hamburger          = document.getElementById('nav-hamburger');
  const mobileMenu         = document.getElementById('nav-mobile-menu');
  const mobileLinks        = Array.from(document.querySelectorAll('.nav-mobile-link'));
  const svcs               = Array.from(document.querySelectorAll('.svc'));
  const svcCards           = svcs.map(s => Array.from(s.querySelectorAll('.svc__card')));
  const svcCtas            = svcs.map(s => s.querySelector('.svc__cta'));

  /* ── Service data ── */
  const SERVICES = [
    { name: 'Corporate Identity',   sub: 'Logos · Brand Systems · Collateral', num: '01' },
    { name: 'Websites',             sub: 'Design · Development · CMS',          num: '02' },
    { name: 'Event Visuals',        sub: 'Branding · Flyers · Posters',         num: '03' },
    { name: 'Music Artwork',        sub: 'Albums · Singles · EP Covers',        num: '04' },
    { name: 'CRM Systems',          sub: 'Pipelines · Automation · Dashboards', num: '05' },
    { name: 'Other Services',       sub: 'AR · Activations · Mockups',          num: '06' },
    { name: 'Ready to Make Magic',  sub: '',                                     num: '07' },
  ];

  const MAX_VP = 1 + SERVICES.length; // 7

  /* ── Initial states ── */
  gsap.set(services,            { opacity: 0 });
  gsap.set(servicesNav,         { opacity: 0 });
  gsap.set(servicesScrollHint,  { opacity: 0 });
  gsap.set(overview,            { opacity: 0 });
  gsap.set(svcs,                { opacity: 0, scale: 0.85, y: 18 });
  gsap.set(detail,              { opacity: 0 });
  svcCards.forEach(c   => gsap.set(c,   { opacity: 0 }));
  svcCtas.forEach(cta  => { if (cta) gsap.set(cta, { opacity: 0, y: 8 }); });

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
     CAMERA — zoom overview so target svc is centered
     overview is position:absolute inset:0 (= 100vw × 100vh)
     transform-origin defaults to 50% 50% (viewport center)
     ═══════════════════════════════════════ */
  function cameraToService(svc, scale) {
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const sx  = parseFloat(svc.style.getPropertyValue('--sx')) / 100;
    const sy  = parseFloat(svc.style.getPropertyValue('--sy')) / 100;
    const ciX = sx * vpW;
    const ciY = sy * vpH;
    const cx  = vpW / 2;
    const cy  = vpH / 2;
    // After scaling from center, the point lands at:
    const ax = cx + (ciX - cx) * scale;
    const ay = cy + (ciY - cy) * scale;
    // Translate to pull it back to viewport center:
    return { x: cx - ax, y: cy - ay, scale };
  }

  /* ═══════════════════════════════════════
     FOCUS STATE — blur + size relative to focused index
     Past services (d < 0): off screen immediately
     Focused (d = 0): no blur, full CI reference size
     Ahead  (d > 0): progressive blur + smaller text
       d=1 → 20% blur, 80% size
       d=2 → 40% blur, 60% size
       d=3 → 60% blur, 40% size
       d=4 → 80% blur, 20% size
       d=5 → 100% blur, 10% size
     ═══════════════════════════════════════ */
  //                    d:  1    2    3    4    5
  const AHEAD_BLUR_PX = [3,  7,  13,  20,  30];
  const AHEAD_SCALE   = [0.80, 0.60, 0.40, 0.20, 0.10];

  /* Reference sizes mirror is-focused CSS: clamp(32px, 5.5vw, 72px) / clamp(9px, 0.85vw, 12px) */
  function getRefSize() {
    const vw = window.innerWidth;
    return {
      name: Math.min(Math.max(32, 5.5 * vw / 100), 72),
      sub:  Math.min(Math.max(9,  0.85 * vw / 100), 12),
    };
  }

  /* Apply blur + font-size to every service based on distance from focused index.
     prevIdx is excluded — its fly-off animation is handled separately by enterService. */
  function setFocusState(idx, prevIdx) {
    const { name: refName, sub: refSub } = getRefSize();
    svcs.forEach((svc, i) => {
      if (i === prevIdx) return;
      const d      = i - idx;
      const nameEl = svc.querySelector('.svc__name');
      const subEl  = svc.querySelector('.svc__sub');

      if (d === 0) {
        // Focused: sharp, full reference size
        gsap.to(svc,    { filter: 'blur(0px)', opacity: 1, duration: 0.45, ease: 'power2.out' });
        gsap.to(nameEl, { fontSize: refName + 'px', duration: 0.55, ease: 'power2.out' });
        gsap.to(subEl,  { fontSize: refSub  + 'px', duration: 0.55, ease: 'power2.out' });
      } else if (d > 0) {
        // Ahead: visible, progressively blurred and smaller
        const di = Math.min(d - 1, AHEAD_SCALE.length - 1);
        gsap.to(svc,    { filter: `blur(${AHEAD_BLUR_PX[di]}px)`, opacity: 1, duration: 0.55, ease: 'power2.out' });
        gsap.to(nameEl, { fontSize: refName * AHEAD_SCALE[di] + 'px', duration: 0.55, ease: 'power2.out' });
        gsap.to(subEl,  { fontSize: refSub  * AHEAD_SCALE[di] + 'px', duration: 0.55, ease: 'power2.out' });
      } else {
        // Behind (d < 0): fade out quickly so visible services don't snap to invisible.
        // When scrolling back UP, these were previously visible as "ahead" services —
        // a fast fade (not instant) makes the transition look intentional.
        gsap.to(svc, { opacity: 0, filter: 'blur(0px)', duration: 0.25, ease: 'power1.in' });
        gsap.set([nameEl, subEl], { clearProps: 'fontSize' });
      }
    });
  }

  /* Reset all inline overrides → CSS data-depth rules take back over (used in overview/hero) */
  function resetFocusState() {
    svcs.forEach(svc => {
      gsap.set(svc, { clearProps: 'filter' });
      gsap.set([svc.querySelector('.svc__name'), svc.querySelector('.svc__sub')], { clearProps: 'fontSize' });
    });
  }

  /* ═══════════════════════════════════════
     GALAXY DRIFT — floating in space
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

  /* ═══════════════════════════════════════
     TRANSITIONS
     ═══════════════════════════════════════ */

  function clearFocusedClass() {
    svcs.forEach(s => {
      s.classList.remove('is-focused');
      gsap.set([s.querySelector('.svc__name'), s.querySelector('.svc__sub')], { clearProps: 'fontSize' });
    });
  }

  function enterHero() {
    stopDrift();
    clearFocusedClass();
    hideAllCards();
    gsap.to(detail,              { opacity: 0, duration: 0.3 });
    gsap.to(servicesScrollHint, { opacity: 0, duration: 0.2 });
    gsap.to(overview, { x: 0, y: 0, scale: 1, duration: 0.5, ease: 'power2.out' });
    gsap.to(services, { opacity: 0, duration: 0.4 });
    updateNavActive(-1);
    closeMobileMenu();
    // Reset all individual svc transforms (including drift residuals + parallax)
    gsap.killTweensOf(svcs);
    svcs.forEach(s => {
      gsap.killTweensOf(s.querySelector('.svc__name'));
      gsap.killTweensOf(s.querySelector('.svc__sub'));
      gsap.set(s, { scale: 1, opacity: 1, x: 0, y: 0, clearProps: 'filter' });
      gsap.set([s.querySelector('.svc__name'), s.querySelector('.svc__sub')], { clearProps: 'fontSize' });
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
      // Reset any individually-transformed svcs (flown-past, shrunk, drift, parallax)
      gsap.killTweensOf(svcs);
      svcs.forEach(s => {
        gsap.set(s, { scale: 1, opacity: 0, x: 0, y: 0 });
        s.style.translate = '';
      });
      resetFocusState();
      // Zoom camera back out to wide view
      gsap.to(overview, { x: 0, y: 0, scale: 1, duration: 0.65, ease: 'power3.out' });
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

    const SCALE = window.innerWidth < 768 ? 1.5 : 1.8;
    const cam   = cameraToService(svcs[idx], SCALE);
    const goingForward = prevIdx >= 0 && idx > prevIdx;

    // Update counter + nav active state
    detailCounter.textContent = SERVICES[idx].num + ' / 0' + SERVICES.length;
    updateNavActive(idx);

    // Hide cards + CTA + remove focus class on previously focused service
    if (prevIdx >= 0) {
      gsap.to(svcCards[prevIdx], { opacity: 0, y: 8, duration: 0.2 });
      if (svcCtas[prevIdx]) gsap.to(svcCtas[prevIdx], { opacity: 0, y: 8, duration: 0.15 });
      svcs[prevIdx].classList.remove('is-focused');
    }

    // Reset ALL non-participating services — clear drift/parallax residuals.
    // Opacity is NOT set here; setFocusState owns opacity for all services.
    svcs.forEach((s, i) => {
      if (i !== prevIdx && i !== idx) {
        gsap.killTweensOf(s);
        gsap.killTweensOf(s.querySelector('.svc__name'));
        gsap.killTweensOf(s.querySelector('.svc__sub'));
        gsap.set(s, { scale: 1, x: 0, y: 0 });
        s.style.translate = '';
      }
    });

    // Ensure target svc is exactly at its declared --sx/--sy position
    gsap.killTweensOf(svcs[idx]);
    gsap.killTweensOf(svcs[idx].querySelector('.svc__name'));
    gsap.killTweensOf(svcs[idx].querySelector('.svc__sub'));
    gsap.set(svcs[idx], { scale: 1, opacity: 1, x: 0, y: 0 });
    svcs[idx].style.translate = '';

    // Apply focused font size — triggers CSS transition so it grows as camera arrives
    svcs[idx].classList.add('is-focused');

    // Set blur + size for all services relative to this focal point
    setFocusState(idx, prevIdx);

    /* ── From overview: camera flies toward focused service ── */
    if (fromState === 'overview' || prevIdx < 0) {
      gsap.to(overview, {
        x: cam.x, y: cam.y, scale: cam.scale,
        duration: 0.80, ease: 'power3.out',
      });
      gsap.to(detail, { opacity: 1, duration: 0.35, delay: 0.58 });
      gsap.fromTo(svcCards[idx],
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, stagger: 0.09, duration: 0.45, ease: 'power2.out', delay: 0.65 }
      );
      if (svcCtas[idx]) gsap.fromTo(svcCtas[idx],
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', delay: 0.82 }
      );

    /* ── Forward: previous service flies past camera, next zooms in ── */
    } else if (goingForward) {
      gsap.killTweensOf(svcs[prevIdx]);
      // Previous service blows past camera (grows massive + fades — just like the logo)
      gsap.to(svcs[prevIdx], {
        scale: 5.5, opacity: 0,
        duration: 0.40, ease: 'power3.in',
      });
      // Camera simultaneously flies to next service
      gsap.to(overview, {
        x: cam.x, y: cam.y, scale: cam.scale,
        duration: 0.72, ease: 'power3.out', delay: 0.15,
      });
      gsap.to(detail, { opacity: 1, duration: 0.3, delay: 0.62 });
      gsap.fromTo(svcCards[idx],
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, stagger: 0.09, duration: 0.42, ease: 'power2.out', delay: 0.68 }
      );
      if (svcCtas[idx]) gsap.fromTo(svcCtas[idx],
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', delay: 0.85 }
      );

    /* ── Backward: current service recedes, previous grows back into view ── */
    } else {
      gsap.killTweensOf(svcs[prevIdx]);
      // Current service shrinks away (you're retreating from it)
      gsap.to(svcs[prevIdx], {
        scale: 0.2, opacity: 0,
        duration: 0.35, ease: 'power2.in',
      });
      // Camera retreats back to previous service
      gsap.to(overview, {
        x: cam.x, y: cam.y, scale: cam.scale,
        duration: 0.72, ease: 'power3.out',
      });
      gsap.to(detail, { opacity: 1, duration: 0.3, delay: 0.52 });
      gsap.fromTo(svcCards[idx],
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, stagger: 0.09, duration: 0.42, ease: 'power2.out', delay: 0.58 }
      );
      if (svcCtas[idx]) gsap.fromTo(svcCtas[idx],
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', delay: 0.75 }
      );
    }
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
      delay:    0.22,          // brief pause before camera moves
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
    setTimeout(() => { wheelLocked = false; }, 1100); // delay + tween + buffer
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
     jumps the camera directly to it
     ═══════════════════════════════════════ */
  svcs.forEach((svc, i) => {
    svc.addEventListener('click', () => {
      if (currentState === 'hero') return;
      seekTo(i + 2); // 0=hero, 1=overview, 2+=services
    });
  });

  /* ═══════════════════════════════════════
     MOUSE PARALLAX — services drift with cursor
     Closer services (depth 1) react most,
     further services (depth 5) barely move.
     Uses CSS `translate` property so it
     composes with GSAP's transform independently.
     ═══════════════════════════════════════ */
  const PAR_FACTOR = [1.0, 0.68, 0.45, 0.28, 0.15]; // depth 1→5
  const PAR_X      = 26;  // max horizontal drift px
  const PAR_Y      = 16;  // max vertical drift px
  const PAR_EASE   = 0.07; // lerp speed (lower = lazier)

  let pmx = 0, pmy = 0;                     // normalised mouse -0.5 → 0.5
  let pcx = Array(svcs.length).fill(0);     // current interpolated x per svc
  let pcy = Array(svcs.length).fill(0);     // current interpolated y per svc
  let praf = null;

  function parLoop() {
    let running = false;
    svcs.forEach((svc, i) => {
      // Focused service must NOT receive parallax — the camera centers it on --sx/--sy.
      // Any parallax offset shifts it away from where the camera is pointing.
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
      // CSS `translate` is independent of GSAP's transform matrix
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
     DESKTOP NAV LINKS — click to jump directly to service
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
