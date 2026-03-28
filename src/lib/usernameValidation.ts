import { Filter } from "bad-words";

const filter = new Filter();

/** Extra blocked terms (EN + IS); extend as needed */
filter.addWords(
  "helvíti",
  "andskotinn",
  "fjandinn",
  "fokk",
  "hóra",
  "níga",
  "níggi",
);

const USERNAME_RE = /^[\p{L}\p{N}_-]{3,24}$/u;

/**
 * @returns `null` if valid, otherwise a short error message for the UI
 */
export function validateUsername(raw: string): string | null {
  const username = raw.trim();
  if (username.length < 3 || username.length > 24) {
    return "Username must be 3–24 characters.";
  }
  if (!USERNAME_RE.test(username)) {
    return "Use only letters, numbers, underscores, and hyphens.";
  }
  const lower = username.toLowerCase();
  if (filter.isProfane(username) || filter.isProfane(lower)) {
    return "Please choose a different username.";
  }
  return null;
}

export function normalizeUsername(raw: string): string {
  return raw.trim();
}
