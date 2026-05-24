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

/* ── Minify CSS ───────────────────────────────────────── */
const minCss = new CleanCSS({ level: 2 }).minify(css).styles;

/* ── Obfuscate JS (protect + app bundled together) ────── */
/* Wrap app script in IIFE so local vars get renamed by obfuscator */
const wrappedJs = '(function(){' + js + '})();';
const combinedJs = protect + '\n;\n' + wrappedJs;

const obfuscated = JavaScriptObfuscator.obfuscate(combinedJs, {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: true,
  debugProtectionInterval: 4000,
  disableConsoleOutput: true,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,
  selfDefending: true,
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

/* ── Inline everything into HTML ──────────────────────── */
let output = html
  /* swap stylesheet link with inlined minified CSS */
  .replace(
    /<link rel="stylesheet" href="style\.css" \/>/,
    `<style>${minCss}</style>`
  )
  /* swap script tag with inlined obfuscated JS */
  .replace(
    /<script src="script\.js"><\/script>/,
    `<script>${obfuscated}</script>`
  );

/* ── Write dist ───────────────────────────────────────── */
fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, 'index.html'), output, 'utf8');

console.log('Build complete → dist/index.html');
console.log('  CSS: ' + (css.length / 1024).toFixed(1) + ' KB → ' + (minCss.length / 1024).toFixed(1) + ' KB');
console.log('  JS:  ' + (combinedJs.length / 1024).toFixed(1) + ' KB → ' + (obfuscated.length / 1024).toFixed(1) + ' KB (obfuscated)');
