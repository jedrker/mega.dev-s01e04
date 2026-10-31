import type { Hono } from 'hono';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { readNight } from '../src/digest/read.js';

const base = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60 };

const line = (at: string, job: string, status: string, owner: string | null) =>
  JSON.stringify({ at, job, status, owner });

const good = [
  line('2026-10-28T23:00:02+01:00', 'zeta/cleanup', 'ok', 'rook'),
  line('2026-10-28T23:05:00+01:00', 'alpha/sync', 'retry', null),
  line('2026-10-28T23:06:00+01:00', 'alpha/sync', 'ok', null),
  line('2026-10-28T23:10:00+01:00', 'mid/build', 'fail', 'lane-07'),
];

let tmp: string;
let app: Hono;

beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), 'rig-digest-'));
  writeFileSync(join(tmp, '2026-01-01.jsonl'), good.join('\n') + '\n');
  writeFileSync(join(tmp, '2026-01-02.jsonl'), '');
  writeFileSync(join(tmp, '2026-01-03.jsonl'), [good[0], 'not json {', good[1]].join('\n') + '\n');
  app = createApp({ ...base, runsDir: tmp });
});

afterAll(() => rmSync(tmp, { recursive: true, force: true }));

const jobsInPageOrder = (html: string, jobs: string[]) =>
  jobs
    .map((job) => ({ job, at: html.indexOf(job) }))
    .filter((j) => j.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((j) => j.job);

describe('GET /digest/:night', () => {
  it('renders the layout and one row per job', async () => {
    const res = await app.request('/digest/2026-01-01');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('lane-07');
    for (const job of ['alpha/sync', 'mid/build', 'zeta/cleanup']) expect(html).toContain(job);
    expect(html.match(/alpha\/sync/g)).toHaveLength(1);
  });

  it('404s a night with no file', async () => {
    expect((await app.request('/digest/2026-01-09')).status).toBe(404);
  });

  it('says nothing ran for an empty file', async () => {
    const res = await app.request('/digest/2026-01-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('still lists the good jobs when a line is bad', async () => {
    const res = await app.request('/digest/2026-01-03');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('zeta/cleanup');
    expect(html).toContain('alpha/sync');
  });
});

describe('GET /api/digest/:night', () => {
  it('returns night, rows and badLines matching the reader', async () => {
    const res = await app.request('/api/digest/2026-01-01');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      night: '2026-01-01',
      rows: readNight(tmp, '2026-01-01')!.rows,
      badLines: 0,
    });
  });

  it('404s a night with no file', async () => {
    expect((await app.request('/api/digest/2026-01-09')).status).toBe(404);
  });

  it('returns no rows for an empty file', async () => {
    const res = await app.request('/api/digest/2026-01-02');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ rows: [], badLines: 0 });
  });

  it('counts a bad line and keeps the good rows', async () => {
    const res = await app.request('/api/digest/2026-01-03');
    const body = (await res.json()) as { rows: { job: string }[]; badLines: number };
    expect(res.status).toBe(200);
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r) => r.job)).toEqual(['alpha/sync', 'zeta/cleanup']);
  });
});

describe('page and JSON agree', () => {
  it('lists jobs in the same order', async () => {
    const page = await (await app.request('/digest/2026-01-01')).text();
    const json = (await (await app.request('/api/digest/2026-01-01')).json()) as { rows: { job: string }[] };
    const jobs = json.rows.map((r) => r.job);
    expect(jobsInPageOrder(page, jobs)).toEqual(jobs);
  });
});
