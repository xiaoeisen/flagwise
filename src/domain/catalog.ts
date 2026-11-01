import { COUNTRIES } from './data/countries';
import { normalize } from './text';
import type { Country, RegionCode, RegionFilter } from './types';

/** A country plus the normalized strings used for matching and search. Built once at startup. */
export interface CatalogEntry extends Country {
  /** Normalized name and aliases. */
  keys: readonly string[];
  normCapital: string;
}

export const REGIONS: readonly { code: RegionCode; name: string }[] = [
  { code: 'AF', name: 'Africa' },
  { code: 'AS', name: 'Asia' },
  { code: 'EU', name: 'Europe' },
  { code: 'NA', name: 'North America' },
  { code: 'SA', name: 'South America' },
  { code: 'OC', name: 'Oceania' },
];

const REGION_NAME = new Map(REGIONS.map((r) => [r.code, r.name]));
export const regionName = (code: RegionCode): string => REGION_NAME.get(code) ?? code;

export const CATALOG: readonly CatalogEntry[] = COUNTRIES.map((c) => ({
  ...c,
  keys: [c.name, ...c.aliases].map(normalize),
  normCapital: normalize(c.capital),
}));

const BY_CODE = new Map(CATALOG.map((c) => [c.code, c]));
export const ALL_CODES: readonly string[] = CATALOG.map((c) => c.code);

export function country(code: string): CatalogEntry {
  const c = BY_CODE.get(code);
  if (!c) throw new Error(`Unknown country code: ${code}`);
  return c;
}

export function codesIn(region: RegionFilter): string[] {
  return CATALOG.filter((c) => region === 'all' || c.region === region).map((c) => c.code);
}

export const flagUrl = (code: string): string => `flags/${code}.svg`;
