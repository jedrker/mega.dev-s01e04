import { readdirSync } from 'node:fs';
import type { RigConfig } from './config.js';
import { countStatuses, type StatusCounts } from './digest/counts.js';
import { readNight } from './digest/read.js';
import { lastBeat, type Beat } from './heartbeat.js';

export type Status = {
  adapter: string;
  installed: string;
  lastBeat: Beat | null;
  nights: NightSummary[];
};

export type NightSummary = { night: string; counts: StatusCounts | null };

// Nights on disk = runs/<YYYY-MM-DD>.jsonl, newest first.
export function nightsOnDisk(runsDir: string): string[] {
  try {
    return readdirSync(runsDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))
      .map((f) => f.slice(0, 10))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

function summarize(runsDir: string, night: string): NightSummary {
  try {
    const data = readNight(runsDir, night);
    return { night, counts: data ? countStatuses(data) : null };
  } catch {
    return { night, counts: null };
  }
}

export function readStatus(config: RigConfig): Status {
  return {
    adapter: config.adapter,
    installed: config.installed,
    lastBeat: lastBeat(),
    nights: nightsOnDisk(config.runsDir).map((n) => summarize(config.runsDir, n)),
  };
}
