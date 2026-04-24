"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { invalidateLeaderboard } from "@/lib/useLeaderboard";
import { ymdUtcNow } from "@/lib/game-date";
import PitchLeaderboard, { invalidatePitchLeaderboard } from "@/components/ui/PitchLeaderboard";
import monoPng from "@/assets/lottie/mono.png";

const TOTAL_ROUNDS = 5;
const LISTEN_MS = 3000;
const FONT = "'Avenir Next', Avenir, Nunito, system-ui, sans-serif";
const F = { fontFamily: FONT, fontWeight: 700 } as const;
const FIGMA_BLUE = "#145df5";
const FIGMA_CREAM = "#fdfdfb";

// Hz range: 80–2000, logarithmic perception
const MIN_HZ = 80;
const MAX_HZ = 2000;

function randomHz(): number {
  // Log-uniform so low and high freqs are equally likely
  const logMin = Math.log2(MIN_HZ);
  const logMax = Math.log2(MAX_HZ);
  return Math.round(Math.pow(2, logMin + Math.random() * (logMax - logMin)));
}

// Slider position [0,1] ↔ Hz (logarithmic)
function posToHz(pos: number): number {
  const logMin = Math.log2(MIN_HZ);
  const logMax = Math.log2(MAX_HZ);
  return Math.round(Math.pow(2, logMin + pos * (logMax - logMin)));
}

function hzToPos(hz: number): number {
  const logMin = Math.log2(MIN_HZ);
  const logMax = Math.log2(MAX_HZ);
  return (Math.log2(hz) - logMin) / (logMax - logMin);
}

// Score: 0–100 based on log ratio (half-octave = ~50 pts off)
function scoreFromHz(target: number, guess: number): number {
  const logRatio = Math.abs(Math.log2(guess / target));
  // 0 cents off → 100, 1200 cents (one octave) off → 0
  const score = Math.max(0, 100 - (logRatio * 1200) / 12);
  return parseFloat(score.toFixed(1));
}

// ─── Audio ──────────────────────────────────────────────────────────────────

let audioMuted = false;
let sharedCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!sharedCtx || sharedCtx.state === "closed") {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      sharedCtx = new Ctor();
    }
    return sharedCtx;
  } catch {
    return null;
  }
}

function playBeep(freq: number, duration: number, gain = 0.18, type: OscillatorType = "sine") {
  if (audioMuted) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  void ctx.resume();
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
}

function playCountdownBeep(isGo: boolean) {
  playBeep(isGo ? 880 : 660, isGo ? 0.18 : 0.1);
}

function playTargetTone(hz: number): () => void {
  if (audioMuted) return () => {};
  const ctx = getAudioCtx();
  if (!ctx) return () => {};
  void ctx.resume();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.connect(g);
  g.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(hz, ctx.currentTime);
  // Fade in / sustain / fade out
  g.gain.setValueAtTime(0.001, ctx.currentTime);
  g.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.15);
  g.gain.setValueAtTime(0.22, ctx.currentTime + LISTEN_MS / 1000 - 0.25);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + LISTEN_MS / 1000);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + LISTEN_MS / 1000);
  return () => {
    try { osc.stop(); } catch {}
  };
}

// Continuous preview tone for the slider
let previewOsc: OscillatorNode | null = null;
let previewGain: GainNode | null = null;

function startPreviewTone(hz: number) {
  if (audioMuted) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  void ctx.resume();
  stopPreviewTone();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.connect(g);
  g.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(hz, ctx.currentTime);
  g.gain.setValueAtTime(0.001, ctx.currentTime);
  g.gain.linearRampToValueAtTime(0.14, ctx.currentTime + 0.06);
  osc.start(ctx.currentTime);
  previewOsc = osc;
  previewGain = g;
}

function updatePreviewTone(hz: number) {
  if (!previewOsc || !previewGain) { startPreviewTone(hz); return; }
  const ctx = getAudioCtx();
  if (!ctx) return;
  previewOsc.frequency.setTargetAtTime(hz, ctx.currentTime, 0.02);
}

function stopPreviewTone() {
  if (previewGain && sharedCtx) {
    try {
      previewGain.gain.setTargetAtTime(0.001, sharedCtx.currentTime, 0.04);
    } catch {}
  }
  const osc = previewOsc;
  if (osc) {
    try { setTimeout(() => { try { osc.stop(); } catch {} }, 200); } catch {}
  }
  previewOsc = null;
  previewGain = null;
}

function playResult(score: number) {
  if (score >= 80) {
    playBeep(523, 0.12, 0.15); setTimeout(() => playBeep(659, 0.12, 0.13), 80); setTimeout(() => playBeep(784, 0.18, 0.11), 160);
  } else if (score >= 50) {
    playBeep(440, 0.1, 0.13); setTimeout(() => playBeep(494, 0.14, 0.11), 90);
  } else {
    playBeep(330, 0.12, 0.12, "triangle"); setTimeout(() => playBeep(277, 0.18, 0.1, "triangle"), 100);
  }
}

// ─── Quips ──────────────────────────────────────────────────────────────────

const QUIPS: Record<"high" | "mid" | "low" | "bad", string[]> = {
  high: [
    "Perfect pitch? Almost.",
    "Your ears are suspiciously accurate.",
    "A tuner would be jealous.",
    "That's genuinely impressive.",
    "You heard it. You nailed it.",
  ],
  mid: [
    "In the right neighborhood. Wrong house.",
    "Your ears tried. Points for effort.",
    "Close enough to hum along.",
    "A semitone or two off. Respectable.",
    "Somewhere in the ballpark. Big ballpark.",
  ],
  low: [
    "You heard something. Just not that.",
    "A confident guess. Confidently wrong.",
    "The tone waited patiently.",
    "Not quite. But committed.",
    "Your ears have their own agenda.",
  ],
  bad: [
    "Were you listening to something else?",
    "That's a different octave. Or two.",
    "The tone is still out there somewhere.",
    "Bold choice. Wrong frequency.",
    "The sound was right there.",
  ],
};

function getQuip(score: number): string {
  const bucket = score >= 85 ? "high" : score >= 60 ? "mid" : score >= 35 ? "low" : "bad";
  const pool = QUIPS[bucket];
  return pool[Math.floor(Math.random() * pool.length)]!;
}

// ─── Types ──────────────────────────────────────────────────────────────────

type Phase = "intro" | "countdown" | "listen" | "guess" | "result" | "final";

interface RoundResult {
  target: number;
  guess: number;
  score: number;
  quip: string;
}

// ─── Shared card shell ──────────────────────────────────────────────────────

function GameCard({ bg, children, motionKey }: { bg: string; children: React.ReactNode; motionKey: string }) {
  return (
    <motion.div
      key={motionKey}
      initial={false}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full h-full rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.18)] overflow-hidden"
      style={{ background: bg }}
    >
      {children}
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
              style={filled ? { background: FIGMA_BLUE } : { border: `1px solid ${FIGMA_BLUE}`, background: "transparent" }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Mute button ─────────────────────────────────────────────────────────────

function MuteButton({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={muted ? "Unmute sounds" : "Mute sounds"}
      className="rounded-full p-2 transition-opacity hover:opacity-70"
      style={{ color: FIGMA_BLUE }}
    >
      {muted ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
        </svg>
      )}
    </button>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function PitchGuesser() {
  const { user } = useAuth();
  const [muted, setMuted] = useState(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [round, setRound] = useState(0);
  const [countdownNum, setCountdownNum] = useState(3);
  const [target, setTarget] = useState<number>(() => randomHz());
  const [guessPos, setGuessPos] = useState(0.5); // slider position [0,1]
  const [results, setResults] = useState<RoundResult[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const scoreSavedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => { audioMuted = muted; }, [muted]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      stopPreviewTone();
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

  const startListen = useCallback((hz: number) => {
    setPhase("listen");
    setElapsed(0);
    setGuessPos(0.5);
    playTargetTone(hz);
    startRef.current = performance.now();
    const tick = () => {
      const p = Math.min((performance.now() - startRef.current) / LISTEN_MS, 1);
      setElapsed(p);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    timeoutRef.current = setTimeout(() => setPhase("guess"), LISTEN_MS);
  }, []);

  function handlePlay() {
    const hz = randomHz();
    setTarget(hz);
    // Resume AudioContext from within the user gesture so iOS Safari allows audio.
    const ctx = getAudioCtx();
    const resume = ctx ? ctx.resume() : Promise.resolve();
    resume.then(() => startCountdown(() => startListen(hz)));
  }

  function submitGuess() {
    stopPreviewTone();
    const guess = posToHz(guessPos);
    const score = scoreFromHz(target, guess);
    const quip = getQuip(score);
    setResults((r) => [...r, { target, guess, score, quip }]);
    setTimeout(() => playResult(score), 100);
    setPhase("result");
  }

  function nextRound() {
    if (round + 1 >= TOTAL_ROUNDS) {
      setPhase("final");
    } else {
      const hz = randomHz();
      setTarget(hz);
      setRound((r) => r + 1);
      startCountdown(() => startListen(hz));
    }
  }

  function restart() {
    cancelAnimationFrame(rafRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    stopPreviewTone();
    scoreSavedRef.current = false;
    setRound(0);
    setResults([]);
    setElapsed(0);
    setGuessPos(0.5);
    setPhase("intro");
  }

  const totalScore = results.length > 0
    ? results.reduce((acc, r) => acc + r.score, 0) / results.length
    : 0;

  useEffect(() => {
    if (phase !== "final" || scoreSavedRef.current || !user) return;
    scoreSavedRef.current = true;
    const xp = Math.round(totalScore * 10);
    supabase
      .from("game_scores")
      .insert({ user_id: user.id, game_type: "pitch", game_date: ymdUtcNow(), guesses: TOTAL_ROUNDS, xp, won: true })
      .then(({ error }) => { if (!error) { invalidateLeaderboard(); invalidatePitchLeaderboard(); } });
  }, [phase, user, totalScore]);

  if (phase === "final") {
    return <FinalScreen results={results} totalScore={totalScore} onRestart={restart} />;
  }

  return (
    <div className="relative z-10 pt-0 pb-6 px-4 sm:px-8">
      <div className="grid grid-cols-1 md:grid-cols-[clamp(180px,22vw,320px)_1fr] gap-y-0 md:gap-x-8 items-start w-full">

        {/* Title block */}
        <div className="md:pt-2 mb-3 md:mb-0">
          <motion.h1
            className="font-black leading-[0.85] tracking-tight text-(--color-blue)"
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 4vw, 5rem)" }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            Pitch<br />Match
          </motion.h1>
          <motion.p
            className="text-sm text-(--color-muted) leading-relaxed mt-3"
            style={{ fontFamily: "var(--font-sans)" }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            Listen to a tone, then match its frequency from memory.
          </motion.p>
          <motion.p
            className="text-xs text-(--color-muted) leading-relaxed mt-1"
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

          {/* Leaderboard: left column on desktop only */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="hidden md:block mt-6"
          >
            <Suspense fallback={null}><PitchLeaderboard /></Suspense>
          </motion.div>
        </div>

        {/* Game card */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-2" style={{ minHeight: 28 }}>
            <RoundDots round={round} completedCount={results.length} />
            <MuteButton muted={muted} onToggle={() => setMuted((m) => !m)} />
          </div>
          <div className="relative w-full card-height-container">
            {/* Monkey peeking over the top of the card */}
            <Image
              src={monoPng}
              alt=""
              aria-hidden
              className="absolute pointer-events-none select-none z-20"
              style={{ width: 80, height: "auto", top: -33, right:200 }}
            />
            <AnimatePresence mode="wait" initial={false}>
              {phase === "intro" && <IntroPhase key="intro" onPlay={handlePlay} />}
              {phase === "countdown" && <CountdownPhase key={`cd-${round}`} num={countdownNum} />}
              {phase === "listen" && <ListenPhase key={`listen-${round}`} hz={target} elapsed={elapsed} round={round} />}
              {phase === "guess" && (
                <GuessPhase
                  key={`guess-${round}`}
                  guessPos={guessPos}
                  setGuessPos={setGuessPos}
                  onSubmit={submitGuess}
                  round={round}
                  muted={muted}
                />
              )}
              {phase === "result" && results.length > 0 && (
                <ResultPhase key={`result-${round}`} result={results[results.length - 1]!} onNext={nextRound} />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Leaderboard: below card on mobile only */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="md:hidden mt-8 px-4 sm:px-8"
      >
        <Suspense fallback={null}><PitchLeaderboard /></Suspense>
      </motion.div>
    </div>
  );
}

// ─── Intro ──────────────────────────────────────────────────────────────────

function IntroPhase({ onPlay }: { onPlay: () => void }) {
  return (
    <GameCard bg={FIGMA_CREAM} motionKey="intro">
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 xl:gap-6 px-6 xl:px-10 pb-6 xl:pb-10 pt-6 xl:pt-10">
        {/* Waveform illustration */}
        <svg width="120" height="48" viewBox="0 0 120 48" fill="none" aria-hidden="true">
          <path
            d="M0 24 Q10 4 20 24 Q30 44 40 24 Q50 4 60 24 Q70 44 80 24 Q90 4 100 24 Q110 44 120 24"
            stroke={FIGMA_BLUE}
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.7"
          />
        </svg>
        <div className="text-center max-w-sm">
          <p className="text-[10px] xl:text-[11px] tracking-[0.25em] uppercase mb-3 xl:mb-5" style={{ ...F, color: FIGMA_BLUE }}>
            How to play
          </p>
          <p className="text-sm xl:text-lg font-semibold leading-relaxed mb-1 xl:mb-2" style={{ ...F, color: "#1a1a1a" }}>
            You&apos;ll hear a tone for 3 seconds.
          </p>
          <p className="text-sm xl:text-lg font-semibold leading-relaxed" style={{ ...F, color: "#1a1a1a" }}>
            Then use the slider to match its pitch from memory.
          </p>
          <p className="text-xs xl:text-sm mt-2 xl:mt-4" style={{ ...F, color: "#999" }}>
            5 rounds · scored 0–100 on pitch accuracy
          </p>
        </div>
        <button
          type="button"
          onClick={onPlay}
          className="rounded-full px-7 xl:px-10 py-2.5 xl:py-3.5 text-sm xl:text-base font-bold text-white transition-opacity hover:opacity-90"
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
      className="relative w-full h-full rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.18)] overflow-hidden flex items-center justify-center"
      style={{ background: FIGMA_CREAM }}
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

// ─── Listen ──────────────────────────────────────────────────────────────────

function ListenPhase({ hz, elapsed, round }: { hz: number; elapsed: number; round: number }) {
  const secondsLeft = ((1 - elapsed) * LISTEN_MS) / 1000;

  // Animated waveform amplitude tied to elapsed (full while playing)
  const amp = elapsed < 0.9 ? 1 : 1 - (elapsed - 0.9) / 0.1;

  return (
    <GameCard bg={FIGMA_BLUE} motionKey={`listen-${round}`}>
      {/* Animated waveform center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <WaveformViz amplitude={amp} />
      </div>

      {/* Timer top-right */}
      <div className="absolute top-6 right-6 text-right">
        <p
          className="text-[4rem] font-black leading-none tabular-nums"
          style={{ fontFamily: FONT, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}
        >
          {secondsLeft.toFixed(1)}
        </p>
        <p className="text-xs tracking-[0.2em] uppercase mt-1" style={{ ...F, color: "rgba(255,255,255,0.45)" }}>
          Listen carefully
        </p>
      </div>

      {/* Hz label bottom-left */}
      <div className="absolute bottom-6 left-6">
        <p className="text-[10px] tracking-[0.2em] uppercase" style={{ ...F, color: "rgba(255,255,255,0.35)" }}>
          Remember this pitch
        </p>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-6 left-6 right-6">
        <div className="h-[3px] w-full rounded-full bg-white/15 overflow-hidden mt-5">
          <div
            className="h-full rounded-full bg-white/50"
            style={{ width: `${(1 - elapsed) * 100}%`, transition: "none" }}
          />
        </div>
      </div>
    </GameCard>
  );
}

// ─── Animated waveform ───────────────────────────────────────────────────────

function WaveformViz({ amplitude }: { amplitude: number }) {
  const bars = 32;
  return (
    <div className="flex items-center gap-[3px]" style={{ height: 80 }}>
      {Array.from({ length: bars }).map((_, i) => {
        // Sine-wave envelope across bars for a waveform look
        const phase = (i / bars) * Math.PI * 2;
        const baseH = 12 + Math.abs(Math.sin(phase)) * 52;
        return (
          <motion.div
            key={i}
            className="rounded-full bg-white/70"
            style={{ width: 4 }}
            animate={{ height: baseH * amplitude + 4 }}
            transition={{ duration: 0.08, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}

// ─── Guess ──────────────────────────────────────────────────────────────────

function GuessPhase({ guessPos, setGuessPos, onSubmit, round, muted }: {
  guessPos: number; setGuessPos: (p: number) => void; onSubmit: () => void; round: number; muted: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [grabbing, setGrabbing] = useState(false);
  const hz = posToHz(guessPos);
  const isPlayingRef = useRef(false);

  // Start preview tone when phase mounts — deferred so iOS AudioContext is resumed
  // from the pointer event on first interaction rather than here.
  useEffect(() => {
    if (!muted) {
      getAudioCtx()?.resume().then(() => {
        startPreviewTone(hz);
        isPlayingRef.current = true;
      });
    }
    return () => { stopPreviewTone(); isPlayingRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muted]);

  const getPosFromClientX = useCallback((clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return guessPos;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, [guessPos]);

  const handleMove = useCallback((clientX: number) => {
    const pos = getPosFromClientX(clientX);
    setGuessPos(pos);
    if (!muted) updatePreviewTone(posToHz(pos));
  }, [getPosFromClientX, setGuessPos, muted]);

  const endGrab = useCallback(() => {
    dragging.current = false;
    setGrabbing(false);
  }, []);

  // Frequency label size: smaller for high Hz (more digits)
  const hzLabel = hz >= 1000 ? `${(hz / 1000).toFixed(2)}k` : `${hz}`;

  return (
    <GameCard bg={FIGMA_CREAM} motionKey={`guess-${round}`}>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-8">

        {/* Frequency display */}
        <div className="text-center">
          <p
            className="text-[5rem] font-black leading-none tabular-nums"
            style={{ fontFamily: FONT, fontWeight: 700, color: FIGMA_BLUE }}
          >
            {hzLabel}
          </p>
          <p className="text-xs tracking-[0.2em] uppercase mt-1" style={{ ...F, color: "#aaa" }}>
            Hz
          </p>
        </div>

        {/* Horizontal slider track */}
        <div className="w-full flex flex-col gap-3">
          <div className="flex justify-between text-[10px] tracking-widest uppercase" style={{ ...F, color: "#bbb" }}>
            <span>{MIN_HZ} Hz</span>
            <span>Drag to match pitch</span>
            <span>{MAX_HZ} Hz</span>
          </div>
          <div
            ref={trackRef}
            role="slider"
            aria-valuemin={MIN_HZ}
            aria-valuemax={MAX_HZ}
            aria-valuenow={hz}
            tabIndex={0}
            className={`relative h-12 rounded-full select-none touch-none ${grabbing ? "cursor-grabbing" : "cursor-grab"}`}
            style={{ background: `linear-gradient(to right, #b3c8ff, ${FIGMA_BLUE})` }}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              dragging.current = true;
              setGrabbing(true);
              void getAudioCtx()?.resume();
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              handleMove(e.clientX);
            }}
            onPointerMove={(e) => { if (dragging.current) handleMove(e.clientX); }}
            onPointerUp={endGrab}
            onPointerCancel={endGrab}
            onLostPointerCapture={endGrab}
            onKeyDown={(e) => {
              let delta = 0;
              if (e.key === "ArrowLeft") delta = -0.01;
              else if (e.key === "ArrowRight") delta = 0.01;
              else return;
              e.preventDefault();
              const next = Math.max(0, Math.min(1, guessPos + delta));
              setGuessPos(next);
              if (!muted) updatePreviewTone(posToHz(next));
            }}
          >
            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-[0_2px_12px_rgba(0,0,0,0.25)] pointer-events-none"
              style={{ left: `${guessPos * 100}%` }}
            />
          </div>
        </div>

        {/* Instruction */}
        <p className="text-xs text-center max-w-xs" style={{ ...F, color: "#aaa" }}>
          The preview tone plays as you drag. Match the pitch you heard.
        </p>
      </div>

      {/* Submit */}
      <button
        type="button"
        onClick={onSubmit}
        className="absolute bottom-5 right-5 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-opacity hover:opacity-90 text-xl font-bold"
        style={{ ...F, background: FIGMA_BLUE, color: FIGMA_CREAM }}
        aria-label="Submit guess"
      >
        →
      </button>
    </GameCard>
  );
}

// ─── Result ──────────────────────────────────────────────────────────────────

function ResultPhase({ result, onNext }: { result: RoundResult; onNext: () => void }) {
  const { target, guess, score, quip } = result;
  const cents = Math.round(Math.abs(Math.log2(guess / target)) * 1200);

  // Visual: show target and guess on a mini frequency bar
  const targetPos = hzToPos(target);
  const guessPos = hzToPos(guess);

  return (
    <GameCard bg={FIGMA_CREAM} motionKey={`result-${result.target}`}>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-8">

        {/* Score */}
        <div className="text-center">
          <p
            className="text-[5.5rem] font-black leading-none tabular-nums"
            style={{ fontFamily: FONT, fontWeight: 700, color: FIGMA_BLUE }}
          >
            {score.toFixed(1)}
          </p>
          <p className="text-sm mt-1 max-w-xs" style={{ ...F, color: "#999" }}>
            {quip}
          </p>
        </div>

        {/* Frequency comparison bar */}
        <div className="w-full">
          <div
            className="relative h-3 rounded-full w-full overflow-visible"
            style={{ background: "#e8edf8" }}
          >
            {/* Target marker */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md"
              style={{ left: `${targetPos * 100}%`, background: FIGMA_BLUE }}
              title={`Target: ${target} Hz`}
            />
            {/* Guess marker */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md"
              style={{ left: `${guessPos * 100}%`, background: score >= 80 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444" }}
              title={`Your guess: ${guess} Hz`}
            />
          </div>
          <div className="flex justify-between mt-3 text-xs" style={{ ...F, color: "#999" }}>
            <span>
              <span className="inline-block w-2.5 h-2.5 rounded-full mr-1" style={{ background: FIGMA_BLUE, verticalAlign: "middle" }} />
              Target: {target} Hz
            </span>
            <span>
              {cents} cents off
            </span>
            <span>
              Your guess: {guess} Hz
              <span
                className="inline-block w-2.5 h-2.5 rounded-full ml-1"
                style={{ background: score >= 80 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444", verticalAlign: "middle" }}
              />
            </span>
          </div>
        </div>
      </div>

      {/* Next */}
      <button
        type="button"
        onClick={onNext}
        className="absolute bottom-5 right-5 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-opacity hover:opacity-90 text-xl font-bold"
        style={{ ...F, background: FIGMA_BLUE, color: FIGMA_CREAM }}
        aria-label="Next round"
      >
        →
      </button>
    </GameCard>
  );
}

// ─── Final ───────────────────────────────────────────────────────────────────

function FinalScreen({ results, totalScore, onRestart }: {
  results: RoundResult[]; totalScore: number; onRestart: () => void;
}) {
  return (
    <div className="relative z-10 px-4 sm:px-8 pt-2 pb-10">
      <h1
        className="text-[clamp(3.25rem,10vw,8rem)] font-black leading-[0.82] tracking-tight mb-6 sm:mb-8"
        style={{ color: FIGMA_BLUE, fontFamily: "var(--font-display)" }}
      >
        Pitch<br />Match
      </h1>

      <div className="flex flex-col items-center mb-10">
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[960px] rounded-3xl border border-(--color-border) bg-(--color-surface) p-4 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
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
              const cents = Math.round(Math.abs(Math.log2(r.guess / r.target)) * 1200);
              return (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-(--color-border) px-4 py-3">
                  <span className="text-xs text-(--color-muted) w-14 shrink-0" style={F}>
                    Round {i + 1}
                  </span>
                  <div className="flex flex-col shrink-0 w-24 text-[10px]" style={{ ...F, color: "#999" }}>
                    <span>{r.target} Hz</span>
                    <span>{r.guess} Hz</span>
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
                  <span className="text-[10px] shrink-0" style={{ ...F, color: "#aaa" }}>{cents}¢</span>
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
          <PitchLeaderboard />
        </Suspense>
      </div>
    </div>
  );
}
