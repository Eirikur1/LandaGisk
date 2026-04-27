"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { parseGameDateParam, ymdUtcNow } from "@/lib/game-date";
import { LANGUAGE_SENTENCES, type LanguageSentence } from "@/data/languageSentences";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { invalidateLeaderboard } from "@/lib/useLeaderboard";
import MiniLeaderboard from "@/components/ui/MiniLeaderboard";

const ROUNDS = 5;
const OPTIONS = 4;
const XP_PER_CORRECT = 200;

const copy = {
  en: {
    title: "Language Guess",
    subtitle: "Read the sentence. Name the language.",
    round: "Round",
    correct: "Correct!",
    wrong: "Wrong!",
    next: "Next ->",
    finish: "See results",
    results: "Results",
    playAgain: "Play again",
    perfect: "Polyglot behavior.",
    great: "Your language radar is sharp.",
    good: "Not bad. The clues were there.",
    keep: "The alphabets fought back.",
    answerWas: "Answer:",
    yourAnswer: "Your answer:",
    sample: "Daily sample",
    helpTitle: "How to play",
    helpIntro: "Each round shows a short sentence in a mystery language.",
    helpChoices: "Pick the correct language from 4 choices.",
    helpScoring: "There are 5 rounds per day. Each correct answer earns 200 XP.",
    gotIt: "Got it",
    dontShowAgain: "Don't show again",
    todaysPuzzle: "Today's puzzle",
  },
  is: {
    title: "Tungumála gisk",
    subtitle: "Lestu setninguna. Nefndu tungumálið.",
    round: "Umferð",
    correct: "Rétt!",
    wrong: "Rangt!",
    next: "Næsta ->",
    finish: "Sjá niðurstöður",
    results: "Niðurstöður",
    playAgain: "Spila aftur",
    perfect: "Alvöru fjöltyngt.",
    great: "Tungumálaradarinn virkar.",
    good: "Ekki slæmt. Vísbendingarnar voru þarna.",
    keep: "Stafrófin börðust á móti.",
    answerWas: "Svarið:",
    yourAnswer: "Þitt svar:",
    sample: "Sýnishorn dagsins",
    helpTitle: "Hvernig á að spila",
    helpIntro: "Í hverri umferð sérðu stutta setningu á dularfullu tungumáli.",
    helpChoices: "Veldu rétta tungumálið úr 4 valkostum.",
    helpScoring: "Það eru 5 umferðir á dag. Hvert rétt svar gefur 200 XP.",
    gotIt: "Skilið",
    dontShowAgain: "Ekki sýna aftur",
    todaysPuzzle: "Þraut dagsins",
  },
} as const;

type Round = {
  target: LanguageSentence;
  options: LanguageSentence[];
};

type SavedState = {
  answers: (string | null)[];
  scoreSaved?: boolean;
};

function seededRng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >> 7;
    h ^= h << 17;
    return (Math.abs(h) >>> 0) / 0xffffffff;
  };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function buildRounds(day: string): Round[] {
  const rng = seededRng(`${day}:language-guess`);
  const pool = [...LANGUAGE_SENTENCES];
  const targets: LanguageSentence[] = [];
  const used = new Set<string>();

  while (targets.length < ROUNDS) {
    const candidate = pool[Math.floor(rng() * pool.length)]!;
    if (!used.has(candidate.code)) {
      used.add(candidate.code);
      targets.push(candidate);
    }
  }

  return targets.map((target) => {
    const distractors: LanguageSentence[] = [];
    const blocked = new Set([target.code]);
    while (distractors.length < OPTIONS - 1) {
      const candidate = pool[Math.floor(rng() * pool.length)]!;
      if (!blocked.has(candidate.code)) {
        blocked.add(candidate.code);
        distractors.push(candidate);
      }
    }
    return { target, options: shuffle([...distractors, target], rng) };
  });
}

function languageLabel(item: LanguageSentence, locale: "en" | "is") {
  return item.label[locale];
}

function LanguageGuesserInner() {
  const locale = (useLocale() as "en" | "is") || "en";
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  const day = useMemo(() => parseGameDateParam(dateParam) ?? ymdUtcNow(), [dateParam]);
  const isArchive = useMemo(() => day !== ymdUtcNow(), [day]);
  const t = copy[locale];
  const { user } = useAuth();
  const rounds = useMemo(() => buildRounds(day), [day]);

  const [answers, setAnswers] = useState<(string | null)[]>(Array(ROUNDS).fill(null));
  const [currentRound, setCurrentRound] = useState(0);
  const [phase, setPhase] = useState<"idle" | "answered" | "done">("idle");
  const [showHelp, setShowHelp] = useState(false);
  const [earnedXp, setEarnedXp] = useState<number | null>(null);
  const [savedScore, setSavedScore] = useState(false);

  const scoreSavedRef = useRef(false);
  const confettiFiredRef = useRef(false);
  const prevUserRef = useRef<string | null | undefined>(undefined);
  const storageKey = `language-guess:${day}`;
  function dismissHelp(permanent: boolean) {
    setShowHelp(false);
    if (permanent) {
      try { window.localStorage.setItem("help-seen:language", "1"); } catch {}
    }
  }

  useEffect(() => {
    const prev = prevUserRef.current;
    prevUserRef.current = user?.id ?? null;
    if (prev === undefined) return;
    if (!prev && user) {
      try { window.localStorage.removeItem(storageKey); } catch {}
      setAnswers(Array(ROUNDS).fill(null));
      setCurrentRound(0);
      setPhase("idle");
      setEarnedXp(null);
      setSavedScore(false);
      scoreSavedRef.current = false;
      confettiFiredRef.current = false;
    }
  }, [user, storageKey]);

  useEffect(() => {
    setAnswers(Array(ROUNDS).fill(null));
    setCurrentRound(0);
    setPhase("idle");
    setEarnedXp(null);
    setSavedScore(false);
    scoreSavedRef.current = false;
    confettiFiredRef.current = false;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as SavedState;
      if (!Array.isArray(saved.answers)) return;
      const nextAnswers = saved.answers.slice(0, ROUNDS);
      const nextSavedScore = Boolean(saved.scoreSaved);
      setAnswers(nextAnswers);
      setSavedScore(nextSavedScore);
      scoreSavedRef.current = nextSavedScore;
      const answered = nextAnswers.filter(Boolean).length;
      if (answered >= ROUNDS) {
        setCurrentRound(ROUNDS - 1);
        setPhase("done");
      } else if (answered > 0) {
        setCurrentRound(answered - 1);
        setPhase("answered");
      }
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    try { window.localStorage.setItem(storageKey, JSON.stringify({ answers, scoreSaved: savedScore })); } catch {}
  }, [answers, savedScore, storageKey]);

  const score = useMemo(
    () => answers.filter((answer, i) => answer === rounds[i]?.target.code).length,
    [answers, rounds]
  );

  useEffect(() => {
    if (phase !== "done" || scoreSavedRef.current || savedScore || !user) return;
    scoreSavedRef.current = true;
    const xp = score * XP_PER_CORRECT;
    void supabase
      .from("game_scores")
      .insert({ user_id: user.id, game_type: "language", game_date: day, guesses: ROUNDS, xp, won: true })
      .then(({ error }) => {
        if (!error) {
          setEarnedXp(xp);
          setSavedScore(true);
          invalidateLeaderboard();
        } else {
          scoreSavedRef.current = false;
        }
      });
  }, [phase, score, user, day, savedScore]);

  useEffect(() => {
    if (phase !== "done" || score < ROUNDS || confettiFiredRef.current) return;
    confettiFiredRef.current = true;
    void import("canvas-confetti").then(({ default: confetti }) => {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ["#2b5ceb", "#22c55e", "#f59e0b", "#ffffff"] });
      setTimeout(() => confetti({ particleCount: 60, spread: 100, origin: { y: 0.55 } }), 300);
    });
  }, [phase, score]);

  function handleAnswer(code: string) {
    if (phase !== "idle") return;
    const nextAnswers = [...answers];
    nextAnswers[currentRound] = code;
    setAnswers(nextAnswers);
    setPhase("answered");
  }

  function handleNext() {
    if (currentRound >= ROUNDS - 1) {
      setPhase("done");
    } else {
      setCurrentRound((round) => round + 1);
      setPhase("idle");
    }
  }

  function resetGame() {
    setAnswers(Array(ROUNDS).fill(null));
    setCurrentRound(0);
    setPhase("idle");
    setEarnedXp(null);
    setSavedScore(false);
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
  const chosen = answers[currentRound];
  const isCorrect = chosen === round.target.code;
  const finalXp = score * XP_PER_CORRECT;

  return (
    <>
      <button
        type="button"
        onClick={() => setShowHelp(true)}
        className="fixed top-18 md:top-4 right-4 z-20 w-8 h-8 rounded-full border border-(--color-border) bg-(--color-surface) text-(--color-muted) text-sm font-bold hover:opacity-70 transition-opacity flex items-center justify-center shadow-sm touch-manipulation"
        aria-label="How to play"
      >
        ?
      </button>

      {showHelp && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => dismissHelp(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-sm mx-4 rounded-2xl border border-(--color-border) bg-(--color-surface) p-6 shadow-[0_20px_60px_rgba(0,0,0,0.15)]"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-xl font-black mb-4 text-(--color-foreground)" style={{ fontFamily: "var(--font-display)" }}>
              {t.helpTitle}
            </h2>
            <div className="space-y-3 text-sm text-(--color-muted) leading-relaxed">
              <p>{t.helpIntro}</p>
              <p><strong className="text-(--color-foreground)">{t.helpChoices}</strong></p>
              <p>{t.helpScoring}</p>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => dismissHelp(false)}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white bg-(--color-blue) hover:opacity-90 transition-opacity touch-manipulation"
              >
                {t.gotIt}
              </button>
              <button
                type="button"
                onClick={() => dismissHelp(true)}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold border border-(--color-border) text-(--color-muted) hover:opacity-60 transition-opacity touch-manipulation"
              >
                {t.dontShowAgain}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="relative z-10 w-full flex flex-col items-center px-8 pt-0 pb-8" style={{ minHeight: "calc(100dvh - 5rem)" }}>
        <div className="w-full mb-3">
          {isArchive && (
            <div
              className="mb-3 rounded-xl border border-(--color-border) bg-(--color-surface) px-3 py-2 text-xs text-(--color-muted)"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              <span className="text-(--color-foreground) font-semibold">{day}</span>
              {" · "}
              <Link href={`/${locale}/language`} className="underline underline-offset-2 hover:opacity-70 transition-opacity">
                {t.todaysPuzzle}
              </Link>
            </div>
          )}
          <motion.h1
            className="text-[clamp(2rem,4vw,5rem)] font-black leading-[0.85] tracking-tight text-(--color-blue) mb-1"
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
            {new Intl.DateTimeFormat("en-US", { weekday: "short", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date())}
          </motion.p>
        </div>

        <div className="w-full max-w-sm xl:max-w-lg flex flex-col flex-1">
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
                {(earnedXp !== null || phase === "done") && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-(--color-blue) text-white px-4 py-2">
                    <span className="text-sm font-semibold opacity-70">XP</span>
                    <span className="text-2xl font-black">+{earnedXp ?? finalXp}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3 mb-6">
                {rounds.map((resultRound, i) => {
                  const answer = answers[i];
                  const correct = answer === resultRound.target.code;
                  const chosenOption = resultRound.options.find((option) => option.code === answer);
                  return (
                    <div
                      key={resultRound.target.id}
                      className="rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <p className="text-xs text-(--color-muted)" style={{ fontFamily: "var(--font-sans)" }}>
                          {t.round} {i + 1}
                        </p>
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: correct ? "#dcfce7" : "#fee2e2",
                            color: correct ? "#16a34a" : "#dc2626",
                          }}
                        >
                          {correct ? t.correct : t.wrong}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-(--color-foreground) leading-relaxed mb-2" lang={resultRound.target.code}>
                        {resultRound.target.sentence}
                      </p>
                      <p className="text-xs text-(--color-muted)">
                        {t.answerWas} <span className="font-bold text-(--color-foreground)">{languageLabel(resultRound.target, locale)}</span>
                      </p>
                      {!correct && chosenOption && (
                        <p className="text-xs text-(--color-muted)">
                          {t.yourAnswer} {languageLabel(chosenOption, locale)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={resetGame}
                className="w-full rounded-xl py-3 text-sm font-bold border border-(--color-border) text-(--color-muted) hover:opacity-60 transition-opacity touch-manipulation"
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
            <motion.div
              key={currentRound}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col flex-1"
            >
              <div className="flex items-center gap-2 mb-3">
                {Array.from({ length: ROUNDS }, (_, i) => {
                  const answer = answers[i];
                  const done = answer !== null;
                  const correct = done && answer === rounds[i]?.target.code;
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

              <div className="relative overflow-hidden rounded-3xl border border-(--color-border) bg-(--color-surface) p-6 sm:p-8 shadow-[0_16px_48px_rgba(0,0,0,0.08)] mb-4">
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-(--color-blue) opacity-10" />
                <p className="relative text-[10px] tracking-[0.25em] uppercase text-(--color-muted) mb-5" style={{ fontFamily: "var(--font-sans)" }}>
                  {t.sample}
                </p>
                <blockquote
                  className="relative text-2xl sm:text-3xl font-black leading-snug text-(--color-foreground)"
                  style={{ fontFamily: "var(--font-display)" }}
                  lang={round.target.code}
                >
                  “{round.target.sentence}”
                </blockquote>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                {round.options.map((option) => {
                  const isChosen = chosen === option.code;
                  const isTarget = option.code === round.target.code;
                  let bg = "var(--color-surface)";
                  let border = "var(--color-border)";
                  let textColor = "var(--color-foreground)";

                  if (phase === "answered") {
                    if (isTarget) {
                      bg = "#dcfce7";
                      border = "#22c55e";
                      textColor = "#15803d";
                    } else if (isChosen) {
                      bg = "#fee2e2";
                      border = "#ef4444";
                      textColor = "#dc2626";
                    }
                  }

                  return (
                    <button
                      key={option.code}
                      type="button"
                      onClick={() => handleAnswer(option.code)}
                      disabled={phase === "answered"}
                      className="rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all duration-200 hover:opacity-80 disabled:cursor-default touch-manipulation"
                      style={{
                        background: bg,
                        borderColor: border,
                        color: textColor,
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      {languageLabel(option, locale)}
                    </button>
                  );
                })}
              </div>

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
                          {t.answerWas} {languageLabel(round.target, locale)}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="rounded-xl px-4 py-2 text-sm font-bold text-white bg-(--color-blue) hover:opacity-90 transition-opacity shrink-0 touch-manipulation"
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

export default function LanguageGuesser() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const fallback = (
    <div
      className="relative min-h-[40vh] grid place-items-center text-(--color-muted) text-sm"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      Loading...
    </div>
  );

  if (!mounted) return fallback;

  return (
    <Suspense fallback={fallback}>
      <LanguageGuesserInner />
    </Suspense>
  );
}
