#!/usr/bin/env node
/*
  Simple build script for HTMLExtensions
  - Injects a banner with version/author/license into dist JS
  - Produces both readable and minified artifacts
  - Keeps sources header‑free
*/
const fs = require('fs');
const path = require('path');
const terser = require('terser');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version || '0.0.0';
const nowIso = new Date().toISOString();

const banner = `/*!\n HTMLExtensions v${version} — DataTables ColumnHighlighter & ToggleView\n (c) 2011–${new Date().getFullYear()} Przemyslaw Klys @ Evotec\n https://htmlextensions.evotec.xyz | MIT License | Build: ${nowIso}\n*/`;

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

async function buildFile({ sources, outBaseName }) {
  const distDir = path.join(root, 'dist');
  ensureDir(distDir);

  const code = sources
    .map((rel) => fs.readFileSync(path.join(root, rel), 'utf8'))
    .join('\n\n');

  const readable = `${banner}\n\n${code}`;
  const outJs = path.join(distDir, outBaseName + '.js');
  fs.writeFileSync(outJs, readable, 'utf8');

  const min = await terser.minify(readable, {
    compress: true,
    mangle: true,
    format: { preamble: banner },
  });
  if (min.error) {
    console.error('Terser error for', outBaseName, min.error);
    process.exit(1);
  }
  const outMin = path.join(distDir, outBaseName + '.min.js');
  fs.writeFileSync(outMin, min.code, 'utf8');
  // sanity: ensure banner carries the current version
  const checkReadable = fs.readFileSync(outJs, 'utf8');
  const checkMinified = fs.readFileSync(outMin, 'utf8');
  const needle = `HTMLExtensions v${version}`;
  if (!checkReadable.includes(needle) || !checkMinified.includes(needle)) {
    console.error('Banner/version check failed for', outBaseName);
    process.exit(1);
  }
  console.log('Built', outBaseName);
}

async function buildCssFile({ sources, outBaseName }) {
  const distDir = path.join(root, 'dist');
  ensureDir(distDir);
  const code = sources.map((rel) => fs.readFileSync(path.join(root, rel), 'utf8')).join('\n\n');
  const readable = `${banner}\n\n${code}`;
  const outCss = path.join(distDir, outBaseName + '.css');
  fs.writeFileSync(outCss, readable, 'utf8');
  // best-effort minify using clean-css-cli if available
  try {
    const CleanCSS = require('clean-css');
    const minified = new CleanCSS({ level: 2 }).minify(readable);
    if (minified.errors && minified.errors.length) {
      console.error('CleanCSS errors for', outBaseName, minified.errors);
      process.exit(1);
    }
    const outMin = path.join(distDir, outBaseName + '.min.css');
    const minBanner = banner.replace('*/', ' */');
    fs.writeFileSync(outMin, `${minBanner}\n${minified.styles}`, 'utf8');
  } catch (e) {
    // optional dependency; skip minification if not present
    console.warn('clean-css not installed; skipping CSS minify for', outBaseName);
  }
}

function readBundleConfig(dir) {
  const cfgPath = path.join(dir, 'bundle.json');
  if (fs.existsSync(cfgPath)) {
    try { return JSON.parse(fs.readFileSync(cfgPath, 'utf8')); } catch (_) { return null; }
  }
  return null;
}

function discoverBundles() {
  const srcRoot = path.join(root, 'sources');
  const categories = fs.readdirSync(srcRoot).filter((n) => fs.statSync(path.join(srcRoot, n)).isDirectory());
  const bundles = [];
  for (const cat of categories) {
    const catDir = path.join(srcRoot, cat);
    const plugins = fs.readdirSync(catDir).filter((n) => fs.statSync(path.join(catDir, n)).isDirectory());
    for (const plugin of plugins) {
      const pluginDir = path.join(catDir, plugin);
      const cfg = readBundleConfig(pluginDir);
      const baseName = `${cat}.${plugin}`;
      if (cfg && (cfg.js?.length || cfg.css?.length)) {
        if (cfg.js?.length) bundles.push({ type: 'js', outBaseName: cfg.name || baseName, sources: cfg.js.map((f) => path.join('sources', cat, plugin, f)) });
        if (cfg.css?.length) bundles.push({ type: 'css', outBaseName: cfg.name || baseName, sources: cfg.css.map((f) => path.join('sources', cat, plugin, f)) });
        continue;
      }
      // fallback: all .js and .css in folder (alphabetical)
      const files = fs.readdirSync(pluginDir);
      const js = files.filter((f) => f.endsWith('.js')).sort();
      const css = files.filter((f) => f.endsWith('.css')).sort();
      if (js.length) bundles.push({ type: 'js', outBaseName: baseName, sources: js.map((f) => path.join('sources', cat, plugin, f)) });
      if (css.length) bundles.push({ type: 'css', outBaseName: baseName, sources: css.map((f) => path.join('sources', cat, plugin, f)) });
    }
  }
  return bundles;
}

(async () => {
  const bundles = discoverBundles();
  for (const b of bundles) {
    if (b.type === 'js') await buildFile(b);
    else if (b.type === 'css') await buildCssFile(b);
  }
})();
