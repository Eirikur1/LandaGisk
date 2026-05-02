"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EUROPEAN_COUNTRIES, type EuropeanCountry } from "@/data/europeanCountries";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { invalidateLeaderboard } from "@/lib/useLeaderboard";
import MiniLeaderboard from "@/components/ui/MiniLeaderboard";

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
  }
  return `${seconds}.${String(centiseconds).padStart(2, "0")}`;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

type GameState = "idle" | "playing" | "finished";

export default function EuroFlagRun() {
  const { user } = useAuth();

  const [gameState, setGameState] = useState<GameState>("idle");
  const [queue, setQueue] = useState<EuropeanCountry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [finalTimeMs, setFinalTimeMs] = useState<number | null>(null);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [skipCount, setSkipCount] = useState(0);

  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const current = queue[currentIndex] ?? null;
  const remaining = queue.length - currentIndex;

  const suggestions = useMemo(() => {
    const q = input.trim().toLowerCase();
    if (!q || !current) return [];
    return EUROPEAN_COUNTRIES.filter((c) =>
      c.name.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [input, current]);

  const tick = useCallback(() => {
    if (startTimeRef.current !== null) {
      setElapsedMs(Date.now() - startTimeRef.current);
      rafRef.current = requestAnimationFrame(tick);
    }
  }, []);

  const stopTimer = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  function startGame() {
    const shuffled = shuffle(EUROPEAN_COUNTRIES);
    setQueue(shuffled);
    setCurrentIndex(0);
    setInput("");
    setError("");
    setActiveIndex(-1);
    setElapsedMs(0);
    setFinalTimeMs(null);
    setScoreSaved(false);
    setSkipCount(0);
    setGameState("playing");
    startTimeRef.current = Date.now();
    rafRef.current = requestAnimationFrame(tick);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function finishGame(skipCountFinal: number) {
    stopTimer();
    const elapsed = startTimeRef.current !== null ? Date.now() - startTimeRef.current : elapsedMs;
    startTimeRef.current = null;
    setFinalTimeMs(elapsed);
    setGameState("finished");

    import("canvas-confetti").then(({ default: confetti }) => {
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.55 }, colors: ["#2b5ceb", "#22c55e", "#f59e0b", "#ffffff", "#ef4444"] });
      setTimeout(() => confetti({ particleCount: 80, spread: 120, origin: { y: 0.5 } }), 400);
    });

    if (user) {
      const xp = Math.max(0, Math.round(10000 - elapsed / 100) - skipCountFinal * 50);
      supabase.from("game_scores")
        .insert({ user_id: user.id, game_type: "euro_flags", game_date: new Date().toISOString().slice(0, 10), guesses: EUROPEAN_COUNTRIES.length + skipCountFinal, xp: Math.max(xp, 0), won: true })
        .then(({ error: err }) => { if (!err) { setScoreSaved(true); invalidateLeaderboard(); } });
    }
  }

  function advanceOrFinish(newSkipCount: number) {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= queue.length) {
      finishGame(newSkipCount);
    } else {
      setCurrentIndex(nextIndex);
      setInput("");
      setError("");
      setActiveIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }

  function onGuess() {
    if (!current || gameState !== "playing") return;
    const normalized = input.trim().toLowerCase();
    if (!normalized) return;

    const match = EUROPEAN_COUNTRIES.find((c) => c.name.toLowerCase() === normalized);
    if (!match) {
      setError("Country not found — try typing more");
      return;
    }
    if (match.code !== current.code) {
      setError(`That's ${match.name} — keep trying!`);
      return;
    }
    setError("");
    advanceOrFinish(skipCount);
  }

  function onSkip() {
    if (!current || gameState !== "playing") return;
    const newSkipCount = skipCount + 1;
    setSkipCount(newSkipCount);
    setError("");
    // If this is the only remaining flag, can't skip — just show an error
    if (remaining <= 1) {
      setError("Can't skip the last flag!");
      return;
    }
    // Move skipped flag to end of remaining queue, keep currentIndex the same
    // so the next flag (now shifted into position) is shown
    const newQueue = [...queue];
    newQueue.splice(currentIndex, 1);
    newQueue.push(current);
    setQueue(newQueue);
    setInput("");
    setActiveIndex(-1);
    setTimeout(() => inputRef.current?.focus(), 30);
  }

  useEffect(() => {
    return () => { stopTimer(); };
  }, [stopTimer]);

  const progressPct = queue.length > 0 ? ((currentIndex) / queue.length) * 100 : 0;

  return (
    <div className="relative z-10 w-full flex flex-col items-center px-8 pt-0 pb-10">

      {/* Header */}
      <div className="w-full mb-6">
        <motion.h1
          className="text-[clamp(2rem,6vw,8rem)] font-black leading-[0.95] tracking-tight text-(--color-blue) mb-2"
          style={{ fontFamily: "var(--font-display)" }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          Euro Flag Run
        </motion.h1>
        <motion.p
          className="text-sm text-(--color-muted) leading-relaxed"
          style={{ fontFamily: "var(--font-sans)" }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Name all {EUROPEAN_COUNTRIES.length} European flags as fast as you can.
        </motion.p>
      </div>

      <div className="w-full max-w-sm xl:max-w-lg">

        {gameState === "idle" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center gap-6 py-8"
          >
            {/* Preview grid */}
            <div className="flex flex-wrap gap-2 justify-center max-w-xs">
              {EUROPEAN_COUNTRIES.slice(0, 12).map((c) => (
                <span key={c.code} className={`fi fi-${c.code} rounded-sm shadow-sm`} style={{ width: 32, height: 24 }} />
              ))}
              <span className="text-sm text-(--color-muted) self-center">+{EUROPEAN_COUNTRIES.length - 12} more</span>
            </div>

            <div className="text-center space-y-1">
              <p className="text-sm text-(--color-muted)" style={{ fontFamily: "var(--font-sans)" }}>
                {EUROPEAN_COUNTRIES.length} flags · type a name · skip to come back later
              </p>
              <p className="text-xs text-(--color-muted) opacity-60" style={{ fontFamily: "var(--font-sans)" }}>
                Timer starts when you click Start
              </p>
            </div>

            <button
              type="button"
              onClick={startGame}
              className="rounded-2xl px-10 py-3.5 text-base font-black text-white bg-(--color-blue) hover:opacity-90 transition-opacity shadow-lg"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Start
            </button>
          </motion.div>
        )}

        {gameState === "playing" && current && (
          <div className="flex flex-col gap-4">
            {/* Timer + progress */}
            <div className="flex items-center justify-between">
              <div
                className="text-3xl font-black tabular-nums text-(--color-foreground)"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {formatTime(elapsedMs)}
              </div>
              <div className="text-right">
                <p className="text-xs text-(--color-muted)" style={{ fontFamily: "var(--font-sans)" }}>
                  {currentIndex} / {EUROPEAN_COUNTRIES.length} done
                </p>
                {skipCount > 0 && (
                  <p className="text-[10px] text-amber-500" style={{ fontFamily: "var(--font-sans)" }}>
                    {skipCount} skipped
                  </p>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 rounded-full bg-(--color-border) overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-(--color-blue)"
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>

            {/* Flag */}
            <AnimatePresence mode="wait">
              <motion.div
                key={current.code}
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.05, y: -10 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.15)]"
                style={{ aspectRatio: "3/2" }}
              >
                <img
                  src={`https://flagcdn.com/w640/${current.code}.png`}
                  alt="Guess this flag"
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </motion.div>
            </AnimatePresence>

            {/* Remaining count badge */}
            <p className="text-center text-xs text-(--color-muted)" style={{ fontFamily: "var(--font-sans)" }}>
              {remaining} left
            </p>

            {/* Input */}
            <div className="relative">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => { setInput(e.target.value); setError(""); setActiveIndex(-1); }}
                    onKeyDown={(e) => {
                      if (suggestions.length > 0) {
                        if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1)); return; }
                        if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, -1)); return; }
                        if (e.key === "Enter" && activeIndex >= 0) {
                          e.preventDefault();
                          const sel = suggestions[activeIndex];
                          if (sel) { setInput(sel.name); setActiveIndex(-1); setError(""); }
                          return;
                        }
                      }
                      if (e.key === "Enter") onGuess();
                      if (e.key === "Tab") { e.preventDefault(); onSkip(); }
                    }}
                    placeholder="Type a country name…"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className="w-full rounded-xl border border-(--color-border) bg-white px-4 py-2.5 text-sm outline-none focus:border-(--color-blue) transition-colors"
                  />
                  {suggestions.length > 0 && (
                    <div className="absolute top-full mt-1 left-0 right-0 rounded-xl border border-(--color-border) bg-white shadow-lg overflow-y-auto z-50 max-h-48">
                      {suggestions.map((s, i) => (
                        <button
                          key={s.code}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); setInput(s.name); setActiveIndex(-1); setError(""); inputRef.current?.focus(); }}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2 ${i === activeIndex ? "bg-(--color-blue-light)" : "hover:bg-(--color-blue-light)"}`}
                        >
                          <span className={`fi fi-${s.code} rounded-sm shrink-0`} style={{ width: 18, height: 14 }} />
                          {s.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onGuess}
                  className="rounded-xl px-5 py-2.5 text-sm font-bold text-white bg-(--color-blue) hover:opacity-90 transition-opacity"
                >
                  Go
                </button>
              </div>
              {error && (
                <motion.p
                  key={error}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1.5 text-xs text-red-500"
                >
                  {error}
                </motion.p>
              )}
            </div>

            <button
              type="button"
              onClick={onSkip}
              className="text-xs text-(--color-muted) underline underline-offset-2 hover:opacity-60 transition-opacity self-center"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Skip (Tab) — come back later
            </button>
          </div>
        )}

        {gameState === "finished" && finalTimeMs !== null && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center gap-6"
          >
            {/* Result card */}
            <div className="w-full rounded-2xl border border-(--color-border) bg-(--color-surface) p-6 text-center shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
              <p className="text-xs tracking-[0.25em] uppercase text-(--color-muted) mb-2" style={{ fontFamily: "var(--font-sans)" }}>
                Final time
              </p>
              <p
                className="text-[clamp(2.5rem,10vw,5rem)] font-black tabular-nums leading-none text-(--color-blue) mb-3"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {formatTime(finalTimeMs)}
              </p>
              <div className="flex justify-center gap-6 text-sm text-(--color-muted)" style={{ fontFamily: "var(--font-sans)" }}>
                <span><strong className="text-(--color-foreground)">{EUROPEAN_COUNTRIES.length}</strong> flags</span>
                {skipCount > 0 && <span><strong className="text-amber-500">{skipCount}</strong> skips</span>}
                {scoreSaved && <span className="text-green-600 font-semibold">Score saved ✓</span>}
              </div>
            </div>

            {/* Country flags recap */}
            <div className="w-full">
              <p className="text-xs tracking-[0.2em] uppercase text-(--color-muted) mb-3" style={{ fontFamily: "var(--font-sans)" }}>
                All {EUROPEAN_COUNTRIES.length} flags
              </p>
              <div className="flex flex-wrap gap-2">
                {EUROPEAN_COUNTRIES.map((c) => (
                  <div key={c.code} className="flex flex-col items-center gap-0.5 group relative">
                    <span className={`fi fi-${c.code} rounded-sm shadow-sm`} style={{ width: 32, height: 24 }} />
                    <span className="text-[9px] text-(--color-muted) text-center leading-tight max-w-[40px] hidden group-hover:block absolute -bottom-5 bg-white border border-(--color-border) rounded px-1 whitespace-nowrap z-10 shadow-sm">
                      {c.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={startGame}
              className="rounded-2xl px-10 py-3.5 text-base font-black text-white bg-(--color-blue) hover:opacity-90 transition-opacity shadow-lg"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Play Again
            </button>

            <div className="w-full mt-4">
              <MiniLeaderboard />
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
