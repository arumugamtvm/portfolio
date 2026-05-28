// ─── Nav: active link + scrolled state ───────────────
const nav = document.querySelector('nav');
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('nav ul a');

const navObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(a => a.classList.remove('active'));
      const active = document.querySelector(`nav ul a[href="#${entry.target.id}"]`);
      if (active) active.classList.add('active');
    }
  });
}, { threshold: 0.4 });
sections.forEach(s => navObserver.observe(s));

// ─── Scroll progress bar + nav shrink ─────────────────
const progress = document.querySelector('.scroll-progress');
function onScroll() {
  const h = document.documentElement;
  const scrolled = h.scrollTop / (h.scrollHeight - h.clientHeight);
  if (progress) progress.style.width = (scrolled * 100) + '%';
  if (nav) nav.classList.toggle('scrolled', h.scrollTop > 40);
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ─── Reveal on scroll ─────────────────────────────────
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach((el, i) => {
  el.style.transitionDelay = (i % 5 * 0.06) + 's';
  revealObserver.observe(el);
});

// ─── Custom cursor: hover states ──────────────────────
// (the glow's trailing motion is driven by the Starfield engine's single
//  rAF loop below, so there is no second animation loop competing here.)
const glow = document.querySelector('.cursor-glow');
if (glow && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  const interactive = 'a, button, .skill-tag, .stat-card, .contact-card, .tilt';
  document.querySelectorAll(interactive).forEach(el => {
    el.addEventListener('mouseenter', () => glow.classList.add('hovering'));
    el.addEventListener('mouseleave', () => glow.classList.remove('hovering'));
  });
}

// ─── Magnetic buttons + 3D tilt cards (fine pointers only) ─────────────
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.querySelectorAll('.magnetic').forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const mx = e.clientX - r.left - r.width / 2;
      const my = e.clientY - r.top - r.height / 2;
      el.style.transform = `translate(${mx * 0.25}px, ${my * 0.35}px)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  });

  // 3D tilt + a cursor-tracking sheen (--gx/--gy feed the CSS ::after/::before)
  document.querySelectorAll('.tilt').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform =
        `perspective(700px) rotateX(${-py * 8}deg) rotateY(${px * 8}deg) translateY(-6px)`;
      card.style.setProperty('--gx', ((px + 0.5) * 100).toFixed(1) + '%');
      card.style.setProperty('--gy', ((py + 0.5) * 100).toFixed(1) + '%');
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.setProperty('--gx', '50%');
      card.style.setProperty('--gy', '50%');
    });
  });
}

// ─── Terminal loading spinner ─────────────────────────
const loadingEl = document.querySelector('.terminal-body .cursor');
if (loadingEl) {
  const frames = ['|', '/', '—', '\\'];
  let i = 0;
  setInterval(() => { loadingEl.textContent = frames[i++ % frames.length]; }, 200);
}

/* ════════════════════════════════════════════════════════════════
   STARFIELD OS — unified 3D-depth + click-burst engine (vanilla, no deps)
   One rAF loop drives: pointer-parallax CSS vars, hero scene-tilt,
   cursor-glow trail, an interactive constellation field, and
   click-anywhere "stardust" bursts (perspective-projected depth particles
   + ground-plane shockwave rings + a combo/streak reward).
   Concept: "light reacts to your presence." Fully guarded for
   prefers-reduced-motion and touch/coarse pointers.
   ════════════════════════════════════════════════════════════════ */
(function StarfieldOS() {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const mqReduce = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };
  if (mqReduce.matches) return;            // honor reduced-motion: no decorative motion

  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const root = document.documentElement;

  /* ── palette / helpers ───────────────────────────────────────── */
  const PALETTE = [
    { r: 139, g: 123, b: 255 },  // violet  #8b7bff
    { r: 94,  g: 231, b: 176 },  // mint    #5ee7b0
    { r: 255, g: 126, b: 182 }   // pink    #ff7eb6
  ];
  const GOLD = { r: 255, g: 238, b: 200 };
  const pick = () => PALETTE[(Math.random() * PALETTE.length) | 0];
  const rgba = (c, a) => 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  const rand = (a, b) => a + Math.random() * (b - a);

  /* ── shared, smoothed input state ────────────────────────────── */
  let vw = window.innerWidth, vh = window.innerHeight;
  let rawX = vw / 2, rawY = vh / 2;        // raw pointer (px)
  let tpx = 0, tpy = 0, lpx = 0, lpy = 0;  // normalized pointer: target / live
  let cgx = rawX, cgy = rawY;              // eased cursor-glow position
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  const glowEl = document.querySelector('.cursor-glow');
  const heroInner = document.querySelector('.hero-inner');

  /* ── constellation canvas (fine pointers only) ───────────────── */
  let bg = null, bgCtx = null;
  const FIELD = { w: vw, h: vh, depth: 900, fov: 520 };
  let stars = [];
  if (fine) {
    bg = document.createElement('canvas');
    bg.className = 'depth-canvas';
    bg.setAttribute('aria-hidden', 'true');
    bgCtx = bg.getContext('2d', { alpha: true });
  }

  /* ── click-burst canvas + combo pill (all pointer types) ─────── */
  const fx = document.createElement('canvas');
  fx.id = 'clickfx-canvas';
  fx.setAttribute('aria-hidden', 'true');
  const fxCtx = fx.getContext('2d', { alpha: true, desynchronized: true });
  const comboEl = document.createElement('div');
  comboEl.id = 'clickfx-combo';
  comboEl.setAttribute('aria-hidden', 'true');

  function attach() {
    if (!document.body) return;
    if (bg) document.body.appendChild(bg);
    document.body.appendChild(fx);
    document.body.appendChild(comboEl);
    resize();
  }

  /* ── DPR-aware sizing ────────────────────────────────────────── */
  function sizeCanvas(c, ctx) {
    if (!c || !ctx) return;
    c.width = Math.round(vw * dpr);
    c.height = Math.round(vh * dpr);
    c.style.width = vw + 'px';
    c.style.height = vh + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);  // draw in CSS pixels
  }
  function resize() {
    vw = window.innerWidth; vh = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    sizeCanvas(bg, bgCtx);
    sizeCanvas(fx, fxCtx);
    if (bg) buildField();
  }
  let resizeRaf = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(resize);
  }, { passive: true });

  /* ── constellation field (perspective-projected 3D points) ───── */
  function starCount() {
    const area = vw * vh;                    // balanced density, bounded for perf
    return Math.max(40, Math.min(90, Math.round(area / 19000)));
  }
  function makeStar() {
    const half = FIELD.depth / 2;
    return {
      x: (Math.random() - 0.5) * FIELD.w * 1.6,
      y: (Math.random() - 0.5) * FIELD.h * 1.6,
      z: Math.random() * FIELD.depth - half,
      vx: (Math.random() - 0.5) * 0.05,
      vy: (Math.random() - 0.5) * 0.05,
      vz: (Math.random() - 0.5) * 0.05 + 0.04,
      r: Math.random() * 1.5 + 0.5,
      col: pick()
    };
  }
  function buildField() {
    FIELD.w = vw; FIELD.h = vh;
    const n = starCount();
    stars = new Array(n);
    for (let i = 0; i < n; i++) stars[i] = makeStar();
  }
  function project(s, panX, panY) {
    const zc = s.z + FIELD.depth;            // shift so z is positive in front of cam
    const scale = FIELD.fov / (FIELD.fov + zc);
    return { x: FIELD.w / 2 + (s.x + panX) * scale, y: FIELD.h / 2 + (s.y + panY) * scale, scale };
  }
  const LINK_SQ = 120 * 120;
  const MAX_LINKS = 3;

  /* ── click-burst engine (object-pooled) ──────────────────────── */
  const FOCAL = 320;
  const MAX_PARTICLES = 320;
  const MAX_RINGS = 24;
  const BASE_PARTICLES = 18;
  const COMBO_WINDOW = 600;                  // ms to keep a streak alive
  const SPAWN_THROTTLE = 16;

  const particles = [];
  const rings = [];
  for (let i = 0; i < MAX_PARTICLES; i++) particles.push({ active: false });
  for (let j = 0; j < MAX_RINGS; j++) rings.push({ active: false });
  function getParticle() { for (let k = 0; k < particles.length; k++) if (!particles[k].active) return particles[k]; return null; }
  function getRing() { for (let k = 0; k < rings.length; k++) if (!rings[k].active) return rings[k]; return null; }

  let comboCount = 0, lastClick = 0, lastSpawn = 0, comboTimer = null;
  function bumpCombo(x, y) {
    const now = performance.now();
    comboCount = (now - lastClick <= COMBO_WINDOW) ? comboCount + 1 : 1;
    lastClick = now;
    if (comboCount >= 2) {
      comboEl.textContent = 'x' + comboCount;
      comboEl.style.left = x + 'px';
      comboEl.style.top = y + 'px';
      comboEl.classList.remove('show');
      void comboEl.offsetWidth;              // restart the keyframes
      comboEl.classList.add('show');
    }
    if (comboTimer) clearTimeout(comboTimer);
    comboTimer = setTimeout(() => { comboCount = 0; }, COMBO_WINDOW + 60);
  }
  const comboIntensity = () => Math.min(1, (comboCount - 1) / 9);

  function spawnBurst(x, y) {
    const intensity = comboIntensity();
    const supernova = Math.random() < 0.12 + intensity * 0.18;
    let count = Math.round((BASE_PARTICLES + intensity * 26) * (supernova ? 1.7 : 1));
    count = Math.min(count, 70);

    // ground-plane shockwave ring(s)
    const ringN = 1 + (supernova ? 2 : (Math.random() < 0.45 ? 1 : 0));
    for (let r = 0; r < ringN; r++) {
      const ring = getRing(); if (!ring) break;
      ring.active = true; ring.x = x; ring.y = y; ring.life = 0; ring.delay = r * 0.06;
      ring.maxLife = rand(0.5, 0.75) + intensity * 0.15;
      ring.maxR = rand(70, 120) * (1 + intensity * 0.6) * (supernova ? 1.3 : 1);
      ring.w = rand(1.4, 2.6); ring.squash = 0.42; ring.thin = false;
      ring.color = (supernova && r === 0) ? GOLD : pick();
      ring.glow = supernova ? 1 : 0.7;
    }
    // screen-wide pulse at combo milestones
    if (comboCount >= 5 && comboCount % 5 === 0) {
      const p = getRing();
      if (p) {
        p.active = true; p.x = x; p.y = y; p.life = 0; p.delay = 0;
        p.maxLife = 0.85; p.maxR = Math.max(vw, vh) * 0.9; p.w = 2;
        p.squash = 1; p.color = pick(); p.glow = 0.4; p.thin = true;
      }
    }
    // depth particles
    for (let i = 0; i < count; i++) {
      const pt = getParticle(); if (!pt) break;
      pt.active = true; pt.x = x; pt.y = y; pt.z = rand(-20, 20);
      const ang = Math.random() * Math.PI * 2;
      const speed = rand(2.2, 6.4) * (1 + intensity * 0.5) * (supernova ? 1.25 : 1);
      pt.vx = Math.cos(ang) * speed;
      pt.vy = Math.sin(ang) * speed * 0.7 - rand(0.2, 1) * rand(2, 5);
      pt.vz = rand(-7, 4);
      pt.grav = rand(0.10, 0.16); pt.drag = rand(0.955, 0.985);
      pt.life = 0; pt.maxLife = rand(0.7, 1.25) * (supernova ? 1.15 : 1);
      pt.size = rand(1.6, 4.2) * (supernova ? 1.2 : 1);
      pt.rot = Math.random() * Math.PI * 2; pt.vr = rand(-0.25, 0.25);
      pt.shape = (Math.random() * 4) | 0;
      pt.color = (supernova && Math.random() < 0.5) ? GOLD : pick();
    }
    ensureRunning();
  }

  const drawList = [];
  function renderBursts(dt, dtScale) {
    let alive = false;
    fxCtx.clearRect(0, 0, vw, vh);
    fxCtx.globalCompositeOperation = 'lighter';

    // rings
    for (let r = 0; r < rings.length; r++) {
      const ring = rings[r]; if (!ring.active) continue;
      ring.life += dt;
      const la = ring.life - ring.delay;
      if (la < 0) { alive = true; continue; }
      const t = la / ring.maxLife;
      if (t >= 1) { ring.active = false; continue; }
      alive = true;
      const ease = 1 - Math.pow(1 - t, 3);
      const radius = ring.maxR * ease;
      const alpha = (1 - t) * (ring.thin ? 0.5 : 1) * ring.glow;
      fxCtx.save();
      fxCtx.translate(ring.x, ring.y);
      fxCtx.scale(1, ring.squash);
      fxCtx.beginPath();
      fxCtx.arc(0, 0, radius, 0, Math.PI * 2);
      fxCtx.lineWidth = ring.w * (1 - t * 0.5);
      fxCtx.strokeStyle = rgba(ring.color, alpha * 0.9);
      fxCtx.shadowColor = rgba(ring.color, alpha);
      fxCtx.shadowBlur = ring.thin ? 0 : 14 * (1 - t);
      fxCtx.stroke();
      fxCtx.restore();
      if (!ring.thin && t < 0.5) {            // faint vertical light pillar (depth cue)
        const pa = 0.18 * (1 - t * 2) * ring.glow;
        if (pa > 0) {
          const g = fxCtx.createLinearGradient(ring.x, ring.y, ring.x, ring.y - 70);
          g.addColorStop(0, rgba(ring.color, pa));
          g.addColorStop(1, rgba(ring.color, 0));
          fxCtx.fillStyle = g;
          fxCtx.fillRect(ring.x - ring.w, ring.y - 70, ring.w * 2, 70);
        }
      }
    }

    // particles — integrate in world space, collect for z-sort
    drawList.length = 0;
    for (let p = 0; p < particles.length; p++) {
      const pt = particles[p]; if (!pt.active) continue;
      pt.life += dt;
      const lt = pt.life / pt.maxLife;
      if (lt >= 1) { pt.active = false; continue; }
      alive = true;
      const d = Math.pow(pt.drag, dtScale);
      pt.vx *= d; pt.vy *= d; pt.vz *= d;
      pt.vy += pt.grav * dtScale;
      pt.x += pt.vx * dtScale; pt.y += pt.vy * dtScale; pt.z += pt.vz * dtScale;
      pt.rot += pt.vr * dtScale;
      let denom = FOCAL + pt.z; if (denom < 40) denom = 40;
      pt._scale = FOCAL / denom; pt._lt = lt;
      drawList.push(pt);
    }
    drawList.sort((a, b) => a._scale - b._scale);   // painter's: far first
    for (let i = 0; i < drawList.length; i++) drawParticle(drawList[i]);
    return alive;
  }

  function drawParticle(pt) {
    const lt = pt._lt;
    let fade = lt < 0.12 ? lt / 0.12 : (1 - (lt - 0.12) / 0.88);
    fade = Math.max(0, Math.min(1, fade));
    const sz = pt.size * pt._scale;
    if (sz < 0.3 || fade <= 0.01) return;
    const alpha = fade * Math.min(1, pt._scale);
    fxCtx.save();
    fxCtx.translate(pt.x, pt.y);
    fxCtx.rotate(pt.rot);
    fxCtx.shadowColor = rgba(pt.color, alpha);
    fxCtx.shadowBlur = 8 * pt._scale;
    switch (pt.shape) {
      case 0: {                               // spark: motion-stretched line
        const len = sz * (3 + Math.min(4, Math.abs(pt.vx) + Math.abs(pt.vy)) * 0.4);
        fxCtx.strokeStyle = rgba(pt.color, alpha);
        fxCtx.lineWidth = Math.max(0.6, sz * 0.5);
        fxCtx.lineCap = 'round';
        fxCtx.beginPath(); fxCtx.moveTo(-len * 0.5, 0); fxCtx.lineTo(len * 0.5, 0); fxCtx.stroke();
        break;
      }
      case 1:                                 // triangle
        fxCtx.fillStyle = rgba(pt.color, alpha);
        fxCtx.beginPath(); fxCtx.moveTo(0, -sz); fxCtx.lineTo(sz * 0.9, sz * 0.7);
        fxCtx.lineTo(-sz * 0.9, sz * 0.7); fxCtx.closePath(); fxCtx.fill();
        break;
      case 2:                                 // diamond
        fxCtx.fillStyle = rgba(pt.color, alpha);
        fxCtx.beginPath(); fxCtx.moveTo(0, -sz); fxCtx.lineTo(sz * 0.7, 0);
        fxCtx.lineTo(0, sz); fxCtx.lineTo(-sz * 0.7, 0); fxCtx.closePath(); fxCtx.fill();
        break;
      default: {                              // soft orb
        const g = fxCtx.createRadialGradient(0, 0, 0, 0, 0, sz * 1.6);
        g.addColorStop(0, rgba(pt.color, alpha));
        g.addColorStop(0.5, rgba(pt.color, alpha * 0.5));
        g.addColorStop(1, rgba(pt.color, 0));
        fxCtx.fillStyle = g;
        fxCtx.beginPath(); fxCtx.arc(0, 0, sz * 1.6, 0, Math.PI * 2); fxCtx.fill();
      }
    }
    fxCtx.restore();
  }

  function renderConstellation(dt) {
    bgCtx.clearRect(0, 0, FIELD.w, FIELD.h);
    const panX = -lpx * 60, panY = -lpy * 60;
    const cwx = rawX - FIELD.w / 2, cwy = rawY - FIELD.h / 2;
    const half = FIELD.depth / 2;
    const proj = new Array(stars.length);
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.x += s.vx * dt * 60; s.y += s.vy * dt * 60; s.z += s.vz * dt * 60;
      const dx = cwx - s.x, dy = cwy - s.y;          // gentle gravity well toward cursor
      const pull = 220 / (dx * dx + dy * dy + 1);
      s.x += dx * pull * dt * 60; s.y += dy * pull * dt * 60;
      if (s.z > half) { s.z = -half; s.x = (Math.random() - 0.5) * FIELD.w * 1.6; s.y = (Math.random() - 0.5) * FIELD.h * 1.6; }
      else if (s.z < -half) s.z = half;
      const p = project(s, panX, panY); proj[i] = p;
      const rad = Math.max(0.4, s.r * p.scale * 2.2);
      const a = Math.min(0.9, p.scale * 1.1);
      bgCtx.beginPath();
      bgCtx.arc(p.x, p.y, rad, 0, Math.PI * 2);
      bgCtx.fillStyle = rgba(s.col, +a.toFixed(3));
      bgCtx.fill();
    }
    bgCtx.lineWidth = 1;
    for (let i = 0; i < stars.length; i++) {
      const a = proj[i]; let links = 0;
      for (let j = i + 1; j < stars.length; j++) {
        if (links >= MAX_LINKS) break;
        const b = proj[j];
        const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
        if (d2 < LINK_SQ) {
          links++;
          const t = 1 - d2 / LINK_SQ;
          const alpha = t * ((a.scale + b.scale) * 0.5) * 0.22;
          bgCtx.strokeStyle = 'rgba(139,123,255,' + alpha.toFixed(3) + ')';
          bgCtx.beginPath(); bgCtx.moveTo(a.x, a.y); bgCtx.lineTo(b.x, b.y); bgCtx.stroke();
        }
      }
    }
  }

  /* ── the single rAF loop ─────────────────────────────────────── */
  let running = false, rafId = 0, lastT = 0, visible = true;

  function frame(now) {
    if (!visible) { running = false; rafId = 0; return; }
    if (!lastT) lastT = now;
    let dt = (now - lastT) / 1000; if (dt > 0.05) dt = 0.05;
    lastT = now;
    const dtScale = dt * 60;

    // 1) ease pointer -> publish parallax vars (fine pointers)
    if (fine) {
      lpx += (tpx - lpx) * 0.08;
      lpy += (tpy - lpy) * 0.08;
      root.style.setProperty('--px', lpx.toFixed(3));
      root.style.setProperty('--py', lpy.toFixed(3));
      // 2) hero scene-tilt (JS inline transform composes with .reveal opacity)
      if (heroInner) {
        heroInner.style.transform =
          'translate3d(' + (lpx * 40).toFixed(2) + 'px,' + (lpy * 24).toFixed(2) + 'px,0) ' +
          'rotateX(' + (lpy * -4).toFixed(2) + 'deg) rotateY(' + (lpx * 5).toFixed(2) + 'deg)';
      }
      // 3) cursor-glow trail
      if (glowEl) {
        cgx += (rawX - cgx) * 0.2; cgy += (rawY - cgy) * 0.2;
        glowEl.style.transform = 'translate(' + cgx + 'px,' + cgy + 'px) translate(-50%,-50%)';
      }
    }

    // 4) constellation (fine only) + 5) bursts (all)
    if (bg && bgCtx) renderConstellation(dt);
    const burstsAlive = renderBursts(dt, dtScale);

    // keep looping while the constellation lives (fine) or bursts are active
    if (fine || burstsAlive) { rafId = requestAnimationFrame(frame); }
    else { running = false; rafId = 0; fxCtx.clearRect(0, 0, vw, vh); }
  }
  function ensureRunning() {
    if (running) return;
    running = true; lastT = 0; rafId = requestAnimationFrame(frame);
  }

  /* ── input ───────────────────────────────────────────────────── */
  if (fine) {
    window.addEventListener('pointermove', e => {
      rawX = e.clientX; rawY = e.clientY;
      tpx = (e.clientX / vw) * 2 - 1;
      tpy = (e.clientY / vh) * 2 - 1;
    }, { passive: true });
    window.addEventListener('pointerout', e => {
      if (!e.relatedTarget) { tpx = 0; tpy = 0; }
    }, { passive: true });
  }

  const IGNORE = 'input, textarea, select, [contenteditable="true"]';
  function onPoint(x, y, target) {
    if (target && target.closest && target.closest(IGNORE)) return;
    const now = performance.now();
    if (now - lastSpawn < SPAWN_THROTTLE) return;
    lastSpawn = now;
    bumpCombo(x, y);
    spawnBurst(x, y);
  }
  // capture-phase + passive + never preventDefault => real click handlers unaffected
  if (window.PointerEvent) {
    document.addEventListener('pointerdown', e => {
      if (e.isTrusted === false) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;  // left-click only for mouse
      onPoint(e.clientX, e.clientY, e.target);
    }, { capture: true, passive: true });
  } else {
    document.addEventListener('mousedown', e => {
      if (e.button !== 0) return; onPoint(e.clientX, e.clientY, e.target);
    }, { capture: true, passive: true });
    document.addEventListener('touchstart', e => {
      const t = e.changedTouches && e.changedTouches[0]; if (!t) return;
      onPoint(t.clientX, t.clientY, e.target);
    }, { capture: true, passive: true });
  }

  document.addEventListener('visibilitychange', () => {
    visible = document.visibilityState === 'visible';
    if (visible) { lastT = 0; ensureRunning(); }
    else if (rafId) { cancelAnimationFrame(rafId); rafId = 0; running = false; }
  });

  /* ── richer scroll-depth entrance for headings & groups ──────── */
  document.querySelectorAll('section h2, .about-cards, .skills-grid, .contact-links')
    .forEach(el => { if (el.classList.contains('reveal')) el.classList.add('depth-in'); });

  /* ── boot ────────────────────────────────────────────────────── */
  if (document.body) attach();
  else document.addEventListener('DOMContentLoaded', attach, { once: true });
  if (fine) ensureRunning();                 // constellation/parallax run continuously
})();
