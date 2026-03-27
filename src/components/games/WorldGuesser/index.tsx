"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import { WORLD_COUNTRIES, type WorldCountry } from "@/data/worldCountries";
import GlobeMap from "./GlobeMap";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { guessesToXp, xpLabel } from "@/lib/xp";

type GuessRow = {
  name: string;
  distanceKm: number;
  direction: string;
  proximity: number;
  exact: boolean;
};

const copy = {
  en: {
    title: "Country Guess",
    subtitle: "Guess today's mystery country. Each guess shows distance & direction.",
    input: "Type a country…",
    guess: "Guess",
    solved: "Solved!",
    solvedText: "You found it",
    reset: "Reset",
    noMatch: "Country not found.",
    already: "Already guessed.",
    heading: "Guesses",
  },
  is: {
    title: "Landagisk",
    subtitle: "Giskaðu á land dagsins. Hver giska sýnir fjarlægð og átt.",
    input: "Skrifaðu land…",
    guess: "Giska",
    solved: "Leyst!",
    solvedText: "Þú fannst það",
    reset: "Hreinsa",
    noMatch: "Land fannst ekki.",
    already: "Þegar giskað.",
    heading: "Getgátur",
  },
} as const;

const LEFT_FADE =
  "linear-gradient(to right, var(--color-background) 0%, var(--color-background) 28%, transparent 100%)";


function toRad(deg: number) { return (deg * Math.PI) / 180; }

function distanceKm(a: WorldCountry, b: WorldCountry) {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function bearingDeg(a: WorldCountry, b: WorldCountry) {
  const dLon = toRad(b.lon - a.lon);
  const y = Math.sin(dLon) * Math.cos(toRad(b.lat));
  const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) - Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function directionArrow(bearing: number) {
  return ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"][Math.round(bearing / 45) % 8]!;
}

function ymdNow() { return new Date().toISOString().slice(0, 10); }

function seededIndex(seed: string, mod: number) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h) % mod;
}

export default function WorldGuesser() {
  const locale = (useLocale() as "en" | "is") || "en";
  const t = copy[locale];
  const { user } = useAuth();

  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [earnedXp, setEarnedXp] = useState<number | null>(null);
  const scoreSavedRef = useRef(false);
  const confettiFiredRef = useRef(false);

  const day = useMemo(() => ymdNow(), []);
  const storageKey = `world-guesser:${day}`;
  const target = useMemo(() => WORLD_COUNTRIES[seededIndex(day, WORLD_COUNTRIES.length)]!, [day]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed)) setGuesses(parsed);
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    try { window.localStorage.setItem(storageKey, JSON.stringify(guesses)); } catch {}
  }, [guesses, storageKey]);

  const won = guesses.map((n) => WORLD_COUNTRIES.find((c) => c.name === n)).some((c) => c?.code === target.code);

  useEffect(() => {
    if (!won || scoreSavedRef.current || !user) return;
    scoreSavedRef.current = true;
    const guessCount = guesses.length;
    const xp = guessesToXp(guessCount);
    supabase.from("game_scores")
      .insert({ user_id: user.id, game_type: "world", game_date: day, guesses: guessCount, xp, won: true })
      .then(({ error: err }) => { if (!err) setEarnedXp(xp); });
  }, [won, user, day, guesses.length]);

  useEffect(() => {
    if (!won || confettiFiredRef.current) return;
    confettiFiredRef.current = true;
    import("canvas-confetti").then(({ default: confetti }) => {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ["#2b5ceb", "#22c55e", "#f59e0b", "#ffffff"] });
      setTimeout(() => confetti({ particleCount: 60, spread: 100, origin: { y: 0.55 }, colors: ["#2b5ceb", "#22c55e", "#f59e0b"] }), 300);
    });
  }, [won]);

  const rows = useMemo<GuessRow[]>(() =>
    guesses
      .map((n) => WORLD_COUNTRIES.find((c) => c.name === n))
      .filter((c): c is WorldCountry => Boolean(c))
      .map((g) => {
        const d = distanceKm(g, target);
        const exact = g.code === target.code;
        return {
          name: g.name,
          distanceKm: Math.round(d),
          direction: exact ? "✓" : directionArrow(bearingDeg(g, target)),
          proximity: exact ? 100 : Math.max(0, Math.round((1 - d / 20015) * 100)),
          exact,
        };
      }),
  [guesses, target]);

  const guessedProximity = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      const c = WORLD_COUNTRIES.find((c) => c.name === r.name);
      if (c?.ccn3) map.set(c.ccn3, r.proximity);
    });
    return map;
  }, [rows]);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    return WORLD_COUNTRIES.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 6);
  }, [value]);

  function onGuess() {
    const normalized = value.trim().toLowerCase();
    if (!normalized || won) return;
    const match = WORLD_COUNTRIES.find((c) => c.name.toLowerCase() === normalized);
    if (!match) { setError(t.noMatch); return; }
    if (guesses.includes(match.name)) { setError(t.already); return; }
    setError("");
    setGuesses((g) => [match.name, ...g]);
    setValue("");
  }

  function clearDay() {
    setGuesses([]); setError("");
    try { window.localStorage.removeItem(storageKey); } catch {}
    scoreSavedRef.current = false;
  }

  return (
    <>
      {/* ── Right: Globe (absolute, like the hero) ──────────────── */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 select-none overflow-visible"
        style={{ width: "min(96vw, 1680px)" }}
      >
        {/* left-edge fade */}
        <div
          className="absolute inset-y-0 left-0 z-10"
          style={{ width: "min(56vw, 24rem)", background: LEFT_FADE }}
        />
        <div className="pointer-events-auto absolute inset-y-0 right-0 flex items-center">
          <GlobeMap
            guessedProximity={guessedProximity}
            targetCcn3={target.ccn3}
            won={won}
          />
        </div>
      </div>

      {/* ── Left: Game UI (mirrors hero left column) ────────────── */}
      <div className="relative z-10 max-w-xl px-8 pt-2 pb-10">

        {/* Title */}
        <div className="mb-8">
          <motion.h1
            className="text-[clamp(2.8rem,8vw,4.5rem)] font-black leading-[0.95] tracking-tight text-(--color-blue) mb-3"
            style={{ fontFamily: "var(--font-display)" }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            {t.title}
          </motion.h1>
          <motion.p
            className="text-sm text-(--color-muted) max-w-sm leading-relaxed"
            style={{ fontFamily: "var(--font-sans)" }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            {t.subtitle}
          </motion.p>
        </div>

        {/* Win banner */}
        {won && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-5 rounded-2xl border border-(--color-border) bg-(--color-surface) px-4 py-3 flex items-center justify-between gap-4"
          >
            <div>
              <p className="font-bold text-green-600">{t.solved} — {target.name}</p>
              <p className="text-xs text-(--color-muted) mt-0.5">{xpLabel(rows.length)}</p>
            </div>
            {earnedXp !== null && (
              <div className="shrink-0 rounded-xl bg-(--color-blue) text-white px-3 py-1.5 text-center">
                <p className="text-[10px] font-semibold opacity-70 leading-none">XP</p>
                <p className="text-lg font-black leading-none">+{earnedXp}</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Input */}
        <motion.div
          className="mb-4 relative"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                value={value}
                onChange={(e) => { setValue(e.target.value); setError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") onGuess(); }}
                placeholder={t.input}
                disabled={won}
                className="w-full rounded-xl border border-(--color-border) bg-white px-4 py-2.5 text-sm outline-none focus:border-(--color-blue) transition-colors"
              />
              {!won && suggestions.length > 0 && (
                <div className="absolute top-full mt-1 left-0 right-0 rounded-xl border border-(--color-border) bg-white shadow-lg overflow-hidden z-20">
                  {suggestions.map((s) => (
                    <button
                      key={s.code}
                      type="button"
                      onClick={() => { setValue(s.name); setError(""); }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-(--color-blue-light) transition-colors"
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onGuess}
              disabled={won}
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-white bg-(--color-blue) disabled:opacity-40 transition-opacity"
            >
              {t.guess}
            </button>
          </div>
          {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
        </motion.div>

        {/* Guess list */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="border-t border-(--color-border)"
        >
          <div className="flex items-center justify-between pt-4 pb-2">
            <span
              className="text-[10px] tracking-[0.22em] uppercase font-semibold"
              style={{ color: "var(--color-muted)", fontFamily: "var(--font-sans)" }}
            >
              {t.heading} ({rows.length})
            </span>
            <button
              type="button"
              onClick={clearDay}
              className="text-[10px] tracking-[0.14em] uppercase hover:opacity-50 transition-opacity"
              style={{ color: "var(--color-muted)", fontFamily: "var(--font-sans)" }}
            >
              {t.reset}
            </button>
          </div>

          {rows.length === 0 ? (
            <div className="py-8 text-center text-sm text-(--color-muted) opacity-60">
              No guesses yet
            </div>
          ) : (
            <div className="space-y-1.5">
              {rows.map((r) => (
                <div
                  key={r.name}
                  className="grid items-center gap-3 rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-2.5"
                  style={{ gridTemplateColumns: "1fr auto auto auto" }}
                >
                  <span className="font-semibold text-sm">{r.name}</span>
                  <span className="text-xs text-(--color-muted) whitespace-nowrap tabular-nums">
                    {r.distanceKm.toLocaleString()} km
                  </span>
                  <span className="text-base w-5 text-center">{r.direction}</span>
                  <span
                    className="text-sm font-black w-10 text-right tabular-nums"
                    style={{ color: r.exact ? "#22c55e" : "var(--color-blue)" }}
                  >
                    {r.proximity}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}
