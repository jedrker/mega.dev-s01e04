export type RunStatus = 'ok' | 'retry' | 'fail';

export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  /** `at` of the job's first line, verbatim from the log (offset kept). */
  firstAt: string;
  /** `at` of the job's last line, verbatim from the log (offset kept). */
  lastAt: string;
};

export type Night = {
  /** Sorted by job. Empty when the file exists but nothing ran. */
  rows: DigestRow[];
  badLines: number;
};

/** `null` = the night has no file (404); an empty file gives `{ rows: [], badLines: 0 }`. */
export type ReadNight = (runsDir: string, night: string) => Night | null;
