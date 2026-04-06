"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MiniLeaderboard from "@/components/ui/MiniLeaderboard";

const TOTAL_ROUNDS = 5;
const REVEAL_MS = 5000;
const FONT = "'Avenir Next', Avenir, Nunito, system-ui, sans-serif";
const F = { fontFamily: FONT, fontWeight: 700 } as const;
const FIGMA_BLUE = "#145df5";
const FIGMA_CREAM = "#fdfdfb";

// ─── Audio ─────────────────────────────────────────────────────────────────

let audioMuted = false;

function playTone(freq: number, duration: number, type: OscillatorType = "sine", gain = 0.18) {
  if (audioMuted) return;
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

let dialAudioCtx: AudioContext | null = null;

function ensureDialAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!dialAudioCtx || dialAudioCtx.state === "closed") {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      dialAudioCtx = new Ctor();
    }
    return dialAudioCtx;
  } catch {
    return null;
  }
}

/** Short mechanical tick; `up` / `down` matches scroll / drag direction along the track. */
function playDialTick(direction: "up" | "down") {
  if (audioMuted) return;
  const ctx = ensureDialAudioContext();
  if (!ctx) return;
  void ctx.resume();
  const t = ctx.currentTime;
  const f0 = direction === "up" ? 3150 : 2380;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(f0 * 0.62, t + 0.026);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.085, t + 0.0015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.042);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.048);
}

function playSubmit() {
  playTone(440, 0.08, "sine", 0.15);
  setTimeout(() => playTone(554, 0.1, "sine", 0.12), 60);
}

function playResult(score: number) {
  if (score >= 80) {
    // Happy ascending chord
    playTone(523, 0.12, "sine", 0.15);
    setTimeout(() => playTone(659, 0.12, "sine", 0.13), 80);
    setTimeout(() => playTone(784, 0.18, "sine", 0.11), 160);
  } else if (score >= 50) {
    playTone(440, 0.1, "sine", 0.13);
    setTimeout(() => playTone(494, 0.14, "sine", 0.11), 90);
  } else {
    // Low descending — not great
    playTone(330, 0.12, "triangle", 0.12);
    setTimeout(() => playTone(277, 0.18, "triangle", 0.1), 100);
  }
}

function playCountdownBeep(isGo: boolean) {
  playTone(isGo ? 880 : 660, isGo ? 0.18 : 0.1, "sine", 0.14);
}

// ─── Color math ────────────────────────────────────────────────────────────

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
  // All three channels equally weighted, each normalized to [0, 1]
  const dh = Math.min(Math.abs(a[0] - b[0]), 360 - Math.abs(a[0] - b[0])) / 180;
  const ds = Math.abs(a[1] - b[1]) / 100;
  const db = Math.abs(a[2] - b[2]) / 100;
  return Math.sqrt(dh * dh + ds * ds + db * db);
}

function scoreFromDist(dist: number): number {
  const max = Math.sqrt(3);
  return Math.max(0, parseFloat(((1 - dist / max) * 100).toFixed(1)));
}

// ─── Quips ─────────────────────────────────────────────────────────────────

const QUIPS: Record<"high" | "mid" | "low" | "bad", string[]> = {
  high: [
    "Okay we're genuinely impressed.",
    "That's almost unfair to the other players.",
    "You have a gift. Or a problem. Unclear.",
    "Your eyes don't miss much, do they.",
    "Perfect? Nearly. We'll allow it.",
  ],
  mid: [
    "Not terrible. Not great. The Switzerland of guesses.",
    "Somewhere in the neighborhood. Wrong house though.",
    "Your brain tried. Points for trying.",
    "Getting warmer. Literally.",
    "That's the color's cousin. Close family.",
  ],
  low: [
    "You looked directly at it.",
    "Maybe you blinked at the wrong moment.",
    "The color did not stick around long enough for you.",
    "A confident miss. Respect the confidence.",
    "Close-ish. In a generous universe.",
  ],
  bad: [
    "Did you close your eyes on purpose?",
    "That's a different color. On a different planet.",
    "We won't tell anyone. Actually we might.",
    "The color was right there. It waited for you.",
    "Truly a unique interpretation of what you saw.",
  ],
};

function getQuip(score: number): string {
  const bucket = score >= 85 ? "high" : score >= 60 ? "mid" : score >= 35 ? "low" : "bad";
  const pool = QUIPS[bucket];
  return pool[Math.floor(Math.random() * pool.length)]!;
}

// ─── Types ──────────────────────────────────────────────────────────────────

type Phase = "intro" | "countdown" | "reveal" | "guess" | "result" | "final";

interface RoundResult {
  target: HSB;
  guess: HSB;
  score: number;
  quip: string;
}

// ─── Shared card shell ──────────────────────────────────────────────────────

function GameCard({ bg, children, motionKey, overflow = "hidden" }: {
  bg: string; children: React.ReactNode; motionKey: string; overflow?: "hidden" | "visible";
}) {
  const overflowClass = overflow === "visible" ? "overflow-visible" : "overflow-hidden";
  return (
    <motion.div
      key={motionKey}
      initial={false}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`relative w-full rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.18)] aspect-3/4 sm:aspect-4/3 ${overflowClass}`}
      style={{ background: bg, maxWidth: 740 }}
    >
      {children}
    </motion.div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function ColorGuesser() {
  const [muted, setMuted] = useState(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [round, setRound] = useState(0);
  const [countdownNum, setCountdownNum] = useState(3);
  const [target, setTarget] = useState<HSB>(() => randomHSB());
  const [guess, setGuess] = useState<HSB>([180, 50, 50]);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => { audioMuted = muted; }, [muted]);

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
      const p = Math.min((performance.now() - startRef.current) / REVEAL_MS, 1);
      setElapsed(p);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
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
    playCountdownBeep(false);
    let n = 3;
    const tick = () => {
      n -= 1;
      if (n > 0) {
        setCountdownNum(n);
        playCountdownBeep(false);
        timeoutRef.current = setTimeout(tick, 1000);
      } else {
        setCountdownNum(0);
        playCountdownBeep(true);
        timeoutRef.current = setTimeout(afterCountdown, 700);
      }
    };
    timeoutRef.current = setTimeout(tick, 1000);
  }

  function submitGuess() {
    const dist = hsbDistance(target, guess);
    const score = scoreFromDist(dist);
    const quip = getQuip(score);
    setResults((r) => [...r, { target, guess, score, quip }]);
    playSubmit();
    setTimeout(() => playResult(score), 200);
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

  const totalScore = results.length > 0
    ? results.reduce((acc, r) => acc + r.score, 0) / results.length
    : 0;

  if (phase === "final") {
    return <FinalScreen results={results} totalScore={totalScore} onRestart={restart} />;
  }

  const secondsLeft = ((1 - elapsed) * REVEAL_MS) / 1000;

  return (
    <div className="relative z-10 pt-0 pb-10">
      {/* Header — left-aligned */}
      <div className="px-4 sm:px-8 mb-3 max-w-xl">
        <motion.h1
          className="text-[clamp(3.25rem,10vw,5.5rem)] font-black leading-[0.82] tracking-tight text-(--color-blue) mb-2"
          style={{ fontFamily: "var(--font-display)" }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          Color<br />Match
        </motion.h1>
        <motion.p
          className="text-sm text-(--color-muted) max-w-sm leading-relaxed mt-4"
          style={{ fontFamily: "var(--font-sans)" }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          Remember a color, then recreate it from memory.
        </motion.p>
        <motion.p
          className="text-xs text-(--color-muted) max-w-sm leading-relaxed mt-1"
          style={{ fontFamily: "var(--font-sans)" }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          5 rounds, scored on accuracy.
        </motion.p>
        <motion.p
          className="text-[10px] tracking-[0.25em] text-(--color-muted) mt-2 opacity-80"
          style={{ fontFamily: "var(--font-sans)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {new Intl.DateTimeFormat("en-US", { weekday: "short", month: "long", day: "numeric" }).format(new Date())}
        </motion.p>
      </div>

      {/* Game — centered */}
      <div className="flex flex-col items-center px-2 sm:px-8 mt-4 sm:-mt-48">
        <div className="w-full max-w-[740px] flex items-center justify-between mb-3" style={{ minHeight: 28 }}>
          <div>
            <RoundDots round={round} completedCount={results.length} />
          </div>
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Unmute sounds" : "Mute sounds"}
            className="rounded-full p-2 transition-opacity hover:opacity-70"
            style={{ color: FIGMA_BLUE }}
          >
            {muted ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <line x1="23" y1="9" x2="17" y2="15"/>
                <line x1="17" y1="9" x2="23" y2="15"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
            )}
          </button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {phase === "intro" && <IntroPhase key="intro" onPlay={handlePlay} />}
          {phase === "countdown" && <CountdownPhase key={`cd-${round}`} num={countdownNum} />}
          {phase === "reveal" && (
            <RevealPhase key={`reveal-${round}`} target={target} elapsed={elapsed} secondsLeft={secondsLeft} round={round} />
          )}
          {phase === "guess" && (
            <GuessPhase key={`guess-${round}`} guess={guess} setGuess={setGuess} onSubmit={submitGuess} round={round} />
          )}
          {phase === "result" && results.length > 0 && (
            <ResultPhase key={`result-${round}`} result={results[results.length - 1]!} onNext={nextRound} />
          )}
        </AnimatePresence>
      </div>

      {/* Leaderboard — left-aligned */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="px-8 mt-8 max-w-xl"
      >
        <Suspense fallback={null}>
          <MiniLeaderboard />
        </Suspense>
      </motion.div>
    </div>
  );
}

// ─── Intro ──────────────────────────────────────────────────────────────────

function IntroPhase({ onPlay }: { onPlay: () => void }) {
  return (
    <GameCard bg={FIGMA_CREAM} motionKey="intro">
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-10 pb-10 pt-10">
        <div className="text-center max-w-sm">
          <p className="text-[11px] tracking-[0.25em] uppercase mb-5" style={{ ...F, color: FIGMA_BLUE }}>
            How to play
          </p>
          <p className="text-lg font-semibold leading-relaxed mb-2" style={{ ...F, color: "#1a1a1a" }}>
            You&apos;ll see a color for 5 seconds.
          </p>
          <p className="text-lg font-semibold leading-relaxed" style={{ ...F, color: "#1a1a1a" }}>
            Then it disappears — use the sliders to recreate it from memory.
          </p>
          <p className="text-sm mt-4" style={{ ...F, color: "#999" }}>
            5 rounds · scored 0–100 on accuracy
          </p>
        </div>
        <button
          type="button"
          onClick={onPlay}
          className="rounded-full px-10 py-3.5 text-base font-bold text-white transition-opacity hover:opacity-90"
          style={{ ...F, background: FIGMA_BLUE }}
        >
          Play
        </button>
      </div>
    </GameCard>
  );
}

// ─── Countdown ──────────────────────────────────────────────────────────────

function CountdownPhase({ num }: { num: number }) {
  const label = num === 0 ? "Go!" : String(num);
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.18)] overflow-hidden flex items-center justify-center aspect-3/4 sm:aspect-4/3"
      style={{ maxWidth: 740, background: FIGMA_CREAM }}
    >
      <AnimatePresence mode="wait">
        <motion.p
          key={label}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.5 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="text-[10rem] font-black leading-none tabular-nums select-none"
          style={{ fontFamily: FONT, fontWeight: 700, color: FIGMA_BLUE }}
        >
          {label}
        </motion.p>
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Round dots ─────────────────────────────────────────────────────────────

function RoundDots({ round, completedCount }: { round: number; completedCount: number }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-flex items-center justify-center rounded-[24px] px-2.5 py-0.5 text-[18px] font-semibold tabular-nums leading-none shrink-0"
        style={{ ...F, background: FIGMA_CREAM, color: FIGMA_BLUE }}
      >
        {round + 1}/{TOTAL_ROUNDS}
      </span>
      <div className="flex items-center gap-1">
        {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => {
          const filled = i < completedCount || i === round;
          return (
            <div
              key={i}
              className="h-2 w-2 rounded-full shrink-0"
              style={filled
                ? { background: FIGMA_BLUE }
                : { border: `1px solid ${FIGMA_BLUE}`, background: "transparent" }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Reveal ─────────────────────────────────────────────────────────────────

function RevealPhase({ target, elapsed, secondsLeft, round }: {
  target: HSB; elapsed: number; secondsLeft: number; round: number;
}) {
  const bg = hsbToCSS(target[0], target[1], target[2]);
  // Format like "4.12" but shown as large digits
  const secs = secondsLeft.toFixed(2);

  return (
    <GameCard bg={bg} motionKey={`reveal-${round}`}>

      {/* Center-right: huge seconds */}
      <div className="absolute top-1/2 right-6 -translate-y-1/2 text-right">
        <p
          className="text-[5.5rem] font-black leading-none tabular-nums"
          style={{ fontFamily: FONT, fontWeight: 700, color: "rgba(255,255,255,0.55)" }}
        >
          {secs}
        </p>
        <p className="text-xs tracking-[0.2em] uppercase mt-1" style={{ ...F, color: "rgba(255,255,255,0.4)" }}>
          Seconds to remember
        </p>
        <p
          className="text-[11px] leading-snug mt-3 max-w-[220px] ml-auto font-medium"
          style={{ fontFamily: FONT, color: "rgba(255,255,255,0.38)" }}
        >
          When the timer hits zero, this color disappears. You'll recreate it from memory with the sliders next.
        </p>
      </div>

      {/* Bottom-left: progress bar */}
      <div className="absolute bottom-6 left-6 right-6">
        <div className="h-[3px] w-full rounded-full bg-white/15 overflow-hidden">
          <div
            className="h-full rounded-full bg-white/50"
            style={{ width: `${(1 - elapsed) * 100}%`, transition: "none" }}
          />
        </div>
      </div>
    </GameCard>
  );
}

// ─── Guess ───────────────────────────────────────────────────────────────────

function GuessPhase({ guess, setGuess, onSubmit, round }: {
  guess: HSB; setGuess: (g: HSB) => void; onSubmit: () => void; round: number;
}) {
  const [h, s, b] = guess;
  const bg = hsbToCSS(h, s, b);

  const hueGrad = "linear-gradient(to bottom,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)";
  const satGrad = `linear-gradient(to bottom,#fff,${hsbToCSS(h, 100, b)})`;
  const briGrad = `linear-gradient(to bottom,${hsbToCSS(h, s, 100)},#000)`;

  return (
    <GameCard bg={bg} motionKey={`guess-${round}`}>
      {/* Sliders flush left */}
      <div className="absolute left-0 top-0 bottom-0 flex gap-0 overflow-hidden rounded-l-3xl">
        <VerticalSlider value={h} min={0} max={360} gradient={hueGrad} onChange={(v) => setGuess([v, s, b])} width={44} />
        <VerticalSlider value={s} min={0} max={100} gradient={satGrad} onChange={(v) => setGuess([h, v, b])} width={44} />
        <VerticalSlider value={100 - b} min={0} max={100} gradient={briGrad} onChange={(v) => setGuess([h, s, 100 - v])} width={44} />
      </div>


      {/* Instruction top-right */}
      <p
        className="absolute top-5 right-5 text-sm font-semibold text-white/70 leading-snug text-right max-w-[200px]"
        style={F}
      >
        Adjust hue, saturation, and brightness until the color feels right.
      </p>

      {/* Submit button bottom-right */}
      <button
        type="button"
        onClick={onSubmit}
        className="absolute bottom-5 right-5 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-opacity hover:opacity-90 text-xl font-bold"
        style={{ ...F, background: FIGMA_CREAM, color: FIGMA_BLUE }}
        aria-label="Submit guess"
      >
        →
      </button>
    </GameCard>
  );
}

// ─── Vertical slider ─────────────────────────────────────────────────────────

function VerticalSlider({ value, min, max, gradient, onChange, width = 40 }: {
  value: number; min: number; max: number; gradient: string; onChange: (v: number) => void; width?: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastEmittedRef = useRef(value);
  const [grabbing, setGrabbing] = useState(false);

  useEffect(() => {
    lastEmittedRef.current = value;
  }, [value]);

  const getVal = useCallback((clientY: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return value;
    return Math.round(min + Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)) * (max - min));
  }, [min, max, value]);

  const emitFromClientY = useCallback(
    (clientY: number, sound: boolean) => {
      const next = getVal(clientY);
      if (next === lastEmittedRef.current) return;
      if (sound) {
        playDialTick(next > lastEmittedRef.current ? "down" : "up");
      }
      lastEmittedRef.current = next;
      onChange(next);
    },
    [getVal, onChange]
  );

  const endGrab = useCallback(() => {
    dragging.current = false;
    setGrabbing(false);
  }, []);

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      tabIndex={0}
      className={`relative h-full shrink-0 select-none touch-none ${grabbing ? "cursor-grabbing" : "cursor-grab"}`}
      style={{ background: gradient, width }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        dragging.current = true;
        setGrabbing(true);
        void ensureDialAudioContext()?.resume();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        emitFromClientY(e.clientY, true);
      }}
      onPointerMove={(e) => {
        if (dragging.current) emitFromClientY(e.clientY, true);
      }}
      onPointerUp={endGrab}
      onPointerCancel={endGrab}
      onLostPointerCapture={endGrab}
      onWheel={(e) => {
        e.preventDefault();
        const step = max - min >= 200 ? 2 : 1;
        const delta = e.deltaY > 0 ? step : -step;
        const next = Math.round(Math.max(min, Math.min(max, value + delta)));
        if (next === value) return;
        void ensureDialAudioContext()?.resume();
        playDialTick(next > value ? "down" : "up");
        lastEmittedRef.current = next;
        onChange(next);
      }}
      onKeyDown={(e) => {
        const step = max - min >= 200 ? 2 : 1;
        let delta = 0;
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") delta = -step;
        else if (e.key === "ArrowDown" || e.key === "ArrowRight") delta = step;
        else return;
        e.preventDefault();
        const next = Math.max(min, Math.min(max, value + delta));
        if (next === value) return;
        void ensureDialAudioContext()?.resume();
        playDialTick(next > value ? "down" : "up");
        lastEmittedRef.current = next;
        onChange(next);
      }}
    >
      <div
        className="absolute left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.4)] pointer-events-none"
        style={{ top: `calc(${((value - min) / (max - min)) * 100}% - 10px)` }}
      />
    </div>
  );
}

// ─── Result ───────────────────────────────────────────────────────────────────

function ResultPhase({ result, onNext }: {
  result: RoundResult; onNext: () => void;
}) {
  const { target, guess, score, quip } = result;
  const guessBg = hsbToCSS(guess[0], guess[1], guess[2]);
  const targetBg = hsbToCSS(target[0], target[1], target[2]);

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.18)] overflow-hidden aspect-3/4 sm:aspect-4/3"
      style={{ maxWidth: 740 }}
    >
      {/* Bottom layer: original (full card) */}
      <div className="absolute inset-0" style={{ background: targetBg }} />

      {/* Top layer: your guess, left half */}
      <div
        className="absolute inset-0"
        style={{
          background: guessBg,
          clipPath: "polygon(0 0, 50% 0, 50% 100%, 0 100%)",
        }}
      />

      {/* Score + quip — top-right, on the original (right half) */}
      <div className="absolute top-4 right-6 text-right">
        <p
          className="text-[3.8rem] font-black leading-none tabular-nums text-white/90"
          style={{ fontFamily: FONT, fontWeight: 700 }}
        >
          {score.toFixed(1)}
        </p>
        <p className="text-sm text-white/65 mt-1 leading-snug max-w-[200px] ml-auto" style={F}>
          {quip}
        </p>
      </div>

      {/* Your selection — bottom-left on guess half */}
      <div className="absolute bottom-4 left-6">
        <p className="text-[10px] tracking-[0.2em] uppercase text-white/45 mb-0.5" style={F}>
          Your selection
        </p>
        <p className="text-sm font-bold text-white/80" style={F}>
          H{guess[0]} S{guess[1]} B{guess[2]}
        </p>
      </div>

      {/* Original — bottom-right on original half */}
      <div className="absolute bottom-4 right-20 text-right">
        <p className="text-[10px] tracking-[0.2em] uppercase text-white/45 mb-0.5" style={F}>
          Original
        </p>
        <p className="text-sm font-bold text-white/80" style={F}>
          H{target[0]} S{target[1]} B{target[2]}
        </p>
      </div>

      {/* Next button — bottom-right */}
      <button
        type="button"
        onClick={onNext}
        className="absolute bottom-4 right-5 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-opacity hover:opacity-90 text-xl font-bold"
        style={{ background: FIGMA_CREAM, color: FIGMA_BLUE }}
        aria-label="Next round"
      >
        →
      </button>
    </motion.div>
  );
}

// ─── Final screen ─────────────────────────────────────────────────────────────

function FinalScreen({ results, totalScore, onRestart }: {
  results: RoundResult[]; totalScore: number; onRestart: () => void;
}) {
  return (
    <div className="relative z-10 px-4 sm:px-8 pt-2 pb-10">
      <h1
        className="text-[clamp(3.25rem,10vw,5.5rem)] font-black leading-[0.82] tracking-tight mb-6 sm:mb-8"
        style={{ color: FIGMA_BLUE, fontFamily: "var(--font-display)" }}
      >
        Color<br />guess
      </h1>

      <div className="flex flex-col items-center mb-10">
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[740px] rounded-3xl border border-(--color-border) bg-(--color-surface) p-4 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
        >
          <div className="mb-6">
            <p className="text-[10px] tracking-[0.25em] uppercase text-(--color-muted) mb-1" style={F}>
              Average score
            </p>
            <div className="flex items-baseline gap-1.5">
              <p
                className="text-[2.5rem] sm:text-[4rem] font-black leading-none tabular-nums"
                style={{ fontFamily: FONT, fontWeight: 700, color: FIGMA_BLUE }}
              >
                {totalScore.toFixed(1)}
              </p>
              <span className="text-2xl font-semibold text-(--color-muted)" style={F}>/ 100</span>
            </div>
          </div>

          <div className="space-y-2">
            {results.map((r, i) => {
              const gBg = hsbToCSS(r.guess[0], r.guess[1], r.guess[2]);
              const tBg = hsbToCSS(r.target[0], r.target[1], r.target[2]);
              return (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-(--color-border) px-4 py-3">
                  <span className="text-xs text-(--color-muted) w-14 shrink-0" style={F}>
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
                        background: r.score >= 80 ? "#22c55e" : r.score >= 50 ? FIGMA_BLUE : "#f59e0b",
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold w-10 text-right shrink-0 tabular-nums" style={F}>
                    {r.score.toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onRestart}
            className="mt-6 w-full rounded-full py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity"
            style={{ ...F, background: FIGMA_BLUE }}
          >
            Play again
          </button>
        </motion.div>
      </div>

      <div className="max-w-xl">
        <Suspense fallback={null}>
          <MiniLeaderboard />
        </Suspense>
      </div>
    </div>
  );
}
