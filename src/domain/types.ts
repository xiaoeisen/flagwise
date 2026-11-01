/** Shared domain types. Nothing in `domain/` imports from the DOM, storage or UI. */

export type RegionCode = 'AF' | 'AS' | 'EU' | 'NA' | 'SA' | 'OC';
export type RegionFilter = RegionCode | 'all';
export type ModeId = 'classic' | 'type' | 'streak' | 'blitz' | 'daily' | 'missed';
export type ThemePref = 'light' | 'dark';
export type QuestionCount = 10 | 20 | 50 | 'all';

export interface Country {
  /** ISO 3166-1 alpha-2, lowercase. Also the flag file name. */
  code: string;
  name: string;
  region: RegionCode;
  capital: string;
  /** Accepted spellings besides `name` when the player types an answer. */
  aliases: readonly string[];
}

/** Per-flag learning record. A flag counts as mastered after `MASTERY_RUN` correct answers in a row. */
export interface FlagProgress {
  right: number;
  wrong: number;
  run: number;
}

export interface DailyResult {
  score: number;
  results: boolean[];
}

export interface Progress {
  flags: Record<string, FlagProgress>;
  answered: number;
  correct: number;
  bestRun: number;
  bestBlitz: number;
  /** Keyed by local date, `YYYY-MM-DD`. Only the first attempt of a day is stored. */
  daily: Record<string, DailyResult>;
}

export interface Prefs {
  region: RegionFilter;
  count: QuestionCount;
  lookalikes: boolean;
  autocomplete: boolean;
  theme: ThemePref;
}

/** What gets persisted. Bump `version` and add a migration in `services/storage.ts` when this changes. */
export interface Snapshot {
  version: 2;
  prefs: Prefs;
  progress: Progress;
}

export interface Clock {
  now(): number;
}
