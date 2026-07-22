import { describe, expect, it } from 'vitest';
import {
  formatDraftNumberDisplay,
  parseDraftNumber,
  roundDraftNumber,
  tryParseDraftNumber,
} from './DraftNumberInput';

describe('roundDraftNumber / formatDraftNumberDisplay', () => {
  it('rounds and formats to 2 decimals', () => {
    expect(roundDraftNumber(8)).toBe(8);
    expect(roundDraftNumber(10.5)).toBe(10.5);
    expect(roundDraftNumber(10.556)).toBe(10.56);
    expect(formatDraftNumberDisplay(8)).toBe('8.00');
    expect(formatDraftNumberDisplay(10.5)).toBe('10.50');
    expect(formatDraftNumberDisplay(10.556)).toBe('10.56');
  });
});

describe('tryParseDraftNumber', () => {
  it('returns null for incomplete drafts', () => {
    expect(tryParseDraftNumber('')).toBeNull();
    expect(tryParseDraftNumber('   ')).toBeNull();
    expect(tryParseDraftNumber('.')).toBeNull();
    expect(tryParseDraftNumber('-')).toBeNull();
    expect(tryParseDraftNumber('-.')).toBeNull();
  });

  it('parses valid numbers, rounds to 2dp, and clamps', () => {
    expect(tryParseDraftNumber('20')).toBe(20);
    expect(tryParseDraftNumber('12.5')).toBe(12.5);
    expect(tryParseDraftNumber('12.')).toBe(12);
    expect(tryParseDraftNumber('8.005')).toBe(8.01);
    expect(tryParseDraftNumber('-3', 0)).toBe(0);
    expect(tryParseDraftNumber('150', 0, 100)).toBe(100);
  });
});

describe('parseDraftNumber', () => {
  it('falls back when draft is incomplete', () => {
    expect(parseDraftNumber('', 15)).toBe(15);
    expect(parseDraftNumber('.', 10, 0)).toBe(10);
    expect(parseDraftNumber('', 8)).toBe(8);
  });

  it('parses and clamps like tryParse', () => {
    expect(parseDraftNumber('25', 15)).toBe(25);
    expect(parseDraftNumber('-1', 15, 0)).toBe(0);
    expect(parseDraftNumber('10.5', 0)).toBe(10.5);
  });
});
