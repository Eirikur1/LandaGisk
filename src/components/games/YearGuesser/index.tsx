"use client";

import { useMemo, useState, useEffect, useRef, Suspense } from "react";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { parseGameDateParam, ymdUtcNow } from "@/lib/game-date";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import MiniLeaderboard from "@/components/ui/MiniLeaderboard";
import { YEAR_PHOTOS } from "@/data/yearPhotos";

// ─── Constants ──────────────────────────────────────────────────────────────

const TOTAL_ROUNDS = 5;
const MIN_YEAR = 1900;
const MAX_YEAR = new Date().getFullYear();
const TOLERANCE_EXACT = 0;     // within 0 years → perfect (1000 XP)
const TOLERANCE_CLOSE = 3;     // within 3 years → great  (700 XP)
const TOLERANCE_OK = 10;       // within 10 years → ok    (400 XP)
const TOLERANCE_FAR = 25;      // within 25 years → far   (200 XP)
// beyond 25 years → miss (50 XP)

const FONT = "var(--font-sans)";

// ─── Copy ───────────────────────────────────────────────────────────────────

const copy = {
  en: {
    title: "Year Guess",
    subtitle: "Look at the photo and guess what year it was taken.",
    round: "Round",
    of: "of",
    hint: "Hint",
    submit: "Submit guess",
    nextRound: "Next round",
    seeFinal: "See results",
    restart: "Play again",
    yourGuess: "Your guess",
    answer: "The answer",
    perfect: "Perfect!",
    close: "Very close!",
    ok: "Not bad!",
    far: "A bit off",
    miss: "Way off",
    xpEarned: "XP earned",
    totalXp: "Total XP",
    finalTitle: "Game over",
    roundResult: "Round result",
    showHint: "Show hint",
    hideHint: "Hide hint",
    xpSaved: "Saved to leaderboard",
  },
  is: {
    title: "Ársgisk",
    subtitle: "Skoðaðu myndina og gissaðu hvaða ár hún var tekin.",
    round: "Lota",
    of: "af",
    hint: "Vísbending",
    submit: "Staðfesta gisk",
    nextRound: "Næsta lota",
    seeFinal: "Sjá niðurstöður",
    restart: "Spila aftur",
    yourGuess: "Gisk þitt",
    answer: "Rétt svar",
    perfect: "Fullkomið!",
    close: "Mjög nálægt!",
    ok: "Ekki slæmt!",
    far: "Nokkuð langt frá",
    miss: "Langt frá",
    xpEarned: "XP unnin",
    totalXp: "Heildarstig XP",
    finalTitle: "Leik lokið",
    roundResult: "Niðurstaða lotu",
    showHint: "Sýna vísbendingu",
    hideHint: "Fela vísbendingu",
    xpSaved: "Vistað á stigatöflu",
  },
} as const;

// ─── Types ──────────────────────────────────────────────────────────────────

type CopyT = typeof copy["en"] | typeof copy["is"];

// ─── Helpers ────────────────────────────────────────────────────────────────

function seededIndex(seed: string, mod: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % mod;
}

/** Pick `count` distinct indices from `total` using a seeded walk */
function seededPickN(seed: string, total: number, count: number): number[] {
  const picked: number[] = [];
  const used = new Set<number>();
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  while (picked.length < count) {
    h ^= picked.length;
    h = Math.imul(h, 16777619);
    const idx = Math.abs(h) % total;
    if (!used.has(idx)) {
      used.add(idx);
      picked.push(idx);
    }
  }
  return picked;
}

function xpForDiff(diff: number): number {
  if (diff <= TOLERANCE_EXACT) return 1000;
  if (diff <= TOLERANCE_CLOSE) return 700;
  if (diff <= TOLERANCE_OK)    return 400;
  if (diff <= TOLERANCE_FAR)   return 200;
  return 50;
}

function resultLabel(diff: number, t: CopyT): string {
  if (diff <= TOLERANCE_EXACT) return t.perfect;
  if (diff <= TOLERANCE_CLOSE) return t.close;
  if (diff <= TOLERANCE_OK)    return t.ok;
  if (diff <= TOLERANCE_FAR)   return t.far;
  return t.miss;
}

function resultColor(diff: number): string {
  if (diff <= TOLERANCE_EXACT) return "#22c55e"; // green
  if (diff <= TOLERANCE_CLOSE) return "#84cc16"; // lime
  if (diff <= TOLERANCE_OK)    return "#eab308"; // yellow
  if (diff <= TOLERANCE_FAR)   return "#f97316"; // orange
  return "#ef4444";                               // red
}

// ─── Slider ─────────────────────────────────────────────────────────────────

function YearSlider({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  const pct = ((value - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;

  return (
    <div className="w-full" style={{ fontFamily: FONT }}>
      {/* Year label */}
      <div className="flex justify-between items-end mb-2">
        <span className="text-xs text-(--color-muted)">{MIN_YEAR}</span>
        <motion.span
          key={value}
          initial={{ scale: 0.9, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-3xl font-black text-(--color-blue) tabular-nums"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {value}
        </motion.span>
        <span className="text-xs text-(--color-muted)">{MAX_YEAR}</span>
      </div>

      {/* Track + thumb */}
      <div className="relative h-10 flex items-center">
        {/* Background track */}
        <div
          className="absolute inset-x-0 h-2 rounded-full"
          style={{ background: "var(--color-border)" }}
        />
        {/* Filled track */}
        <div
          className="absolute left-0 h-2 rounded-full transition-none"
          style={{
            width: `${pct}%`,
            background: "var(--color-blue)",
          }}
        />
        {/* Actual range input (invisible, but interactive) */}
        <input
          type="range"
          min={MIN_YEAR}
          max={MAX_YEAR}
          step={1}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default"
          style={{ zIndex: 2 }}
        />
        {/* Custom thumb */}
        <div
          className="absolute w-6 h-6 rounded-full shadow-md border-2 pointer-events-none transition-none"
          style={{
            left: `calc(${pct}% - 12px)`,
            background: "var(--color-blue)",
            borderColor: "white",
            zIndex: 1,
          }}
        />
      </div>
    </div>
  );
}

// ─── Score bar ───────────────────────────────────────────────────────────────

function ScoreBar({ xp }: { xp: number }) {
  const pct = (xp / 1000) * 100;
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="h-full rounded-full"
        style={{ background: "var(--color-blue)" }}
      />
    </div>
  );
}

// ─── Round result card ───────────────────────────────────────────────────────

interface RoundResult {
  photoIndex: number;
  guessYear: number;
  actualYear: number;
  xp: number;
}

function RoundCard({ result, t }: { result: RoundResult; t: CopyT }) {
  const diff = Math.abs(result.guessYear - result.actualYear);
  const color = resultColor(diff);
  const label = resultLabel(diff, t);
  const photo = YEAR_PHOTOS[result.photoIndex]!;

  return (
    <div
      className="rounded-2xl overflow-hidden border"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
    >
      <div className="flex gap-3 p-4 items-start">
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden" style={{ background: "var(--color-border)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.imageUrl}
            alt={photo.title}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: "var(--color-foreground)" }}>{photo.title}</p>
          <div className="flex gap-4 mt-1">
            <div>
              <p className="text-[10px] text-(--color-muted) uppercase tracking-wider">{t.yourGuess}</p>
              <p className="text-xl font-black tabular-nums" style={{ fontFamily: "var(--font-display)", color }}>{result.guessYear}</p>
            </div>
            <div>
              <p className="text-[10px] text-(--color-muted) uppercase tracking-wider">{t.answer}</p>
              <p className="text-xl font-black tabular-nums" style={{ fontFamily: "var(--font-display)", color: "var(--color-foreground)" }}>{result.actualYear}</p>
            </div>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs font-semibold" style={{ color }}>{label}</p>
          <p className="text-lg font-black" style={{ fontFamily: "var(--font-display)", color: "var(--color-blue)" }}>+{result.xp}</p>
          <p className="text-[10px] text-(--color-muted)">XP</p>
        </div>
      </div>
    </div>
  );
}

// ─── Inner component (needs Suspense for useSearchParams) ────────────────────

function YearGuesserInner() {
  const locale = (useLocale() as "en" | "is") || "en";
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  const day = useMemo(() => parseGameDateParam(dateParam) ?? ymdUtcNow(), [dateParam]);
  const t = copy[locale];
  const { user } = useAuth();

  // Pick 5 distinct photos for the day
  const photoIndices = useMemo(
    () => seededPickN(day + "year", YEAR_PHOTOS.length, TOTAL_ROUNDS),
    [day],
  );

  const [round, setRound] = useState(0);
  const [guessYear, setGuessYear] = useState(Math.round((MIN_YEAR + MAX_YEAR) / 2));
  const [submitted, setSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [phase, setPhase] = useState<"playing" | "roundResult" | "final">("playing");
  const [earnedXp, setEarnedXp] = useState<number | null>(null);

  const storageKey = `year-guesser:${day}`;
  const scoreSavedRef = useRef(false);
  const prevUserRef = useRef<string | null | undefined>(undefined);

  const currentPhoto = YEAR_PHOTOS[photoIndices[round]!]!;

  // Reset on login (discard anonymous play)
  useEffect(() => {
    const prev = prevUserRef.current;
    prevUserRef.current = user?.id ?? null;
    if (prev === undefined) return;
    if (!prev && user) {
      try { window.localStorage.removeItem(storageKey); } catch {}
      setRound(0);
      setResults([]);
      setPhase("playing");
      setSubmitted(false);
      setShowHint(false);
      setGuessYear(Math.round((MIN_YEAR + MAX_YEAR) / 2));
      scoreSavedRef.current = false;
    }
  }, [user, storageKey]);

  // Load from localStorage
  useEffect(() => {
    setRound(0);
    setResults([]);
    setPhase("playing");
    setSubmitted(false);
    setShowHint(false);
    setGuessYear(Math.round((MIN_YEAR + MAX_YEAR) / 2));
    scoreSavedRef.current = false;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        round?: number;
        results?: RoundResult[];
        phase?: "playing" | "roundResult" | "final";
        submitted?: boolean;
      };
      if (parsed.round != null) setRound(parsed.round);
      if (parsed.results) setResults(parsed.results);
      if (parsed.phase) setPhase(parsed.phase);
      if (parsed.submitted) setSubmitted(parsed.submitted);
    } catch {}
  }, [storageKey]);

  // Save to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ round, results, phase, submitted }),
      );
    } catch {}
  }, [round, results, phase, submitted, storageKey]);

  // Save score to Supabase when final
  const totalXp = results.reduce((s, r) => s + r.xp, 0);
  useEffect(() => {
    if (phase !== "final" || scoreSavedRef.current || !user) return;
    scoreSavedRef.current = true;
    supabase
      .from("game_scores")
      .insert({
        user_id: user.id,
        game_type: "year",
        game_date: day,
        guesses: TOTAL_ROUNDS,
        xp: totalXp,
        won: true,
      })
      .then(({ error: err }) => {
        if (!err) setEarnedXp(totalXp);
      });
  }, [phase, user, day, totalXp]);

  function handleSubmit() {
    if (submitted) return;
    const actualYear = currentPhoto.year;
    const diff = Math.abs(guessYear - actualYear);
    const xp = xpForDiff(diff);
    const newResult: RoundResult = {
      photoIndex: photoIndices[round]!,
      guessYear,
      actualYear,
      xp,
    };
    setResults((prev) => [...prev, newResult]);
    setSubmitted(true);
    setPhase("roundResult");
  }

  function handleNext() {
    const nextRound = round + 1;
    if (nextRound >= TOTAL_ROUNDS) {
      setPhase("final");
    } else {
      setRound(nextRound);
      setSubmitted(false);
      setShowHint(false);
      setGuessYear(Math.round((MIN_YEAR + MAX_YEAR) / 2));
      setPhase("playing");
    }
  }

  // ── Final screen ─────────────────────────────────────────────────────────
  if (phase === "final") {
    return (
      <div
        className="w-full max-w-2xl xl:max-w-4xl mx-auto px-4 py-8"
        style={{ fontFamily: FONT }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2
            className="text-3xl font-black mb-1 text-(--color-foreground)"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t.finalTitle}
          </h2>
          <p className="text-sm text-(--color-muted) mb-6">
            {t.totalXp}:{" "}
            <span className="font-bold text-(--color-blue)">{totalXp} XP</span>
            {earnedXp !== null && (
              <span className="ml-2 text-xs text-green-600">· {t.xpSaved}</span>
            )}
          </p>

          {/* Score bar */}
          <div className="mb-6">
            <ScoreBar xp={Math.min(totalXp, 5000)} />
            <div className="flex justify-between text-[10px] text-(--color-muted) mt-1">
              <span>0 XP</span>
              <span>5000 XP</span>
            </div>
          </div>

          {/* Round results */}
          <div className="flex flex-col gap-3 mb-8">
            {results.map((r, i) => (
              <RoundCard key={i} result={r} t={t} />
            ))}
          </div>

          <MiniLeaderboard />
        </motion.div>
      </div>
    );
  }

  // ── Playing / round result ────────────────────────────────────────────────
  const currentResult = results[round];

  return (
    <div
      className="w-full max-w-2xl xl:max-w-4xl mx-auto px-4 py-8"
      style={{ fontFamily: FONT }}
    >
      {/* Header */}
      <div className="flex items-baseline gap-2 mb-1">
        <h1
          className="text-2xl font-black text-(--color-foreground)"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t.title}
        </h1>
        <span className="text-xs text-(--color-muted) ml-auto">
          {t.round} {round + 1} {t.of} {TOTAL_ROUNDS}
        </span>
      </div>
      <p className="text-sm text-(--color-muted) mb-5">{t.subtitle}</p>

      {/* Round progress dots */}
      <div className="flex gap-1.5 mb-6">
        {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => {
          const done = i < results.length;
          const active = i === round;
          return (
            <div
              key={i}
              className="h-1.5 rounded-full flex-1 transition-all duration-300"
              style={{
                background: done
                  ? "var(--color-blue)"
                  : active
                  ? "var(--color-border)"
                  : "var(--color-border)",
                opacity: active ? 1 : done ? 1 : 0.4,
              }}
            />
          );
        })}
      </div>

      {/* Photo */}
      <motion.div
        key={`photo-${round}`}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full rounded-2xl overflow-hidden mb-4 shadow-lg"
        style={{ aspectRatio: "16/9", background: "var(--color-border)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentPhoto.imageUrl}
          alt="Historical photo — guess the year"
          className="w-full h-full object-cover"
        />

        {/* Overlay: after submit show actual year */}
        <AnimatePresence>
          {submitted && currentResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center"
              style={{ background: "rgba(0,0,0,0.55)" }}
            >
              <p
                className="text-6xl font-black text-white"
                style={{ fontFamily: "var(--font-display)", textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}
              >
                {currentResult.actualYear}
              </p>
              <p
                className="text-sm font-semibold mt-1"
                style={{ color: resultColor(Math.abs(currentResult.guessYear - currentResult.actualYear)) }}
              >
                {resultLabel(Math.abs(currentResult.guessYear - currentResult.actualYear), t)}
                {" · +"}
                {currentResult.xp} XP
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Hint toggle */}
      <div className="mb-5">
        <button
          onClick={() => setShowHint((v) => !v)}
          className="text-xs text-(--color-blue) underline underline-offset-2 hover:opacity-70 transition-opacity"
        >
          {showHint ? t.hideHint : t.showHint}
        </button>
        <AnimatePresence>
          {showHint && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-sm text-(--color-muted) mt-1 italic overflow-hidden"
            >
              {currentPhoto.hint}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Slider */}
      <div className="mb-6">
        <YearSlider
          value={guessYear}
          onChange={setGuessYear}
          disabled={submitted}
        />
      </div>

      {/* Action button */}
      {!submitted ? (
        <button
          onClick={handleSubmit}
          className="w-full py-3 rounded-xl font-bold text-white text-sm transition-opacity hover:opacity-90 active:scale-[0.98]"
          style={{ background: "var(--color-blue)", fontFamily: FONT }}
        >
          {t.submit}
        </button>
      ) : (
        <button
          onClick={handleNext}
          className="w-full py-3 rounded-xl font-bold text-white text-sm transition-opacity hover:opacity-90 active:scale-[0.98]"
          style={{ background: "var(--color-blue)", fontFamily: FONT }}
        >
          {round + 1 >= TOTAL_ROUNDS ? t.seeFinal : t.nextRound}
        </button>
      )}

      {/* Inline result (after submit) */}
      <AnimatePresence>
        {submitted && currentResult && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 p-4 rounded-2xl border"
            style={{
              borderColor: "var(--color-border)",
              background: "var(--color-surface)",
            }}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-(--color-muted) uppercase tracking-wider">{t.yourGuess}</p>
                <p
                  className="text-2xl font-black tabular-nums"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: resultColor(Math.abs(currentResult.guessYear - currentResult.actualYear)),
                  }}
                >
                  {currentResult.guessYear}
                </p>
              </div>
              <div className="text-center">
                <p
                  className="text-base font-bold"
                  style={{ color: resultColor(Math.abs(currentResult.guessYear - currentResult.actualYear)) }}
                >
                  {resultLabel(Math.abs(currentResult.guessYear - currentResult.actualYear), t)}
                </p>
                <p className="text-xs text-(--color-muted)">
                  {Math.abs(currentResult.guessYear - currentResult.actualYear) === 0
                    ? "Exact!"
                    : `${Math.abs(currentResult.guessYear - currentResult.actualYear)} year${Math.abs(currentResult.guessYear - currentResult.actualYear) === 1 ? "" : "s"} off`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-(--color-muted) uppercase tracking-wider">{t.answer}</p>
                <p
                  className="text-2xl font-black tabular-nums"
                  style={{ fontFamily: "var(--font-display)", color: "var(--color-foreground)" }}
                >
                  {currentResult.actualYear}
                </p>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <span
                className="text-lg font-black"
                style={{ fontFamily: "var(--font-display)", color: "var(--color-blue)" }}
              >
                +{currentResult.xp} XP
              </span>
            </div>
            <div className="mt-2">
              <ScoreBar xp={currentResult.xp} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Export ──────────────────────────────────────────────────────────────────

export default function YearGuesser() {
  return (
    <Suspense>
      <YearGuesserInner />
    </Suspense>
  );
}
