import { ALL_CODES } from './catalog';
import type { FlagProgress, Progress } from './types';

/** Correct answers in a row before a flag counts as mastered. */
export const MASTERY_RUN = 2;

export function emptyProgress(): Progress {
  return { flags: {}, answered: 0, correct: 0, bestRun: 0, bestBlitz: 0, daily: {} };
}

export const isMastered = (p: Progress, code: string): boolean => (p.flags[code]?.run ?? 0) >= MASTERY_RUN;

export function needsReview(p: Progress, code: string): boolean {
  const f = p.flags[code];
  return !!f && f.wrong > 0 && f.run < MASTERY_RUN;
}

export function masteredCount(p: Progress, codes: readonly string[] = ALL_CODES): number {
  return codes.filter((c) => isMastered(p, c)).length;
}

export function reviewList(p: Progress): string[] {
  return ALL_CODES.filter((c) => needsReview(p, c));
}

export interface AnswerOutcome {
  progress: Progress;
  newlyMastered: boolean;
}

/** Pure update: returns a new Progress and does not touch the input. */
export function applyAnswer(p: Progress, code: string, correct: boolean): AnswerOutcome {
  const prev: FlagProgress = p.flags[code] ?? { right: 0, wrong: 0, run: 0 };
  const next: FlagProgress = correct
    ? { right: prev.right + 1, wrong: prev.wrong, run: prev.run + 1 }
    : { right: prev.right, wrong: prev.wrong + 1, run: 0 };
  return {
    progress: {
      ...p,
      flags: { ...p.flags, [code]: next },
      answered: p.answered + 1,
      correct: p.correct + (correct ? 1 : 0),
    },
    newlyMastered: correct && prev.run < MASTERY_RUN && next.run >= MASTERY_RUN,
  };
}

/* Dates are local calendar days so "today" matches what the player sees. */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function previousDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return dateKey(new Date(y, m - 1, d - 1));
}

/** Consecutive days with a recorded daily result, ending today or yesterday. */
export function dailyStreak(p: Progress, today: string): number {
  let key = p.daily[today] ? today : previousDay(today);
  let n = 0;
  while (p.daily[key]) {
    n++;
    key = previousDay(key);
  }
  return n;
}
