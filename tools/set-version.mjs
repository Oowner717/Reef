#!/usr/bin/env node
// The one place the version is written from. Usage:
//   node tools/set-version.mjs 0.4.0        set an explicit version
//   node tools/set-version.mjs minor        bump the minor, reset the patch
//   node tools/set-version.mjs patch        bump the patch
//
// Writes js/version.js (version + a fresh build id) and the README stamp.
// Stage 12 extends it to the manifest and the service worker cache name.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
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

const readme = join(ROOT, 'README.md');
if (existsSync(readme)) {
  const src = readFileSync(readme, 'utf8');
  const out = src.replace(/^\*\*Version:\*\*.*$/m, `**Version:** ${version}`);
  if (out !== src) writeFileSync(readme, out);
  else console.warn('README has no "**Version:**" line to stamp');
}

console.log(`version ${version}  build ${build}`);
