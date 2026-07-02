#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');
const CleanCSS = require('clean-css');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

/* ── Read sources ─────────────────────────────────────── */
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
const js = fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8');
const protect = fs.readFileSync(path.join(ROOT, 'src', 'protect.js'), 'utf8');
const icons = fs.readFileSync(path.join(ROOT, 'src', 'icons.js'), 'utf8');

/* ── Minify CSS ───────────────────────────────────────── */
const minCss = new CleanCSS({ level: 2 }).minify(css).styles;

/* ── Obfuscate JS (protect + app bundled together) ────── */
/* Wrap app script in IIFE so local vars get renamed by obfuscator */
const wrappedJs = '(function(){' + js + '})();';
const combinedJs = protect + '\n;\n' + icons + '\n;\n' + wrappedJs;

const obfuscated = JavaScriptObfuscator.obfuscate(combinedJs, {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: false,            /* relaxed: inspection/agent-friendly */
  debugProtectionInterval: 4000,     /* inert while debugProtection:false */
  disableConsoleOutput: false,       /* relaxed: console hints/easter eggs should appear */
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,
  selfDefending: false,              /* relaxed: allow inspection/instrumentation */
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 8,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: false,
}).getObfuscatedCode();

/* ── Real build metadata for the dev-HUD (best-effort; falls back locally) ── */
const { execSync } = require('child_process');
let sha = 'dev', subject = 'local build', when = new Date().toISOString();
try {
  sha     = execSync('git rev-parse --short HEAD').toString().trim();
  subject = execSync('git log -1 --pretty=%s').toString().trim();
  when    = execSync('git log -1 --pretty=%cI').toString().trim();
} catch (e) { /* local dev without git — keep fallbacks */ }
const buildInfo = JSON.stringify({ sha, subject, when, built: new Date().toISOString() });

/* ── Inline everything into HTML ──────────────────────── */
/* NOTE: use FUNCTION replacements, not string replacements. A string
   replacement interprets `$&`, `$'`, `` $` ``, `$1`… specially — and the
   obfuscated JS can legitimately contain a `$'` sequence (e.g. inside the
   self-defending regex strings), which would otherwise splice the document
   tail into the middle of the script and corrupt the output. */
let output = html
  /* swap stylesheet link with inlined minified CSS */
  .replace(
    /<link rel="stylesheet" href="style\.css" \/>/,
    () => `<style>${minCss}</style>`
  )
  /* remove dev-only icons helper — bundled into obfuscated script */
  .replace(/<script src="src\/icons\.js"><\/script>\s*/, '')
  /* swap script tag with inlined obfuscated JS */
  .replace(
    /<script src="script\.js"><\/script>/,
    () => `<script>${obfuscated}</script>`
  )
  /* inject real build metadata for the dev-HUD (read as window.__BUILD) */
  .replace(
    /<\/head>/,
    () => `<script>window.__BUILD=${buildInfo}</script></head>`
  );

/* ── Write dist ───────────────────────────────────────── */
fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, 'index.html'), output, 'utf8');

/* ── Copy static assets into dist ─────────────────────── */
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}
if (fs.existsSync(path.join(ROOT, 'assets'))) {
  copyDir(path.join(ROOT, 'assets'), path.join(DIST, 'assets'));
}

/* ── Copy agent/SEO/static passthrough files into dist ── */
for (const f of ['llms.txt', 'profile.json', 'robots.txt', 'sitemap.xml', 'arumugam-g.png', 'og-image.png']) {
  const src = path.join(ROOT, f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(DIST, f));
}

/* ── Keep sitemap <lastmod> current on each build ─────── */
const sitemapPath = path.join(DIST, 'sitemap.xml');
if (fs.existsSync(sitemapPath)) {
  let sm = fs.readFileSync(sitemapPath, 'utf8');
  sm = sm.replace(/<lastmod>.*?<\/lastmod>/, `<lastmod>${new Date().toISOString().split('T')[0]}</lastmod>`);
  fs.writeFileSync(sitemapPath, sm, 'utf8');
}

/* ════════════════════════════════════════════════════════
   CONTENT PAGES — blog / learn / track (markdown in content/,
   synced from Notion on demand) + the private wallet app.
   Plain static HTML — not obfuscated; these pages ARE the content.
   ════════════════════════════════════════════════════════ */

const CONTENT = path.join(ROOT, 'content');

// Feature flags — disable content page generation without deleting source files
const BUILD_FLAGS = {
  blog:   false,  // blog pages disabled (nav links removed)
  learn:  false,  // learn pages disabled (nav links removed)
  track:  true,   // track page enabled
  wallet: true,   // wallet page enabled
};

/* tiny markdown → HTML (headings, code fences, lists, quotes, hr,
   bold/em/links/inline-code, paragraphs; raw HTML tables pass through) */
function esc(x) { return x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function inline(x) {
  return x
    .replace(/`([^`]+)`/g, (m, c) => '<code>' + esc(c) + '</code>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g, '<a href="$2">$1</a>');
}
function mdToHtml(src) {
  const lines = src.split('\n');
  let html = '', i = 0, list = null, quote = [], para = [];
  const flushPara = () => { if (para.length) { html += '<p>' + para.map(inline).join('<br>') + '</p>\n'; para = []; } };
  const flushList = () => { if (list) { html += '<ul>' + list.map((x) => '<li>' + inline(x) + '</li>').join('') + '</ul>\n'; list = null; } };
  const flushQuote = () => { if (quote.length) { html += '<blockquote>' + quote.map(inline).join('<br>') + '</blockquote>\n'; quote = []; } };
  const flushAll = () => { flushPara(); flushList(); flushQuote(); };
  while (i < lines.length) {
    const ln = lines[i];
    if (ln.startsWith('```')) {           // fenced code
      flushAll();
      const buf = []; i++;
      while (i < lines.length && !lines[i].startsWith('```')) { buf.push(lines[i]); i++; }
      html += '<pre><code>' + esc(buf.join('\n')) + '</code></pre>\n';
      i++; continue;
    }
    if (/^<table/.test(ln.trim())) {      // raw HTML table passthrough
      flushAll();
      while (i < lines.length) { html += lines[i] + '\n'; if (/<\/table>/.test(lines[i])) { i++; break; } i++; }
      continue;
    }
    const h = ln.match(/^(#{1,4})\s+(.+)/);
    if (h) { flushAll(); const lvl = Math.max(2, h[1].length); const id = h[2].toLowerCase().replace(/[^\w]+/g, '-').replace(/^-|-$/g, ''); html += `<h${lvl} id="${id}">` + inline(h[2]) + `</h${lvl}>\n`; i++; continue; }
    if (/^---\s*$/.test(ln)) { flushAll(); html += '<hr>\n'; i++; continue; }
    if (/^>\s?/.test(ln)) { flushPara(); flushList(); quote.push(ln.replace(/^>\s?/, '')); i++; continue; }
    const li = ln.match(/^\s*[-*]\s+(.+)/);
    if (li) { flushPara(); flushQuote(); (list = list || []).push(li[1]); i++; continue; }
    const ol = ln.match(/^\s*\d+\.\s+(.+)/);
    if (ol) { flushPara(); flushQuote(); (list = list || []).push(ol[1]); i++; continue; }
    if (ln.trim() === '') { flushAll(); i++; continue; }
    flushList(); flushQuote(); para.push(ln); i++;
  }
  flushAll();
  return html;
}
function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  for (const line of m[1].split('\n')) { const kv = line.match(/^(\w+):\s*(.*)$/); if (kv) meta[kv[1]] = kv[2]; }
  return { meta, body: m[2] };
}

/* shared page shell — brand palette, light+dark, compact and readable */
const PAGE_CSS = `
:root{--paper:#faf7f0;--ink:#1d1b16;--soft:#6e6759;--violet:#6b4eff;--line:#e7e1d4;--card:#fffdf8;--code:#f3efe5}
@media(prefers-color-scheme:dark){:root{--paper:#12111a;--ink:#eceaf6;--soft:#9b96ad;--violet:#9d8cff;--line:#2a2838;--card:#1a1925;--code:#201e2e}}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:17px/1.7 -apple-system,'Segoe UI',Roboto,sans-serif}
.wrap{max-width:760px;margin:0 auto;padding:1.2rem 1.2rem 4rem}
header.site{display:flex;align-items:center;gap:1rem;padding:.9rem 0;border-bottom:1px solid var(--line);flex-wrap:wrap}
.logo{font-weight:800;background:var(--ink);color:var(--paper);padding:.25em .5em;border-radius:.45em;text-decoration:none;font-size:.95rem}
nav.site{display:flex;gap:.9rem;flex-wrap:wrap}nav.site a{color:var(--soft);text-decoration:none;font-size:.92rem}nav.site a:hover,nav.site a.on{color:var(--violet)}
h1{font-size:2rem;line-height:1.2;margin:1.4rem 0 .4rem}h2{margin-top:2.2rem;font-size:1.45rem}h3{margin-top:1.6rem;font-size:1.15rem}h4{margin-top:1.2rem}
.meta{color:var(--soft);font-size:.9rem}
a{color:var(--violet)}hr{border:0;border-top:1px solid var(--line);margin:2rem 0}
blockquote{margin:1.2rem 0;padding:.8rem 1.1rem;border-left:3px solid var(--violet);background:var(--card);border-radius:0 .6rem .6rem 0;color:var(--ink)}
pre{background:#14121c;color:#e8e6f3;padding:1rem 1.1rem;border-radius:.7rem;overflow:auto;font-size:.85rem;line-height:1.55}
pre code{background:none;padding:0;color:inherit}
code{background:var(--code);padding:.12em .4em;border-radius:.35em;font-size:.88em;font-family:'JetBrains Mono',ui-monospace,monospace}
table{border-collapse:collapse;width:100%;margin:1.1rem 0;font-size:.92rem}
th,td{border:1px solid var(--line);padding:.5rem .7rem;text-align:left}th{background:var(--card)}
ul{padding-left:1.3rem}.cardlist{list-style:none;padding:0}
.cardlist li{background:var(--card);border:1px solid var(--line);border-radius:.8rem;padding:1rem 1.2rem;margin:.8rem 0}
.cardlist a.title{font-size:1.15rem;font-weight:700;text-decoration:none}
footer.site{margin-top:3.5rem;padding-top:1.2rem;border-top:1px solid var(--line);color:var(--soft);font-size:.88rem;display:flex;gap:1rem;flex-wrap:wrap}
footer.site a{color:var(--soft)}
.learn-layout{display:grid;grid-template-columns:250px minmax(0,1fr);gap:2.2rem;align-items:start}
.learn-nav{position:sticky;top:1rem;font-size:.88rem;max-height:calc(100vh - 2rem);overflow:auto;padding-right:.4rem}
.learn-nav .top a{display:block;padding:.32rem .5rem;border-radius:.45rem;color:var(--ink);text-decoration:none;font-weight:600}
.learn-nav .top a:hover{background:var(--card)}
.learn-nav details{margin:.35rem 0;border-left:2px solid var(--line);padding-left:.4rem}
.learn-nav summary{cursor:pointer;color:var(--soft);font-weight:700;padding:.25rem .3rem;list-style:none}
.learn-nav summary::-webkit-details-marker{display:none}
.learn-nav summary::before{content:'▸ ';color:var(--violet)}
.learn-nav details[open] summary::before{content:'▾ '}
.learn-nav details a{display:block;padding:.22rem .5rem;border-radius:.4rem;color:var(--soft);text-decoration:none;line-height:1.35}
.learn-nav details a:hover{color:var(--violet);background:var(--card)}
.learn-nav a.on{color:var(--violet);font-weight:700;background:var(--card)}
.pn{display:flex;justify-content:space-between;gap:1rem;margin-top:2.5rem;border-top:1px solid var(--line);padding-top:1.1rem;font-size:.92rem}
.pn a{text-decoration:none;max-width:46%}
.stub-note{background:var(--card);border:1px dashed var(--line);border-radius:.8rem;padding:1.1rem 1.3rem;color:var(--soft);margin:1.6rem 0}
@media(max-width:900px){.learn-layout{grid-template-columns:1fr}.learn-nav{position:static;max-height:none;border:1px solid var(--line);border-radius:.7rem;padding:.7rem}}
`.trim();

function pageShell({ title, desc, nav, bodyHtml, extraHead = '', route = '' }) {
  const pageUrl = 'https://arumugamg.com/' + (route ? route.replace(/\/?$/, '/') : '');
  const navHtml = [
    ['/', 'Home'], ['/blog/', 'Blog'], ['/learn/', 'Learn'], ['/track/', 'Track'], ['/#contact', 'Contact'],
  ].map(([href, label]) => `<a href="${href}"${nav === label.toLowerCase() ? ' class="on"' : ''}>${label}</a>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} — Arumugam G</title>
<meta name="description" content="${esc(desc || '')}">
<link rel="canonical" href="${pageUrl}">
<meta property="og:title" content="${esc(title)} — Arumugam G">
<meta property="og:description" content="${esc(desc || '')}">
<meta property="og:url" content="${pageUrl}">
<meta property="og:type" content="${route.startsWith('blog/') ? 'article' : 'website'}">
<meta property="og:image" content="https://arumugamg.com/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="author" content="Arumugam G">
<style>${PAGE_CSS}</style>${extraHead}
</head>
<body>
<div class="wrap">
<header class="site" role="banner"><a class="logo" href="/">AG</a><nav class="site" aria-label="Main navigation">${navHtml}</nav></header>
<main role="main">
${bodyHtml}
</main>
<footer class="site" role="contentinfo"><span>© 2026 Arumugam G</span><a href="/">arumugamg.com</a><a href="/wallet/">wallet</a></footer>
</div>
</body>
</html>`;
}
function writePage(rel, htmlStr) {
  const dir = path.join(DIST, rel);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), htmlStr, 'utf8');
}

/* ── blog: per-post pages + index ── */
const posts = [];
const blogDir = path.join(CONTENT, 'blog');
if (fs.existsSync(blogDir)) {
  for (const f of fs.readdirSync(blogDir).filter((x) => x.endsWith('.md')).sort()) {
    const { meta, body } = parseFrontmatter(fs.readFileSync(path.join(blogDir, f), 'utf8'));
    const slug = f.replace(/\.md$/, '');
    posts.push({ slug, meta });
    const head = `<h1>${inline(meta.title || slug)}</h1>\n<p class="meta">${meta.date || ''}${meta.readtime ? ' · ' + meta.readtime + ' read' : ''} · by Arumugam G</p>`;
    const articleLd = `<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org', '@type': 'BlogPosting',
      headline: meta.title || slug, datePublished: meta.date, description: meta.description,
      url: 'https://arumugamg.com/blog/' + slug + '/',
      author: { '@type': 'Person', '@id': 'https://arumugamg.com/#person', name: 'Arumugam G', url: 'https://arumugamg.com/' },
    })}</script>`;
    writePage('blog/' + slug, pageShell({ title: meta.title || slug, desc: meta.description, nav: 'blog', route: 'blog/' + slug, extraHead: articleLd, bodyHtml: head + mdToHtml(body) }));
  }
  posts.sort((a, b) => (b.meta.date || '').localeCompare(a.meta.date || ''));
  const list = posts.map((p) =>
    `<li><a class="title" href="/blog/${p.slug}/">${inline(p.meta.title || p.slug)}</a><p class="meta">${p.meta.date || ''}${p.meta.readtime ? ' · ' + p.meta.readtime + ' read' : ''}</p><p>${inline(p.meta.description || '')}</p></li>`).join('\n');
  writePage('blog', pageShell({ title: 'Blog', desc: 'Technical writing by Arumugam G — AI engineering, agents, and web architecture.', nav: 'blog', route: 'blog',
    bodyHtml: `<h1>Blog</h1>\n<p class="meta">Long-form technical writing. Maintained in Notion, published here.</p>\n<ul class="cardlist">${list}</ul>` }));
}

/* ── learn: Notion-style navigation over the full module manifest ── */
const manifest = JSON.parse(fs.readFileSync(path.join(CONTENT, 'learn', 'modules.json'), 'utf8'));
const allModules = manifest.phases.flatMap((p) => p.modules.map((m) => ({ ...m, phase: p.title, phaseId: p.id })));
const moduleFile = (slug) => path.join(CONTENT, 'learn', 'modules', slug + '.md');

function learnNav(currentSlug) {
  const top = [
    ['/learn/', 'learn-home', '🏠 Learning Hub'],
    ['/learn/dsa-patterns/', 'dsa-patterns', '🔢 DSA Patterns Guide'],
    ['/track/', 'track', '📊 Progress Tracker'],
    ['/blog/', 'blog', '📝 Blog'],
  ].map(([href, key, label]) => `<a href="${href}"${currentSlug === key ? ' class="on"' : ''}>${label}</a>`).join('');
  const groups = manifest.phases.map((p) => {
    const isOpen = p.modules.some((m) => m.slug === currentSlug) || currentSlug === 'learn-home';
    const items = p.modules.map((m) =>
      `<a href="/learn/${m.slug}/"${m.slug === currentSlug ? ' class="on"' : ''}>${esc(m.title)}${fs.existsSync(moduleFile(m.slug)) ? '' : ' ◌'}</a>`).join('');
    return `<details${isOpen ? ' open' : ''}><summary>${esc(p.title)}</summary>${items}</details>`;
  }).join('');
  return `<nav class="learn-nav" aria-label="Learning hub navigation"><div class="top">${top}</div>${groups}</nav>`;
}
function learnShell({ title, desc, route, currentSlug, mainHtml }) {
  return pageShell({ title, desc, nav: 'learn', route,
    bodyHtml: `<div class="learn-layout">${learnNav(currentSlug)}<div class="learn-main">${mainHtml}</div></div>` });
}

/* learn index — intro from md + generated linked phase lists */
{
  const { meta, body } = parseFrontmatter(fs.readFileSync(path.join(CONTENT, 'learn', 'index.md'), 'utf8'));
  const phaseLists = manifest.phases.map((p) => {
    const items = p.modules.map((m) => {
      const synced = fs.existsSync(moduleFile(m.slug));
      return `<li><a${synced ? '' : ' class="meta"'} href="/learn/${m.slug}/">${esc(m.title)}</a>${synced ? '' : ' <span class="meta">· notes sync on demand</span>'}</li>`;
    }).join('');
    return `<h3>${esc(p.title)}</h3><ul>${items}</ul>`;
  }).join('\n');
  writePage('learn', learnShell({ title: meta.title || 'Learning Hub', desc: meta.description, route: 'learn', currentSlug: 'learn-home',
    mainHtml: `<h1>${inline(meta.title || 'Learning Hub')}</h1>\n` + mdToHtml(body) + `<h2 id="curriculum">📚 Full Curriculum — every module</h2>\n` + phaseLists }));
}

/* dsa-patterns page inside the learn shell */
{
  const { meta, body } = parseFrontmatter(fs.readFileSync(path.join(CONTENT, 'learn', 'dsa-patterns.md'), 'utf8'));
  writePage('learn/dsa-patterns', learnShell({ title: meta.title, desc: meta.description, route: 'learn/dsa-patterns', currentSlug: 'dsa-patterns',
    mainHtml: `<h1>${inline(meta.title)}</h1>\n` + mdToHtml(body) }));
}

/* one page per module — full notes when synced, honest stub otherwise */
let syncedCount = 0;
allModules.forEach((m, i) => {
  const prev = allModules[i - 1], next = allModules[i + 1];
  const pn = `<div class="pn">${prev ? `<a href="/learn/${prev.slug}/">← ${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a href="/learn/${next.slug}/" style="text-align:right">${esc(next.title)} →</a>` : '<span></span>'}</div>`;
  let mainHtml, desc;
  if (fs.existsSync(moduleFile(m.slug))) {
    syncedCount++;
    const { meta, body } = parseFrontmatter(fs.readFileSync(moduleFile(m.slug), 'utf8'));
    desc = meta.description || m.title;
    mainHtml = `<h1>${inline(meta.title || m.title)}</h1>\n<p class="meta">${esc(m.phase)} · Hope AI — ML &amp; DS Course</p>\n` + mdToHtml(body) + pn;
  } else {
    desc = m.title + ' — Hope AI course module (notes sync from Notion on demand).';
    mainHtml = `<h1>${esc(m.title)}</h1>\n<p class="meta">${esc(m.phase)} · Hope AI — ML &amp; DS Course</p>
<div class="stub-note">📓 The full notes for this module live in my Notion workspace and haven't been synced to the site yet — modules are published here one by one as I work through them. The complete curriculum map is always up to date in the sidebar.</div>
<p>Meanwhile: the <a href="/learn/week17-ai-agents/">AI Agents notes</a> and the <a href="/learn/dsa-patterns/">DSA Patterns guide</a> are fully published, and the <a href="/track/">progress tracker</a> shows where I am right now.</p>` + pn;
  }
  writePage('learn/' + m.slug, learnShell({ title: m.title.replace(/^[^\w]*\s*/, ''), desc, route: 'learn/' + m.slug, currentSlug: m.slug, mainHtml }));
});

/* track page (own route, plain shell) */
{
  const { meta, body } = parseFrontmatter(fs.readFileSync(path.join(CONTENT, 'track', 'index.md'), 'utf8'));
  writePage('track', pageShell({ title: meta.title, desc: meta.description, nav: 'track', route: 'track',
    bodyHtml: `<h1>${inline(meta.title)}</h1>\n` + mdToHtml(body) }));
}

/* ── wallet: the owner's SECRETS VAULT (keys & passwords).
      End-to-end encrypted: values are AES-GCM encrypted IN THE BROWSER with a
      key derived from the master passphrase (PBKDF2). Auth uses a one-way
      SHA-256 of the passphrase — the server never sees the passphrase and the
      backend only ever stores ciphertext. ── */
const WALLET_JS = `
const API='https://arumugamg-copilot.test-dev-user-606.workers.dev/api/wallet';
const $=(s)=>document.querySelector(s);
const master=()=>sessionStorage.getItem('ws-vault-master')||'';
let _authHex=null,_aesKey=null,_items=[];
async function sha256hex(s){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function authHex(){return _authHex||(_authHex=await sha256hex('auth:'+master()));}
async function aesKey(){
  if(_aesKey)return _aesKey;
  const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(master()),'PBKDF2',false,['deriveKey']);
  _aesKey=await crypto.subtle.deriveKey({name:'PBKDF2',salt:new TextEncoder().encode('ws-vault-v1'),iterations:150000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  return _aesKey;
}
async function encryptVal(plain){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await aesKey(),new TextEncoder().encode(plain)));
  const all=new Uint8Array(12+ct.length);all.set(iv);all.set(ct,12);
  let s='';for(const b of all)s+=String.fromCharCode(b);
  return btoa(s);
}
async function decryptVal(b64){
  const all=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
  const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:all.slice(0,12)},await aesKey(),all.slice(12));
  return new TextDecoder().decode(pt);
}
async function api(method,bodyObj,qs){
  const r=await fetch(API+(qs||''),{method,headers:{'Content-Type':'application/json','x-wallet-key':await authHex()},...(bodyObj?{body:JSON.stringify(bodyObj)}:{})});
  const d=await r.json().catch(()=>({}));
  if(r.status===401){sessionStorage.removeItem('ws-vault-master');_authHex=_aesKey=null;show('lock');throw new Error('wrong key');}
  if(!r.ok)throw new Error((d.error&&d.error.message)||('error '+r.status));
  return d;
}
function show(view){$('#lock').hidden=view!=='lock';$('#app').hidden=view!=='app';}
function esc(x){return String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
async function refresh(){
  const d=await api('GET');
  _items=d.items;
  $('#count').textContent=d.count+' secret'+(d.count===1?'':'s');
  const rows=d.items.map(t=>'<tr data-id="'+t.id+'"><td><strong>'+esc(t.name)+'</strong></td><td>'+esc(t.username||'')+'</td>'+
    '<td class="sec"><span class="mask">••••••••</span></td>'+
    '<td class="acts"><button class="ico show" title="Show">👁</button><button class="ico copy" title="Copy">⧉</button><button class="ico del" title="Delete">✕</button></td></tr>').join('');
  $('#vbody').innerHTML=rows||'<tr><td colspan="4" style="color:var(--soft)">Vault is empty — add your first secret above.</td></tr>';
}
document.addEventListener('click',async(e)=>{
  const btn=e.target.closest('button.ico');if(!btn)return;
  const tr=btn.closest('tr');const item=_items.find(x=>x.id===tr.dataset.id);if(!item)return;
  try{
    if(btn.classList.contains('del')){
      if(!confirm('Delete "'+item.name+'" forever?'))return;
      await api('DELETE',null,'?id='+encodeURIComponent(item.id));refresh();return;
    }
    const plain=await decryptVal(item.ct);
    if(btn.classList.contains('copy')){
      await navigator.clipboard.writeText(plain);
      btn.textContent='✓';setTimeout(()=>{btn.textContent='⧉';},1200);
    }else{
      const cell=tr.querySelector('.sec');
      if(cell.dataset.open){cell.innerHTML='<span class="mask">••••••••</span>';delete cell.dataset.open;}
      else{cell.textContent=plain;cell.dataset.open='1';}
    }
  }catch(err){alert('Could not decrypt — wrong master key for this entry?');}
});
$('#unlock').addEventListener('submit',async(e)=>{
  e.preventDefault();
  sessionStorage.setItem('ws-vault-master',$('#keyin').value.trim());
  _authHex=_aesKey=null;
  try{show('app');await refresh();}catch(err){$('#lockmsg').textContent='That key was not accepted.';}
});
$('#add').addEventListener('submit',async(e)=>{
  e.preventDefault();
  const name=$('#name').value.trim(),val=$('#value').value;
  if(!name||!val)return;
  $('#addbtn').disabled=true;
  try{
    await api('POST',{name,username:$('#user').value.trim(),ct:await encryptVal(val)});
    $('#name').value='';$('#user').value='';$('#value').value='';
    await refresh();
  }catch(err){alert(err.message);}finally{$('#addbtn').disabled=false;}
});
$('#locknow').addEventListener('click',()=>{sessionStorage.removeItem('ws-vault-master');_authHex=_aesKey=null;_items=[];show('lock');});
if(master()){show('app');refresh().catch(()=>show('lock'));}else show('lock');
`.trim();

const WALLET_BODY = `
<h1>🔐 Wallet</h1>
<p class="meta">Private vault for keys and passwords. Every value is encrypted <em>in this browser</em> before upload — the backend only ever stores ciphertext, and the master key never leaves this page.</p>
<section id="lock" hidden>
  <form id="unlock" style="display:flex;gap:.6rem;flex-wrap:wrap;margin-top:1.4rem">
    <input id="keyin" type="password" placeholder="Master key" autocomplete="current-password" style="flex:1;min-width:220px;padding:.7rem .9rem;border:1px solid var(--line);border-radius:.6rem;background:var(--card);color:var(--ink);font-size:1rem">
    <button style="padding:.7rem 1.3rem;border:0;border-radius:.6rem;background:var(--violet);color:#fff;font-weight:700;font-size:1rem;cursor:pointer">Unlock</button>
  </form>
  <p id="lockmsg" class="meta" role="alert"></p>
</section>
<section id="app" hidden>
  <div style="display:flex;align-items:center;gap:1rem;margin:1.2rem 0">
    <span id="count" class="meta">—</span>
    <button id="locknow" style="margin-left:auto;padding:.45rem .9rem;border:1px solid var(--line);border-radius:.5rem;background:var(--card);color:var(--ink);cursor:pointer">🔒 Lock</button>
  </div>
  <form id="add" style="display:flex;gap:.55rem;flex-wrap:wrap;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:.8rem;padding:.9rem">
    <input id="name" type="text" placeholder="Name (e.g. GitHub token)" required maxlength="60" aria-label="Name" style="flex:1;min-width:150px;padding:.6rem;border:1px solid var(--line);border-radius:.5rem;background:var(--paper);color:var(--ink)">
    <input id="user" type="text" placeholder="Username / id (optional)" maxlength="120" aria-label="Username" autocomplete="off" style="flex:1;min-width:140px;padding:.6rem;border:1px solid var(--line);border-radius:.5rem;background:var(--paper);color:var(--ink)">
    <input id="value" type="password" placeholder="Secret value" required aria-label="Secret value" autocomplete="new-password" style="flex:2;min-width:180px;padding:.6rem;border:1px solid var(--line);border-radius:.5rem;background:var(--paper);color:var(--ink)">
    <button id="addbtn" style="padding:.6rem 1.2rem;border:0;border-radius:.5rem;background:var(--violet);color:#fff;font-weight:700;cursor:pointer">Add</button>
  </form>
  <table style="margin-top:1.2rem"><thead><tr><th>Name</th><th>Username</th><th>Secret</th><th></th></tr></thead><tbody id="vbody"></tbody></table>
  <p class="meta">👁 show · ⧉ copy · ✕ delete. Lock when you leave — the key lives only in this tab's session.</p>
</section>
<style>.ico{background:none;border:0;color:var(--soft);cursor:pointer;font-size:1rem;padding:.2rem .35rem}.ico:hover{color:var(--violet)}.ico.del:hover{color:#d05b4e}.mask{letter-spacing:.15em;color:var(--soft)}td.sec{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:.82rem;word-break:break-all;max-width:260px}.acts{white-space:nowrap;text-align:right}</style>
<script>${WALLET_JS}</script>`;

writePage('wallet', pageShell({ title: 'Wallet', desc: 'Private vault (owner only).', nav: '', route: 'wallet', bodyHtml: WALLET_BODY,
  extraHead: '<meta name="robots" content="noindex">' }));

console.log('  Pages: blog (' + posts.length + ' post' + (posts.length === 1 ? '' : 's') + '), learn (' + allModules.length + ' modules, ' + syncedCount + ' synced), dsa-patterns, track, wallet');

console.log('Build complete → dist/index.html');
console.log('  CSS: ' + (css.length / 1024).toFixed(1) + ' KB → ' + (minCss.length / 1024).toFixed(1) + ' KB');
console.log('  JS:  ' + (combinedJs.length / 1024).toFixed(1) + ' KB → ' + (obfuscated.length / 1024).toFixed(1) + ' KB (obfuscated)');
