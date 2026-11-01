/** Flags that people mix up. Used for "Look-alikes" answer choices and the detail panel. */
const GROUPS: readonly (readonly string[])[] = [
  ['ro', 'td', 'ad', 'md'],
  ['id', 'mc', 'pl'],
  ['ie', 'ci', 'it', 'in', 'ne'],
  ['it', 'mx', 'hu', 'bg'],
  ['ru', 'sk', 'si', 'rs', 'hr'],
  ['nl', 'lu', 'fr', 'py', 'ru'],
  ['dk', 'no', 'se', 'fi', 'is'],
  ['au', 'nz', 'fj', 'tv'],
  ['eg', 'sy', 'ye', 'iq', 'sd'],
  ['jo', 'ps', 'kw', 'ae', 'sd'],
  ['ml', 'sn', 'gn', 'cm', 'bj'],
  ['bo', 'gh', 'lt', 'et'],
  ['us', 'lr', 'my', 'cu'],
  ['ch', 'to', 'ge'],
  ['tr', 'tn', 'dz', 'pk', 'mr'],
  ['de', 'be'],
  ['vn', 'cn', 'ma'],
  ['jp', 'bd', 'pw'],
  ['co', 'ec', 've'],
  ['at', 'lv', 'pe'],
  ['ca', 'pe'],
  ['ar', 'uy', 'gr', 'fi', 'il'],
  ['hn', 'ni', 'sv', 'gt'],
  ['th', 'cr'],
  ['cz', 'ph', 'cu'],
  ['qa', 'bh'],
];

const INDEX: ReadonlyMap<string, readonly string[]> = (() => {
  const sets = new Map<string, Set<string>>();
  for (const group of GROUPS) {
    for (const a of group) {
      const set = sets.get(a) ?? new Set<string>();
      for (const b of group) if (a !== b) set.add(b);
      sets.set(a, set);
    }
  }
  return new Map([...sets].map(([k, v]) => [k, [...v]]));
})();

export function lookalikesOf(code: string): readonly string[] {
  return INDEX.get(code) ?? [];
}
