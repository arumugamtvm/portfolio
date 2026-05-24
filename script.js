// Smooth active nav highlight on scroll
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('nav ul a');

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(a => a.style.color = '');
      const active = document.querySelector(`nav ul a[href="#${entry.target.id}"]`);
      if (active) active.style.color = 'var(--accent)';
    }
  });
}, { threshold: 0.4 });

sections.forEach(s => observer.observe(s));

// Typing effect for terminal — cycles loading dots
const loadingEl = document.querySelector('.terminal-body .cursor');
if (loadingEl) {
  const frames = ['|', '/', '—', '\\'];
  let i = 0;
  setInterval(() => { loadingEl.textContent = frames[i++ % frames.length]; }, 200);
}
