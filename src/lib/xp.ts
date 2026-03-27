/** XP awarded for solving the country game in N guesses. */
export const WORLD_XP: Record<number, number> = {
  1: 1000,
  2: 800,
  3: 600,
  4: 450,
  5: 300,
  6: 200,
};

/** Minimum XP for solving in 7+ guesses. */
export const WORLD_XP_MIN = 100;

export function guessesToXp(guesses: number): number {
  return WORLD_XP[guesses] ?? WORLD_XP_MIN;
}

/** Rows for info UI (country game XP ladder). */
export function worldXpTable(): { label: string; xp: number }[] {
  const rows: { label: string; xp: number }[] = [];
  for (let n = 1; n <= 6; n++) {
    rows.push({
      label: `${n} ${n === 1 ? "guess" : "guesses"}`,
      xp: WORLD_XP[n]!,
    });
  }
  rows.push({ label: "7+ guesses", xp: WORLD_XP_MIN });
  return rows;
}

/** Human-readable label: "1 guess · 1000 XP" */
export function xpLabel(guesses: number): string {
  const xp = guessesToXp(guesses);
  return `${guesses} ${guesses === 1 ? "guess" : "guesses"} · ${xp} XP`;
}
