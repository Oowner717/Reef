#!/usr/bin/env node
// The one place the version is written from. Usage:
//   node tools/set-version.mjs 0.4.0        set an explicit version
//   node tools/set-version.mjs minor        bump the minor, reset the patch
//   node tools/set-version.mjs patch        bump the patch
//
// Writes js/version.js (version + a fresh build id) and the README stamp.
// Stage 12 extends it to the manifest and the service worker cache name.
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VERSION_FILE = join(ROOT, 'js/version.js');

function currentVersion() {
  const m = readFileSync(VERSION_FILE, 'utf8').match(/VERSION\s*=\s*'([^']+)'/);
  if (!m) throw new Error('cannot read the current version from js/version.js');
  return m[1];
}

function resolve(arg) {
  if (/^\d+\.\d+\.\d+$/.test(arg)) return arg;
  const [maj, min, pat] = currentVersion().split('.').map(Number);
  if (arg === 'major') return `${maj + 1}.0.0`;
  if (arg === 'minor') return `${maj}.${min + 1}.0`;
  if (arg === 'patch') return `${maj}.${min}.${pat + 1}`;
  throw new Error(`unrecognised version argument: ${arg}`);
}

function buildId() {
  const n = Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36).padStart(2, '0');
  return n.slice(-6);
}

const arg = process.argv[2];
if (!arg) { console.error('usage: set-version.mjs <x.y.z|major|minor|patch>'); process.exit(1); }
const version = resolve(arg);
const build = buildId();

writeFileSync(VERSION_FILE,
  `// Single source of truth for the version. Written by tools/set-version.mjs.\n` +
  `// Nothing else in the app hard-codes a version number.\n` +
  `export const VERSION = '${version}';\n` +
  `export const BUILD = '${build}';\n`);

function patch(rel, pattern, replacement, what) {
  const file = join(ROOT, rel);
  if (!existsSync(file)) return;          // not built yet; nothing to stamp
  const src = readFileSync(file, 'utf8');
  if (!pattern.test(src)) { console.warn(`${rel} has no ${what} to stamp`); return; }
  const out = src.replace(pattern, replacement);
  if (out !== src) writeFileSync(file, out);
}

patch('README.md', /^\*\*Version:\*\*.*$/m, `**Version:** ${version}`, '"**Version:**" line');

// The cache name carries the version, so a new version means a new cache and
// the old one is deleted on activate.
patch('sw.js', /const CACHE = '[^']*'/, `const CACHE = 'reef-v${version}-${build}'`, 'CACHE constant');

patch('manifest.webmanifest', /"version"\s*:\s*"[^"]*"/, `"version": "${version}"`, '"version" field');

// The precache list is regenerated from what is actually on disk, so it cannot
// go stale as modules are added. Still a maintenance script, not a build step:
// the app runs from source with nothing compiled.
function walk(dir, out, base) {
  for (const name of readdirSync(join(ROOT, dir)).sort()) {
    if (name.startsWith('.')) continue;
    const rel = dir ? `${dir}/${name}` : name;
    if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, out, base);
    else out.push(`./${rel}`);
  }
  return out;
}

if (existsSync(join(ROOT, 'sw.js'))) {
  const files = ['./', './index.html', './style.css', './manifest.webmanifest'];
  for (const dir of ['js', 'icons']) if (existsSync(join(ROOT, dir))) walk(dir, files);
  const list = files.map((f) => `  '${f}',`).join('\n');
  const src = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  const out = src.replace(
    /(\/\/ PRECACHE-START[^\n]*\n)const PRECACHE = \[[\s\S]*?\];/,
    `$1const PRECACHE = [\n${list}\n];`);
  if (out !== src) writeFileSync(join(ROOT, 'sw.js'), out);
  console.log(`precached ${files.length} files`);
}

console.log(`version ${version}  build ${build}`);
