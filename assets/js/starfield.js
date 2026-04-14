/* ============================================
   CWS Poetic Artistry — ASMR Particle Field
   Diamond particles that react to the cursor
   ============================================ */

(function () {
  const canvas = document.getElementById('starfield');
  if (!canvas) return;

  const ctx    = canvas.getContext('2d');
  const COUNT  = 650;
  const RADIUS = 220;   // magnetic pull radius
  const PULL   = 0.10;  // attraction strength
  const VORTEX = 0.06;  // perpendicular swirl

  let W, H, particles, mouse = { x: -9999, y: -9999 };

  /* ── Resize ── */
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  /* ── Particle ── */
  function createParticle() {
    const r = Math.random();
    return {
      x:   Math.random() * W,
      y:   Math.random() * H,
      vx:  (Math.random() - 0.5) * 0.22,
      vy:  (Math.random() - 0.5) * 0.22,
      size: Math.random() * 1.5 + 0.4,
      rot:  Math.random() * Math.PI * 2,
      rotS: (Math.random() - 0.5) * 0.035,
      glow: 0,
      // colour: 15% amber · 25% glass-blue · 60% charcoal
      color: r > 0.85 ? '179,139,91' : r > 0.60 ? '210,220,255' : '110,105,112',
      alpha: Math.random() * 0.35 + 0.08,
    };
  }

  function init() {
    particles = Array.from({ length: COUNT }, createParticle);
  }

  /* ── Update ── */
  function update(p) {
    const dx   = mouse.x - p.x;
    const dy   = mouse.y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    if (dist < RADIUS) {
      const f = (RADIUS - dist) / RADIUS;
      p.vx += (dx / dist) * f * PULL + (dy / dist) * f * VORTEX * 8;
      p.vy += (dy / dist) * f * PULL - (dx / dist) * f * VORTEX * 8;
      p.glow = f * 0.8;
    } else {
      p.glow *= 0.88;
    }

    p.x  += p.vx;
    p.y  += p.vy;
    p.vx  = p.vx * 0.94 + (Math.random() - 0.5) * 0.03;
    p.vy  = p.vy * 0.94 + (Math.random() - 0.5) * 0.03;
    p.rot += p.rotS + (Math.abs(p.vx) + Math.abs(p.vy)) * 0.03;

    if (p.x < -20) p.x = W + 20;
    if (p.x > W + 20) p.x = -20;
    if (p.y < -20) p.y = H + 20;
    if (p.y > H + 20) p.y = -20;
  }

  /* ── Draw ── */
  function draw(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);

    const a = Math.min(p.alpha + p.glow * 0.45, 0.92);
    ctx.fillStyle = `rgba(${p.color},${a})`;

    if (p.glow > 0.25) {
      ctx.shadowBlur  = 8 * p.glow;
      ctx.shadowColor = `rgba(179,139,91,${p.glow * 0.5})`;
    }

    const s = p.size;
    ctx.beginPath();
    ctx.moveTo(0, -s * 2.4);
    ctx.lineTo(s, 0);
    ctx.lineTo(0,  s * 2.4);
    ctx.lineTo(-s, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /* ── Loop ── */
  function loop() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { update(p); draw(p); });
    requestAnimationFrame(loop);
  }

  /* ── Mouse ── */
  window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }, { passive: true });

  /* ── Boot ── */
  resize();
  init();
  loop();

  window.addEventListener('resize', () => { resize(); init(); }, { passive: true });
})();
