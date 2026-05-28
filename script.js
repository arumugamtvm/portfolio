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

// ─── Custom cursor glow ───────────────────────────────
const glow = document.querySelector('.cursor-glow');
if (glow && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  let gx = window.innerWidth / 2, gy = window.innerHeight / 2, cx = gx, cy = gy;
  window.addEventListener('mousemove', e => { gx = e.clientX; gy = e.clientY; });
  (function trail() {
    cx += (gx - cx) * 0.2; cy += (gy - cy) * 0.2;
    glow.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
    requestAnimationFrame(trail);
  })();
  const interactive = 'a, button, .skill-tag, .stat-card, .contact-card, .tilt';
  document.querySelectorAll(interactive).forEach(el => {
    el.addEventListener('mouseenter', () => glow.classList.add('hovering'));
    el.addEventListener('mouseleave', () => glow.classList.remove('hovering'));
  });
}

// ─── Magnetic buttons ─────────────────────────────────
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

  // ─── 3D tilt on cards ───────────────────────────────
  document.querySelectorAll('.tilt').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(700px) rotateX(${-py * 6}deg) rotateY(${px * 6}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
}

// ─── Terminal loading spinner ─────────────────────────
const loadingEl = document.querySelector('.terminal-body .cursor');
if (loadingEl) {
  const frames = ['|', '/', '—', '\\'];
  let i = 0;
  setInterval(() => { loadingEl.textContent = frames[i++ % frames.length]; }, 200);
}
