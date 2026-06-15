#!/usr/bin/env node
import { readFileSync } from 'node:fs';

let input = {};
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  input = {};
}

const status = input.status ?? input.reason ?? '';
if (/no.?op|cancelled|aborted/i.test(String(status))) {
  process.stdout.write(JSON.stringify({}));
  process.exit(0);
}

const msg = [
  'SESSION END — Estimation Studio memory (if you edited files):',
  '1. docs/ES_MEMORY.md — append session log bullets',
  '2. docs/SESSION_LOG.md — append row',
  '3. docs/LIVE_STATE.md — update phase / next steps',
  '4. Say "Memory updated. [N] files changed."',
].join('\n');

process.stdout.write(JSON.stringify({ followup_message: msg }));
process.exit(0);
