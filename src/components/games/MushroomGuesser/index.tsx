"use client";

import { useMemo, useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { parseGameDateParam, ymdUtcNow } from "@/lib/game-date";
import { MUSHROOM_GUESS_POOL, mushroomPrimaryTitle, type WikiMushroom } from "@/data/wikiMushrooms";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import MiniLeaderboard from "@/components/ui/MiniLeaderboard";

const ROUNDS = 5;
const OPTIONS = 4;

const copy = {
  en: {
    title: "Mushroom Quiz",
    subtitle: "5 rounds — identify each mushroom from 4 choices.",
    round: "Round",
    of: "of",
    correct: "Correct!",
    wrong: "Wrong!",
    next: "Next →",
    finish: "See results",
    results: "Results",
    score: "Score",
    playAgain: "Play again",
    attribution: "Photo: Wikimedia Commons",
    wiki: "Article",
    perfect: "Perfect score!",
    great: "Great job!",
    good: "Not bad!",
    keep: "Keep practicing!",
  },
  is: {
    title: "Sveppa þraut",
    subtitle: "5 umferðir — þekktu hvern svepp úr 4 valkostum.",
    round: "Umferð",
    of: "af",
    correct: "Rétt!",
    wrong: "Rangt!",
    next: "Næsta →",
    finish: "Sjá niðurstöður",
    results: "Niðurstöður",
    score: "Stig",
    playAgain: "Spila aftur",
    attribution: "Mynd: Wikimedia Commons",
    wiki: "Grein",
    perfect: "Fullkomið!",
    great: "Vel gert!",
    good: "Ekki slæmt!",
    keep: "Haltu áfram að æfa!",
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

type Round = {
  target: WikiMushroom;
  options: WikiMushroom[]; // always OPTIONS length, target is one of them
};

function buildRounds(day: string): Round[] {
  const rng = seededRng(day + "mushroomquiz");
  const pool = [...MUSHROOM_GUESS_POOL];

  // Pick ROUNDS distinct targets
  const targets: WikiMushroom[] = [];
  const used = new Set<number>();
  while (targets.length < ROUNDS) {
    const idx = Math.floor(rng() * pool.length);
    if (!used.has(idx)) { used.add(idx); targets.push(pool[idx]!); }
  }

  return targets.map((target) => {
    // Pick OPTIONS-1 distinct distractors
    const distractors: WikiMushroom[] = [];
    const dUsed = new Set<number>(Array.from(used));
    while (distractors.length < OPTIONS - 1) {
      const idx = Math.floor(rng() * pool.length);
      if (!dUsed.has(idx)) { dUsed.add(idx); distractors.push(pool[idx]!); }
    }
    // Shuffle target into options
    const opts = [...distractors, target];
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [opts[i], opts[j]] = [opts[j]!, opts[i]!];
    }
    return { target, options: opts };
  });
}

type SavedState = {
  answers: (string | null)[];
};

function MushroomGuesserInner() {
  const locale = (useLocale() as "en" | "is") || "en";
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  const day = useMemo(() => parseGameDateParam(dateParam) ?? ymdUtcNow(), [dateParam]);
  const isArchive = useMemo(() => day !== ymdUtcNow(), [day]);
  const t = copy[locale];
  const { user } = useAuth();

  const helpSeenKey = "help-seen:mushroom";
  const [showHelp, setShowHelp] = useState(false);
  useEffect(() => {
    try { if (!window.localStorage.getItem(helpSeenKey)) setShowHelp(true); } catch {}
  }, []);
  function dismissHelp(permanent: boolean) {
    setShowHelp(false);
    if (permanent) { try { window.localStorage.setItem(helpSeenKey, "1"); } catch {} }
  }

  const rounds = useMemo(() => buildRounds(day), [day]);

  // answers[i] = title of chosen option, or null if not answered yet
  const [answers, setAnswers] = useState<(string | null)[]>(Array(ROUNDS).fill(null));
  const [currentRound, setCurrentRound] = useState(0);
  // "idle" | "answered" | "done"
  const [phase, setPhase] = useState<"idle" | "answered" | "done">("idle");

  const storageKey = `mushroom-quiz:${day}`;
  const scoreSavedRef = useRef(false);
  const confettiFiredRef = useRef(false);
  const prevUserRef = useRef<string | null | undefined>(undefined);
  const [earnedXp, setEarnedXp] = useState<number | null>(null);

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
      scoreSavedRef.current = false;
      confettiFiredRef.current = false;
    }
  }, [user, storageKey]);

  // Load from storage
  useEffect(() => {
    setAnswers(Array(ROUNDS).fill(null));
    setCurrentRound(0);
    setPhase("idle");
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
    () => answers.filter((a, i) => a === rounds[i]?.target.title).length,
    [answers, rounds]
  );

  // Save XP when done
  useEffect(() => {
    if (phase !== "done" || scoreSavedRef.current || !user) return;
    scoreSavedRef.current = true;
    const xp = score * 200;
    void supabase
      .from("game_scores")
      .insert({ user_id: user.id, game_type: "mushroom", game_date: day, guesses: ROUNDS, xp, won: score >= 3 })
      .then(({ error: err }) => { if (!err) setEarnedXp(xp); });
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

  function handleAnswer(optionTitle: string) {
    if (phase !== "idle") return;
    const newAnswers = [...answers];
    newAnswers[currentRound] = optionTitle;
    setAnswers(newAnswers);
    setPhase("answered");
  }

  function handleNext() {
    if (currentRound >= ROUNDS - 1) {
      setPhase("done");
    } else {
      setCurrentRound((r) => r + 1);
      setPhase("idle");
    }
  }

  function resetGame() {
    setAnswers(Array(ROUNDS).fill(null));
    setCurrentRound(0);
    setPhase("idle");
    setEarnedXp(null);
    scoreSavedRef.current = false;
    confettiFiredRef.current = false;
    try { window.localStorage.removeItem(storageKey); } catch {}
  }

  const round = rounds[currentRound]!;
  const chosen = answers[currentRound];
  const isCorrect = chosen === round.target.title;
  const imageSrc = round.target.thumbnailUrl ?? round.target.originalUrl ?? "";

  function resultLabel() {
    if (score === ROUNDS) return t.perfect;
    if (score >= 4) return t.great;
    if (score >= 2) return t.good;
    return t.keep;
  }

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
              <p>Each round shows a mushroom photo from Icelandic Wikipedia. Pick the correct species from <strong className="text-(--color-foreground)">4 options</strong>.</p>
              <p>There are <strong className="text-(--color-foreground)">5 rounds</strong> per day. Each correct answer earns <strong className="text-(--color-foreground)">200 XP</strong>.</p>
              <p>A new set of mushrooms every day.</p>
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

        {/* Title — left aligned */}
        <div className="w-full mb-3">
          {isArchive && (
            <div
              className="mb-3 rounded-xl border border-(--color-border) bg-(--color-surface) px-3 py-2 text-xs text-(--color-muted)"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              <span className="text-(--color-foreground) font-semibold">{day}</span>
              {" · "}
              <Link href={`/${locale}/mushroom`} className="underline underline-offset-2 hover:opacity-70 transition-opacity">
                Today&apos;s puzzle
              </Link>
            </div>
          )}
          <motion.h1
            className="text-[clamp(2rem,6vw,5.5rem)] font-black leading-[0.95] tracking-tight text-(--color-blue) mb-1"
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
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
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

        {/* ── Game content ─────────────────────────────────────── */}
        <div className="w-full max-w-sm flex flex-col flex-1">

        {/* ── Results screen ─────────────────────────────────── */}
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
                const correct = ans === r.target.title;
                const img = r.target.thumbnailUrl ?? r.target.originalUrl ?? "";
                return (
                  <div
                    key={r.target.pageid}
                    className="flex items-center gap-3 rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-3"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-(--color-muted) mb-0.5" style={{ fontFamily: "var(--font-sans)" }}>
                        {t.round} {i + 1}
                      </p>
                      <p className="font-bold text-sm text-(--color-foreground) truncate" style={{ fontFamily: "var(--font-display)" }}>
                        {mushroomPrimaryTitle(r.target.title)}
                      </p>
                      {!correct && ans && (
                        <p className="text-xs text-(--color-muted) truncate">
                          Your answer: {mushroomPrimaryTitle(ans)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: correct ? "#dcfce7" : "#fee2e2",
                          color: correct ? "#16a34a" : "#dc2626",
                        }}
                      >
                        {correct ? t.correct : t.wrong}
                      </span>
                      <a
                        href={r.target.pageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-(--color-blue) underline underline-offset-2"
                      >
                        {t.wiki}
                      </a>
                    </div>
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
          /* ── Active round ──────────────────────────────────── */
          <motion.div
            key={currentRound}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col flex-1"
          >
            {/* Progress */}
            <div className="flex items-center gap-2 mb-3">
              {Array.from({ length: ROUNDS }, (_, i) => {
                const ans = answers[i];
                const done = ans !== null;
                const correct = done && ans === rounds[i]?.target.title;
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

            {/* Mushroom image */}
            <div className="flex-1 min-h-0 rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.15)] bg-(--color-surface) mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageSrc} alt="" className="w-full h-full object-cover" />
            </div>
            <p className="text-[10px] text-(--color-muted) text-center mb-3" style={{ fontFamily: "var(--font-sans)" }}>
              {t.attribution}
            </p>

            {/* Options */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {round.options.map((opt) => {
                const isChosen = chosen === opt.title;
                const isTarget = opt.title === round.target.title;
                let bg = "var(--color-surface)";
                let border = "var(--color-border)";
                let textColor = "var(--color-foreground)";

                if (phase === "answered") {
                  if (isTarget) { bg = "#dcfce7"; border = "#22c55e"; textColor = "#15803d"; }
                  else if (isChosen) { bg = "#fee2e2"; border = "#ef4444"; textColor = "#dc2626"; }
                }

                return (
                  <button
                    key={opt.pageid}
                    type="button"
                    onClick={() => handleAnswer(opt.title)}
                    disabled={phase === "answered"}
                    className="rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all duration-200 hover:opacity-80 disabled:cursor-default"
                    style={{
                      background: bg,
                      borderColor: border,
                      color: textColor,
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {mushroomPrimaryTitle(opt.title)}
                  </button>
                );
              })}
            </div>

            {/* Feedback + next */}
            <AnimatePresence>
              {phase === "answered" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center justify-between gap-4 rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-3"
                >
                  <div>
                    <p
                      className="font-bold text-sm"
                      style={{ color: isCorrect ? "#22c55e" : "#ef4444" }}
                    >
                      {isCorrect ? t.correct : t.wrong}
                    </p>
                    {!isCorrect && (
                      <p className="text-xs text-(--color-muted) mt-0.5">
                        {mushroomPrimaryTitle(round.target.title)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <a
                      href={round.target.pageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-(--color-blue) underline underline-offset-2"
                    >
                      {t.wiki}
                    </a>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="rounded-xl px-4 py-2 text-sm font-bold text-white bg-(--color-blue) hover:opacity-90 transition-opacity"
                    >
                      {currentRound >= ROUNDS - 1 ? t.finish : t.next}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        </div>{/* end game content */}
      </div>
    </>
  );
}

export default function MushroomGuesser() {
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
      <MushroomGuesserInner />
    </Suspense>
  );
}
