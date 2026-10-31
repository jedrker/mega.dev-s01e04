import type { Night } from './types.js';

export type StatusCounts = { ok: number; retry: number; fail: number };

export function countStatuses(night: Night): StatusCounts {
  let runs = 0;
  let retry = 0;
  let fail = 0;
  for (const r of night.rows) {
    runs += r.runs;
    retry += r.retries;
    fail += r.fails;
  }
  return { ok: runs - retry - fail, retry, fail };
}
