#!/usr/bin/env node
/**
 * DISABLED — do not register in hooks.json with followup_message.
 *
 * A stop hook that returns followup_message runs after EVERY agent turn, not only
 * at session end, which caused an infinite "SESSION END" loop (agent replies →
 * hook fires again → same prompt injected).
 *
 * Living memory updates are handled by .cursor/rules/memory-auto-update.mdc
 * (alwaysApply). Re-enable only if Cursor adds a true sessionEnd event or
 * loop-safe one-shot followup.
 */
process.stdout.write(JSON.stringify({}));
process.exit(0);
