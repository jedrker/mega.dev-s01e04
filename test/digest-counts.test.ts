import { describe, expect, it } from 'vitest';
import { countStatuses } from '../src/digest/counts.js';
import { readNight } from '../src/digest/read.js';

describe('countStatuses', () => {
  it('counts 2026-10-28', () => {
    expect(countStatuses(readNight('runs', '2026-10-28')!)).toEqual({ ok: 10, retry: 4, fail: 1 });
  });
  it('counts 2026-10-27', () => {
    expect(countStatuses(readNight('runs', '2026-10-27')!)).toEqual({ ok: 7, retry: 0, fail: 0 });
  });
  it('is zero for an empty night', () => {
    expect(countStatuses({ rows: [], badLines: 0 })).toEqual({ ok: 0, retry: 0, fail: 0 });
  });
});
