/* ============================================
   CWS Poetic Artistry — Logo Mouse Follow
   Logo drifts toward the cursor position.
   ============================================ */

(function () {
  const logo = document.getElementById('logo');
  const hero = document.getElementById('hero');
  if (!logo || !hero) return;

  let tx = 0, ty = 0, cx = 0, cy = 0, raf = null;

  function loop() {
    cx += (tx - cx) * 0.10;
    cy += (ty - cy) * 0.10;
    logo.style.translate = `${cx}px ${cy}px`;
    raf = requestAnimationFrame(loop);
  }

  hero.addEventListener('mousemove', e => {
    if (!raf) loop();
    const r = hero.getBoundingClientRect();
    const rawX = (e.clientX - r.left  - r.width  / 2) * 0.055;
    const rawY = (e.clientY - r.top   - r.height / 2) * 0.055;
    tx = Math.max(-42, Math.min(42, rawX));
    ty = Math.max(-28, Math.min(28, rawY));
  }, { passive: true });

  hero.addEventListener('mouseleave', () => { tx = 0; ty = 0; });

  // Stop RAF when hero is off-screen (after zoom-through)
  new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting && raf) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  }).observe(hero);
})();
