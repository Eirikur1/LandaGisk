"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MiniLeaderboard from "@/components/ui/MiniLeaderboard";

const TOTAL_ROUNDS = 5;
const REVEAL_MS = 5000;
const FONT = "'Avenir Next', Avenir, Nunito, system-ui, sans-serif";
/** Figma (node 1:39) */
const FIGMA_BLUE = "#145df5";
const FIGMA_CREAM = "#fdfdfb";

type HSB = [number, number, number];

function randomHSB(): HSB {
  return [
    Math.floor(Math.random() * 360),
    Math.floor(40 + Math.random() * 60),
    Math.floor(35 + Math.random() * 55),
  ];
}

function hsbToRgb(h: number, s: number, b: number): [number, number, number] {
  s /= 100; b /= 100;
  const k = (n: number) => (n + h / 60) % 6;
  const f = (n: number) => b * (1 - s * Math.max(0, Math.min(k(n), 4 - k(n), 1)));
  return [Math.round(f(5) * 255), Math.round(f(3) * 255), Math.round(f(1) * 255)];
}

function hsbToCSS(h: number, s: number, b: number): string {
  const [r, g, b2] = hsbToRgb(h, s, b);
  return `rgb(${r},${g},${b2})`;
}

function hsbDistance(a: HSB, b: HSB): number {
  const dh = Math.min(Math.abs(a[0] - b[0]), 360 - Math.abs(a[0] - b[0])) / 180;
  const ds = Math.abs(a[1] - b[1]) / 100;
  const db = Math.abs(a[2] - b[2]) / 100;
  return Math.sqrt(dh * dh + ds * ds + db * db);
}

function scoreFromDist(dist: number): number {
  const max = Math.sqrt(3);
  return Math.max(0, parseFloat(((1 - dist / max) * 100).toFixed(1)));
}

type Phase = "intro" | "countdown" | "reveal" | "guess" | "result" | "final";

interface RoundResult {
  target: HSB;
  guess: HSB;
  score: number;
}

// Shared card wrapper — centers a large rounded card in the viewport
function GameCard({
  bg,
  children,
  motionKey,
}: {
  bg: string;
  children: React.ReactNode;
  motionKey: string;
}) {
  return (
    <motion.div
      key={motionKey}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.18)]"
      style={{ background: bg, maxWidth: 740, aspectRatio: "4/3" }}
    >
      {children}
    </motion.div>
  );
}

export default function ColorGuesser() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [round, setRound] = useState(0);
  const [countdownNum, setCountdownNum] = useState(3);
  const [target, setTarget] = useState<HSB>(() => randomHSB());
  const [guess, setGuess] = useState<HSB>([180, 50, 50]);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [elapsed, setElapsed] = useState(0);

  const startRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startReveal = useCallback((t: HSB) => {
    setPhase("reveal");
    setElapsed(0);
    setGuess([180, 50, 50]);
    setTarget(t);
    startRef.current = performance.now();

    const tick = () => {
      const progress = Math.min((performance.now() - startRef.current) / REVEAL_MS, 1);
      setElapsed(progress);
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    timeoutRef.current = setTimeout(() => setPhase("guess"), REVEAL_MS);
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function startCountdown(afterCountdown: () => void) {
    setPhase("countdown");
    setCountdownNum(3);
    let n = 3;
    const tick = () => {
      n -= 1;
      if (n > 0) {
        setCountdownNum(n);
        timeoutRef.current = setTimeout(tick, 1000);
      } else {
        // "Go!" — show 0 briefly then start
        setCountdownNum(0);
        timeoutRef.current = setTimeout(afterCountdown, 600);
      }
    };
    timeoutRef.current = setTimeout(tick, 1000);
  }

  function submitGuess() {
    const dist = hsbDistance(target, guess);
    const score = scoreFromDist(dist);
    setResults((r) => [...r, { target, guess, score }]);
    setPhase("result");
  }

  function handlePlay() {
    const t = randomHSB();
    setTarget(t);
    startCountdown(() => startReveal(t));
  }

  function nextRound() {
    if (round + 1 >= TOTAL_ROUNDS) {
      setPhase("final");
    } else {
      const t = randomHSB();
      setTarget(t);
      setRound((r) => r + 1);
      startCountdown(() => startReveal(t));
    }
  }

  function restart() {
    cancelAnimationFrame(rafRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setRound(0);
    setResults([]);
    setPhase("intro");
  }

  const totalScore = results.length > 0 ? results.reduce((acc, r) => acc + r.score, 0) / results.length : 0;

  if (phase === "final") {
    return <FinalScreen results={results} totalScore={totalScore} onRestart={restart} />;
  }

  const secondsLeft = ((1 - elapsed) * REVEAL_MS) / 1000;

  return (
    <div className="relative z-10 px-8 pt-2 pb-10">
      {/* Title — same position as other games */}
      <motion.h1
        className="text-[clamp(3.25rem,10vw,5.5rem)] font-black leading-[0.95] tracking-tight mb-4"
        style={{ color: FIGMA_BLUE, fontFamily: "var(--font-display)" }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        Color guess
      </motion.h1>

      {/* Round dots + card — centered */}
      <div className="flex flex-col items-center">
        {phase !== "intro" && (
          <div className="mb-3 w-full max-w-[740px]">
            <RoundDots round={round} completedCount={results.length} />
          </div>
        )}

      {/* Game card */}
      <AnimatePresence mode="wait">
        {phase === "intro" && (
          <IntroPhase key="intro" onPlay={handlePlay} />
        )}
        {phase === "countdown" && (
          <CountdownPhase key={`countdown-${round}`} num={countdownNum} />
        )}
        {phase === "reveal" && (
          <RevealPhase
            key={`reveal-${round}`}
            target={target}
            elapsed={elapsed}
            secondsLeft={secondsLeft}
            round={round}
          />
        )}
        {phase === "guess" && (
          <GuessPhase
            key={`guess-${round}`}
            guess={guess}
            setGuess={setGuess}
            onSubmit={submitGuess}
            round={round}
          />
        )}
        {phase === "result" && results.length > 0 && (
          <ResultPhase
            key={`result-${round}`}
            result={results[results.length - 1]!}
            round={round}
            onNext={nextRound}
          />
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}

function IntroPhase({ onPlay }: { onPlay: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.18)] overflow-hidden flex flex-col items-center justify-center gap-6 p-10"
      style={{ maxWidth: 740, aspectRatio: "4/3", background: FIGMA_CREAM }}
    >
      <div className="text-center max-w-sm">
        <p className="text-[11px] tracking-[0.25em] uppercase mb-4" style={{ fontFamily: FONT, color: FIGMA_BLUE }}>
          How to play
        </p>
        <p className="text-lg font-semibold leading-relaxed mb-2" style={{ fontFamily: FONT, color: "#1a1a1a" }}>
          You&apos;ll see a color for a few seconds.
        </p>
        <p className="text-lg font-semibold leading-relaxed mb-2" style={{ fontFamily: FONT, color: "#1a1a1a" }}>
          Then it disappears — use the hue, saturation, and brightness sliders to recreate it from memory.
        </p>
        <p className="text-sm mt-3" style={{ fontFamily: FONT, color: "#888" }}>
          5 rounds · scored on how close you get
        </p>
      </div>

      <button
        type="button"
        onClick={onPlay}
        className="rounded-full px-10 py-3.5 text-base font-bold text-white transition-opacity hover:opacity-90"
        style={{ background: FIGMA_BLUE, fontFamily: FONT }}
      >
        Play
      </button>
    </motion.div>
  );
}

function CountdownPhase({ num }: { num: number }) {
  const label = num === 0 ? "Go!" : String(num);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.18)] overflow-hidden flex items-center justify-center"
      style={{ maxWidth: 740, aspectRatio: "4/3", background: FIGMA_CREAM }}
    >
      <AnimatePresence mode="wait">
        <motion.p
          key={label}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.4 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="text-[8rem] font-black leading-none tabular-nums"
          style={{ fontFamily: "var(--font-display)", color: FIGMA_BLUE }}
        >
          {label}
        </motion.p>
      </AnimatePresence>
    </motion.div>
  );
}

function RoundDots({ round, completedCount }: { round: number; completedCount: number }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-flex items-center justify-center rounded-[24px] px-2.5 py-0.5 text-[18px] font-semibold tabular-nums leading-none shrink-0 sm:px-3 sm:py-1 sm:text-[20px]"
        style={{ fontFamily: FONT, background: FIGMA_CREAM, color: FIGMA_BLUE }}
      >
        {round + 1}/{TOTAL_ROUNDS}
      </span>
      <div className="flex items-center gap-1">
        {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => {
          const filled = i < completedCount || i === round;
          return (
            <div
              key={i}
              className="h-2 w-2 rounded-full shrink-0 sm:h-2.5 sm:w-2.5"
              style={
                filled
                  ? { background: FIGMA_BLUE }
                  : { border: `1px solid ${FIGMA_BLUE}`, background: "transparent" }
              }
            />
          );
        })}
      </div>
    </div>
  );
}

function RevealPhase({
  target, elapsed, secondsLeft, round,
}: {
  target: HSB; elapsed: number; secondsLeft: number; round: number;
}) {
  const bg = hsbToCSS(target[0], target[1], target[2]);
  return (
    <GameCard bg={bg} motionKey={`reveal-${round}`}>
      {/* Bottom left: label + progress bar */}
      <div className="absolute bottom-6 left-6">
        <p
          className="text-[10px] tracking-[0.22em] uppercase text-white/55 mb-2"
          style={{ fontFamily: FONT }}
        >
          Memorize this shade
        </p>
        <div className="h-1 w-44 rounded-full bg-white/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-white/65"
            style={{ width: `${(1 - elapsed) * 100}%`, transition: "none" }}
          />
        </div>
      </div>

      {/* Bottom right: countdown */}
      <div className="absolute bottom-4 right-6 text-right">
        <p
          className="text-[3.2rem] font-black leading-none text-white/85 tabular-nums"
          style={{ fontFamily: FONT }}
        >
          {secondsLeft.toFixed(2)}
        </p>
        <p
          className="text-[10px] tracking-[0.22em] uppercase text-white/50 mt-0.5"
          style={{ fontFamily: FONT }}
        >
          seconds left
        </p>
      </div>
    </GameCard>
  );
}

function GuessPhase({
  guess, setGuess, onSubmit, round,
}: {
  guess: HSB; setGuess: (g: HSB) => void; onSubmit: () => void; round: number;
}) {
  const [h, s, b] = guess;
  const bg = hsbToCSS(h, s, b);

  const hueGradient = "linear-gradient(to bottom, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)";
  const satGradient = `linear-gradient(to bottom, #ffffff, ${hsbToCSS(h, 100, b)})`;
  const briGradient = `linear-gradient(to bottom, ${hsbToCSS(h, s, 100)}, #000000)`;

  return (
    <GameCard bg={bg} motionKey={`guess-${round}`}>
      {/* Sliders — left side, inset from edges */}
      <div className="absolute left-5 top-5 bottom-5 flex gap-3">
        <VerticalSlider value={h} min={0} max={360} gradient={hueGradient} onChange={(v) => setGuess([v, s, b])} />
        <VerticalSlider value={s} min={0} max={100} gradient={satGradient} onChange={(v) => setGuess([h, v, b])} />
        <VerticalSlider value={100 - b} min={0} max={100} gradient={briGradient} onChange={(v) => setGuess([h, s, 100 - v])} />
      </div>

      {/* Top right of card — clear of sliders */}
      <div className="absolute left-[148px] right-5 top-5 flex justify-end sm:left-[156px]">
        <p
          className="text-right text-sm font-semibold leading-snug text-white sm:text-base max-w-[min(280px,calc(100%-0.5rem))]"
          style={{ fontFamily: FONT }}
        >
          Adjust Hue, Saturation, and brightness until the color feels right.
        </p>
      </div>

      {/* Submit — cream pill, blue arrow (Figma) */}
      <button
        type="button"
        onClick={onSubmit}
        className="absolute bottom-5 right-5 flex h-[54px] w-[85px] items-center justify-center rounded-[31px] shadow-lg transition-opacity hover:opacity-95"
        style={{ fontFamily: FONT, background: FIGMA_CREAM, color: FIGMA_BLUE }}
        aria-label="Submit guess"
      >
        <span className="text-2xl font-bold leading-none" aria-hidden>
          →
        </span>
      </button>
    </GameCard>
  );
}

function VerticalSlider({
  value, min, max, gradient, onChange,
}: {
  value: number; min: number; max: number; gradient: string; onChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const getValueFromY = useCallback((clientY: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return value;
    const ratio = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    return Math.round(min + ratio * (max - min));
  }, [min, max, value]);

  return (
    <div
      ref={trackRef}
      className="relative w-10 h-full rounded-xl cursor-pointer select-none touch-none"
      style={{ background: gradient }}
      onPointerDown={(e) => {
        dragging.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        onChange(getValueFromY(e.clientY));
      }}
      onPointerMove={(e) => { if (dragging.current) onChange(getValueFromY(e.clientY)); }}
      onPointerUp={() => { dragging.current = false; }}
    >
      <div
        className="absolute left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
        style={{ top: `calc(${((value - min) / (max - min)) * 100}% - 10px)` }}
      />
    </div>
  );
}

function ResultPhase({
  result, round, onNext,
}: {
  result: RoundResult; round: number; onNext: () => void;
}) {
  const { target, guess, score } = result;
  const guessBg = hsbToCSS(guess[0], guess[1], guess[2]);
  const targetBg = hsbToCSS(target[0], target[1], target[2]);

  const quip =
    score >= 95 ? "Uncanny. Almost perfect." :
    score >= 80 ? "Really close!" :
    score >= 60 ? "Not bad, getting warmer." :
    score >= 40 ? "That shade got loose on you. Next round is a clean slate." :
                   "Way off — but that's the fun of it.";

  return (
    <motion.div
      key={`result-${round}`}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.18)] overflow-hidden flex"
      style={{ maxWidth: 740, aspectRatio: "4/3" }}
    >
        {/* Left half: your guess */}
        <div className="flex-1 relative" style={{ background: guessBg }}>
          <div className="absolute bottom-5 left-6">
            <p className="text-[10px] tracking-[0.22em] uppercase text-white/50 mb-1" style={{ fontFamily: FONT }}>
              Your selection
            </p>
            <p className="text-sm font-bold text-white/90" style={{ fontFamily: FONT }}>
              H{guess[0]} S{guess[1]} B{guess[2]}
            </p>
          </div>
        </div>

        {/* Right half: original */}
        <div className="flex-1 relative" style={{ background: targetBg }}>
          {/* Score top right */}
          <div className="absolute top-6 right-6 text-right">
            <p
              className="text-[3.5rem] font-black leading-none text-white/90 tabular-nums"
              style={{ fontFamily: FONT }}
            >
              {score.toFixed(1)}
            </p>
            <p className="text-sm text-white/65 mt-2 leading-snug max-w-[180px] ml-auto" style={{ fontFamily: FONT }}>
              {quip}
            </p>
          </div>

          {/* Original label bottom */}
          <div className="absolute bottom-5 left-6 right-16">
            <p className="text-[10px] tracking-[0.22em] uppercase text-white/50 mb-1" style={{ fontFamily: FONT }}>
              Original
            </p>
            <p className="text-sm font-bold text-white/90" style={{ fontFamily: FONT }}>
              H{target[0]} S{target[1]} B{target[2]}
            </p>
          </div>

          {/* Arrow button — match Figma cream / blue */}
          <button
            type="button"
            onClick={onNext}
            className="absolute bottom-5 right-5 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-opacity hover:opacity-95 text-xl font-bold"
            style={{ background: FIGMA_CREAM, color: FIGMA_BLUE }}
            aria-label="Next round"
          >
            →
          </button>
        </div>
    </motion.div>
  );
}

function FinalScreen({
  results, totalScore, onRestart,
}: {
  results: RoundResult[]; totalScore: number; onRestart: () => void;
}) {
  return (
    <div className="relative z-10 px-8 pt-2 pb-10">
      {/* Title */}
      <h1
        className="text-[clamp(3.25rem,10vw,5.5rem)] font-black leading-[0.95] tracking-tight mb-8"
        style={{ color: FIGMA_BLUE, fontFamily: "var(--font-display)" }}
      >
        Color guess
      </h1>

      {/* Scoreboard — centered */}
      <div className="flex flex-col items-center mb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[740px] rounded-3xl border border-(--color-border) bg-(--color-surface) p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
        >
          {/* Total score */}
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-[10px] tracking-[0.25em] uppercase text-(--color-muted) mb-1" style={{ fontFamily: FONT }}>
                Average score
              </p>
              <p
                className="text-[4rem] font-black leading-none tabular-nums"
                style={{ fontFamily: "var(--font-display)", color: FIGMA_BLUE }}
              >
                {totalScore.toFixed(1)}
                <span className="text-2xl font-semibold text-(--color-muted) ml-2">/ 100</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onRestart}
              className="rounded-full px-7 py-3 text-sm font-bold text-white bg-(--color-blue) hover:opacity-90 transition-opacity shrink-0"
              style={{ fontFamily: FONT }}
            >
              Play again
            </button>
          </div>

          {/* Per-round breakdown */}
          <div className="space-y-2">
            {results.map((r, i) => {
              const gBg = hsbToCSS(r.guess[0], r.guess[1], r.guess[2]);
              const tBg = hsbToCSS(r.target[0], r.target[1], r.target[2]);
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-(--color-border) px-4 py-3"
                >
                  <span className="text-xs text-(--color-muted) w-14 shrink-0" style={{ fontFamily: FONT }}>
                    Round {i + 1}
                  </span>
                  <div className="flex gap-1.5 shrink-0">
                    <div className="w-6 h-6 rounded-md" style={{ background: gBg }} title="Your guess" />
                    <div className="w-6 h-6 rounded-md" style={{ background: tBg }} title="Original" />
                  </div>
                  <div className="flex-1 h-1.5 rounded-full bg-(--color-border) overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${r.score}%`,
                        background: r.score >= 80 ? "#22c55e" : r.score >= 50 ? "var(--color-blue)" : "#f59e0b",
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold w-10 text-right shrink-0 tabular-nums" style={{ fontFamily: FONT }}>
                    {r.score.toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Leaderboard — left-aligned, max-w-xl like other games */}
      <div className="max-w-xl">
        <Suspense fallback={null}>
          <MiniLeaderboard />
        </Suspense>
      </div>
    </div>
  );
}
