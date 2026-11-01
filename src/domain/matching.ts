import { CATALOG, country, type CatalogEntry } from './catalog';
import { editDistance, normalize } from './text';

/** Typo budget by answer length. Short names must be exact so Oman never passes for Iran. */
function tolerance(len: number): number {
  if (len >= 12) return 2;
  if (len >= 5) return 1;
  return 0;
}

/** True when `input` is the country's name or alias, allowing a small typo. Only the target is compared. */
export function isCorrect(code: string, input: string): boolean {
  const t = normalize(input);
  if (!t) return false;
  return country(code).keys.some((k) => {
    if (k === t) return true;
    const tol = tolerance(k.length);
    return tol > 0 && Math.abs(k.length - t.length) <= tol && editDistance(k, t) <= tol;
  });
}

/** Autocomplete: names that start with the query first, then names that contain it. */
export function suggest(query: string, limit = 6): CatalogEntry[] {
  const q = normalize(query);
  if (!q) return [];
  const starts: CatalogEntry[] = [];
  const contains: CatalogEntry[] = [];
  for (const c of CATALOG) {
    if (c.keys.some((k) => k.startsWith(q))) starts.push(c);
    else if (c.keys.some((k) => k.includes(q))) contains.push(c);
  }
  return [...starts, ...contains].slice(0, limit);
}

/** Learn-page search: country, alias or capital. */
export function search(query: string, pool: readonly CatalogEntry[] = CATALOG): CatalogEntry[] {
  const q = normalize(query);
  if (!q) return pool.slice();
  return pool.filter((c) => c.keys.some((k) => k.includes(q)) || c.normCapital.includes(q));
}
