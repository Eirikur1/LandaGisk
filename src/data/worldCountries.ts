import countries from "world-countries";

export type WorldCountry = {
  code: string;  // ISO 3166-1 alpha-2 lowercase (e.g. "gh")
  ccn3: string;  // ISO 3166-1 numeric string (e.g. "288") — matches Natural Earth geo IDs
  cca3: string;  // ISO 3166-1 alpha-3 (e.g. "GHA") — used for border lookup
  borders: string[]; // cca3 codes of bordering countries
  name: string;
  lat: number;
  lon: number;
};

/** All 193 UN member states with coordinates, sorted alphabetically. */
export const WORLD_COUNTRIES: WorldCountry[] = countries
  .filter(
    (c) =>
      c.unMember === true &&
      Boolean(c.ccn3) &&
      Array.isArray(c.latlng) &&
      c.latlng.length === 2
  )
  .map((c) => ({
    code: c.cca2.toLowerCase(),
    ccn3: c.ccn3,
    cca3: c.cca3,
    borders: c.borders ?? [],
    name: c.name.common,
    lat: c.latlng[0],
    lon: c.latlng[1],
  }))
  .sort((a, b) => a.name.localeCompare(b.name));
