#!/usr/bin/env node
/**
 * Update UI UX Pro Max in the current git repo (Cursor, Copilot, Codex, Kiro).
 * Usage: node scripts/ui-ux-pro-max-update.mjs [--force] [--quiet]
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLATFORMS = ['cursor', 'copilot', 'codex', 'kiro'];
const THROTTLE_MS = 24 * 60 * 60 * 1000;
const force = process.argv.includes('--force');
const quiet = process.argv.includes('--quiet');

function log(...args) {
  if (!quiet) console.log(...args);
}

function findRepoRoot(start) {
  let dir = resolve(start);
  while (true) {
    if (existsSync(join(dir, '.git'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return resolve(start);
    dir = parent;
  }
}

function uiproCmd() {
  if (process.platform === 'win32') {
    const cmd = join(process.env.APPDATA || '', 'npm', 'uipro.cmd');
    if (existsSync(cmd)) return `"${cmd}"`;
  }
  return 'uipro';
}

function run(cmd, cwd) {
  log(`> ${cmd}`);
  execSync(cmd, { cwd, stdio: quiet ? 'pipe' : 'inherit', shell: true });
}

function shouldUpdate(markerPath) {
  if (force) return true;
  if (!existsSync(markerPath)) return true;
  try {
    const last = Number(readFileSync(markerPath, 'utf8').trim());
    return Number.isNaN(last) || Date.now() - last > THROTTLE_MS;
  } catch {
    return true;
  }
}

function touchMarker(markerPath) {
  mkdirSync(dirname(markerPath), { recursive: true });
  writeFileSync(markerPath, String(Date.now()));
}

const repoRoot = findRepoRoot(dirname(fileURLToPath(import.meta.url)));
const marker = join(repoRoot, 'scripts', '.ui-ux-pro-max-last-update');

if (!shouldUpdate(marker)) {
  log(`skip (updated within 24h): ${repoRoot}`);
  process.exit(0);
}

if (force || shouldUpdate(join(repoRoot, 'scripts', '.ui-ux-pro-max-cli-last-update'))) {
  try {
    run('npm install -g ui-ux-pro-max-cli@latest', repoRoot);
    touchMarker(join(repoRoot, 'scripts', '.ui-ux-pro-max-cli-last-update'));
  } catch (e) {
    log('npm global update skipped:', e.message);
  }
}

const uipro = uiproCmd();
for (const ai of PLATFORMS) {
  run(`${uipro} update --ai ${ai}`, repoRoot);
}

touchMarker(marker);
log(`updated UI UX Pro Max: ${repoRoot}`);
