export type Territory = {
  code: string;   // ISO 3166-1 alpha-2 or similar
  name: string;
  aliases: string[];
  sovereign?: string; // administering country, for context
};

// Flag images served from flagcdn.com using lowercase alpha-2 codes.
// Territories that need special codes are noted inline.
export const TERRITORIES: Territory[] = [
  // British Overseas Territories
  { code: "gi", name: "Gibraltar", aliases: [], sovereign: "United Kingdom" },
  { code: "fk", name: "Falkland Islands", aliases: ["Malvinas", "Falklands"], sovereign: "United Kingdom" },
  { code: "bm", name: "Bermuda", aliases: [], sovereign: "United Kingdom" },
  { code: "ky", name: "Cayman Islands", aliases: ["Caymans"], sovereign: "United Kingdom" },
  { code: "vg", name: "British Virgin Islands", aliases: ["BVI"], sovereign: "United Kingdom" },
  { code: "tc", name: "Turks and Caicos Islands", aliases: ["Turks and Caicos", "TCI"], sovereign: "United Kingdom" },
  { code: "ms", name: "Montserrat", aliases: [], sovereign: "United Kingdom" },
  { code: "ai", name: "Anguilla", aliases: [], sovereign: "United Kingdom" },
  { code: "sh", name: "Saint Helena", aliases: ["St Helena", "St. Helena"], sovereign: "United Kingdom" },
  { code: "io", name: "British Indian Ocean Territory", aliases: ["BIOT", "Diego Garcia"], sovereign: "United Kingdom" },
  { code: "pn", name: "Pitcairn Islands", aliases: ["Pitcairn"], sovereign: "United Kingdom" },

  // French overseas territories
  { code: "gp", name: "Guadeloupe", aliases: [], sovereign: "France" },
  { code: "mq", name: "Martinique", aliases: [], sovereign: "France" },
  { code: "gf", name: "French Guiana", aliases: ["Guyane"], sovereign: "France" },
  { code: "re", name: "Réunion", aliases: ["Reunion"], sovereign: "France" },
  { code: "mf", name: "Saint Martin", aliases: ["St Martin", "St. Martin"], sovereign: "France" },
  { code: "bl", name: "Saint Barthélemy", aliases: ["Saint Barthelemy", "St Barts", "St. Barts"], sovereign: "France" },
  { code: "pm", name: "Saint Pierre and Miquelon", aliases: ["Saint-Pierre and Miquelon", "St Pierre and Miquelon"], sovereign: "France" },
  { code: "wf", name: "Wallis and Futuna", aliases: [], sovereign: "France" },
  { code: "pf", name: "French Polynesia", aliases: ["Tahiti"], sovereign: "France" },
  { code: "nc", name: "New Caledonia", aliases: [], sovereign: "France" },
  { code: "yt", name: "Mayotte", aliases: [], sovereign: "France" },
  { code: "tf", name: "French Southern Territories", aliases: ["TAAF"], sovereign: "France" },

  // Dutch / Kingdom of the Netherlands
  { code: "aw", name: "Aruba", aliases: [], sovereign: "Netherlands" },
  { code: "cw", name: "Curaçao", aliases: ["Curacao"], sovereign: "Netherlands" },
  { code: "sx", name: "Sint Maarten", aliases: [], sovereign: "Netherlands" },
  { code: "bq", name: "Caribbean Netherlands", aliases: ["Bonaire", "Bonaire Sint Eustatius and Saba"], sovereign: "Netherlands" },

  // US territories
  { code: "pr", name: "Puerto Rico", aliases: [], sovereign: "United States" },
  { code: "vi", name: "US Virgin Islands", aliases: ["United States Virgin Islands", "USVI"], sovereign: "United States" },
  { code: "gu", name: "Guam", aliases: [], sovereign: "United States" },
  { code: "mp", name: "Northern Mariana Islands", aliases: ["CNMI"], sovereign: "United States" },
  { code: "as", name: "American Samoa", aliases: [], sovereign: "United States" },

  // Australian external territories
  { code: "cc", name: "Cocos Islands", aliases: ["Cocos (Keeling) Islands", "Keeling Islands"], sovereign: "Australia" },
  { code: "cx", name: "Christmas Island", aliases: [], sovereign: "Australia" },
  { code: "nf", name: "Norfolk Island", aliases: [], sovereign: "Australia" },

  // New Zealand associated / territories
  { code: "ck", name: "Cook Islands", aliases: [], sovereign: "New Zealand" },
  { code: "nu", name: "Niue", aliases: [], sovereign: "New Zealand" },
  { code: "tk", name: "Tokelau", aliases: [], sovereign: "New Zealand" },

  // Danish autonomous territories
  { code: "fo", name: "Faroe Islands", aliases: ["Faroes", "Færøerne"], sovereign: "Denmark" },
  { code: "gl", name: "Greenland", aliases: ["Kalaallit Nunaat"], sovereign: "Denmark" },

  // Norwegian dependencies
  { code: "sj", name: "Svalbard and Jan Mayen", aliases: ["Svalbard"], sovereign: "Norway" },

  // Chinese special administrative regions
  { code: "hk", name: "Hong Kong", aliases: ["HK"], sovereign: "China" },
  { code: "mo", name: "Macau", aliases: ["Macao"], sovereign: "China" },

  // Miscellaneous self-governing / dependent territories
  { code: "gg", name: "Guernsey", aliases: [], sovereign: "United Kingdom" },
  { code: "je", name: "Jersey", aliases: [], sovereign: "United Kingdom" },
  { code: "im", name: "Isle of Man", aliases: [], sovereign: "United Kingdom" },
  { code: "ax", name: "Åland Islands", aliases: ["Aland Islands", "Aland"], sovereign: "Finland" },
  { code: "gi", name: "Gibraltar", aliases: [], sovereign: "United Kingdom" },
  { code: "gs", name: "South Georgia and the South Sandwich Islands", aliases: ["South Georgia", "SGSSI"], sovereign: "United Kingdom" },
  { code: "ac", name: "Ascension Island", aliases: [], sovereign: "United Kingdom" },
  { code: "ta", name: "Tristan da Cunha", aliases: [], sovereign: "United Kingdom" },
  { code: "gu", name: "Guam", aliases: [], sovereign: "United States" },
];

// Deduplicate by code+name
const seen = new Set<string>();
export const TERRITORY_POOL: Territory[] = TERRITORIES.filter((t) => {
  const key = `${t.code}:${t.name}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

export function flagUrl(code: string): string {
  return `https://flagcdn.com/w320/${code.toLowerCase()}.png`;
}

export function normalise(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function matchesTerritory(input: string, territory: Territory): boolean {
  const n = normalise(input);
  if (normalise(territory.name) === n) return true;
  return territory.aliases.some((a) => normalise(a) === n);
}
