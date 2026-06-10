/* ════════════════════════════════════════════════════════════════
   WARM STUDIO — interaction engine
   One rAF loop publishes eased pointer to :root (--px/--py); consumers
   read it in their OWN transform so nothing clobbers card tilt.
   ════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ── Pointer signal (eased) ─────────────────────────────────── */
  let tx = 0, ty = 0, ex = 0, ey = 0;   // target / eased, range [-1,1]
  let mx = innerWidth / 2, my = innerHeight / 2;  // raw px for cursor
  let cx = mx, cy = my;                  // eased cursor px

  window.addEventListener('pointermove', (e) => {
    mx = e.clientX; my = e.clientY;
    tx = (e.clientX / innerWidth - 0.5) * 2;
    ty = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });

  /* ── Custom cursor ──────────────────────────────────────────── */
  const ring = document.querySelector('.cursor-ring');
  const dot  = document.querySelector('.cursor-dot');
  const hotSel = '[data-hot], a, button, .skill, .stat-card';
  document.addEventListener('pointerover', (e) => {
    if (e.target.closest(hotSel)) ring && ring.classList.add('hot');
  });
  document.addEventListener('pointerout', (e) => {
    if (e.target.closest(hotSel)) ring && ring.classList.remove('hot');
  });

  /* ── Hero stage tilt (cursor-driven 3D) ─────────────────────── */
  const stage = document.querySelector('[data-stage]');
  const play  = document.querySelector('[data-play]');
  const floats = [...document.querySelectorAll('[data-float]')];

  function frame() {
    const m = parseFloat(getComputedStyle(root).getPropertyValue('--motion')) || 1;
    ex = lerp(ex, tx, 0.08);
    ey = lerp(ey, ty, 0.08);
    root.style.setProperty('--px', ex.toFixed(4));
    root.style.setProperty('--py', ey.toFixed(4));

    // cursor easing
    if (fine && ring && dot) {
      cx = lerp(cx, mx, 0.18); cy = lerp(cy, my, 0.18);
      ring.style.transform = `translate(${cx}px, ${cy}px) translate(-50%,-50%)`;
      dot.style.transform  = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
    }

    if (!reduce) {
      if (stage) stage.style.transform =
        `rotateY(${ex * 5 * m}deg) rotateX(${-ey * 4 * m}deg)`;
      // floating stickers parallax at individual depths
      floats.forEach((el) => {
        const d = parseFloat(getComputedStyle(el).getPropertyValue('--depth')) || 80;
        const rot = getComputedStyle(el).getPropertyValue('--rot') || '0deg';
        const k = (d / 180);
        el.style.transform =
          `translate3d(calc(${(-ex * 26 * k * m).toFixed(2)}px + var(--dragx, 0px)), calc(${(-ey * 26 * k * m).toFixed(2)}px + var(--dragy, 0px)), ${d}px) rotate(${rot})`;
      });
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ── Card tilt + sheen ──────────────────────────────────────── */
  if (fine && !reduce) {
    document.querySelectorAll('.tilt').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        const m = parseFloat(getComputedStyle(root).getPropertyValue('--motion')) || 1;
        card.style.transform =
          `perspective(800px) rotateY(${(px - 0.5) * 9 * m}deg) rotateX(${-(py - 0.5) * 9 * m}deg) translateZ(6px)`;
        card.style.setProperty('--gx', (px * 100) + '%');
        card.style.setProperty('--gy', (py * 100) + '%');
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  /* ── Nav: scrolled state + scroll progress + active link ────── */
  const nav = document.querySelector('nav');
  const prog = document.querySelector('.scroll-progress');
  const links = [...document.querySelectorAll('nav ul a')];
  const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  function onScroll() {
    const y = scrollY;
    nav.classList.toggle('scrolled', y > 24);
    const h = document.documentElement.scrollHeight - innerHeight;
    if (prog) prog.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    let act = sections[0];
    for (const s of sections) { if (s.offsetTop - 140 <= y) act = s; }
    links.forEach((a) => a.classList.toggle('active', act && a.getAttribute('href') === '#' + act.id));
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── Reveal on scroll (rect-based; IO is unreliable in sandboxes) ── */
  let revealEls = [];
  function registerReveal(el) { if (!revealEls.includes(el)) revealEls.push(el); }
  function revealCheck() {
    const vh = innerHeight;
    for (let i = revealEls.length - 1; i >= 0; i--) {
      const el = revealEls[i];
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) {
        el.classList.add('in');
        revealEls.splice(i, 1);
      }
    }
  }
  const io = { observe: registerReveal, unobserve() {} }; // shim for renderSkills
  document.querySelectorAll('.reveal').forEach(registerReveal);
  window.addEventListener('scroll', revealCheck, { passive: true });
  window.addEventListener('resize', revealCheck);

  // Only enable the pre-animation hidden state when the tab can actually
  // paint — otherwise transitions freeze at opacity:0 and content vanishes.
  function enableAnim() {
    if (root.classList.contains('anim-ready')) return;
    if (document.visibilityState !== 'visible') return;
    root.classList.add('anim-ready');
    revealCheck();
  }
  if (document.visibilityState === 'visible') { enableAnim(); }
  document.addEventListener('visibilitychange', enableAnim);
  revealCheck();
  // safety: ensure nothing stays hidden if something goes sideways
  setTimeout(revealCheck, 300);
  setTimeout(() => revealEls.forEach((el) => el.classList.add('in')), 4000);

  // draw the name squiggle once hero is in
  const name = document.querySelector('[data-name]');
  if (name) setTimeout(() => name.classList.add('drawn'), 400);

  /* ── Skills data + render ───────────────────────────────────── */
  const SKILLS = [
    { name: 'JavaScript', cat: 'lang', lvl: 92, note: 'The language I use most, on the web and the server.' },
    { name: 'TypeScript', cat: 'lang', lvl: 84, note: 'JavaScript with types, so I catch mistakes early.' },
    { name: 'C#',         cat: 'lang', lvl: 80, note: 'I use it with .NET to build apps and services.' },
    { name: 'Dart',       cat: 'lang', lvl: 78, note: 'I use it with Flutter to build mobile apps.' },
    { name: 'Python',     cat: 'lang', lvl: 86, note: 'Great for quick tools and working with AI.' },
    { name: 'React',      cat: 'tool', lvl: 88, note: 'I use it to build interactive web pages.' },
    { name: 'Node.js',    cat: 'tool', lvl: 85, note: 'Lets me run JavaScript on the server.' },
    { name: 'Next.js',    cat: 'tool', lvl: 80, note: 'A React framework for full, fast websites.' },
    { name: 'SQL',        cat: 'lang', lvl: 75, note: 'For storing and finding data in databases.' },
    { name: 'AI / LLM APIs', cat: 'tool', lvl: 82, note: 'I build features powered by AI models.' },
    { name: 'Docker',     cat: 'tool', lvl: 72, note: 'Packages apps so they run the same anywhere.' },
    { name: 'Git',        cat: 'tool', lvl: 90, note: 'How I track changes and work on code safely.' },
    { name: 'APIs',       cat: 'tool', lvl: 88, note: 'I build and connect services over the web.' },
  ];
  const grid = document.querySelector('[data-skills]');
  function renderSkills(filter = 'all') {
    if (!grid) return;
    grid.innerHTML = '';
    SKILLS.filter((s) => filter === 'all' || s.cat === filter).forEach((s, i) => {
      const el = document.createElement('div');
      el.className = 'skill reveal';
      el.style.setProperty('--lvl', s.lvl + '%');
      el.style.setProperty('--rd', (i * 0.03) + 's');
      el.innerHTML =
        `<div class="s-top"><span class="s-name">${s.name}</span><span class="s-lvl">${s.lvl}%</span></div>` +
        `<div class="s-bar"><i></i></div>` +
        `<span class="s-note">${s.note}</span>`;
      grid.appendChild(el);
      io.observe(el);
    });
    revealCheck();
  }
  renderSkills();
  document.querySelectorAll('[data-skillfilter] button').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelectorAll('[data-skillfilter] button').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      renderSkills(b.dataset.filter);
    });
  });

  /* ── Copy email ─────────────────────────────────────────────── */
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const txt = btn.dataset.copy;
      try { await navigator.clipboard.writeText(txt); }
      catch (e) { const t = document.createElement('textarea'); t.value = txt; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }
      const toast = document.querySelector('[data-toast]');
      if (toast) { toast.classList.add('show'); clearTimeout(btn._t); btn._t = setTimeout(() => toast.classList.remove('show'), 2200); }
    });
  });

  /* ── Résumé download (generated on the fly) ─────────────────── */
  const RESUME = `ARUMUGAM G
Developer — builds fast, iterates faster, ships relentlessly.

CONTACT
  Email   garumugamtvm@gmail.com
  GitHub  github.com/arumugamtvm

SUMMARY
  Developer who turns coffee, curiosity, and an unreasonable number of
  open browser tabs into software that actually ships. Cares about
  readable code, sensible names, and error handling that doesn't quietly
  judge the next person to open the file.

SKILLS
  Languages   JavaScript, TypeScript, C#, Dart, Python, SQL
  Frontend    React, Next.js, HTML, CSS, 3D / motion on the web
  Backend     Node.js, REST APIs, SQL databases
  Tooling     Git, Docker, GitHub Actions
  Curious in  AI / LLM APIs, prompt engineering, weekend experiments

HOW I WORK
  - Ship it > perfect it (then perfect it).
  - Read the error message slowly. The answer is usually in there.
  - Document... eventually. But the code reads clearly in the meantime.

NOTE
  This resume was generated by clicking a button on my portfolio.
  Yes, that was also a small project. No, it doesn't have bugs. (Probably.)
`;
  document.querySelectorAll('[data-resume]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const blob = new Blob([RESUME], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'Arumugam-G-Resume.txt';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      egg('résumé downloaded — the 1% that was left was naming the file ✶');
    });
  });

  /* ── Theme toggle (mini btn cycles cream → midnight → mono) ──── */
  const THEMES = ['cream', 'midnight', 'mono'];
  const savedTheme = localStorage.getItem('ws-theme');
  if (savedTheme && THEMES.includes(savedTheme)) root.setAttribute('data-theme', savedTheme);
  document.querySelectorAll('[data-toggle-theme]').forEach((b) => {
    b.addEventListener('click', () => {
      const cur = root.getAttribute('data-theme') || 'cream';
      const next = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
      root.setAttribute('data-theme', next);
      localStorage.setItem('ws-theme', next);
      egg('theme → ' + next);
      window.dispatchEvent(new CustomEvent('ws-theme', { detail: next }));
    });
  });
  document.querySelectorAll('[data-toggle-top]').forEach((b) => {
    b.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  });

  /* ── Easter eggs ────────────────────────────────────────────── */
  const eggEl = document.querySelector('[data-egg]');
  let eggTimer;
  function egg(msg) {
    if (!eggEl) return;
    eggEl.textContent = msg;
    eggEl.classList.add('show');
    clearTimeout(eggTimer);
    eggTimer = setTimeout(() => eggEl.classList.remove('show'), 2600);
  }
  window.__egg = egg;

  // Orb clicker
  const orb = document.querySelector('.hero-orb');
  const ORB_MSGS = [
    'ow.', 'again? bold.', 'this orb has feelings.', 'keep going, I dare you.',
    'okay now you\'re just procrastinating.', '🎉 achievement: clicked a circle 7 times',
  ];
  let orbN = 0;
  if (orb) {
    orb.style.pointerEvents = 'auto';
    orb.style.cursor = 'pointer';
    orb.addEventListener('click', () => {
      egg(ORB_MSGS[Math.min(orbN, ORB_MSGS.length - 1)]);
      orb.animate([{ transform: getComputedStyle(orb).transform + ' scale(1)' },
                   { transform: getComputedStyle(orb).transform + ' scale(0.86)' },
                   { transform: getComputedStyle(orb).transform + ' scale(1)' }],
                   { duration: 240, easing: 'ease-out' });
      orbN++;
    });
  }

  // Konami code
  const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let kbuf = [];
  window.addEventListener('keydown', (e) => {
    kbuf.push(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    kbuf = kbuf.slice(-KONAMI.length);
    if (kbuf.join(',') === KONAMI.join(',')) {
      root.setAttribute('data-theme', 'midnight');
      localStorage.setItem('ws-theme', 'midnight');
      document.body.classList.add('party');
      egg('🌙 you found it. midnight mode unlocked. respect.');
      confetti();
    }
  });

  // tiny confetti burst (no deps)
  function confetti() {
    const colors = ['#6b4eff', '#ff7a45', '#1f9d6b', '#ffd23f'];
    for (let i = 0; i < 60; i++) {
      const p = document.createElement('span');
      const size = 6 + Math.random() * 8;
      Object.assign(p.style, {
        position: 'fixed', left: '50%', top: '40%', width: size + 'px', height: size + 'px',
        background: colors[i % colors.length], borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        zIndex: 9500, pointerEvents: 'none', willChange: 'transform,opacity',
      });
      document.body.appendChild(p);
      const ang = Math.random() * Math.PI * 2;
      const vel = 120 + Math.random() * 260;
      p.animate([
        { transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 1 },
        { transform: `translate(${Math.cos(ang)*vel - 50}%, ${Math.sin(ang)*vel + 200}%) rotate(${Math.random()*720}deg)`, opacity: 0 },
      ], { duration: 1100 + Math.random() * 700, easing: 'cubic-bezier(.2,.7,.2,1)' })
       .onfinish = () => p.remove();
    }
  }
  window.__confetti = confetti;

  // Console message for the curious
  console.log('%c👋 hey, you opened the console.', 'font-size:15px;font-weight:700;color:#6b4eff');
  console.log('%cthat\'s a developer move. we should talk → garumugamtvm@gmail.com', 'font-size:12px;color:#ff7a45');

  /* ── Tweaks bridge: apply CSS-var tweaks posted by the panel ── */
  window.applyWsTweaks = function (t) {
    if (!t) return;
    if (t.theme && THEMES.includes(t.theme)) root.setAttribute('data-theme', t.theme);
    if (t.accent) root.style.setProperty('--violet', t.accent), root.style.setProperty('--violet-ink', t.accent);
    if (t.coral) root.style.setProperty('--coral', t.coral);
    if (typeof t.motion === 'number') root.style.setProperty('--motion', String(t.motion));
    if (t.motionOff !== undefined) root.setAttribute('data-motion', t.motionOff ? 'off' : 'on');
    if (t.cursor !== undefined) document.body.setAttribute('data-cursor', t.cursor ? 'on' : 'off');
    if (t.sparks !== undefined) root.setAttribute('data-sparks', t.sparks ? 'on' : 'off');
    if (t.display) root.style.setProperty('--display', t.display);
    if (t.body) root.style.setProperty('--body', t.body);
  };
})();
/* ════════════════════════════════════════════════════════════════
   CREATIVE LAYER — runs after app.js. Reuses window.__egg / confetti.
   ════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const egg = window.__egg || (() => {});
  const lerp = (a, b, t) => a + (b - a) * t;
  const COLORS = ['#6b4eff', '#ff7a45', '#1f9d6b', '#ffd23f'];

  /* ── Custom context menu ─────────────────────────────────────── */
  const menu = document.createElement('div');
  menu.className = 'ctx-menu';
  menu.setAttribute('role', 'menu');
  menu.innerHTML = `
    <div class="ctx-head"><span>Arumugam · quick menu</span><span class="blink"></span></div>
    <button class="ctx-item" data-act="email"><span class="ic">${ico('mail')}</span>Copy my email<span class="meta">⌘C</span></button>
    <button class="ctx-item" data-act="resume"><span class="ic">${ico('file')}</span>Grab my résumé<span class="meta">.txt</span></button>
    <button class="ctx-item" data-act="github"><span class="ic">${ico('github')}</span>Open GitHub<span class="meta">↗</span></button>
    <div class="ctx-sep"></div>
    <button class="ctx-item" data-act="theme"><span class="ic">${ico('palette')}</span>Switch the vibe<span class="meta">theme</span></button>
    <button class="ctx-item" data-act="confetti"><span class="ic">${ico('sparkles')}</span>Throw confetti<span class="meta">why not</span></button>
    <button class="ctx-item" data-act="top"><span class="ic">${ico('arrow-up')}</span>Back to the top<span class="meta">home</span></button>
    <div class="ctx-foot">you right-clicked. <b>respect.</b><br>no boring browser menu here.</div>
  `;
  document.body.appendChild(menu);

  let menuOpen = false;
  function openMenu(x, y) {
    menu.classList.add('show');
    menuOpen = true;
    const r = menu.getBoundingClientRect();
    const px = Math.min(x, innerWidth - r.width - 12);
    const py = Math.min(y, innerHeight - r.height - 12);
    menu.style.left = px + 'px';
    menu.style.top = py + 'px';
  }
  function closeMenu() { menu.classList.remove('show'); menuOpen = false; }

  window.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.ws-chat')) return;
    e.preventDefault();
    openMenu(e.clientX, e.clientY);
  });
  window.addEventListener('click', (e) => { if (menuOpen && !menu.contains(e.target)) closeMenu(); });
  window.addEventListener('scroll', () => { if (menuOpen) closeMenu(); }, { passive: true });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  menu.addEventListener('click', (e) => {
    const item = e.target.closest('.ctx-item'); if (!item) return;
    const act = item.dataset.act;
    closeMenu();
    if (act === 'email') {
      const v = 'garumugamtvm@gmail.com';
      (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject())
        .catch(() => { const t = document.createElement('textarea'); t.value = v; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); });
      egg('email copied — now go say hi ✶');
    } else if (act === 'resume') {
      const btn = document.querySelector('[data-resume]'); if (btn) btn.click();
    } else if (act === 'github') {
      window.open('https://github.com/arumugamtvm', '_blank', 'noopener');
    } else if (act === 'theme') {
      const btn = document.querySelector('[data-toggle-theme]'); if (btn) btn.click();
    } else if (act === 'confetti') {
      (window.__confetti || (() => {}))(); egg('🎉 confetti deployed to production.');
    } else if (act === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  /* ── Click sparks + ripple ───────────────────────────────────── */
  function clickFx(x, y) {
    if (reduce) return;
    if (root.getAttribute('data-sparks') === 'off') return;
    const m = parseFloat(getComputedStyle(root).getPropertyValue('--motion')) || 1;
    if (m <= 0) return;
    // ripple ring
    const ring = document.createElement('span');
    ring.className = 'click-ring';
    Object.assign(ring.style, { left: x + 'px', top: y + 'px', width: '10px', height: '10px',
      borderColor: COLORS[Math.floor(Math.random() * 2)] });
    document.body.appendChild(ring);
    ring.animate([
      { transform: 'translate(-50%,-50%) scale(0.4)', opacity: 0.9 },
      { transform: 'translate(-50%,-50%) scale(5)', opacity: 0 },
    ], { duration: 520, easing: 'cubic-bezier(.2,.7,.2,1)' }).onfinish = () => ring.remove();
    // sparks
    const n = 7;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'spark';
      const c = COLORS[i % COLORS.length];
      Object.assign(s.style, { left: x + 'px', top: y + 'px', background: c,
        borderRadius: Math.random() > .5 ? '50%' : '2px' });
      document.body.appendChild(s);
      const ang = (Math.PI * 2 * i) / n + Math.random() * 0.6;
      const dist = (34 + Math.random() * 46) * m;
      s.animate([
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(ang)*dist}px), calc(-50% + ${Math.sin(ang)*dist}px)) scale(0)`, opacity: 0 },
      ], { duration: 520 + Math.random() * 260, easing: 'cubic-bezier(.2,.7,.2,1)' }).onfinish = () => s.remove();
    }
  }
  window.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('.ctx-menu, .tweaks-host, .ws-chat, input, textarea')) return;
    clickFx(e.clientX, e.clientY);
  });

  /* ── Magnetic buttons ────────────────────────────────────────── */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduce) {
    document.querySelectorAll('.btn, .nav-cta, .mini-btn').forEach((el) => {
      let raf = 0, tx = 0, ty = 0, cx = 0, cy = 0;
      function loop() {
        cx = lerp(cx, tx, 0.2); cy = lerp(cy, ty, 0.2);
        el.style.transform = `translate(${cx}px, ${cy}px)`;
        if (Math.abs(cx - tx) > 0.1 || Math.abs(cy - ty) > 0.1) raf = requestAnimationFrame(loop);
        else { el.style.transform = `translate(${tx}px,${ty}px)`; raf = 0; }
      }
      el.addEventListener('pointermove', (e) => {
        const m = parseFloat(getComputedStyle(root).getPropertyValue('--motion')) || 1;
        const r = el.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - 0.5) * 16 * m;
        ty = ((e.clientY - r.top) / r.height - 0.5) * 16 * m;
        if (!raf) raf = requestAnimationFrame(loop);
      });
      el.addEventListener('pointerleave', () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(loop); });
    });
  }

  /* ── Scroll-reactive: velocity → subtle section skew + marquee ── */
  let lastY = scrollY, vel = 0, skew = 0;
  const tracks = [...document.querySelectorAll('.marquee-track')];
  const sectionsAll = [...document.querySelectorAll('section')];
  let marqueeX = tracks.map(() => 0);

  /* ── Horizontal pinned gallery driver ────────────────────────── */
  const workSection = document.querySelector('#work.h-scroll');
  const hTrack = document.querySelector('[data-htrack]');
  const hRail = document.querySelector('[data-hrail]');
  let hX = 0; // eased translateX
  const isHorizMode = () => window.matchMedia('(min-width: 861px)').matches;

  /* ── Hero scroll parallax targets ────────────────────────────── */
  const heroStage = document.querySelector('[data-stage]');
  const heroPlay = document.querySelector('[data-play]');
  const heroOrb = document.querySelector('.hero-orb');
  const heroFloats = [...document.querySelectorAll('[data-float]')];

  /* ── Interactive constellation field (hero background) ───────── */
  const hero = document.querySelector('#hero');
  let fieldCanvas = null, fctx = null, points = [], fieldW = 0, fieldH = 0, dpr = 1;
  let fmx = -999, fmy = -999;            // mouse within hero
  let fieldColors = { dot: 'rgba(107,78,255,.7)', dot2: 'rgba(255,122,69,.8)', line: 'rgba(29,23,18,.5)' };
  function readFieldColors() {
    const cs = getComputedStyle(root);
    const v = cs.getPropertyValue('--violet').trim() || '#6b4eff';
    const c = cs.getPropertyValue('--coral').trim() || '#ff7a45';
    const ink = cs.getPropertyValue('--ink-faint').trim() || '#9a8f80';
    fieldColors = { dot: v, dot2: c, line: ink };
  }
  function initField() {
    if (!hero || reduce) return;
    fieldCanvas = document.createElement('canvas');
    fieldCanvas.className = 'hero-field';
    hero.insertBefore(fieldCanvas, hero.firstChild);
    fctx = fieldCanvas.getContext('2d');
    readFieldColors();
    sizeField();
    const n = Math.min(46, Math.round(fieldW / 36));
    points = Array.from({ length: n }, () => ({
      x: Math.random() * fieldW, y: Math.random() * fieldH,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
      r: 1.4 + Math.random() * 1.8, coral: Math.random() > 0.78,
    }));
    hero.addEventListener('pointermove', (e) => {
      const rct = hero.getBoundingClientRect();
      fmx = e.clientX - rct.left; fmy = e.clientY - rct.top;
    });
    hero.addEventListener('pointerleave', () => { fmx = -999; fmy = -999; });
    window.addEventListener('ws-theme', () => setTimeout(readFieldColors, 30));
  }
  function sizeField() {
    if (!fieldCanvas || !hero) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    fieldW = hero.clientWidth; fieldH = hero.clientHeight;
    fieldCanvas.width = fieldW * dpr; fieldCanvas.height = fieldH * dpr;
    fieldCanvas.style.width = fieldW + 'px'; fieldCanvas.style.height = fieldH + 'px';
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', sizeField);
  function drawField(m) {
    if (!fctx) return;
    fctx.clearRect(0, 0, fieldW, fieldH);
    const D = 116;
    for (const p of points) {
      // gentle drift
      p.x += p.vx * m; p.y += p.vy * m;
      // cursor influence (attract softly)
      if (fmx > -900) {
        const dx = fmx - p.x, dy = fmy - p.y, dist = Math.hypot(dx, dy);
        if (dist < 150 && dist > 0.1) { p.x += (dx / dist) * 0.5 * m; p.y += (dy / dist) * 0.5 * m; }
      }
      if (p.x < 0) p.x += fieldW; if (p.x > fieldW) p.x -= fieldW;
      if (p.y < 0) p.y += fieldH; if (p.y > fieldH) p.y -= fieldH;
    }
    // links
    fctx.strokeStyle = fieldColors.line;
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const a = points[i], b = points[j];
        const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
        if (d < D) { fctx.globalAlpha = (1 - d / D) * 0.22; fctx.beginPath(); fctx.moveTo(a.x, a.y); fctx.lineTo(b.x, b.y); fctx.stroke(); }
      }
    }
    // connect to cursor
    if (fmx > -900) {
      for (const p of points) {
        const d = Math.hypot(fmx - p.x, fmy - p.y);
        if (d < 150) { fctx.globalAlpha = (1 - d / 150) * 0.4; fctx.strokeStyle = fieldColors.dot; fctx.beginPath(); fctx.moveTo(fmx, fmy); fctx.lineTo(p.x, p.y); fctx.stroke(); }
      }
    }
    // dots
    fctx.globalAlpha = 0.85;
    for (const p of points) {
      fctx.fillStyle = p.coral ? fieldColors.dot2 : fieldColors.dot;
      fctx.beginPath(); fctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); fctx.fill();
    }
    fctx.globalAlpha = 1;
  }
  initField();

  function tickScroll() {
    const m = parseFloat(getComputedStyle(root).getPropertyValue('--motion')) || 1;
    const cur = scrollY;
    const dv = cur - lastY;
    lastY = cur;
    vel = lerp(vel, dv, 0.25);

    // constellation field (only while hero is on screen)
    if (fctx && cur < fieldH + 80) drawField(m);

    // section skew (clamped, tiny)
    const target = reduce ? 0 : Math.max(-1.5, Math.min(1.5, vel * 0.045 * m));
    skew = lerp(skew, target, 0.15);
    root.style.setProperty('--skew', skew.toFixed(3));

    // marquee: base drift + scroll velocity nudge, opposite directions
    tracks.forEach((t, i) => {
      const dir = i % 2 === 0 ? -1 : 1;
      const base = reduce ? 0 : 0.4 * dir * m;
      marqueeX[i] += base + (reduce ? 0 : vel * 0.25 * dir * m);
      const w = t.scrollWidth / 2 || 1;
      if (marqueeX[i] <= -w) marqueeX[i] += w;
      if (marqueeX[i] > 0) marqueeX[i] -= w;
      t.style.transform = `translateX(${marqueeX[i].toFixed(2)}px)`;
    });

    // horizontal pinned gallery
    if (workSection && hTrack && isHorizMode()) {
      const top = workSection.offsetTop;
      const dist = workSection.offsetHeight - innerHeight;
      const p = Math.max(0, Math.min(1, (cur - top) / (dist || 1)));
      const maxX = Math.max(0, hTrack.scrollWidth - innerWidth + 8);
      const tX = -p * maxX;
      hX = lerp(hX, tX, 0.12);
      hTrack.style.transform = `translateX(${hX.toFixed(2)}px)`;
      if (hRail) hRail.style.width = (p * 100).toFixed(1) + '%';
    } else if (hTrack) {
      hTrack.style.transform = '';
    }

    // hero scroll parallax (only while hero is on screen)
    if (heroPlay && !reduce && cur < innerHeight * 1.2) {
      const p = cur / innerHeight; // 0..1+
      heroFloats.forEach((el, i) => {
        const k = 1 + (i % 3) * 0.4;
        el.style.marginTop = (-p * 60 * k * m).toFixed(1) + 'px';
      });
      if (heroStage) heroStage.style.opacity = String(Math.max(0, 1 - p * 1.1));
    }

    requestAnimationFrame(tickScroll);
  }
  requestAnimationFrame(tickScroll);

  /* ── Count-up stats when they enter view ─────────────────────── */
  const statEls = [...document.querySelectorAll('.stat-num[data-count]')];
  let counted = false;
  function checkCounts() {
    if (counted) return;
    const trigger = document.querySelector('#about');
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    if (r.top < innerHeight * 0.85) {
      counted = true;
      statEls.forEach((el) => {
        const target = parseFloat(el.dataset.count);
        const suffix = el.dataset.suffix || '';
        const dur = 1200; const t0 = performance.now();
        function step(now) {
          const p = Math.min(1, (now - t0) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased) + suffix;
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }
  }
  window.addEventListener('scroll', checkCounts, { passive: true });
  checkCounts();

})();
/* ════════════════════════════════════════════════════════════════
   ARCADE LAYER — boot · command palette · OS-aware dev-HUD · trail.
   Runs after app.js + creative.js.
   ════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const egg = window.__egg || (() => {});
  const confetti = () => (window.__confetti || (() => {}))();
  const $ = (s, c = document) => c.querySelector(s);

  /* ════════ OS DETECTION ════════ */
  const OS = (() => {
    const pre = root.getAttribute('data-os');
    if (pre) return pre;
    const src = ((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent || '').toLowerCase();
    return /mac|iphone|ipad|ipod|darwin/.test(src) ? 'mac' : /win/.test(src) ? 'win' : 'linux';
  })();
  const IS_MAC = OS === 'mac';
  const OS_LABEL = { mac: 'macOS', win: 'Windows', linux: 'Linux' }[OS];
  const MOD_LABEL = IS_MAC ? '⌘' : 'Ctrl';
  const MOD_K = IS_MAC ? '⌘K' : 'Ctrl+K';

  /* unlock(): no-op shim — remaining callers (boot/drag/cmdk/midnight) are harmless. */
  const unlock = () => {};

  /* ════════ DEV-HUD — editor-style status bar (replaces the XP/achievement HUD) ════════ */
  (() => {
    const reduceHud = reduce || root.getAttribute('data-motion') === 'off';
    const bar = document.createElement('div');
    bar.className = 'devbar';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Developer status bar');
    bar.innerHTML = `
      <button class="db-seg db-net" data-net aria-label="Network status">
        <span class="db-dot" aria-hidden="true"></span><span class="db-net-t">online</span>
      </button>
      <span class="db-sep" aria-hidden="true"></span>
      <button class="db-seg db-git" data-git aria-label="Open latest commit on GitHub">
        <span class="db-branch">main</span><span class="db-ok" aria-hidden="true">✓</span>
        <span class="db-commit" data-commit>—</span>
      </button>
      <span class="db-sep" aria-hidden="true"></span>
      <button class="db-seg db-crumb" data-crumb aria-label="Jump to current section">~/</button>
      <span class="db-spacer" title="Collapse"></span>
      <span class="db-seg db-build" title="CI: npm run build → gh-pages">build:&nbsp;<b>passing</b></span>
      <span class="db-sep" aria-hidden="true"></span>
      <button class="db-seg db-os" aria-label="Operating system">${OS_LABEL}</button>
      <span class="db-seg db-clock" data-clock aria-hidden="true">--:--</span>
      <span class="db-seg db-fps" data-fps aria-hidden="true">-- fps</span>
      <button class="db-seg db-theme" aria-label="Cycle theme"><span data-themelbl>cream</span></button>`;
    document.body.appendChild(bar);
    const $1 = (s) => bar.querySelector(s);

    /* network (real) */
    const dot = $1('.db-dot'), netT = $1('.db-net-t');
    const setNet = () => { const on = navigator.onLine; netT.textContent = on ? 'online' : 'offline'; dot.classList.toggle('off', !on); };
    addEventListener('online', setNet); addEventListener('offline', setNet); setNet();

    /* build / last commit (real; injected by build.js as window.__BUILD; falls back in dev) */
    const b = window.__BUILD || {};
    if (b.when) {
      const mins = (Date.now() - new Date(b.when)) / 6e4;
      const ago = mins < 60 ? Math.max(1, mins | 0) + 'm ago' : mins < 1440 ? (mins / 60 | 0) + 'h ago' : (mins / 1440 | 0) + 'd ago';
      $1('[data-commit]').textContent = ago;
    }
    $1('[data-git]').onclick = () => (b.sha && b.sha !== 'dev')
      ? window.open('https://github.com/arumugamtvm/portfolio/commit/' + b.sha, '_blank', 'noopener')
      : window.open('https://github.com/arumugamtvm/portfolio', '_blank', 'noopener');

    /* clock (real) */
    const clock = $1('[data-clock]');
    const tickClock = () => clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    tickClock(); if (!reduceHud) setInterval(tickClock, 15000);

    /* fps (real rAF delta; paused under reduced motion) */
    const fpsEl = $1('[data-fps]');
    if (reduceHud) { fpsEl.textContent = '— fps'; }
    else {
      let last = performance.now(), frames = 0, acc = 0;
      const loop = (t) => { frames++; acc += t - last; last = t;
        if (acc >= 500) { const v = Math.round(frames / (acc / 1000)); if (v > 0) fpsEl.textContent = v + ' fps'; frames = 0; acc = 0; }
        requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    }

    /* breadcrumb (real; reads section[data-screen-label]) */
    const crumb = $1('[data-crumb]');
    const secs = [...document.querySelectorAll('section[data-screen-label]')];
    if (secs.length && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => {
        es.forEach((e) => { if (e.isIntersecting) {
          const id = e.target.id || e.target.dataset.screenLabel.toLowerCase();
          crumb.textContent = '~/' + id; crumb.classList.add('active');
          clearTimeout(crumb._t); crumb._t = setTimeout(() => crumb.classList.remove('active'), 600);
        }});
      }, { threshold: 0.5 });
      secs.forEach((s) => io.observe(s));
    }
    crumb.onclick = () => { const id = crumb.textContent.slice(2); const t = document.getElementById(id);
      if (t) window.scrollTo({ top: id === 'hero' ? 0 : t.offsetTop - 10, behavior: 'smooth' }); };

    /* theme: mirror label + bridge click to the app-wired mini toggler */
    const tl = $1('[data-themelbl]');
    const syncTheme = () => tl.textContent = root.getAttribute('data-theme') || 'cream';
    new MutationObserver(syncTheme).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    syncTheme();
    $1('.db-theme').onclick = () => { const m = document.querySelector('.mini-controls [data-toggle-theme]'); if (m) m.click(); };

    /* collapse toggle (calm — click the empty space) */
    $1('.db-spacer').onclick = () => bar.classList.toggle('collapsed');
  })();

  /* ════════ COMMAND PALETTE ════════ */
  const scrim = document.createElement('div');
  scrim.className = 'cmdk-scrim';
  scrim.innerHTML = `
    <div class="cmdk" role="dialog" aria-label="Command palette">
      <div class="cmdk-top">
        <span class="pre">${MOD_LABEL}</span>
        <input class="cmdk-input" placeholder="Type a command or search…" aria-label="Command" />
        <span class="cmdk-esc">esc</span>
      </div>
      <div class="cmdk-list" data-cmdlist></div>
    </div>`;
  document.body.appendChild(scrim);
  const cmdInput = $('.cmdk-input', scrim);
  const cmdList = $('[data-cmdlist]', scrim);

  const go = (sel) => { const t = $(sel); if (t) { closeCmd(); window.scrollTo({ top: sel === '#hero' ? 0 : t.offsetTop - 10, behavior: 'smooth' }); } };
  const COMMANDS = [
    { g: 'Navigate', icon: 'diamond', name: 'Hero', sub: 'Top of page', kbd: 'G H', run: () => go('#hero') },
    { g: 'Navigate', icon: 'diamond', name: 'About', sub: 'Who is typing', run: () => go('#about') },
    { g: 'Navigate', icon: 'diamond', name: 'Skills', sub: 'The toolbelt', run: () => go('#skills') },
    { g: 'Navigate', icon: 'diamond', name: 'Work', sub: 'Projects gallery', run: () => go('#work') },
    { g: 'Navigate', icon: 'diamond', name: 'Path', sub: 'Origin story', run: () => go('#path') },
    { g: 'Navigate', icon: 'diamond', name: 'Contact', sub: 'Say hello', run: () => go('#contact') },
    { g: 'Actions', icon: 'mail', name: 'Copy email', sub: 'garumugamtvm@gmail.com', run: () => { copyEmail(); closeCmd(); } },
    { g: 'Actions', icon: 'file', name: 'Download résumé', sub: '.txt file', run: () => { closeCmd(); const b = $('[data-resume]'); if (b) b.click(); } },
    { g: 'Actions', icon: 'github', name: 'Open GitHub', sub: 'github.com/arumugamtvm', run: () => { closeCmd(); window.open('https://github.com/arumugamtvm', '_blank', 'noopener'); } },
    { g: 'Actions', icon: 'palette', name: 'Switch theme', sub: 'cream / midnight / mono', run: () => { const b = $('[data-toggle-theme]'); if (b) b.click(); } },
    { g: 'Actions', icon: 'sparkles', name: 'Throw confetti', sub: 'pure serotonin', run: () => { confetti(); } },
    { g: 'Agents', icon: 'sparkles', name: 'Chat with this site', sub: 'local AI · drives the page', run: () => { closeCmd(); (window.__openChat || (() => {}))(); } },
    { g: 'Agents', icon: 'search', name: 'Search the web', sub: 'open a web search', run: () => { closeCmd(); const qq = prompt('Search the web for:'); if (qq) window.open('https://duckduckgo.com/?q=' + encodeURIComponent(qq), '_blank', 'noopener'); } },
    { g: 'Agents', icon: 'bot', name: 'Copy agent context', sub: 'profile.json + llms.txt for AI agents', run: () => { const ctx = 'Arumugam G — Software Engineer (Thiruvananthapuram, India).\nMachine-readable profile: https://arumugamg.com/profile.json\nAgent guide: https://arumugamg.com/llms.txt\nGitHub: https://github.com/arumugamtvm'; (navigator.clipboard ? navigator.clipboard.writeText(ctx) : Promise.reject()).catch(() => { const t = document.createElement('textarea'); t.value = ctx; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }); egg('agent context copied ✶'); closeCmd(); } },
    { g: 'Secrets', icon: 'moon', name: 'Enter midnight mode', sub: 'shhh', run: () => { root.setAttribute('data-theme', 'midnight'); try { localStorage.setItem('ws-theme', 'midnight'); } catch (e) {} confetti(); closeCmd(); unlock('stylist'); } },
  ];
  function copyEmail() {
    const v = 'garumugamtvm@gmail.com';
    (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject())
      .catch(() => { const t = document.createElement('textarea'); t.value = v; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); });
    egg('email copied — go say hi ✶');
  }

  let cmdOpen = false, sel = 0, filtered = COMMANDS.slice();
  function renderCmd() {
    cmdList.innerHTML = '';
    if (!filtered.length) { cmdList.innerHTML = '<div class="cmdk-empty">no commands match — try “theme”, “work”, “email”</div>'; return; }
    let lastG = null;
    filtered.forEach((c, i) => {
      if (c.g !== lastG) { lastG = c.g; const h = document.createElement('div'); h.className = 'cmdk-group'; h.textContent = c.g; cmdList.appendChild(h); }
      const b = document.createElement('button');
      b.className = 'cmdk-item' + (i === sel ? ' sel' : '');
      b.innerHTML = `<span class="cic">${ico(c.icon)}</span><span class="cname">${c.name}</span><span class="csub">${c.sub || ''}</span>${c.kbd ? `<span class="ckbd">${c.kbd}</span>` : ''}`;
      b.addEventListener('click', () => c.run());
      b.addEventListener('pointermove', () => { if (sel !== i) { sel = i; paintSel(); } });
      cmdList.appendChild(b);
    });
  }
  function paintSel() {
    [...cmdList.querySelectorAll('.cmdk-item')].forEach((el, i) => el.classList.toggle('sel', i === sel));
    const cur = cmdList.querySelectorAll('.cmdk-item')[sel];
    if (cur) cur.scrollIntoView ? cur.scrollIntoView({ block: 'nearest' }) : null;
  }
  function filterCmd(qstr) {
    const s = qstr.trim().toLowerCase();
    filtered = !s ? COMMANDS.slice() : COMMANDS.filter((c) => (c.name + ' ' + (c.sub || '') + ' ' + c.g).toLowerCase().includes(s));
    sel = 0; renderCmd();
  }
  function openCmd() {
    cmdOpen = true; scrim.classList.add('show');
    cmdInput.value = ''; filterCmd(''); sel = 0; renderCmd();
    setTimeout(() => cmdInput.focus(), 60);
    unlock('cmdk');
  }
  window.__openCmdk = openCmd;
  function closeCmd() { cmdOpen = false; scrim.classList.remove('show'); }
  cmdInput.addEventListener('input', () => filterCmd(cmdInput.value));
  scrim.addEventListener('click', (e) => { if (e.target === scrim) closeCmd(); });
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); cmdOpen ? closeCmd() : openCmd(); return; }
    if (!cmdOpen) return;
    if (e.key === 'Escape') { closeCmd(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(filtered.length - 1, sel + 1); paintSel(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); paintSel(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[sel]) filtered[sel].run(); }
  });
  // nav trigger button
  document.querySelectorAll('[data-cmdk-open]').forEach((b) => b.addEventListener('click', openCmd));

  /* ════════ CURSOR TRAIL ════════ */
  if (fine && !reduce) {
    let lastSpawn = 0;
    const cols = ['#6b4eff', '#ff7a45'];
    window.addEventListener('pointermove', (e) => {
      const m = parseFloat(getComputedStyle(root).getPropertyValue('--motion')) || 1;
      if (m <= 0) return;
      const now = performance.now();
      if (now - lastSpawn < 36) return;
      lastSpawn = now;
      const d = document.createElement('span');
      d.className = 'trail-dot';
      const sz = 5 + Math.random() * 4;
      Object.assign(d.style, { left: e.clientX + 'px', top: e.clientY + 'px',
        width: sz + 'px', height: sz + 'px', background: cols[Math.random() > 0.5 ? 0 : 1],
        transform: 'translate(-50%,-50%)' });
      document.body.appendChild(d);
      d.animate([{ opacity: 0.5, transform: 'translate(-50%,-50%) scale(1)' },
        { opacity: 0, transform: `translate(-50%,-50%) scale(0.2) translateY(${6 * m}px)` }],
        { duration: 620, easing: 'ease-out' }).onfinish = () => d.remove();
    }, { passive: true });
  }

  /* ════════ DRAGGABLE HERO STICKERS (spring physics) ════════ */
  if (fine && !reduce) {
    document.querySelectorAll('[data-float]').forEach((el) => {
      let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0; // offset applied
      let vx = 0, vy = 0, raf = 0;
      el.style.pointerEvents = 'auto'; el.style.cursor = 'grab';
      el.style.touchAction = 'none';
      function setOffset() { el.style.setProperty('--dragx', ox.toFixed(1) + 'px'); el.style.setProperty('--dragy', oy.toFixed(1) + 'px'); }
      function spring() {
        ox += vx; oy += vy;
        vx += -ox * 0.12; vy += -oy * 0.12; // pull to origin
        vx *= 0.82; vy *= 0.82;             // damping
        setOffset();
        if (Math.abs(ox) > 0.4 || Math.abs(oy) > 0.4 || Math.abs(vx) > 0.4 || Math.abs(vy) > 0.4) raf = requestAnimationFrame(spring);
        else { ox = oy = vx = vy = 0; setOffset(); raf = 0; }
      }
      el.addEventListener('pointerdown', (e) => {
        dragging = true; el.style.cursor = 'grabbing'; el.style.zIndex = 50;
        sx = e.clientX - ox; sy = e.clientY - oy;
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        el.setPointerCapture(e.pointerId);
        unlock('drag');
      });
      el.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const nx = e.clientX - sx, ny = e.clientY - sy;
        vx = nx - ox; vy = ny - oy; ox = nx; oy = ny; setOffset();
      });
      function release() { if (!dragging) return; dragging = false; el.style.cursor = 'grab'; el.style.zIndex = ''; if (!raf) raf = requestAnimationFrame(spring); }
      el.addEventListener('pointerup', release);
      el.addEventListener('pointercancel', release);
    });
  }

  // console hint
  console.log('%c⌨ psst: press ' + MOD_K + ' for the command palette.', 'font-size:12px;color:#1f9d6b');

  /* ════════ BOOT SEQUENCE ════════ */
  const BOOT_LINES = [
    { t: '<span class="path">$</span> opening arumugamg.com', d: 160 },
    { t: '<span class="ok">[ ok ]</span> loading the <span class="accent">page</span>', d: 90 },
    { t: '<span class="ok">[ ok ]</span> loading projects and skills', d: 95 },
    { t: '<span class="ok">[ ok ]</span> starting the <span class="accent">3D background</span>', d: 95 },
    { t: '<span class="ok">[ ok ]</span> starting the <span class="accent">chat assistant</span>', d: 95 },
    { t: '<span class="accent">ready.</span> welcome — feel free to look around.', d: 140 },
  ];
  function runBoot(el) {
    const lines = $('[data-bootlines]', el);
    const bar = $('[data-bootbar]', el);
    const enter = $('[data-bootenter]', el);
    let i = 0, finished = false, autoT = 0;
    function next() {
      if (i >= BOOT_LINES.length) { ready(); return; }
      const d = document.createElement('div');
      d.className = 'boot-line'; d.innerHTML = BOOT_LINES[i].t;
      lines.appendChild(d);
      bar.style.width = Math.round((i + 1) / BOOT_LINES.length * 100) + '%';
      const delay = BOOT_LINES[i].d || 90;
      i++;
      setTimeout(next, delay + Math.random() * 90);
    }
    function ready() {
      const last = lines.lastElementChild;
      if (last) { const c = document.createElement('span'); c.className = 'boot-cursor'; last.appendChild(c); }
      enter.classList.add('ready');
      enter.addEventListener('click', finish);
      window.addEventListener('keydown', onKey);
      el.addEventListener('pointerdown', finish);
      autoT = setTimeout(finish, 1800);
    }
    function onKey() { finish(); }
    function finish() {
      if (finished) return; finished = true;
      clearTimeout(autoT);
      window.removeEventListener('keydown', onKey);
      el.classList.add('gone');
      try { sessionStorage.setItem('ag-booted', '1'); } catch (e) {}
      setTimeout(() => el.remove(), 650);
      window.scrollTo(0, 0);
      unlock('boot');
    }
    next();
  }
  const bootEl = $('[data-boot]');
  if (bootEl) {
    if (root.classList.contains('skip-boot')) { bootEl.remove(); unlock('boot'); }
    else runBoot(bootEl);
  }
})();

/* ════════════════════════════════════════════════════════════════
   TRENDZ CREATIVE FLOW — hero color-wash scroll driver.
   Warms the hero gradient as you scroll into/through it.
   Isolated IIFE; reads scrollY, writes --hw on the wash element.
   ════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';
  const wash = document.querySelector('.hero-wash');
  const hero = document.querySelector('#hero');
  if (!wash || !hero) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { wash.style.setProperty('--hw', '0.25'); return; }
  let ticking = false;
  function update() {
    ticking = false;
    const h = hero.offsetHeight || innerHeight;
    // progress 0 at top, ~1 by the time the hero has scrolled away
    const p = Math.max(0, Math.min(1, scrollY / (h * 0.85)));
    wash.style.setProperty('--hw', p.toFixed(3));
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
})();

/* ════════════════════════════════════════════════════════════════
   SITE COPILOT — window.AGENT control surface + local-Ollama agentic
   chat that drives this page. Self-contained IIFE. Privacy-first:
   inference runs on a LOCAL Ollama model; nothing leaves the machine.
   ════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';
  const root = document.documentElement;
  const THEMES = ['cream', 'midnight', 'mono'];
  const SECTION_IDS = ['hero', 'about', 'skills', 'work', 'path', 'contact'];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const egg = (m) => (window.__egg || (() => {}))(m);
  const sectionTop = (id) => id === 'hero' ? 0 : (((document.getElementById(id) || {}).offsetTop) || 0) - 10;
  let _scrollRAF = 0;
  function jumpScroll(toY) {
    // force a real instant jump: plain scrollTo(0,y) obeys CSS scroll-behavior
    // smooth, whose animation is paused in hidden tabs (would silently no-op)
    try { window.scrollTo({ top: toY, behavior: 'instant' }); }
    catch (e) { window.scrollTo(0, toY); }
  }
  function tweenScroll(toY) {
    toY = clamp(toY, 0, document.body.scrollHeight - innerHeight);
    // hidden tabs pause rAF — jump instantly so agent actions still land
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || document.hidden) { jumpScroll(toY); return; }
    const fromY = window.scrollY, dist = toY - fromY;
    if (Math.abs(dist) < 2) { jumpScroll(toY); return; }
    const dur = Math.min(720, 240 + Math.abs(dist) * 0.22), t0 = performance.now();
    if (_scrollRAF) cancelAnimationFrame(_scrollRAF);
    const prev = root.style.scrollBehavior; root.style.scrollBehavior = 'auto';
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      window.scrollTo(0, fromY + dist * e);
      if (p < 1) _scrollRAF = requestAnimationFrame(step);
      else { _scrollRAF = 0; root.style.scrollBehavior = prev; }
    };
    _scrollRAF = requestAnimationFrame(step);
  }
  function centerTween(el) {
    const r = el.getBoundingClientRect();
    tweenScroll(window.scrollY + r.top - (innerHeight - Math.min(r.height, innerHeight)) / 2);
  }

  /* ──────────── guide cursor — a visible pointer the copilot moves like a hand.
     It glides toward its target every frame (so it keeps tracking while the page
     scrolls), pulses a ring on "click", and fades out after a moment of rest. ── */
  const CURSOR = (() => {
    let el = null, labelEl = null, raf = 0, hideTimer = 0;
    let cx = 0, cy = 0, getPoint = null, settle = 0, onArrive = null;
    const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
    function ensure() {
      if (el) return;
      el = document.createElement('div');
      el.className = 'agent-cursor';
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = '<span class="agent-cursor-ring"></span>' +
        '<svg class="agent-cursor-arrow" viewBox="0 0 24 24"><path d="M4.5 2.8 20 12l-7.1 1.5L9 20.6z"/></svg>' +
        '<span class="agent-cursor-label">copilot</span>';
      document.body.appendChild(el);
      labelEl = el.querySelector('.agent-cursor-label');
      cx = innerWidth - 96; cy = innerHeight - 110;
      place();
    }
    function place() { el.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)'; }
    function arrive(t) {
      cx = t.x; cy = t.y; place();
      getPoint = null; const cb = onArrive; onArrive = null; cb && cb();
    }
    function step() {
      raf = 0;
      if (!getPoint) return;
      const t = getPoint();
      if (document.hidden) { arrive(t); return; } // rAF pauses in hidden tabs — snap, don't stall
      const dx = t.x - cx, dy = t.y - cy;
      cx += dx * 0.16; cy += dy * 0.16;
      place();
      settle = (Math.abs(dx) < 2 && Math.abs(dy) < 2) ? settle + 1 : 0;
      if (settle >= 4) arrive(t);
      else raf = requestAnimationFrame(step);
    }
    function show(label) {
      ensure();
      if (label) labelEl.textContent = label;
      el.classList.add('show');
      clearTimeout(hideTimer);
    }
    function rest() { clearTimeout(hideTimer); hideTimer = setTimeout(() => { if (el) el.classList.remove('show'); }, 2600); }
    function pulse() { if (!el) return; el.classList.remove('click'); void el.offsetWidth; el.classList.add('click'); }
    /* point at an element (keeps tracking it while the page scrolls), then run opts.then */
    function pointAt(target, opts) {
      opts = opts || {};
      const node = typeof target === 'string' ? document.querySelector(target) : target;
      if (!node) { opts.then && opts.then(); return; }
      ensure();
      const aim = () => {
        const r = node.getBoundingClientRect();
        return { x: clamp(r.left + r.width * (opts.ax != null ? opts.ax : 0.5), 12, innerWidth - 34),
                 y: clamp(r.top + r.height * (opts.ay != null ? opts.ay : 0.55), 12, innerHeight - 34) };
      };
      if (reduced() || document.hidden) {
        const p = aim(); cx = p.x; cy = p.y; place();
        show(opts.label); if (opts.click) pulse(); opts.then && opts.then(); rest();
        return;
      }
      show(opts.label);
      getPoint = aim; settle = 0;
      let fired = false;
      const fire = () => { if (fired) return; fired = true; clearTimeout(watchdog); if (opts.click) pulse(); opts.then && opts.then(); rest(); };
      // Watchdog: if a frame never comes (tab hidden mid-flight, throttling),
      // finish anyway so tool calls awaiting the cursor can never hang.
      const watchdog = setTimeout(() => { const p = aim(); cx = p.x; cy = p.y; place(); getPoint = null; onArrive = null; fire(); }, 2500);
      onArrive = fire;
      if (!raf) raf = requestAnimationFrame(step);
    }
    return { pointAt, pulse, rest };
  })();

  /* ──────────── window.AGENT — DOM-driven control surface ──────────── */
  const AGENT = {
    listSections() {
      return SECTION_IDS.filter((id) => document.getElementById(id)).map((id) => ({
        id, label: document.getElementById(id).getAttribute('data-screen-label') || id,
      }));
    },
    getState() {
      const y = scrollY;
      let current = 'hero';
      for (const { id } of this.listSections()) if (sectionTop(id) <= y + 140) current = id;
      return { ok: true, currentSection: current, scrollY: y,
        theme: root.getAttribute('data-theme') || 'cream', sections: this.listSections().map((s) => s.id) };
    },
    goToSection(id) {
      const sec = document.getElementById(id);
      if (!sec) return { ok: false, error: 'unknown section: ' + id };
      tweenScroll(sectionTop(id));
      CURSOR.pointAt(sec.querySelector('h1, h2, .sec-head') || sec, { label: 'here', ay: 0.35 });
      return { ok: true, scrolledTo: id };
    },
    scrollBy(px) { tweenScroll(window.scrollY + (Number(px) || 0)); return { ok: true }; },
    scrollTo(px) { tweenScroll(Number(px) || 0); return { ok: true }; },
    clickText(text) {
      const t = String(text || '').toLowerCase().trim();
      if (!t) return { ok: false, error: 'empty query' };
      const cands = [...document.querySelectorAll('a, button, [data-hot], [data-resume], [data-copy]')];
      const hit = cands.find((el) => (el.textContent || '').toLowerCase().includes(t));
      if (!hit) return { ok: false, error: 'no clickable element matches: ' + text };
      centerTween(hit);
      CURSOR.pointAt(hit, { label: 'clicking', click: true, then: () => hit.click() });
      return { ok: true, clicked: (hit.textContent || '').trim().slice(0, 60) };
    },
    selectText(text) {
      const t = String(text || '').toLowerCase().trim();
      if (!t) return { ok: false, error: 'empty query' };
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walk.nextNode())) {
        const i = node.textContent.toLowerCase().indexOf(t);
        if (i !== -1) {
          const r = document.createRange();
          r.setStart(node, i); r.setEnd(node, i + t.length);
          const s = getSelection(); s.removeAllRanges(); s.addRange(r);
          if (node.parentElement) centerTween(node.parentElement);
          return { ok: true, selected: text };
        }
      }
      return { ok: false, error: 'text not found on page' };
    },
    highlight(target) {
      const el = document.getElementById(target) || document.querySelector(target);
      if (!el) return { ok: false, error: 'nothing to highlight: ' + target };
      centerTween(el);
      CURSOR.pointAt(el, { label: 'look here', ay: 0.3 });
      el.style.transition = 'outline-color .3s, box-shadow .3s';
      el.style.outline = '2px solid var(--violet)';
      el.style.boxShadow = '0 0 0 6px color-mix(in oklab, var(--violet) 22%, transparent)';
      setTimeout(() => { el.style.outline = ''; el.style.boxShadow = ''; }, 2400);
      return { ok: true, highlighted: el.id || target };
    },
    switchTheme(name) {
      const next = THEMES.includes(name) ? name
        : THEMES[(THEMES.indexOf(root.getAttribute('data-theme') || 'cream') + 1) % THEMES.length];
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('ws-theme', next); } catch (e) {}
      window.dispatchEvent(new CustomEvent('ws-theme', { detail: next }));
      egg('theme → ' + next);
      CURSOR.pointAt(document.querySelector('[data-toggle-theme]'), { label: 'theme → ' + next, click: true });
      return { ok: true, theme: next };
    },
    runCommand(name) {
      const n = String(name || '').toLowerCase().trim();
      const self = this;
      const map = {
        copy_email:      () => { const b = document.querySelector('[data-copy]');
          if (!b) { egg('email copied ✶'); return; }
          centerTween(b); CURSOR.pointAt(b, { label: 'copying email', click: true, then: () => b.click() }); },
        download_resume: () => { const b = document.querySelector('[data-resume]');
          if (b) { centerTween(b); CURSOR.pointAt(b, { label: 'resume', click: true, then: () => b.click() }); } },
        open_github:     () => window.open('https://github.com/arumugamtvm', '_blank', 'noopener'),
        confetti:        () => (window.__confetti || (() => {}))(),
        cycle_theme:     () => self.switchTheme(),
        scroll_top:      () => window.scrollTo({ top: 0, behavior: 'smooth' }),
        open_palette:    () => (window.__openCmdk || (() => {}))(),
      };
      const fn = map[n];
      if (!fn) return { ok: false, error: 'unknown command: ' + name };
      fn();
      return { ok: true, ran: n };
    },
    /* Pre-fill the contact form for the user (drafted message, optional name/email).
       Deliberately never submits — the user reviews and presses Send themselves. */
    async fillContact(fields) {
      fields = fields || {};
      const form = document.querySelector('[data-contact-form]');
      if (!form) return { ok: false, error: 'contact form not found' };
      tweenScroll(sectionTop('contact'));
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const typeInto = (input, val) => new Promise((res) => {
        CURSOR.pointAt(input, { label: 'writing for you', click: true, then: () => {
          input.focus();
          const max = input.maxLength > 0 ? input.maxLength : 2000;
          const s = String(val).trim().slice(0, max);
          const finish = () => { input.value = s; input.dispatchEvent(new Event('input', { bubbles: true })); res(); };
          if (reduced || document.hidden) { finish(); return; }
          input.value = '';
          let i = 0;
          const t0 = Date.now();
          const chunk = Math.max(1, Math.round(s.length / 50)), stepMs = Math.max(8, Math.min(26, 1100 / s.length));
          const t = setInterval(() => {
            // never let the typewriter stall the agent (hidden tabs clamp timers)
            if (document.hidden || Date.now() - t0 > 3000) { clearInterval(t); finish(); return; }
            i += chunk;
            input.value = s.slice(0, i);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            if (i >= s.length) { clearInterval(t); res(); }
          }, stepMs);
        } });
      });
      const plan = [
        ['name', form.querySelector('[data-cf-name]'), fields.name],
        ['email', form.querySelector('[data-cf-email]'), fields.email],
        ['message', form.querySelector('[data-cf-message]'), fields.message],
      ];
      const filled = [];
      for (const [key, input, val] of plan) {
        if (!input || typeof val !== 'string' || !val.trim()) continue;
        await typeInto(input, val);
        filled.push(key);
      }
      const empty = plan.find(([k, input]) => input && !input.value.trim());
      const next = empty ? empty[1] : form.querySelector('[data-cf-send]');
      if (next) CURSOR.pointAt(next, { label: empty ? 'your turn — fill this' : 'press Send when ready', then: () => { if (empty) next.focus(); } });
      return { ok: true, filled, userMustSend: true,
        note: filled.length ? 'Draft is in the form. The user must review it and press Send — you cannot send it.'
                            : 'Form opened; nothing was pre-filled.' };
    },
  };
  window.AGENT = AGENT;

  /* ──────────── chat backends: Gemini via Worker (default) + Ollama (local) ──────────── */
  const CFG = {
    provider:    (() => { try { return localStorage.getItem('ws-agent-provider')    || 'openrouter'; } catch (e) { return 'openrouter'; } })(),
    workerUrl:   (() => { try { return localStorage.getItem('ws-agent-worker-url')  || 'https://arumugamg-copilot.test-dev-user-606.workers.dev'; } catch (e) { return 'https://arumugamg-copilot.test-dev-user-606.workers.dev'; } })(),
    endpoint:    (() => { try { return localStorage.getItem('ws-agent-endpoint')    || 'http://localhost:11434'; } catch (e) { return 'http://localhost:11434'; } })(),
    model:       (() => { try { return localStorage.getItem('ws-agent-model')        || 'qwen3-coder:30b'; } catch (e) { return 'qwen3-coder:30b'; } })(),
    geminiModel: (() => { try { return localStorage.getItem('ws-agent-gemini-model') || 'gemini-2.5-flash-lite'; } catch (e) { return 'gemini-2.5-flash-lite'; } })(),
    orModel:     (() => { try { return localStorage.getItem('ws-agent-or-model')     || 'google/gemma-4-31b-it:free'; } catch (e) { return 'google/gemma-4-31b-it:free'; } })(),
  };
  const KEEP_ALIVE = '30m';
  const base = () => CFG.endpoint.replace(/\/$/, '');
  const workerBase = () => CFG.workerUrl.replace(/\/$/, '');

  async function* readNDJSON(response) {
    const reader = response.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (line) yield JSON.parse(line);
        }
      }
      const tail = (buf + dec.decode()).trim();
      if (tail) yield JSON.parse(tail);
    } finally { try { reader.releaseLock(); } catch (e) {} }
  }

  /* ──────────── Gemini client (browser → Cloudflare Worker → Gemini SSE) ──────────── */
  async function* readSSEJSON(response) {
    const reader = response.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let lf;
        while ((lf = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, lf).trim();
          buf = buf.slice(lf + 1);
          if (line.startsWith('data:')) {
            const payload = line.slice(5).trim();
            if (payload && payload !== '[DONE]') { try { yield JSON.parse(payload); } catch (e) {} }
          }
        }
      }
      const tail = (buf + dec.decode()).trim();
      if (tail.startsWith('data:')) { const p = tail.slice(5).trim(); if (p && p !== '[DONE]') { try { yield JSON.parse(p); } catch (e) {} } }
    } finally { try { reader.releaseLock(); } catch (e) {} }
  }
  // internal messages → Gemini `contents`. CRITICAL: assistant → model role.
  function toGeminiContents(messages) {
    const contents = [];
    for (const msg of messages) {
      if (msg.role === 'system') continue; // lifted to systemInstruction
      if (msg.role === 'user' || msg.role === 'assistant' || msg.role === 'model') {
        const role = msg.role === 'user' ? 'user' : 'model';
        const parts = [];
        if (msg.content) parts.push({ text: msg.content });
        if (msg.tool_calls && msg.tool_calls.length) {
          for (const call of msg.tool_calls) {
            const fc = { name: call.function.name, args: call.function.arguments || {} };
            if (call.id) fc.id = call.id;
            parts.push({ functionCall: fc });
          }
        }
        if (parts.length) contents.push({ role, parts });
      } else if (msg.role === 'tool') {
        let resp; try { resp = JSON.parse(msg.content); } catch (e) { resp = { result: String(msg.content) }; }
        if (resp === null || typeof resp !== 'object') resp = { result: resp };
        const last = contents[contents.length - 1];
        const part = { functionResponse: { name: msg.tool_name, response: resp } };
        if (last && last.role === 'user' && last.parts.some((p) => p.functionResponse)) last.parts.push(part);
        else contents.push({ role: 'user', parts: [part] });
      }
    }
    return contents;
  }
  function toGeminiTools(tools) {
    if (!tools || !tools.length) return undefined;
    return [{ functionDeclarations: tools.map((t) => ({
      name: t.function.name, description: t.function.description, parameters: t.function.parameters,
    })) }];
  }
  async function geminiChat(messages, tools, { onToken, signal } = {}) {
    const systemPrompt = (messages.find((m) => m.role === 'system') || {}).content || '';
    const gtools = toGeminiTools(tools);
    const body = {
      model: CFG.geminiModel,
      contents: toGeminiContents(messages),
      ...(systemPrompt ? { systemInstruction: { parts: [{ text: systemPrompt }] } } : {}),
      ...(gtools ? { tools: gtools } : {}),
      generationConfig: { temperature: 0.4 }, // Worker forces maxOutputTokens
    };
    const res = await fetch(workerBase() + '/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let info = {}; try { info = await res.json(); } catch (e) {}
      const ec = (info.error && info.error.code) || ('http_' + res.status);
      const em = (info.error && info.error.message) || ('Worker error ' + res.status);
      const err = new Error(em); err.workerCode = ec; err.status = res.status; throw err;
    }
    let content = '', toolCalls = [];
    for await (const chunk of readSSEJSON(res)) {
      const cand = chunk.candidates && chunk.candidates[0];
      const parts = cand && cand.content && cand.content.parts;
      if (!parts) continue;
      for (const part of parts) {
        if (part.text) { content += part.text; onToken && onToken(part.text); }
        if (part.functionCall) {
          toolCalls.push({ id: part.functionCall.id || '', function: {
            name: part.functionCall.name, arguments: part.functionCall.args || {} } });
        }
      }
    }
    return { role: 'assistant', content, tool_calls: toolCalls };
  }

  /* ──────────── OpenRouter client (browser → Worker → OpenRouter, OpenAI-compatible SSE) ──────────── */
  function toOpenAIMessages(messages) {
    return messages.map((m) => {
      if (m.role === 'tool') {
        return { role: 'tool', tool_call_id: m.tool_call_id || m.tool_name || 'call', content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) };
      }
      if (m.role === 'assistant' && m.tool_calls && m.tool_calls.length) {
        return { role: 'assistant', content: m.content || '', tool_calls: m.tool_calls.map((c, i) => ({
          id: c.id || ('call_' + i), type: 'function',
          function: { name: c.function.name, arguments: typeof c.function.arguments === 'string' ? c.function.arguments : JSON.stringify(c.function.arguments || {}) } })) };
      }
      return { role: m.role === 'model' ? 'assistant' : m.role, content: m.content || '' };
    });
  }
  async function openrouterChat(messages, tools, { onToken, signal } = {}) {
    const res = await fetch(workerBase() + '/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
      body: JSON.stringify({ provider: 'openrouter', model: CFG.orModel, messages: toOpenAIMessages(messages),
        ...(tools && tools.length ? { tools } : {}), stream: true, generationConfig: { temperature: 0.4 } }),
    });
    if (!res.ok) {
      let info = {}; try { info = await res.json(); } catch (e) {}
      const err = new Error((info.error && info.error.message) || ('Worker error ' + res.status));
      err.workerCode = (info.error && info.error.code) || ('http_' + res.status); err.status = res.status; throw err;
    }
    let content = ''; const acc = {};
    for await (const chunk of readSSEJSON(res)) {
      const choice = chunk.choices && chunk.choices[0];
      const delta = choice && choice.delta;
      if (!delta) continue;
      if (delta.content) { content += delta.content; onToken && onToken(delta.content); }
      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const i = tc.index != null ? tc.index : 0;
          const a = acc[i] || (acc[i] = { id: '', name: '', args: '' });
          if (tc.id) a.id = tc.id;
          if (tc.function) { if (tc.function.name) a.name = tc.function.name; if (tc.function.arguments) a.args += tc.function.arguments; }
        }
      }
    }
    const toolCalls = Object.keys(acc).map((k) => { const a = acc[k]; let args = {};
      try { args = a.args ? JSON.parse(a.args) : {}; } catch (e) { args = {}; }
      return { id: a.id || ('call_' + k), function: { name: a.name, arguments: args } }; }).filter((c) => c.function.name);
    return { role: 'assistant', content, tool_calls: toolCalls };
  }

  async function ollamaChat(messages, tools, { onToken, signal } = {}) {
    const res = await fetch(base() + '/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
      body: JSON.stringify({ model: CFG.model, messages,
        ...(tools && tools.length ? { tools } : {}),
        stream: true, keep_alive: KEEP_ALIVE, options: { temperature: 0.4 } }),
    });
    if (!res.ok) throw new Error('Ollama /api/chat ' + res.status);
    let content = '', toolCalls = [], role = 'assistant';
    for await (const chunk of readNDJSON(res)) {
      const m = chunk.message;
      if (m) {
        if (m.role) role = m.role;
        if (m.content) { content += m.content; onToken && onToken(m.content); }
        if (m.tool_calls && m.tool_calls.length) toolCalls = toolCalls.concat(m.tool_calls);
      }
      if (chunk.done) break;
    }
    return { role, content, tool_calls: toolCalls };
  }

  async function listModels(signal) {
    const res = await fetch(base() + '/api/tags', { signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('/api/tags ' + res.status);
    const data = await res.json();
    return (data.models || []).map((m) => ({
      name: m.name,
      tools: Array.isArray(m.capabilities) ? m.capabilities.includes('tools') : undefined,
      size: m.details && m.details.parameter_size,
    }));
  }
  function warmPing() {
    fetch(base() + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: CFG.model, messages: [{ role: 'user', content: 'hi' }],
        stream: false, keep_alive: KEEP_ALIVE, options: { num_predict: 1 } }) }).catch(() => {});
  }
  async function probe() {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    try {
      if (CFG.provider !== 'ollama') {
        const res = await fetch(workerBase() + '/', { signal: ctrl.signal, headers: { Accept: 'application/json' } });
        clearTimeout(timer);
        return res.ok ? { ok: true, models: [] } : { ok: false, reason: 'http-' + res.status };
      }
      const res = await fetch(base() + '/api/tags', { signal: ctrl.signal, headers: { Accept: 'application/json' } });
      clearTimeout(timer);
      if (!res.ok) return { ok: false, reason: 'http-' + res.status };
      const data = await res.json();
      return { ok: true, models: Array.isArray(data.models) ? data.models : [] };
    } catch (e) { clearTimeout(timer); return { ok: false, reason: e.name === 'AbortError' ? 'timeout' : 'unreachable' }; }
  }

  /* ──────────── tools + safe dispatcher + grounded prompt ──────────── */
  const AGENT_TOOLS = [
    { type:'function', function:{ name:'go_to_section', description:'Smooth-scroll the page to a named section. Map "projects"/"portfolio" to "work".',
      parameters:{ type:'object', properties:{ id:{ type:'string', enum:SECTION_IDS } }, required:['id'] } } },
    { type:'function', function:{ name:'switch_theme', description:'Set the visual theme.',
      parameters:{ type:'object', properties:{ theme:{ type:'string', enum:THEMES } }, required:['theme'] } } },
    { type:'function', function:{ name:'click_text', description:'Click the on-page link or button whose visible text matches the query.',
      parameters:{ type:'object', properties:{ text:{ type:'string' } }, required:['text'] } } },
    { type:'function', function:{ name:'highlight', description:'Visually outline a section (by id) to draw attention.',
      parameters:{ type:'object', properties:{ target:{ type:'string', enum:SECTION_IDS } }, required:['target'] } } },
    { type:'function', function:{ name:'run_command', description:'Run a site command.',
      parameters:{ type:'object', properties:{ command:{ type:'string', enum:['copy_email','download_resume','open_github','confetti','cycle_theme','scroll_top','open_palette'] } }, required:['command'] } } },
    { type:'function', function:{ name:'get_state', description:'Read the current section, scroll position, and theme.', parameters:{ type:'object', properties:{} } } },
    { type:'function', function:{ name:'list_sections', description:'List the sections available on the page.', parameters:{ type:'object', properties:{} } } },
    { type:'function', function:{ name:'present_options', description:'Show the user clickable choice buttons when they should pick one option (e.g. a theme: cream, midnight, mono; or a page). Use this instead of asking them to type the choice. This must be your ONLY tool call that turn — show the buttons, then wait for their tap.',
      parameters:{ type:'object', properties:{ question:{ type:'string', description:'Short question shown above the buttons (optional).' }, options:{ type:'array', items:{ type:'string' }, description:'The choices; each becomes a clickable button.' } }, required:['options'] } } },
    { type:'function', function:{ name:'fill_contact_form', description:'Open the contact form and pre-fill it for the user. Use when they want to write, send, or draft an email/message to Arumugam: write a short, polite message from what they said and pass it as "message". Include their name/email only if they told you. The form is NOT sent — the user reviews the draft and presses Send themselves.',
      parameters:{ type:'object', properties:{ name:{ type:'string', description:'sender name, only if the user gave it' }, email:{ type:'string', description:'sender email, only if the user gave it' }, message:{ type:'string', description:'the drafted message, plain friendly English' } }, required:['message'] } } },
  ];
  function dispatchTool(name, args) {
    const A = window.AGENT;
    if (!A) return { ok: false, error: 'AGENT not ready' };
    try {
      switch (name) {
        case 'go_to_section': return A.goToSection(String(args.id || ''));
        case 'switch_theme':  return A.switchTheme(String(args.theme || ''));
        case 'click_text':    return A.clickText(String(args.text || ''));
        case 'highlight':     return A.highlight(String(args.target || ''));
        case 'run_command':   return A.runCommand(String(args.command || ''));
        case 'get_state':     return A.getState();
        case 'list_sections': return { ok: true, sections: A.listSections() };
        case 'present_options': return renderChoices(args.question, args.options);
        case 'fill_contact_form': return A.fillContact({ name: args.name, email: args.email, message: args.message });
        default:              return { ok: false, error: 'unknown tool: ' + name };
      }
    } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
  }
  function chipLabel(name, args, r) {
    if (!r || !r.ok) return { cls: 'fail', text: (r && r.error) || ('couldn’t run ' + name) };
    switch (name) {
      case 'go_to_section': return { cls: 'ok', text: 'scrolled to ' + r.scrolledTo };
      case 'switch_theme':  return { cls: 'ok', text: 'theme → ' + r.theme };
      case 'click_text':    return { cls: 'ok', text: 'clicked “' + r.clicked + '”' };
      case 'highlight':     return { cls: 'ok', text: 'highlighted ' + r.highlighted };
      case 'run_command':   return { cls: 'ok', text: 'ran: ' + r.ran };
      case 'fill_contact_form': return { cls: 'ok', text: (r.filled && r.filled.length) ? 'drafted it in the form — review & press Send' : 'opened the contact form' };
      default:              return null;
    }
  }

  let PROFILE = null;
  const FALLBACK_PROFILE = { name:'Arumugam G', title:'Software Engineer', location:'Thiruvananthapuram, India',
    email:'garumugamtvm@gmail.com', github:'https://github.com/arumugamtvm',
    skills:['JavaScript','TypeScript','C#','Dart','Node.js','React','HTML/CSS','Three.js / WebGL','Git','REST APIs','Model Context Protocol (MCP)'], projects:[] };
  async function loadProfile() {
    if (PROFILE) return PROFILE;
    try { const r = await fetch('profile.json', { headers: { Accept: 'application/json' } });
      if (r.ok) { PROFILE = await r.json(); return PROFILE; } } catch (e) {}
    PROFILE = FALLBACK_PROFILE; return PROFILE;
  }
  function buildSystemPrompt() {
    const p = PROFILE || FALLBACK_PROFILE;
    const projects = (p.projects || []).map((x) => '- ' + x.name + ': ' + x.description).join('\n') || '(see the Work section)';
    return [
      'You are the guide on ' + p.name + '’s portfolio website (' + p.title + (p.location ? ', ' + p.location : '') + ').',
      'Every turn, do two things: (1) reply in the chat, and (2) when the person wants to move, see, or change something on the page, call exactly one tool to do it.',
      '',
      'Pages on this site: hero, about, skills, work, path, contact. Themes: cream, midnight, mono.',
      'If they say "projects" or "portfolio", that is the "work" page — use go_to_section with id "work". "experience" or "journey" means "path". "contact" or "hire" means "contact".',
      'Call a tool when they ask to go somewhere, scroll, change theme, highlight a part, copy the email, get the resume, or open GitHub. Otherwise just reply with words. Use one tool, then say what you did in one short, friendly sentence.',
      'Only the listed tools exist — never make up a tool name.',
      'A small pointer moves on the page when you act — it shows the person where to look. So prefer doing the thing over describing it.',
      'If they want to write, send, or draft an email or message to ' + p.name + ': call fill_contact_form. Write a short, polite message from what they told you and pass it as "message" (add their name/email only if they gave them). Then tell them to check the draft and press Send. You can never send it yourself.',
      'Ask OR act — never both in one turn. When the user should pick from a few options (like a theme or a page), call present_options ALONE and stop; wait for their tap. Never ask "which would you prefer?" in plain text, and never act before they answer.',
      'You may use light Markdown in replies: **bold**, bullet lists with -, and [links](https://...). Keep replies short.',
      '',
      'Write in clear, simple English. Be warm, short, and professional — 1 to 3 short sentences. No headings, no heavy jargon. Speak as the site ("I can show you..."), not as ' + p.name + '.',
      'Only use the facts below to answer about ' + p.name + '. If you do not know something, say so and offer to take them to the contact page. Never make up jobs, dates, or numbers.',
      '',
      'ABOUT: ' + (p.summary || ''),
      'SKILLS: ' + (p.skills || []).join(', '),
      'PROJECTS:\n' + projects,
      'CONTACT: ' + (p.email || (p.contact && p.contact.email)) + ' · ' + p.github,
    ].join('\n');
  }

  /* ──────────── agentic loop (provider-agnostic) ──────────── */
  const MAX_HOPS = 3; // each hop is a separate billable Gemini call (counts against RPD + RPM)
  function modelChat(messages, tools, opts) {
    return CFG.provider === 'openrouter' ? openrouterChat(messages, tools, opts)
         : CFG.provider === 'gemini' ? geminiChat(messages, tools, opts)
         : ollamaChat(messages, tools, opts);
  }
  async function agenticChat(userText, history, { onToken, onStatus, onTool, signal, useTools } = {}) {
    const messages = [{ role: 'system', content: buildSystemPrompt() }, ...history, { role: 'user', content: userText }];
    for (let hop = 0; hop < MAX_HOPS; hop++) {
      const turn = await modelChat(messages, useTools ? AGENT_TOOLS : null, { onToken, signal });
      messages.push({ role: 'assistant', content: turn.content, ...(turn.tool_calls.length ? { tool_calls: turn.tool_calls } : {}) });
      if (!turn.tool_calls.length) return { final: turn.content, messages };
      // Ask OR act, never both: if the model shows choice buttons, that ends the
      // turn — any other tool calls bundled with it are dropped, and we wait for
      // the user's tap instead of letting the model act on an unanswered question.
      const optCall = turn.tool_calls.find((c) => c.function.name === 'present_options');
      const calls = optCall ? [optCall] : turn.tool_calls;
      for (const call of calls) {
        const fnName = call.function.name;
        const args = call.function.arguments || {};
        onStatus && onStatus('running ' + fnName + '…');
        let result;
        try { result = await Promise.resolve(dispatchTool(fnName, args)); }
        catch (e) { result = { ok: false, error: String((e && e.message) || e) }; }
        onTool && onTool(fnName, args, result);
        messages.push({ role: 'tool', tool_name: fnName, tool_call_id: call.id, content: JSON.stringify(result) });
      }
      if (optCall) return { final: turn.content, messages };
    }
    return { final: 'I tried a few steps but couldn’t finish — try rephrasing?', messages };
  }

  /* ──────────── chat UI controller ──────────── */
  const PANEL_HTML =
    '<header class="agent-head">' +
      '<span class="agent-id"><span class="agent-id-glyph" aria-hidden="true">✦</span>' +
        '<span class="agent-id-name">site&nbsp;<b>copilot</b></span></span>' +
      '<span id="agent-sub" class="agent-sub" data-agent-sub-text>ask me anything · I can move the page</span>' +
      '<button class="agent-icon-btn" data-agent-settings aria-label="Settings" aria-expanded="false">⚙</button>' +
      '<button class="agent-icon-btn" data-agent-close aria-label="Close assistant"><span class="agent-esc">esc</span></button>' +
    '</header>' +
    '<div class="agent-settings" data-agent-settings-panel hidden>' +
      '<label class="agent-field"><span>assistant</span>' +
        '<select class="agent-input-mono" data-agent-provider>' +
          '<option value="openrouter">Online (OpenRouter · Gemma)</option>' +
          '<option value="gemini">Online (Gemini)</option>' +
          '<option value="ollama">On your computer (Ollama)</option>' +
        '</select></label>' +
      '<label class="agent-field" data-agent-gemini-section><span>backend url</span>' +
        '<input class="agent-input-mono" data-agent-worker-url type="url" spellcheck="false" autocapitalize="off" /></label>' +
      '<label class="agent-field" data-agent-ollama-section hidden><span>endpoint</span>' +
        '<input class="agent-input-mono" data-agent-endpoint type="url" spellcheck="false" autocapitalize="off" /></label>' +
      '<label class="agent-field" data-agent-ollama-section hidden><span>model</span>' +
        '<select class="agent-input-mono" data-agent-model aria-describedby="agent-model-note"></select></label>' +
      '<p id="agent-model-note" class="agent-note" data-agent-model-note></p>' +
    '</div>' +
    '<div class="agent-log" data-agent-log role="log" aria-label="Conversation">' +
      '<div class="agent-welcome" data-agent-welcome>' +
        '<p>Ask about Arumugam’s work, or tell me where to go — I can scroll the page and open things for you.</p>' +
        '<div class="agent-chips" role="group" aria-label="Suggested prompts">' +
          '<button class="agent-chip" data-agent-suggest>Show me your projects</button>' +
          '<button class="agent-chip" data-agent-suggest>What can you build?</button>' +
          '<button class="agent-chip" data-agent-suggest>Switch to midnight theme</button>' +
          '<button class="agent-chip" data-agent-suggest>How do I reach you?</button>' +
          '<button class="agent-chip" data-agent-suggest>Write a message for me</button>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<p class="agent-sr-live" data-agent-live aria-live="polite" aria-atomic="true"></p>' +
    '<form class="agent-compose" data-agent-form>' +
      '<textarea class="agent-textarea" data-agent-input rows="1" placeholder="Message the site…" aria-label="Message" enterkeyhint="send"></textarea>' +
      '<button type="submit" class="agent-send" data-agent-send aria-label="Send">↩</button>' +
      '<button type="button" class="agent-stop" data-agent-stop aria-label="Stop generating" hidden>■</button>' +
    '</form>' +
    '<footer class="agent-status" data-agent-status>' +
      '<span class="db-dot" data-agent-dot aria-hidden="true"></span>' +
      '<span class="agent-status-net" data-agent-net>checking…</span>' +
      '<span class="db-sep" aria-hidden="true"></span>' +
      '<span class="agent-status-model" data-agent-status-model></span>' +
      '<span class="agent-status-spacer"></span>' +
      '<span class="agent-status-meta" data-agent-meta></span>' +
    '</footer>';

  let panel = null, chatOpen = false, online = false, busy = false, ctrl = null;
  let history = [];
  const $ = (s) => panel.querySelector(s);
  const launcher = () => document.querySelector('[data-open-chat]');

  /* ── safe markdown (escape first, then inline) + clickable choices ── */
  function escHtml(x){ return String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function inlineMd(x){
    return x
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }
  function mdToHtml(src){
    const lines = escHtml(src).split('\n');
    let html = '', list = [], para = [];
    const flushList = () => { if (list.length){ html += '<ul>' + list.map((x)=>'<li>'+inlineMd(x)+'</li>').join('') + '</ul>'; list = []; } };
    const flushPara = () => { if (para.length){ html += '<p>' + para.map(inlineMd).join('<br>') + '</p>'; para = []; } };
    for (const ln of lines){
      const li = ln.match(/^\s*[-*]\s+(.+)/);
      if (li){ flushPara(); list.push(li[1]); }
      else if (ln.trim() === ''){ flushList(); flushPara(); }
      else { flushList(); para.push(ln); }
    }
    flushList(); flushPara();
    return html || escHtml(src);
  }
  function renderChoices(question, options){
    options = Array.isArray(options) ? options.filter((o)=>typeof o==='string'&&o.trim()).slice(0,12) : [];
    if (!options.length) return { ok:false, error:'no options' };
    const wrap = document.createElement('div'); wrap.className = 'agent-choices';
    if (question){ const q=document.createElement('p'); q.className='agent-choices-q'; q.textContent=question; wrap.appendChild(q); }
    const pick = (val)=>{ if (wrap.dataset.done) return; wrap.dataset.done='1'; wrap.classList.add('chosen'); send(val); };
    const row = document.createElement('div'); row.className='agent-choices-row';
    if (options.length > 5){
      const sel=document.createElement('select'); sel.className='agent-input-mono agent-choices-select';
      options.forEach((o)=>{ const op=document.createElement('option'); op.value=o; op.textContent=o; sel.appendChild(op); });
      const go=document.createElement('button'); go.type='button'; go.className='agent-chip agent-choices-go'; go.textContent='Go';
      go.addEventListener('click', ()=>pick(sel.value));
      row.appendChild(sel); row.appendChild(go);
    } else {
      options.forEach((o)=>{ const b=document.createElement('button'); b.type='button'; b.className='agent-chip'; b.textContent=o; b.addEventListener('click', ()=>pick(o)); row.appendChild(b); });
    }
    wrap.appendChild(row); $('[data-agent-log]').appendChild(wrap); autoscroll();
    return { ok:true, presented: options };
  }

  function autoscroll() { const log = $('[data-agent-log]'); log.scrollTop = log.scrollHeight; }
  function clearWelcome() { const w = $('[data-agent-welcome]'); if (w) w.remove(); }
  function addBubble(kind, text, asMarkdown) {
    const wrap = document.createElement('div');
    wrap.className = 'agent-msg ' + (kind === 'user' ? 'is-user' : 'is-assistant');
    const b = document.createElement('div');
    b.className = 'agent-bubble';
    if (kind !== 'user' && asMarkdown) b.innerHTML = mdToHtml(text || '');
    else b.textContent = text || '';
    wrap.appendChild(b);
    $('[data-agent-log]').appendChild(wrap);
    autoscroll();
    return b;
  }
  function addThinking() {
    const wrap = document.createElement('div');
    wrap.className = 'agent-msg is-assistant';
    wrap.setAttribute('data-agent-thinking', '');
    wrap.innerHTML = '<div class="agent-bubble agent-thinking"><span></span><span></span><span></span></div>';
    $('[data-agent-log]').appendChild(wrap); autoscroll();
    return wrap;
  }
  function addToolChip(name, args, result) {
    const c = chipLabel(name, args, result);
    if (!c) return;
    const d = document.createElement('div');
    d.className = 'agent-tool ' + c.cls;
    d.innerHTML = '<span class="agent-tool-arrow" aria-hidden="true">↳</span><span class="agent-tool-label"></span>';
    d.querySelector('.agent-tool-label').textContent = c.text;
    $('[data-agent-log]').appendChild(d); autoscroll();
  }
  function setStatus(state, meta) {
    const s = $('[data-agent-status]'), dot = $('[data-agent-dot]'), net = $('[data-agent-net]');
    s.classList.toggle('is-offline', state === 'offline');
    dot.classList.toggle('off', state === 'offline');
    const offTxt = CFG.provider === 'ollama' ? 'offline · Ollama unreachable' : 'offline · backend unreachable';
    net.textContent = state === 'online' ? 'online' : state === 'offline' ? offTxt : 'checking…';
    $('[data-agent-status-model]').textContent = CFG.provider === 'openrouter' ? CFG.orModel : CFG.provider === 'gemini' ? CFG.geminiModel : CFG.model;
    if (meta !== undefined) $('[data-agent-meta]').textContent = meta || '';
  }
  function setBusy(b) {
    busy = b;
    $('[data-agent-send]').hidden = b;
    $('[data-agent-stop]').hidden = !b;
    $('[data-agent-input]').disabled = false;
  }

  /* strip <think>…</think> from streamed tokens, keep them out of the visible bubble */
  function makeThinkStripper() {
    let inThink = false, carry = '';
    return (delta) => {
      let s = carry + delta; carry = '';
      let out = '';
      while (s.length) {
        if (inThink) {
          const end = s.indexOf('</think>');
          if (end === -1) { if (s.length > 8) s = s.slice(-8); carry = s; break; }
          s = s.slice(end + 8); inThink = false;
        } else {
          const open = s.indexOf('<think>');
          if (open === -1) {
            const lt = s.lastIndexOf('<');
            if (lt !== -1 && '<think>'.startsWith(s.slice(lt))) { out += s.slice(0, lt); carry = s.slice(lt); }
            else out += s;
            break;
          }
          out += s.slice(0, open); s = s.slice(open + 7); inThink = true;
        }
      }
      return out;
    };
  }

  async function send(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    clearWelcome();
    addBubble('user', text);
    $('[data-agent-input]').value = '';
    autoGrow();
    const liveText = [];
    ctrl = new AbortController();
    setBusy(true);
    // Free-tier model queues can stall for minutes — don't show "thinking" forever.
    let timedOut = false;
    const slowTimer = setTimeout(() => { timedOut = true; try { ctrl.abort(); } catch (e) {} }, 75000);
    const slowNote = setTimeout(() => { setStatus(online ? 'online' : 'offline', 'the free model is waking up — give it a few more seconds…'); }, 9000);
    const thinkingEl = addThinking();
    let bubble = null;
    const strip = makeThinkStripper();
    const onToken = (delta) => {
      const vis = strip(delta);
      if (!vis) return;
      if (!bubble) { if (thinkingEl) thinkingEl.remove(); bubble = addBubble('assistant', ''); bubble.setAttribute('aria-busy', 'true'); }
      bubble.textContent += vis; liveText.push(vis); autoscroll();
    };
    try {
      let toolRan = false, sawOptions = false;
      const r = await agenticChat(text, history.slice(-8), {
        onToken,
        onStatus: (m) => setStatus(online ? 'online' : 'offline', m),
        onTool: (n, a, res) => {
          if (thinkingEl && thinkingEl.parentNode) thinkingEl.remove();
          toolRan = true; if (n === 'present_options') sawOptions = true;
          addToolChip(n, a, res);
        },
        signal: ctrl.signal, useTools: online,
      });
      if (thinkingEl && thinkingEl.parentNode) thinkingEl.remove();
      // Never leave an empty bubble: if the model returned no words, say
      // something sensible — unless choice buttons are already on screen.
      const finalText = (liveText.join('') || strip(r.final || '') || r.final || '').trim()
        || (sawOptions ? '' : toolRan ? 'Done — anything else you’d like to see?' : 'Hmm, I didn’t get a reply that time. Please try again.');
      if (!bubble && finalText) bubble = addBubble('assistant', finalText, true);
      else if (bubble) bubble.innerHTML = mdToHtml(finalText);
      if (bubble) bubble.removeAttribute('aria-busy');
      $('[data-agent-live]').textContent = finalText.slice(0, 220);
      history.push({ role: 'user', content: text });
      history.push({ role: 'assistant', content: (r.final || finalText || '(showed choice buttons)') });
      setStatus(online ? 'online' : 'offline', '');
    } catch (e) {
      if (thinkingEl && thinkingEl.parentNode) thinkingEl.remove();
      if (e && e.name === 'AbortError') {
        if (bubble) bubble.removeAttribute('aria-busy');
        if (timedOut) addError('rate_limited_slow'); // watchdog fired: tell them instead of spinning forever
      }
      else { addError(e && e.workerCode); }
    } finally { clearTimeout(slowTimer); clearTimeout(slowNote); setBusy(false); ctrl = null; }
  }

  function addError(workerCode) {
    const isGemini = CFG.provider === 'gemini';
    const wc = workerCode || '';
    const msg = (wc === 'gemini_forbidden' || wc === 'openrouter_forbidden') ? '⚠ The model key was refused. You can switch the assistant in settings.'
      : wc === 'daily_budget_exhausted' ? '⚠ The assistant has reached today’s usage limit. Please try again tomorrow, or switch the assistant in settings.'
      : /rate_limited/.test(wc) ? '⚠ The assistant is busy right now. Please try again in a moment.'
      : isGemini ? '⚠ I could not reach the assistant backend.' : '⚠ I could not reach the local model.';
    const d = document.createElement('div');
    d.className = 'agent-error'; d.setAttribute('role', 'alert');
    d.innerHTML = '<span></span>' +
      '<button class="agent-link" data-agent-retry>retry</button>' +
      '<button class="agent-link" data-agent-copyctx>copy my info for another AI →</button>';
    d.querySelector('span').textContent = msg;
    $('[data-agent-log]').appendChild(d); autoscroll();
  }

  function offlineMessage() {
    const enable = 'This live AI runs on a local Ollama model on Arumugam’s machine — private by design, ' +
      'nothing leaves the device, no cloud, no API keys. To run it yourself: clone the repo, ' +
      '`ollama pull qwen3-coder:30b`, start Ollama, and open the site from http://localhost.';
    if (location.protocol === 'https:')
      return 'The live AI assistant is local-first — it talks to an Ollama model on localhost, which the ' +
        'deployed site can’t reach (the browser and Ollama restrict cross-origin calls to a localhost server — ' +
        'that’s expected, and keeps it private). ' + enable + ' Meanwhile, here’s a quick guided tour:';
    return 'I couldn’t reach a local Ollama instance right now. ' + enable + ' In the meantime, a guided tour:';
  }

  async function renderScriptedFallback() {
    const p = await loadProfile();
    const QA = [
      { label: 'About',    go: 'about',   answer: () => (p.name + ' — ' + p.title + '. ' + (p.summary || '')).trim() },
      { label: 'Skills',   go: 'skills',  answer: () => 'Core stack: ' + (p.skills || FALLBACK_PROFILE.skills).join(', ') + '.' },
      { label: 'Projects', go: 'work',    answer: () => (p.projects || []).map((x) => '• ' + x.name + ' — ' + x.description).join('\n') || 'See the Work section + GitHub.' },
      { label: 'Contact',  go: 'contact', answer: () => 'Email: ' + (p.email || (p.contact && p.contact.email)) + '\nGitHub: ' + p.github },
    ];
    const row = document.createElement('div');
    row.className = 'agent-chips';
    QA.forEach((item) => {
      const b = document.createElement('button');
      b.className = 'agent-chip'; b.textContent = item.label;
      b.addEventListener('click', () => { addBubble('user', item.label); addBubble('assistant', item.answer()); window.AGENT.goToSection(item.go); });
      row.appendChild(b);
    });
    $('[data-agent-log]').appendChild(row); autoscroll();
  }

  function autoGrow() {
    const ta = $('[data-agent-input]'); if (!ta) return;
    ta.style.height = 'auto'; ta.style.height = Math.min(120, ta.scrollHeight) + 'px';
  }

  async function refreshConnection() {
    setStatus('checking');
    const p = await probe();
    online = p.ok;
    setStatus(online ? 'online' : 'offline');
    $('[data-agent-input]').disabled = false;
    if (CFG.provider === 'ollama') {
      if (online) {
        warmPing();
        try {
          const models = await listModels();
          const sel = $('[data-agent-model]'); sel.innerHTML = '';
          let hasCfg = false;
          models.forEach((m) => {
            const o = document.createElement('option');
            o.value = m.name;
            o.textContent = m.name + (m.tools === false ? ' — text only' : '');
            if (m.name === CFG.model) { o.selected = true; hasCfg = true; }
            sel.appendChild(o);
          });
          if (!hasCfg && models.length) {
            const tcap = models.find((m) => m.tools) || models[0];
            CFG.model = tcap.name; sel.value = tcap.name; saveCfg();
          }
          setStatus('online');
          updateModelNote(models);
        } catch (e) {}
      } else {
        clearWelcome();
        addBubble('assistant', offlineMessage());
        renderScriptedFallback();
      }
    } else { // gemini (via Worker)
      if (online) setStatus('online');
      else {
        clearWelcome();
        addBubble('assistant', offlineWorkerMessage());
        renderScriptedFallback();
      }
    }
  }
  function updateModelNote(models) {
    const note = $('[data-agent-model-note]');
    const m = (models || []).find((x) => x.name === CFG.model);
    if (m && m.tools === false) { note.textContent = 'this model can chat but can’t drive the page.'; note.classList.add('warn'); }
    else { note.textContent = ''; note.classList.remove('warn'); }
  }
  function saveCfg() {
    try {
      localStorage.setItem('ws-agent-provider', CFG.provider);
      localStorage.setItem('ws-agent-worker-url', CFG.workerUrl);
      localStorage.setItem('ws-agent-endpoint', CFG.endpoint);
      localStorage.setItem('ws-agent-model', CFG.model);
      localStorage.setItem('ws-agent-gemini-model', CFG.geminiModel);
      localStorage.setItem('ws-agent-or-model', CFG.orModel);
    } catch (e) {}
  }
  function offlineWorkerMessage() {
    return 'This assistant runs on an online model through a small backend that keeps the API key private. ' +
      'The backend is not reachable right now. You can switch the assistant in settings (the gear icon), ' +
      'or use the quick links below:';
  }

  function build() {
    panel = document.createElement('section');
    panel.id = 'agent-panel';
    panel.className = 'ws-chat agent-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Site assistant');
    panel.hidden = true;
    panel.innerHTML = PANEL_HTML;
    document.body.appendChild(panel);

    $('[data-agent-endpoint]').value = CFG.endpoint;
    $('[data-agent-worker-url]').value = CFG.workerUrl;
    $('[data-agent-provider]').value = CFG.provider;
    $('[data-agent-status-model]').textContent = CFG.provider === 'openrouter' ? CFG.orModel : CFG.provider === 'gemini' ? CFG.geminiModel : CFG.model;

    function updateSettingsView() {
      const isOllama = CFG.provider === 'ollama';
      panel.querySelectorAll('[data-agent-ollama-section]').forEach((el) => { el.hidden = !isOllama; });
      panel.querySelectorAll('[data-agent-gemini-section]').forEach((el) => { el.hidden = isOllama; });
      const sub = $('[data-agent-sub-text]'); if (sub) sub.textContent = isOllama ? 'runs on your computer' : 'ask me anything · I can move the page';
    }
    updateSettingsView();

    $('[data-agent-close]').addEventListener('click', closeChat);
    $('[data-agent-form]').addEventListener('submit', (e) => { e.preventDefault(); send($('[data-agent-input]').value); });
    $('[data-agent-stop]').addEventListener('click', () => { if (ctrl) ctrl.abort(); });
    $('[data-agent-input]').addEventListener('input', autoGrow);
    $('[data-agent-input]').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send($('[data-agent-input]').value); }
    });
    panel.querySelectorAll('[data-agent-suggest]').forEach((b) =>
      b.addEventListener('click', () => send(b.textContent)));
    $('[data-agent-settings]').addEventListener('click', (e) => {
      const sp = $('[data-agent-settings-panel]'); const open = sp.hidden;
      sp.hidden = !open; e.currentTarget.setAttribute('aria-expanded', String(open));
    });
    $('[data-agent-provider]').addEventListener('change', (e) => { CFG.provider = e.target.value; saveCfg(); updateSettingsView(); clearWelcome(); refreshConnection(); });
    $('[data-agent-worker-url]').addEventListener('change', (e) => { CFG.workerUrl = e.target.value.trim() || CFG.workerUrl; saveCfg(); refreshConnection(); });
    $('[data-agent-endpoint]').addEventListener('change', (e) => { CFG.endpoint = e.target.value.trim() || 'http://localhost:11434'; saveCfg(); refreshConnection(); });
    $('[data-agent-model]').addEventListener('change', (e) => { CFG.model = e.target.value; saveCfg(); setStatus(online ? 'online' : 'offline'); });
    panel.addEventListener('click', (e) => {
      const t = e.target.closest('[data-agent-retry], [data-agent-copyctx]');
      if (!t) return;
      if (t.hasAttribute('data-agent-retry')) refreshConnection();
      else { const v = 'Arumugam G — Software Engineer (Thiruvananthapuram, India).\nProfile: https://arumugamg.com/profile.json\nGuide: https://arumugamg.com/llms.txt\nGitHub: https://github.com/arumugamtvm';
        (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).catch(() => {}); egg('agent context copied ✶'); }
    });
  }

  function openChat() {
    if (!panel) build();
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('is-open'));
    chatOpen = true;
    const l = launcher(); if (l) l.setAttribute('aria-expanded', 'true');
    loadProfile();
    refreshConnection();
    setTimeout(() => $('[data-agent-input]').focus(), 80);
  }
  function closeChat() {
    if (!panel) return;
    panel.classList.remove('is-open');
    chatOpen = false;
    const l = launcher(); if (l) l.setAttribute('aria-expanded', 'false');
    if (ctrl) { try { ctrl.abort(); } catch (e) {} }
    setTimeout(() => { if (!chatOpen) panel.hidden = true; }, 240);
    if (l) l.focus();
  }
  window.__openChat = openChat;

  document.querySelectorAll('[data-open-chat]').forEach((b) => b.addEventListener('click', openChat));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && chatOpen) { e.stopPropagation(); closeChat(); }
  }, true);

  const providerLabel = CFG.provider === 'ollama' ? 'local Ollama' : CFG.provider === 'gemini' ? 'Gemini via Worker' : 'OpenRouter/Gemma via Worker';
  console.log('%c✦ site copilot ready — click ✦ or ⌘K → "Chat with this site" (' + providerLabel + ').', 'font-size:12px;color:#6b4eff');
})();


/* ════════════════════════════════════════════════════════════════
   CONTACT FORM → Worker /api/contact → Resend email (key server-side).
   Reads the same Worker URL the chat uses (localStorage ws-agent-worker-url).
   ════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;
  const DEFAULT_WORKER = 'https://arumugamg-copilot.test-dev-user-606.workers.dev';
  const workerUrl = () => {
    try { return (localStorage.getItem('ws-agent-worker-url') || DEFAULT_WORKER).replace(/\/$/, ''); }
    catch (e) { return DEFAULT_WORKER; }
  };
  const note = form.querySelector('[data-cf-note]');
  const btn = form.querySelector('[data-cf-send]');
  const val = (sel) => (form.querySelector(sel) || {}).value || '';
  const setNote = (msg, cls) => { note.textContent = msg; note.className = 'contact-note ' + (cls || ''); };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = val('[data-cf-name]').trim();
    const email = val('[data-cf-email]').trim();
    const message = val('[data-cf-message]').trim();
    const company = val('[data-cf-company]'); // honeypot
    if (!name || !email || !message) { setNote('Please fill in your name, email, and message.', 'err'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setNote('Please enter a valid email address.', 'err'); return; }
    btn.disabled = true; setNote('Sending…', '');
    try {
      const res = await fetch(workerUrl() + '/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, company }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) { setNote('Thanks! Your message was sent. I’ll get back to you soon.', 'ok'); form.reset(); }
      else { setNote((data.error && data.error.message) || 'Could not send. Please email garumugamtvm@gmail.com directly.', 'err'); }
    } catch (err) {
      setNote('Could not reach the server. Please email garumugamtvm@gmail.com directly.', 'err');
    } finally { btn.disabled = false; }
  });
})();
