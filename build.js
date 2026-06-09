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

console.log('Build complete → dist/index.html');
console.log('  CSS: ' + (css.length / 1024).toFixed(1) + ' KB → ' + (minCss.length / 1024).toFixed(1) + ' KB');
console.log('  JS:  ' + (combinedJs.length / 1024).toFixed(1) + ' KB → ' + (obfuscated.length / 1024).toFixed(1) + ' KB (obfuscated)');
