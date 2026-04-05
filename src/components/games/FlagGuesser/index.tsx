"use client";

import { useMemo, useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { parseGameDateParam, ymdUtcNow } from "@/lib/game-date";
import { WORLD_COUNTRIES } from "@/data/worldCountries";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { guessesToXp, xpLabel } from "@/lib/xp";
import MiniLeaderboard from "@/components/ui/MiniLeaderboard";

const copy = {
  en: {
    title: "Flag Guess",
    subtitle: "Guess today's mystery flag. Type a country name to make a guess.",
    input: "Type a country…",
    guess: "Guess",
    solved: "Solved!",
    reset: "Reset",
    noMatch: "Country not found.",
    already: "Already guessed.",
    heading: "Guesses",
    correct: "Correct",
    wrong: "Wrong",
  },
  is: {
    title: "Fánaþraut",
    subtitle: "Giskaðu á fána dagsins. Skrifaðu land til að giska.",
    input: "Skrifaðu land…",
    guess: "Giska",
    solved: "Leyst!",
    reset: "Hreinsa",
    noMatch: "Land fannst ekki.",
    already: "Þegar giskað.",
    heading: "Getgátur",
    correct: "Rétt",
    wrong: "Rangt",
  },
} as const;

const LEFT_FADE =
  "linear-gradient(to right, var(--color-background) 0%, var(--color-background) 28%, transparent 100%)";

const TILE_COUNT = 6;

function seededIndex(seed: string, mod: number) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h) % mod;
}

/** Seeded Fisher-Yates shuffle — deterministic per day */
function seededShuffle(arr: number[], seed: string): number[] {
  const out = [...arr];
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  for (let i = out.length - 1; i > 0; i--) {
    h ^= i; h = Math.imul(h, 16777619);
    const j = Math.abs(h) % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function FlagGuesserInner() {
  const locale = (useLocale() as "en" | "is") || "en";
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  const day = useMemo(() => parseGameDateParam(dateParam) ?? ymdUtcNow(), [dateParam]);
  const isArchive = useMemo(() => day !== ymdUtcNow(), [day]);
  const t = copy[locale];
  const { user } = useAuth();

  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [earnedXp, setEarnedXp] = useState<number | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  const [confirmGiveUp, setConfirmGiveUp] = useState(false);
  const helpSeenKey = "help-seen:flags";
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(helpSeenKey)) setShowHelp(true);
    } catch {}
  }, []);

  function dismissHelp(permanent: boolean) {
    setShowHelp(false);
    if (permanent) {
      try { window.localStorage.setItem(helpSeenKey, "1"); } catch {}
    }
  }
  const scoreSavedRef = useRef(false);
  const confettiFiredRef = useRef(false);
  const prevUserRef = useRef<string | null | undefined>(undefined);

  const storageKey = `flag-guesser:${day}`;
  const target = useMemo(() => WORLD_COUNTRIES[seededIndex(day + "flag", WORLD_COUNTRIES.length)]!, [day]);

  // Reset game when user logs in (discard anonymous play)
  useEffect(() => {
    const prev = prevUserRef.current;
    prevUserRef.current = user?.id ?? null;
    if (prev === undefined) return;
    if (!prev && user) {
      try { window.localStorage.removeItem(storageKey); } catch {}
      setGuesses([]);
      setGaveUp(false);
      setEarnedXp(null);
      setError("");
      setValue("");
      setConfirmGiveUp(false);
      scoreSavedRef.current = false;
      confettiFiredRef.current = false;
    }
  }, [user, storageKey]);

  useEffect(() => {
    setGuesses([]);
    setGaveUp(false);
    setEarnedXp(null);
    setError("");
    setValue("");
    setConfirmGiveUp(false);
    scoreSavedRef.current = false;
    confettiFiredRef.current = false;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { guesses?: string[]; gaveUp?: boolean };
      if (Array.isArray(parsed)) { setGuesses(parsed); return; }
      if (parsed.guesses) setGuesses(parsed.guesses);
      if (parsed.gaveUp) setGaveUp(true);
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    try { window.localStorage.setItem(storageKey, JSON.stringify({ guesses, gaveUp })); } catch {}
  }, [guesses, gaveUp, storageKey]);

  const MAX_GUESSES = 7;
  const won = guesses.includes(target.name);
  const failed = !won && guesses.filter((n) => n !== target.name).length >= MAX_GUESSES;

  useEffect(() => {
    if (!won || scoreSavedRef.current || !user) return;
    scoreSavedRef.current = true;
    const guessCount = guesses.length;
    const xp = guessesToXp(guessCount);
    supabase.from("game_scores")
      .insert({ user_id: user.id, game_type: "flags", game_date: day, guesses: guessCount, xp, won: true })
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

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    return WORLD_COUNTRIES.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 6);
  }, [value]);

  function onGuess() {
    const normalized = value.trim().toLowerCase();
    if (!normalized || won || failed || gaveUp) return;
    const match = WORLD_COUNTRIES.find((c) => c.name.toLowerCase() === normalized);
    if (!match) { setError(t.noMatch); return; }
    if (guesses.includes(match.name)) { setError(t.already); return; }
    setError("");
    setGuesses((g) => [match.name, ...g]);
    setValue("");
  }

  function clearDay() {
    setGuesses([]); setError(""); setGaveUp(false); setConfirmGiveUp(false);
    try { window.localStorage.removeItem(storageKey); } catch {}
    scoreSavedRef.current = false; confettiFiredRef.current = false;
  }

  function doGiveUp() {
    setGaveUp(true);
    setConfirmGiveUp(false);
  }

  const guessRows = useMemo(() =>
    guesses.map((name) => {
      const country = WORLD_COUNTRIES.find((c) => c.name === name);
      return { name, country, correct: name === target.name };
    }),
  [guesses, target]);

  /** Which tile indices are revealed, in the order they unlock */
  const revealOrder = useMemo(
    () => seededShuffle(Array.from({ length: TILE_COUNT }, (_, i) => i), day + "tiles"),
    [day]
  );

  /** How many tiles to reveal: one per wrong guess, all on win/give-up/failed */
  const wrongGuesses = guesses.filter((n) => n !== target.name).length;
  const revealedCount = won || gaveUp || failed
    ? TILE_COUNT
    : Math.min(wrongGuesses, TILE_COUNT);

  const revealedSet = useMemo(
    () => new Set(revealOrder.slice(0, revealedCount)),
    [revealOrder, revealedCount]
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setShowHelp(true)}
        className="fixed top-4 right-4 z-20 w-8 h-8 rounded-full border border-(--color-border) bg-(--color-surface) text-(--color-muted) text-sm font-bold hover:opacity-70 transition-opacity flex items-center justify-center shadow-sm"
        aria-label="How to play"
      >
        ?
      </button>

      {/* ── Right: Flag display (desktop only) ──────────────────── */}
      <div
        className="hidden md:block pointer-events-none absolute inset-y-0 right-0 select-none overflow-visible"
        style={{ width: "min(96vw, 1680px)" }}
      >
        {/* left-edge fade */}
        <div
          className="absolute inset-y-0 left-0 z-10"
          style={{ width: "min(56vw, 24rem)", background: LEFT_FADE }}
        />
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center justify-center pr-16">
          <motion.div
            key={target.code}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
            style={{ width: "clamp(280px, 36vw, 560px)" }}
          >
            {/* Flag with tile overlay */}
            <div
              className="rounded-2xl overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.18)] relative"
              style={{ aspectRatio: "3/2" }}
            >
              <img
                src={`https://flagcdn.com/w640/${target.code}.png`}
                alt="Mystery flag"
                className="w-full h-full object-cover"
              />
              {/* 3×2 cover tiles */}
              <div
                className="absolute inset-0 grid"
                style={{ gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(2, 1fr)" }}
              >
                {Array.from({ length: TILE_COUNT }, (_, i) => (
                  <motion.div
                    key={i}
                    initial={false}
                    animate={{ opacity: revealedSet.has(i) ? 0 : 1 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="bg-(--color-surface) border border-border/40"
                    style={{ backdropFilter: "blur(2px)" }}
                  />
                ))}
              </div>
            </div>
            {/* Country name reveal on win/giveup */}
            {(won || gaveUp) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="mt-4 text-center"
              >
                <p
                  className="text-2xl font-black tracking-tight"
                  style={{ fontFamily: "var(--font-sans)", color: won ? "#22c55e" : "var(--color-muted)" }}
                >
                  {target.name}
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* ── Left: Game UI ────────────────────────────────────────── */}
      <div className="relative z-10 max-w-xl px-8 pt-2 pb-10">

        {isArchive && (
          <div
            className="mb-4 rounded-xl border border-(--color-border) bg-(--color-surface) px-3 py-2 text-xs text-(--color-muted)"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            <span className="text-(--color-foreground) font-semibold">{day}</span>
            {" · "}
            <Link href={`/${locale}/flags`} className="underline underline-offset-2 hover:opacity-70 transition-opacity">
              Today&apos;s puzzle
            </Link>
          </div>
        )}

        {/* Help modal */}
        {showHelp && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
            onClick={() => dismissHelp(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-sm mx-4 rounded-2xl border border-(--color-border) bg-(--color-surface) p-6 shadow-[0_20px_60px_rgba(0,0,0,0.15)]"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-black mb-4 text-(--color-foreground)" style={{ fontFamily: "var(--font-display)" }}>
                How to play
              </h2>
              <div className="space-y-3 text-sm text-(--color-muted) leading-relaxed">
                <p>A mystery flag is shown — but it starts hidden behind tiles. <strong className="text-(--color-foreground)">Type a country name</strong> and submit your guess.</p>
                <p>Each wrong guess reveals one more tile, giving you a bigger look at the flag. You have <strong className="text-(--color-foreground)">7 guesses</strong> to identify the country.</p>
                <p>Fewer guesses = more XP. A new flag every day.</p>
              </div>
              <div className="mt-5 pt-4 border-t border-(--color-border)">
                <p className="text-[11px] uppercase tracking-[0.18em] text-(--color-muted) font-semibold mb-2">XP scoring</p>
                <div className="flex flex-wrap gap-2">
                  {[{ label: "1 guess", xp: 1000 }, { label: "2 guesses", xp: 800 }, { label: "3 guesses", xp: 600 }, { label: "4–5 guesses", xp: 400 }, { label: "6–7 guesses", xp: 200 }].map((r) => (
                    <span key={r.label} className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "var(--color-tag)", color: "var(--color-tag-text)", fontFamily: "var(--font-sans)" }}>
                      {r.label} → +{r.xp}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => dismissHelp(false)}
                  className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white bg-(--color-blue) hover:opacity-90 transition-opacity"
                >
                  Got it
                </button>
                <button
                  type="button"
                  onClick={() => dismissHelp(true)}
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold border border-(--color-border) text-(--color-muted) hover:opacity-60 transition-opacity"
                >
                  Don&apos;t show again
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Title */}
        <div className="mb-12">
          <motion.h1
            className="text-[clamp(3.25rem,10vw,5.5rem)] font-black leading-[0.95] tracking-tight text-(--color-blue) mb-4"
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
          <motion.p
            className="text-[10px] tracking-[0.25em] text-(--color-muted) mt-6 opacity-80"
            style={{ fontFamily: "var(--font-sans)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {new Intl.DateTimeFormat("en-US", { weekday: "short", month: "long", day: "numeric" }).format(new Date())}
          </motion.p>
        </div>

        {/* Failed / gave up banner */}
        {(failed || gaveUp) && !won && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-5 rounded-2xl border border-(--color-border) bg-(--color-surface) px-4 py-3 flex items-center justify-between gap-4"
          >
            <div>
              <p className="font-bold text-(--color-muted)">
                {failed ? "Out of guesses — " : "The answer was "}
                <span className="text-(--color-foreground)">{target.name}</span>
              </p>
              <p className="text-xs text-(--color-muted) mt-0.5">No XP awarded</p>
            </div>
            <button
              type="button"
              onClick={clearDay}
              className="text-[11px] tracking-[0.14em] uppercase font-semibold hover:opacity-60 transition-opacity shrink-0"
              style={{ color: "var(--color-blue)", fontFamily: "var(--font-sans)" }}
            >
              Try again
            </button>
          </motion.div>
        )}

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
              <p className="text-xs text-(--color-muted) mt-0.5">{xpLabel(guesses.length)}</p>
            </div>
            {earnedXp !== null && (
              <div className="shrink-0 rounded-xl bg-(--color-blue) text-white px-3 py-1.5 text-center">
                <p className="text-[10px] font-semibold opacity-70 leading-none">XP</p>
                <p className="text-lg font-black leading-none">+{earnedXp}</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Mobile flag display — shown only on small screens */}
        <motion.div
          className="block md:hidden mb-6"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className="relative rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.15)]"
            style={{ aspectRatio: "3/2" }}
          >
            <img
              src={`https://flagcdn.com/w640/${target.code}.png`}
              alt="Mystery flag"
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-0 grid"
              style={{ gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(2, 1fr)" }}
            >
              {Array.from({ length: TILE_COUNT }, (_, i) => (
                <motion.div
                  key={i}
                  initial={false}
                  animate={{ opacity: revealedSet.has(i) ? 0 : 1 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="bg-(--color-surface) border border-border/40"
                  style={{ backdropFilter: "blur(2px)" }}
                />
              ))}
            </div>
          </div>
          {(won || gaveUp) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="mt-3 text-center"
            >
              <p
                className="text-xl font-black tracking-tight"
                style={{ fontFamily: "var(--font-sans)", color: won ? "#22c55e" : "var(--color-muted)" }}
              >
                {target.name}
              </p>
            </motion.div>
          )}
        </motion.div>

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
                disabled={won || gaveUp || failed}
                className="w-full rounded-xl border border-(--color-border) bg-white px-4 py-2.5 text-sm outline-none focus:border-(--color-blue) transition-colors"
              />
              {!won && !gaveUp && !failed && suggestions.length > 0 && (
                <div className="absolute top-full mt-1 left-0 right-0 rounded-xl border border-(--color-border) bg-white shadow-lg overflow-y-auto z-20 max-h-48">
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
              disabled={won || gaveUp || failed}
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
          <div className="flex items-center justify-between pt-5 pb-1">
            <h2
              className="text-base font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-foreground)" }}
            >
              {t.heading}
              <span
                className="ml-2 text-[10px] tracking-[0.18em] uppercase px-2 py-0.5 rounded-full font-semibold"
                style={{ background: "var(--color-tag)", color: "var(--color-tag-text)", fontFamily: "var(--font-sans)" }}
              >
                {guessRows.length} / {MAX_GUESSES}
              </span>
            </h2>
            {won || gaveUp || failed ? (
              <button
                type="button"
                onClick={clearDay}
                className="text-[11px] tracking-[0.14em] uppercase font-semibold hover:opacity-60 transition-opacity"
                style={{ color: "var(--color-muted)", fontFamily: "var(--font-sans)" }}
              >
                {t.reset}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmGiveUp(true)}
                className="text-[11px] tracking-[0.14em] uppercase font-semibold hover:opacity-60 transition-opacity"
                style={{ color: "var(--color-muted)", fontFamily: "var(--font-sans)" }}
              >
                Give up
              </button>
            )}

            {/* Give up modal */}
            {confirmGiveUp && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
                onClick={() => setConfirmGiveUp(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full max-w-sm mx-4 rounded-2xl border border-(--color-border) bg-(--color-surface) p-6 shadow-[0_20px_60px_rgba(0,0,0,0.15)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h2
                    className="text-xl font-black mb-2 text-(--color-foreground)"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Give up?
                  </h2>
                  <p className="text-sm text-(--color-muted) leading-relaxed mb-6">
                    You won&apos;t earn any XP for today&apos;s game, and the flag will be revealed. You can still play again but won&apos;t appear on the leaderboard.
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={doGiveUp}
                      className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity"
                      style={{ background: "#ef4444" }}
                    >
                      Yes, give up
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmGiveUp(false)}
                      className="flex-1 rounded-xl py-2.5 text-sm font-semibold border border-(--color-border) text-(--color-muted) hover:opacity-60 transition-opacity"
                    >
                      Keep going
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </div>

          {guessRows.length === 0 ? (
            <div className="py-8 text-sm text-(--color-muted) opacity-60">
              No guesses yet
            </div>
          ) : (
            <div>
              {guessRows.map((r) => (
                <div
                  key={r.name}
                  className="grid items-center gap-3 py-4 border-b border-(--color-border)"
                  style={{ gridTemplateColumns: "auto 1fr auto" }}
                >
                  {r.country && (
                    <span
                      className={`fi fi-${r.country.code} rounded-sm shrink-0`}
                      style={{ width: 20, height: 15, display: "inline-block" }}
                    />
                  )}
                  <span
                    className="font-bold text-base text-(--color-foreground)"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {r.name}
                  </span>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: r.correct ? "#dcfce7" : "var(--color-tag)",
                      color: r.correct ? "#16a34a" : "var(--color-muted)",
                    }}
                  >
                    {r.correct ? t.correct : t.wrong}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8"
        >
          <MiniLeaderboard />
        </motion.div>
      </div>
    </>
  );
}

export default function FlagGuesser() {
  return (
    <Suspense
      fallback={
        <div
          className="relative min-h-[40vh] grid place-items-center text-(--color-muted) text-sm"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          Loading…
        </div>
      }
    >
      <FlagGuesserInner />
    </Suspense>
  );
}
