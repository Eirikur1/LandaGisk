"use client";

import { useMemo, useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { parseGameDateParam, ymdUtcNow } from "@/lib/game-date";
import { TERRITORY_POOL, flagUrl, matchesTerritory, type Territory } from "@/data/territories";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { invalidateLeaderboard } from "@/lib/useLeaderboard";
import MiniLeaderboard from "@/components/ui/MiniLeaderboard";

const ROUNDS = 5;

const copy = {
  en: {
    title: "Territory Flags",
    subtitle: "5 rounds — name the territory from its flag.",
    round: "Round",
    correct: "Correct!",
    wrong: "Wrong!",
    next: "Next →",
    finish: "See results",
    results: "Results",
    playAgain: "Play again",
    placeholder: "Type territory name…",
    giveUp: "Give up",
    sovereign: "Administered by",
    perfect: "Perfect score!",
    great: "Great job!",
    good: "Not bad!",
    keep: "Keep practicing!",
    yourAnswer: "Your answer",
    correctAnswer: "Correct answer",
  },
  is: {
    title: "Fánar yfirráðasvæða",
    subtitle: "5 lotur — nefndu yfirráðasvæðið út frá fánanum.",
    round: "Lota",
    correct: "Rétt!",
    wrong: "Rangt!",
    next: "Næsta →",
    finish: "Sjá niðurstöður",
    results: "Niðurstöður",
    playAgain: "Spila aftur",
    placeholder: "Sláðu inn nafn…",
    giveUp: "Gefast upp",
    sovereign: "Stjórnað af",
    perfect: "Fullkomið!",
    great: "Vel gert!",
    good: "Ekki slæmt!",
    keep: "Haltu áfram að æfa!",
    yourAnswer: "Svar þitt",
    correctAnswer: "Rétt svar",
  },
} as const;

function seededRng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13; h ^= h >> 7; h ^= h << 17;
    return (Math.abs(h) >>> 0) / 0xffffffff;
  };
}

type Round = { territory: Territory };

function buildRounds(day: string): Round[] {
  const rng = seededRng(day + "territoryflag");
  const pool = [...TERRITORY_POOL];
  const picks: Territory[] = [];
  const used = new Set<number>();
  while (picks.length < ROUNDS) {
    const idx = Math.floor(rng() * pool.length);
    if (!used.has(idx)) { used.add(idx); picks.push(pool[idx]!); }
  }
  return picks.map((territory) => ({ territory }));
}

type SavedState = { answers: (string | null)[] };

function TerritoryFlagsInner() {
  const locale = (useLocale() as "en" | "is") || "en";
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  const day = useMemo(() => parseGameDateParam(dateParam) ?? ymdUtcNow(), [dateParam]);
  const isArchive = useMemo(() => day !== ymdUtcNow(), [day]);
  const t = copy[locale];
  const { user } = useAuth();

  const [showHelp, setShowHelp] = useState(false);
  const helpSeenKey = "help-seen:territory";
  useEffect(() => {
    try { if (!window.localStorage.getItem(helpSeenKey)) setShowHelp(true); } catch {}
  }, []);
  function dismissHelp(permanent: boolean) {
    setShowHelp(false);
    if (permanent) { try { window.localStorage.setItem(helpSeenKey, "1"); } catch {} }
  }

  const rounds = useMemo(() => buildRounds(day), [day]);

  const [answers, setAnswers] = useState<(string | null)[]>(Array(ROUNDS).fill(null));
  const [currentRound, setCurrentRound] = useState(0);
  const [phase, setPhase] = useState<"idle" | "answered" | "gaveup" | "done">("idle");
  const [inputVal, setInputVal] = useState("");
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const storageKey = `territory-flags:${day}`;
  const scoreSavedRef = useRef(false);
  const confettiFiredRef = useRef(false);
  const prevUserRef = useRef<string | null | undefined>(undefined);
  const [earnedXp, setEarnedXp] = useState<number | null>(null);

  useEffect(() => {
    if (phase === "idle") setTimeout(() => inputRef.current?.focus(), 50);
  }, [phase, currentRound]);

  // Reset on login
  useEffect(() => {
    const prev = prevUserRef.current;
    prevUserRef.current = user?.id ?? null;
    if (prev === undefined) return;
    if (!prev && user) {
      try { window.localStorage.removeItem(storageKey); } catch {}
      setAnswers(Array(ROUNDS).fill(null));
      setCurrentRound(0);
      setPhase("idle");
      setInputVal("");
      scoreSavedRef.current = false;
      confettiFiredRef.current = false;
    }
  }, [user, storageKey]);

  // Load from storage
  useEffect(() => {
    setAnswers(Array(ROUNDS).fill(null));
    setCurrentRound(0);
    setPhase("idle");
    setInputVal("");
    scoreSavedRef.current = false;
    confettiFiredRef.current = false;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as SavedState;
      if (!Array.isArray(saved.answers)) return;
      const ans = saved.answers as (string | null)[];
      setAnswers(ans);
      const answered = ans.filter((a) => a !== null).length;
      if (answered >= ROUNDS) {
        setCurrentRound(ROUNDS - 1);
        setPhase("done");
      } else if (answered > 0) {
        setCurrentRound(answered - 1);
        setPhase("answered");
      }
    } catch {}
  }, [storageKey]);

  // Save to storage
  useEffect(() => {
    try { window.localStorage.setItem(storageKey, JSON.stringify({ answers })); } catch {}
  }, [answers, storageKey]);

  const score = useMemo(
    () => answers.filter((a, i) => {
      const r = rounds[i];
      return r && a !== null && a !== "" && matchesTerritory(a, r.territory);
    }).length,
    [answers, rounds]
  );

  // Save XP when done
  useEffect(() => {
    if (phase !== "done" || scoreSavedRef.current || !user) return;
    scoreSavedRef.current = true;
    const xp = score * 200;
    void supabase
      .from("game_scores")
      .insert({ user_id: user.id, game_type: "territory", game_date: day, guesses: ROUNDS, xp, won: score >= 3 })
      .then(({ error: err }) => { if (!err) { setEarnedXp(xp); invalidateLeaderboard(); } });
  }, [phase, score, user, day]);

  // Confetti on perfect
  useEffect(() => {
    if (phase !== "done" || score < ROUNDS || confettiFiredRef.current) return;
    confettiFiredRef.current = true;
    void import("canvas-confetti").then(({ default: confetti }) => {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ["#2b5ceb", "#22c55e", "#f59e0b", "#ffffff"] });
      setTimeout(() => confetti({ particleCount: 60, spread: 100, origin: { y: 0.55 } }), 300);
    });
  }, [phase, score]);

  function submitGuess() {
    const val = inputVal.trim();
    if (!val || phase !== "idle") return;
    const round = rounds[currentRound]!;
    if (matchesTerritory(val, round.territory)) {
      const newAnswers = [...answers];
      newAnswers[currentRound] = val;
      setAnswers(newAnswers);
      setPhase("answered");
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
    setInputVal("");
  }

  function handleGiveUp() {
    const newAnswers = [...answers];
    newAnswers[currentRound] = "";
    setAnswers(newAnswers);
    setPhase("gaveup");
  }

  function handleNext() {
    if (currentRound >= ROUNDS - 1) {
      setPhase("done");
    } else {
      setCurrentRound((r) => r + 1);
      setPhase("idle");
      setInputVal("");
    }
  }

  function resetGame() {
    setAnswers(Array(ROUNDS).fill(null));
    setCurrentRound(0);
    setPhase("idle");
    setInputVal("");
    setEarnedXp(null);
    scoreSavedRef.current = false;
    confettiFiredRef.current = false;
    try { window.localStorage.removeItem(storageKey); } catch {}
  }

  function resultLabel() {
    if (score === ROUNDS) return t.perfect;
    if (score >= 4) return t.great;
    if (score >= 2) return t.good;
    return t.keep;
  }

  const round = rounds[currentRound]!;
  const chosenAnswer = answers[currentRound];
  const roundCorrect = chosenAnswer !== null && chosenAnswer !== "" && matchesTerritory(chosenAnswer, round.territory);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowHelp(true)}
        className="fixed top-18 md:top-4 right-4 z-20 w-8 h-8 rounded-full border border-(--color-border) bg-(--color-surface) text-(--color-muted) text-sm font-bold hover:opacity-70 transition-opacity flex items-center justify-center shadow-sm"
        aria-label="How to play"
      >
        ?
      </button>

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
              <p>Each round shows the flag of a territory, overseas region, or dependency. Type the correct name.</p>
              <p>There are <strong className="text-(--color-foreground)">5 rounds</strong> per day. Each correct answer earns <strong className="text-(--color-foreground)">200 XP</strong>.</p>
              <p>Common abbreviations and alternate names are accepted.</p>
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

      <div className="relative z-10 w-full flex flex-col items-center px-8 pt-0 pb-4" style={{ minHeight: "calc(100dvh - 5rem)" }}>

        {/* Title */}
        <div className="w-full mb-3">
          {isArchive && (
            <div
              className="mb-3 rounded-xl border border-(--color-border) bg-(--color-surface) px-3 py-2 text-xs text-(--color-muted)"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              <span className="text-(--color-foreground) font-semibold">{day}</span>
              {" · "}
              <Link href={`/${locale}/territory`} className="underline underline-offset-2 hover:opacity-70 transition-opacity">
                Today&apos;s puzzle
              </Link>
            </div>
          )}
          <motion.h1
            className="text-[clamp(2rem,6vw,8rem)] font-black leading-[0.95] tracking-tight text-(--color-blue) mb-1"
            style={{ fontFamily: "var(--font-display)" }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            {t.title}
          </motion.h1>
          <motion.p
            className="text-sm text-(--color-muted) leading-relaxed"
            style={{ fontFamily: "var(--font-sans)" }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {t.subtitle}
          </motion.p>
          <motion.p
            className="text-[10px] tracking-[0.25em] text-(--color-muted) mt-1 opacity-80"
            style={{ fontFamily: "var(--font-sans)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {new Intl.DateTimeFormat("en-US", { weekday: "short", month: "long", day: "numeric" }).format(new Date())}
          </motion.p>
        </div>

        <div className="w-full max-w-sm xl:max-w-lg flex flex-col flex-1">

          {/* Results screen */}
          {phase === "done" ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-6 mb-6">
                <p className="text-[11px] tracking-[0.18em] uppercase font-semibold text-(--color-muted) mb-1" style={{ fontFamily: "var(--font-sans)" }}>
                  {t.results}
                </p>
                <p className="text-5xl font-black text-(--color-blue) mb-1" style={{ fontFamily: "var(--font-display)" }}>
                  {score} / {ROUNDS}
                </p>
                <p className="text-sm text-(--color-muted)" style={{ fontFamily: "var(--font-sans)" }}>
                  {resultLabel()}
                </p>
                {earnedXp !== null && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-(--color-blue) text-white px-4 py-2">
                    <span className="text-sm font-semibold opacity-70">XP</span>
                    <span className="text-2xl font-black">+{earnedXp}</span>
                  </div>
                )}
              </div>

              {/* Round recap */}
              <div className="space-y-3 mb-6">
                {rounds.map((r, i) => {
                  const ans = answers[i];
                  const correct = ans !== null && ans !== "" && matchesTerritory(ans, r.territory);
                  return (
                    <div
                      key={`${r.territory.code}-${i}`}
                      className="flex items-center gap-3 rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-3"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={flagUrl(r.territory.code)}
                        alt={r.territory.name}
                        className="w-14 h-9 rounded object-cover shrink-0 border border-(--color-border)"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-(--color-muted) mb-0.5" style={{ fontFamily: "var(--font-sans)" }}>
                          {t.round} {i + 1}
                        </p>
                        <p className="font-bold text-sm text-(--color-foreground) truncate" style={{ fontFamily: "var(--font-display)" }}>
                          {r.territory.name}
                        </p>
                        {r.territory.sovereign && (
                          <p className="text-[11px] text-(--color-muted) truncate">{t.sovereign}: {r.territory.sovereign}</p>
                        )}
                        {!correct && ans && (
                          <p className="text-xs text-red-500 truncate">{t.yourAnswer}: {ans}</p>
                        )}
                      </div>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                        style={{
                          background: correct ? "#dcfce7" : "#fee2e2",
                          color: correct ? "#16a34a" : "#dc2626",
                        }}
                      >
                        {correct ? t.correct : t.wrong}
                      </span>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={resetGame}
                className="w-full rounded-xl py-3 text-sm font-bold border border-(--color-border) text-(--color-muted) hover:opacity-60 transition-opacity"
              >
                {t.playAgain}
              </button>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-8"
              >
                <MiniLeaderboard />
              </motion.div>
            </motion.div>
          ) : (
            /* Active round */
            <motion.div
              key={currentRound}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col flex-1"
            >
              {/* Progress */}
              <div className="flex items-center gap-2 mb-4">
                {Array.from({ length: ROUNDS }, (_, i) => {
                  const ans = answers[i];
                  const done = ans !== null;
                  const correct = done && ans !== "" && matchesTerritory(ans, rounds[i]!.territory);
                  return (
                    <div
                      key={i}
                      className="flex-1 h-1.5 rounded-full transition-colors duration-300"
                      style={{
                        background: i === currentRound
                          ? "var(--color-blue)"
                          : done
                            ? correct ? "#22c55e" : "#ef4444"
                            : "var(--color-border)",
                      }}
                    />
                  );
                })}
                <span className="text-xs text-(--color-muted) shrink-0 ml-1" style={{ fontFamily: "var(--font-sans)" }}>
                  {currentRound + 1}/{ROUNDS}
                </span>
              </div>

              {/* Flag image — full size, centered */}
              <div className="flex justify-center mb-5">
                <div className="rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-(--color-border) bg-(--color-surface)">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={flagUrl(round.territory.code)}
                    alt=""
                    className="w-full max-w-xs sm:max-w-sm object-contain"
                    style={{ aspectRatio: "3/2" }}
                  />
                </div>
              </div>

              {/* Input or reveal */}
              <AnimatePresence mode="wait">
                {phase === "idle" && (
                  <motion.form
                    key="input"
                    onSubmit={(e) => { e.preventDefault(); submitGuess(); }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-3"
                  >
                    <motion.div
                      className="flex gap-2"
                      animate={shake ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                      transition={{ duration: 0.35 }}
                    >
                      <input
                        ref={inputRef}
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        placeholder={t.placeholder}
                        autoComplete="off"
                        spellCheck={false}
                        className="flex-1 rounded-full px-4 py-2.5 text-sm border border-(--color-border) bg-(--color-surface) outline-none focus:border-(--color-blue) transition-colors"
                        style={{ fontFamily: "var(--font-sans)" }}
                      />
                      <button
                        type="submit"
                        className="rounded-full px-5 py-2.5 text-sm font-bold text-white bg-(--color-blue) hover:opacity-90 transition-opacity shrink-0"
                      >
                        →
                      </button>
                    </motion.div>
                    <button
                      type="button"
                      onClick={handleGiveUp}
                      className="text-[11px] tracking-[0.12em] uppercase text-(--color-muted) hover:opacity-60 transition-opacity text-left"
                      style={{ fontFamily: "var(--font-sans)", fontWeight: 700 }}
                    >
                      {t.giveUp} →
                    </button>
                  </motion.form>
                )}

                {(phase === "answered" || phase === "gaveup") && (
                  <motion.div
                    key="feedback"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex items-center justify-between gap-4 rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-3"
                  >
                    <div>
                      <p
                        className="font-bold text-sm"
                        style={{ color: roundCorrect ? "#22c55e" : "#ef4444" }}
                      >
                        {roundCorrect ? t.correct : t.wrong}
                      </p>
                      <p className="text-xs text-(--color-muted) mt-0.5">
                        {round.territory.name}
                        {round.territory.sovereign && (
                          <span className="ml-1 opacity-60">· {round.territory.sovereign}</span>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="rounded-xl px-4 py-2 text-sm font-bold text-white bg-(--color-blue) hover:opacity-90 transition-opacity shrink-0"
                    >
                      {currentRound >= ROUNDS - 1 ? t.finish : t.next}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}

export default function TerritoryFlags() {
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
      <TerritoryFlagsInner />
    </Suspense>
  );
}
