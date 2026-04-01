"use client";

import { useMemo, useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { parseGameDateParam, ymdUtcNow } from "@/lib/game-date";
import { MUSHROOM_GUESS_POOL, findMushroomByGuessInput, type WikiMushroom } from "@/data/wikiMushrooms";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { guessesToXp, xpLabel } from "@/lib/xp";
import MiniLeaderboard from "@/components/ui/MiniLeaderboard";

const copy = {
  en: {
    title: "Mushroom guess",
    subtitle: "Guess today’s mystery species from the Icelandic Wikipedia fungi list. Type its Icelandic name.",
    input: "Type a species…",
    guess: "Guess",
    solved: "Solved!",
    reset: "Reset",
    noMatch: "Species not found in this game’s list.",
    already: "Already guessed.",
    heading: "Guesses",
    correct: "Correct",
    wrong: "Wrong",
    attribution: "Photo: Wikimedia Commons (license varies by file — see file page).",
    wiki: "Article",
  },
  is: {
    title: "Sveppa gisk",
    subtitle: "Giskaðu á dularfullan svepp úr Wikipediu-listanum Sveppir á Íslandi. Skrifaðu íslenskt nafn.",
    input: "Skrifaðu tegund…",
    guess: "Giska",
    solved: "Leyst!",
    reset: "Hreinsa",
    noMatch: "Tegundin er ekki í þessum leik.",
    already: "Þegar giskað.",
    heading: "Getgátur",
    correct: "Rétt",
    wrong: "Rangt",
    attribution: "Mynd: Wikimedia Commons (leyfi mismunandi eftir skrá — sjá skráarsíðu).",
    wiki: "Grein",
  },
} as const;

const LEFT_FADE =
  "linear-gradient(to right, var(--color-background) 0%, var(--color-background) 28%, transparent 100%)";

function seededIndex(seed: string, mod: number) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % mod;
}


function MushroomGuesserInner() {
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
  const helpSeenKey = "help-seen:mushroom";
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(helpSeenKey)) setShowHelp(true);
    } catch {}
  }, []);

  function dismissHelp(permanent: boolean) {
    setShowHelp(false);
    if (permanent) {
      try {
        window.localStorage.setItem(helpSeenKey, "1");
      } catch {}
    }
  }

  const scoreSavedRef = useRef(false);
  const confettiFiredRef = useRef(false);
  const prevUserRef = useRef<string | null | undefined>(undefined);

  const storageKey = `mushroom-guesser:${day}`;
  const target = useMemo(() => {
    if (MUSHROOM_GUESS_POOL.length === 0) return null as unknown as WikiMushroom;
    return MUSHROOM_GUESS_POOL[seededIndex(day + "mushroom", MUSHROOM_GUESS_POOL.length)]!;
  }, [day]);

  useEffect(() => {
    const prev = prevUserRef.current;
    prevUserRef.current = user?.id ?? null;
    if (prev === undefined) return;
    if (!prev && user) {
      try {
        window.localStorage.removeItem(storageKey);
      } catch {}
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
      if (Array.isArray(parsed)) {
        setGuesses(parsed);
        return;
      }
      if (parsed.guesses) setGuesses(parsed.guesses);
      if (parsed.gaveUp) setGaveUp(true);
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ guesses, gaveUp }));
    } catch {}
  }, [guesses, gaveUp, storageKey]);

  const MAX_GUESSES = 7;
  const won = target ? guesses.includes(target.title) : false;
  const failed = !won && guesses.filter((n) => n !== target?.title).length >= MAX_GUESSES;

  useEffect(() => {
    if (!won || scoreSavedRef.current || !user || !target) return;
    scoreSavedRef.current = true;
    const guessCount = guesses.length;
    const xp = guessesToXp(guessCount);
    void supabase
      .from("game_scores")
      .insert({ user_id: user.id, game_type: "mushroom", game_date: day, guesses: guessCount, xp, won: true })
      .then(({ error: err }) => {
        if (!err) setEarnedXp(xp);
      });
  }, [won, user, day, guesses.length, target]);

  useEffect(() => {
    if (!won || confettiFiredRef.current) return;
    confettiFiredRef.current = true;
    void import("canvas-confetti").then(({ default: confetti }) => {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ["#2b5ceb", "#22c55e", "#f59e0b", "#ffffff"] });
      setTimeout(
        () => confetti({ particleCount: 60, spread: 100, origin: { y: 0.55 }, colors: ["#2b5ceb", "#22c55e", "#f59e0b"] }),
        300
      );
    });
  }, [won]);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    return MUSHROOM_GUESS_POOL.filter((m) => m.title.toLowerCase().includes(q));
  }, [value]);

  function onGuess() {
    if (!target) return;
    const normalized = value.trim().toLowerCase();
    if (!normalized || won || failed || gaveUp) return;
    const match = findMushroomByGuessInput(value);
    if (!match) {
      setError(t.noMatch);
      return;
    }
    if (guesses.includes(match.title)) {
      setError(t.already);
      return;
    }
    setError("");
    setGuesses((g) => [match.title, ...g]);
    setValue("");
  }

  function clearDay() {
    setGuesses([]);
    setError("");
    setGaveUp(false);
    setConfirmGiveUp(false);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {}
    scoreSavedRef.current = false;
    confettiFiredRef.current = false;
  }

  function doGiveUp() {
    setGaveUp(true);
    setConfirmGiveUp(false);
  }

  const guessRows = useMemo(
    () =>
      guesses.map((name) => {
        const mush = MUSHROOM_GUESS_POOL.find((m) => m.title === name);
        return { name, mush, correct: target ? name === target.title : false };
      }),
    [guesses, target]
  );

  if (!target) {
    return (
      <div className="relative z-10 px-8 py-16 text-sm text-(--color-muted)" style={{ fontFamily: "var(--font-sans)" }}>
        No mushroom image data loaded.
      </div>
    );
  }

  const imageSrc = target.thumbnailUrl ?? target.originalUrl ?? "";

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

      <div
        className="pointer-events-none fixed inset-y-0 right-0 select-none overflow-visible"
        style={{ width: "min(96vw, 1680px)" }}
      >
        <div
          className="absolute inset-y-0 left-0 z-10"
          style={{ width: "min(56vw, 24rem)", background: LEFT_FADE }}
        />
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center justify-center pr-16">
          <motion.div
            key={target.pageid}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
            style={{ width: "clamp(280px, 36vw, 520px)" }}
          >
            <div
              className="rounded-2xl overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.18)] relative bg-(--color-surface)"
              style={{ aspectRatio: "4/3" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageSrc} alt="" className="w-full h-full object-cover" />
            </div>
            <p className="mt-2 text-[10px] text-(--color-muted) leading-snug max-w-md text-center mx-auto px-2">
              {t.attribution}
            </p>
            {(won || gaveUp) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="mt-3 text-center space-y-1"
              >
                <p
                  className="text-2xl font-black tracking-tight"
                  style={{ fontFamily: "var(--font-sans)", color: won ? "#22c55e" : "var(--color-muted)" }}
                >
                  {target.title}
                </p>
                <a
                  href={target.pageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-(--color-blue) underline underline-offset-2 inline-block pointer-events-auto"
                >
                  {t.wiki} (Wikipedia)
                </a>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      <div className="relative z-10 max-w-xl px-8 pt-2 pb-10">
        {isArchive && (
          <div
            className="mb-4 rounded-xl border border-(--color-border) bg-(--color-surface) px-3 py-2 text-xs text-(--color-muted)"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            <span className="text-(--color-foreground) font-semibold">{day}</span>
            {" · "}
            <Link href={`/${locale}/mushroom`} className="underline underline-offset-2 hover:opacity-70 transition-opacity">
              Today&apos;s puzzle
            </Link>
          </div>
        )}

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
                <p>
                  A mystery fungus photo is shown (sourced from Wikimedia Commons via Icelandic Wikipedia). It starts hidden behind
                  tiles.
                </p>
                <p>
                  <strong className="text-(--color-foreground)">Type the Icelandic Wikipedia species name</strong> and submit. Each
                  wrong guess reveals another tile. You have <strong className="text-(--color-foreground)">7 guesses</strong>.
                </p>
                <p>Fewer guesses = more XP. A new species every calendar day.</p>
              </div>
              <div className="mt-5 pt-4 border-t border-(--color-border)">
                <p className="text-[11px] uppercase tracking-[0.18em] text-(--color-muted) font-semibold mb-2">XP scoring</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "1 guess", xp: 1000 },
                    { label: "2 guesses", xp: 800 },
                    { label: "3 guesses", xp: 600 },
                    { label: "4–5 guesses", xp: 400 },
                    { label: "6–7 guesses", xp: 200 },
                  ].map((r) => (
                    <span
                      key={r.label}
                      className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: "var(--color-tag)", color: "var(--color-tag-text)", fontFamily: "var(--font-sans)" }}
                    >
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
                <span className="text-(--color-foreground)">{target.title}</span>
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

        {won && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-5 rounded-2xl border border-(--color-border) bg-(--color-surface) px-4 py-3 flex items-center justify-between gap-4"
          >
            <div>
              <p className="font-bold text-green-600">
                {t.solved} — {target.title}
              </p>
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
                onChange={(e) => {
                  setValue(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onGuess();
                }}
                placeholder={t.input}
                disabled={won || gaveUp || failed}
                className="w-full rounded-xl border border-(--color-border) bg-white px-4 py-2.5 text-sm outline-none focus:border-(--color-blue) transition-colors"
              />
              {!won && !gaveUp && !failed && suggestions.length > 0 && (
                <div className="absolute top-full mt-1 left-0 right-0 rounded-xl border border-(--color-border) bg-white shadow-lg overflow-y-auto z-20 max-h-48">
                  {suggestions.map((s) => (
                    <button
                      key={s.pageid}
                      type="button"
                      onClick={() => {
                        setValue(s.title);
                        setError("");
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-(--color-blue-light) transition-colors"
                    >
                      {s.title}
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

            {confirmGiveUp && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
                onClick={() => setConfirmGiveUp(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full max-w-sm mx-4 rounded-2xl border border-(--color-border) bg-(--color-surface) p-6 shadow-[0_20px_60px_rgba(0,0,0,0.15)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h2 className="text-xl font-black mb-2 text-(--color-foreground)" style={{ fontFamily: "var(--font-display)" }}>
                    Give up?
                  </h2>
                  <p className="text-sm text-(--color-muted) leading-relaxed mb-6">
                    You won&apos;t earn XP for today. The answer will be shown.
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
            <div className="py-8 text-sm text-(--color-muted) opacity-60">No guesses yet</div>
          ) : (
            <div>
              {guessRows.map((r) => (
                <div
                  key={r.name}
                  className="grid items-center gap-3 py-4 border-b border-(--color-border)"
                  style={{ gridTemplateColumns: "auto 1fr auto" }}
                >
                  {r.mush?.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.mush.thumbnailUrl}
                      alt=""
                      width={40}
                      height={40}
                      className="rounded-md object-cover shrink-0 size-10"
                    />
                  ) : (
                    <span className="size-10 rounded-md bg-(--color-tag) shrink-0" />
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
