// Feature: es-ui-revamp, Property 5: Reduced-motion mode zeroes all
// non-essential motion durations.
//
// For any non-essential motion token, resolveMotionDurations(true) → 0ms, while
// resolveMotionDurations(false) → its defined non-zero value within range; the
// essential feedback token resolves to ≤ 200ms in both modes.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  resolveMotionDurations,
  NORMAL_MOTION_DURATIONS,
  NON_ESSENTIAL_MOTION_TOKENS,
  ESSENTIAL_MOTION_TOKEN,
  ESSENTIAL_FEEDBACK_CAP_MS,
  type MotionToken,
} from './resolveMotionDurations';

describe('resolveMotionDurations — Property 5: reduced-motion zeroing', () => {
  it('reduced motion zeroes every non-essential token', () => {
    fc.assert(
      fc.property(fc.constantFrom<MotionToken>(...NON_ESSENTIAL_MOTION_TOKENS), (token) => {
        expect(resolveMotionDurations(true)[token]).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it('normal mode resolves every non-essential token to its defined non-zero value', () => {
    fc.assert(
      fc.property(fc.constantFrom<MotionToken>(...NON_ESSENTIAL_MOTION_TOKENS), (token) => {
        const v = resolveMotionDurations(false)[token];
        expect(v).toBe(NORMAL_MOTION_DURATIONS[token]);
        expect(v).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it('the essential feedback token is retained and capped ≤ 200ms in both modes', () => {
    fc.assert(
      fc.property(fc.boolean(), (reduced) => {
        const v = resolveMotionDurations(reduced)[ESSENTIAL_MOTION_TOKEN];
        expect(v).toBeGreaterThan(0);
        expect(v).toBeLessThanOrEqual(ESSENTIAL_FEEDBACK_CAP_MS);
      }),
      { numRuns: 100 },
    );
  });
});
