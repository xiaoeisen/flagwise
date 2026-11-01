import { emptyProgress } from '../domain/progress';
import type { Prefs, Progress, Snapshot } from '../domain/types';

/** Persistence port. The app depends on this interface, not on localStorage. */
export interface StoragePort {
  load(): Snapshot;
  save(snapshot: Snapshot): void;
}

export const defaultPrefs = (): Prefs => ({
  region: 'all',
  count: 10,
  lookalikes: false,
  autocomplete: true,
  theme: 'dark',
});

export const defaultSnapshot = (): Snapshot => ({ version: 2, prefs: defaultPrefs(), progress: emptyProgress() });

const KEY = 'flagwise:v2';
const LEGACY_KEY = 'flagwise-v1';

interface LegacyV1 {
  seen?: Record<string, { r: number; w: number; s: number }>;
  answered?: number;
  correct?: number;
  bestStreak?: number;
  bestBlitz?: number;
  daily?: Record<string, { s: number; g: number[] }>;
  prefs?: { region?: Prefs['region']; count?: Prefs['count']; hard?: boolean; auto?: boolean; theme?: Prefs['theme'] };
}

/** v1 used terse keys and a "hard" flag. Carry the player's progress over instead of resetting it. */
function migrateV1(old: LegacyV1): Snapshot {
  const base = defaultSnapshot();
  const progress: Progress = {
    flags: Object.fromEntries(
      Object.entries(old.seen ?? {}).map(([code, f]) => [code, { right: f.r, wrong: f.w, run: f.s }]),
    ),
    answered: old.answered ?? 0,
    correct: old.correct ?? 0,
    bestRun: old.bestStreak ?? 0,
    bestBlitz: old.bestBlitz ?? 0,
    daily: Object.fromEntries(
      Object.entries(old.daily ?? {}).map(([k, d]) => [k, { score: d.s, results: d.g.map((n) => n === 1) }]),
    ),
  };
  const p = old.prefs ?? {};
  return {
    version: 2,
    progress,
    prefs: {
      region: p.region ?? base.prefs.region,
      count: p.count ?? base.prefs.count,
      lookalikes: p.hard ?? base.prefs.lookalikes,
      autocomplete: p.auto ?? base.prefs.autocomplete,
      theme: p.theme === 'light' ? 'light' : 'dark',
    },
  };
}

/** Merge unknown input over defaults so a missing field never crashes the app. */
function sanitize(raw: Partial<Snapshot>): Snapshot {
  const base = defaultSnapshot();
  return {
    version: 2,
    prefs: {
      ...base.prefs,
      ...raw.prefs,
      theme: raw.prefs?.theme === 'light' ? 'light' : 'dark',
    },
    progress: { ...base.progress, ...raw.progress },
  };
}

export class BrowserStorage implements StoragePort {
  load(): Snapshot {
    try {
      const current = localStorage.getItem(KEY);
      if (current) return sanitize(JSON.parse(current) as Partial<Snapshot>);
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) return migrateV1(JSON.parse(legacy) as LegacyV1);
    } catch {
      /* unreadable or blocked storage: start fresh */
    }
    return defaultSnapshot();
  }

  save(snapshot: Snapshot): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(snapshot));
    } catch {
      /* private mode or quota: keep playing, progress just won't persist */
    }
  }
}

/** For tests and environments without storage. */
export class MemoryStorage implements StoragePort {
  constructor(private snapshot: Snapshot = defaultSnapshot()) {}
  load(): Snapshot {
    return structuredClone(this.snapshot);
  }
  save(snapshot: Snapshot): void {
    this.snapshot = structuredClone(snapshot);
  }
}
