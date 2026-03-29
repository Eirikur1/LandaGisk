/** UTC calendar day as YYYY-MM-DD (matches existing daily game keys). */
export function ymdUtcNow(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Validates `?date=` for archive play: not future, not older than ~2 years.
 * Returns the same string or null.
 */
export function parseGameDateParam(param: string | null): string | null {
  if (!param || !/^\d{4}-\d{2}-\d{2}$/.test(param)) return null;
  const today = ymdUtcNow();
  if (param > today) return null;
  const min = new Date();
  min.setUTCFullYear(min.getUTCFullYear() - 2);
  const minStr = min.toISOString().slice(0, 10);
  if (param < minStr) return null;
  return param;
}

/** Past UTC days only: yesterday .. (today - count). */
export function recentArchiveDates(count: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}
