import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

describe('readNight on runs/2026-10-28.jsonl', () => {
  const night = readNight('runs', '2026-10-28');
  const row = (job: string) => night?.rows.find((r) => r.job === job);

  it('has 5 jobs sorted by job and 1 bad line', () => {
    expect(night?.badLines).toBe(1);
    expect(night?.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('counts runs and retries, last status from the last line', () => {
    expect(row('fixtures/refresh')).toMatchObject({
      runs: 4,
      retries: 3,
      fails: 0,
      lastStatus: 'ok',
      lastError: null,
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
  });

  it('keeps the last error of a failed job', () => {
    expect(row('notes/backup')).toMatchObject({ lastStatus: 'fail', lastError: 'quota exceeded', owner: 'lane-07' });
    expect(row('notes/backup')?.fails).toBe(1);
  });

  it('keeps a row whose owner is null', () => {
    expect(row('digest/render')).toMatchObject({ owner: null, runs: 1, lastStatus: 'ok' });
  });
});

describe('readNight edge cases', () => {
  let dir: string | undefined;
  const tmp = () => (dir = mkdtempSync(join(tmpdir(), 'rig-runs-')));
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
  });

  it('returns null when the night has no file', () => {
    expect(readNight(tmp(), '2026-10-30')).toBeNull();
  });

  it('returns no rows and no bad lines for an empty file', () => {
    const d = tmp();
    writeFileSync(join(d, '2026-10-30.jsonl'), '');
    expect(readNight(d, '2026-10-30')).toEqual({ rows: [], badLines: 0 });
  });

  it('counts unknown status and missing fields as bad, skips blank lines', () => {
    const d = tmp();
    writeFileSync(
      join(d, '2026-10-30.jsonl'),
      [
        '{"at":"2026-10-30T01:00:00+01:00","job":"a","status":"ok","owner":"rook"}',
        '',
        '{"at":"2026-10-30T01:00:00+01:00","job":"a","status":"maybe","owner":"rook"}',
        '{"job":"a","status":"ok","owner":"rook"}',
        '[]',
        '   ',
      ].join('\n'),
    );
    const result = readNight(d, '2026-10-30');
    expect(result?.badLines).toBe(3);
    expect(result?.rows).toHaveLength(1);
  });
});
