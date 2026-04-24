import englishPayload from "./english-wiki-mushrooms.json";
import icelandicPayload from "./icelandic-wiki-mushrooms.json";

export type WikiMushroom = {
  pageid: number;
  title: string;
  pageUrl: string;
  thumbnailUrl: string | null;
  originalUrl: string | null;
  thumbWidth: number | null;
  thumbHeight: number | null;
};

const icelandicSpecies = icelandicPayload.species as WikiMushroom[];
const englishSpecies = englishPayload.species as WikiMushroom[];

/** Entries with a lead image from Wikipedia (required for the guessing UI). */
export const ICELANDIC_MUSHROOM_GUESS_POOL = icelandicSpecies.filter((m) => Boolean(m.thumbnailUrl));
export const ENGLISH_MUSHROOM_GUESS_POOL = englishSpecies.filter((m) => Boolean(m.thumbnailUrl));
export const MUSHROOM_GUESS_POOL = ICELANDIC_MUSHROOM_GUESS_POOL;

export function getMushroomGuessPool(locale: "en" | "is"): WikiMushroom[] {
  return locale === "en" ? ENGLISH_MUSHROOM_GUESS_POOL : ICELANDIC_MUSHROOM_GUESS_POOL;
}

/** Primary label before a trailing parenthetical, e.g. "Rauðhetta (sveppur)" → "Rauðhetta". */
export function mushroomPrimaryTitle(title: string): string {
  return title.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

/** Match user input to a species (exact full title or primary name only, case-insensitive). */
export function findMushroomByGuessInput(raw: string): WikiMushroom | undefined {
  const q = raw.trim().toLowerCase();
  if (!q) return undefined;
  return (
    MUSHROOM_GUESS_POOL.find((m) => m.title.toLowerCase() === q) ??
    MUSHROOM_GUESS_POOL.find((m) => mushroomPrimaryTitle(m.title).toLowerCase() === q)
  );
}
