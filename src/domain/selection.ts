import { ALL_CODES, CATALOG, country } from './catalog';
import { lookalikesOf } from './lookalikes';
import { MASTERY_RUN } from './progress';
import { shuffle, type Rng } from './rng';
import type { Progress } from './types';

/**
 * How likely a flag is to be asked. Missed flags come back most, mastered flags least.
 * Unseen flags sit between so new material keeps flowing in.
 */
export function weightOf(p: Progress, code: string): number {
  const f = p.flags[code];
  if (!f) return 2;
  if (f.run >= MASTERY_RUN) return 0.4;
  if (f.wrong > 0) return 4;
  return 1.5;
}

/** Weighted shuffle without replacement (Efraimidis-Spirakis): key = u^(1/w), sort descending. */
export function weightedOrder(codes: readonly string[], p: Progress, rng: Rng = Math.random): string[] {
  return codes
    .map((c) => [c, Math.pow(rng(), 1 / weightOf(p, c))] as const)
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c);
}

export interface OptionConfig {
  /** Prefer flags that resemble the answer instead of random ones. */
  lookalikes: boolean;
  /** Where random distractors come from. */
  pool: readonly string[];
}

/** Four shuffled codes: the answer plus three distractors. */
export function buildOptions(answer: string, cfg: OptionConfig, rng: Rng = Math.random): string[] {
  const picked: string[] = [];
  const used = new Set([answer]);
  const take = (candidates: readonly string[]) => {
    for (const c of candidates) {
      if (picked.length >= 3) return;
      if (!used.has(c)) {
        used.add(c);
        picked.push(c);
      }
    }
  };
  if (cfg.lookalikes) {
    take(shuffle(lookalikesOf(answer), rng));
    const region = country(answer).region;
    take(shuffle(CATALOG.filter((c) => c.region === region).map((c) => c.code), rng));
  } else {
    take(shuffle(cfg.pool, rng));
  }
  take(shuffle(ALL_CODES, rng));
  return shuffle([answer, ...picked], rng);
}
