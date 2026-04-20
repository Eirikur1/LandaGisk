"use client";

import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  ALL_COUNTRIES,
  GRID_SIZES,
  countriesInCell,
  matchesCountry,
  type WorldCountryEntry,
} from "./worldCountries";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { invalidateLeaderboard } from "@/lib/useLeaderboard";
import { ymdUtcNow } from "@/lib/game-date";

const WorldMap = dynamic(() => import("./WorldMap"), { ssr: false });

const TOTAL_ROUNDS = 5;
const FONT = "'Avenir Next', Avenir, Nunito, system-ui, sans-serif";
const F = { fontFamily: FONT, fontWeight: 700 } as const;
const FIGMA_BLUE = "#145df5";
const FIGMA_CREAM = "#fdfdfb";

// ─── Types ───────────────────────────────────────────────────────────────────

type Phase = "intro" | "playing" | "result" | "final";

interface CellState {
  cols: number;
  rows: number;
  colIdx: number;
  rowIdx: number;
  sizeLabel: string;
  targets: WorldCountryEntry[];
  found: WorldCountryEntry[];
  gaveUp: boolean;
}

interface RoundResult {
  cell: CellState;
  score: number;
}

// ─── Round generation ────────────────────────────────────────────────────────

function pickCell(): CellState {
  const size = GRID_SIZES[Math.floor(Math.random() * GRID_SIZES.length)]!;
  const { cols, rows } = size;

  // Only pick cells that have at least 1 country
  let attempts = 0;
  while (attempts < 300) {
    attempts++;
    const colIdx = Math.floor(Math.random() * cols);
    const rowIdx = Math.floor(Math.random() * rows);
    const targets = countriesInCell(colIdx, rowIdx, cols, rows);
    if (targets.length > 0) {
      return { cols, rows, colIdx, rowIdx, sizeLabel: size.label, targets, found: [], gaveUp: false };
    }
  }
  // Fallback: western Europe guaranteed
  return { cols: 13, rows: 7, colIdx: 7, rowIdx: 2, sizeLabel: "Medium", targets: countriesInCell(7, 2, 13, 7), found: [], gaveUp: false };
}

function scoreCell(cell: CellState): number {
  if (cell.targets.length === 0) return 100;
  return parseFloat(((cell.found.length / cell.targets.length) * 100).toFixed(1));
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GridGuesser() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("intro");
  const [round, setRound] = useState(0);
  const [cell, setCell] = useState<CellState>(() => pickCell());
  const [results, setResults] = useState<RoundResult[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [shake, setShake] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const scoreSavedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase === "playing") setTimeout(() => inputRef.current?.focus(), 50);
  }, [phase, round]);

  function startRound(c: CellState) {
    setCell(c);
    setInputVal("");
    setFeedback(null);
    setPhase("playing");
  }

  function handlePlay() { startRound(pickCell()); }

  function submitGuess() {
    const val = inputVal.trim();
    if (!val) return;

    if (cell.found.some((c) => matchesCountry(val, c))) {
      setFeedback({ msg: "Already found!", ok: false });
      triggerShake();
      setInputVal("");
      return;
    }

    const match = cell.targets.find((c) => matchesCountry(val, c));
    if (!match) {
      const isKnown = ALL_COUNTRIES.some((c) => matchesCountry(val, c));
      setFeedback({ msg: isKnown ? "Not in this cell." : "Country not recognised.", ok: false });
      triggerShake();
      setInputVal("");
      return;
    }

    const newFound = [...cell.found, match];
    const newCell = { ...cell, found: newFound };
    setCell(newCell);
    setInputVal("");
    setFeedback({ msg: `✓ ${match.name}`, ok: true });

    if (newFound.length === newCell.targets.length) {
      finishRound(newCell);
    }
  }

  function giveUp() {
    const newCell = { ...cell, gaveUp: true };
    setCell(newCell);
    finishRound(newCell);
  }

  function finishRound(finalCell: CellState) {
    setResults((r) => [...r, { cell: finalCell, score: scoreCell(finalCell) }]);
    setPhase("result");
  }

  function nextRound() {
    if (round + 1 >= TOTAL_ROUNDS) {
      setPhase("final");
    } else {
      setRound((r) => r + 1);
      startRound(pickCell());
    }
  }

  function restart() {
    scoreSavedRef.current = false;
    setRound(0);
    setResults([]);
    setPhase("intro");
  }

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  }

  const totalScore = results.length > 0
    ? results.reduce((a, r) => a + r.score, 0) / results.length
    : 0;

  useEffect(() => {
    if (phase !== "final" || scoreSavedRef.current || !user) return;
    scoreSavedRef.current = true;
    const xp = Math.round(totalScore * 10);
    supabase
      .from("game_scores")
      .insert({ user_id: user.id, game_type: "grid", game_date: ymdUtcNow(), guesses: TOTAL_ROUNDS, xp, won: true })
      .then(({ error }) => { if (!error) invalidateLeaderboard(); });
  }, [phase, user, totalScore]);

  if (phase === "final") {
    return <FinalScreen results={results} totalScore={totalScore} onRestart={restart} />;
  }

  const foundIds  = cell.found.map((c) => c.id);
  const revealIds = (phase === "result" && cell.gaveUp)
    ? cell.targets.filter((c) => !cell.found.some((f) => f.id === c.id)).map((c) => c.id)
    : [];

  const lastResult = results[results.length - 1];

  return (
    <div className="relative z-10 pt-0 pb-6 px-4 sm:px-8">
      <div className="grid grid-cols-1 md:grid-cols-[clamp(180px,22vw,300px)_1fr] gap-y-4 md:gap-x-8 items-start w-full">

        {/* Left panel */}
        <div className="md:pt-2">
          <motion.h1
            className="font-black leading-[0.85] tracking-tight text-(--color-blue)"
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 4vw, 5rem)" }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            Grid<br />Guesser
          </motion.h1>
          <motion.p className="text-sm text-(--color-muted) leading-relaxed mt-3" style={{ fontFamily: "var(--font-sans)" }}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
            A cell lights up on a borderless world map. Name every country inside it.
          </motion.p>
          <motion.p className="text-xs text-(--color-muted) mt-1" style={{ fontFamily: "var(--font-sans)" }}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}>
            5 rounds · variable grid size
          </motion.p>
          <motion.p className="text-[10px] tracking-[0.25em] text-(--color-muted) mt-2 opacity-80" style={{ fontFamily: "var(--font-sans)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 0.8 }} transition={{ duration: 0.6, delay: 0.2 }}>
            {new Intl.DateTimeFormat("en-US", { weekday: "short", month: "long", day: "numeric" }).format(new Date())}
          </motion.p>

          <AnimatePresence mode="wait">
            {phase === "intro" && (
              <motion.button key="play" type="button" onClick={handlePlay}
                className="mt-6 rounded-full px-7 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{ ...F, background: FIGMA_BLUE }}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                Play
              </motion.button>
            )}

            {phase === "playing" && (
              <motion.div key="playing" className="mt-5 flex flex-col gap-3"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

                <div className="flex items-center gap-2 flex-wrap">
                  <RoundDots round={round} completedCount={results.length} />
                  <SizeBadge label={cell.sizeLabel} />
                </div>

                <p className="text-xs" style={{ ...F, color: "#888" }}>
                  Found{" "}
                  <span style={{ color: FIGMA_BLUE }}>{cell.found.length}</span>
                  {" "}of {cell.targets.length}
                </p>

                {cell.found.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {cell.found.map((c) => (
                      <span key={c.id} className="text-[11px] px-2 py-0.5 rounded-full text-white font-semibold"
                        style={{ ...F, background: "#22c55e" }}>
                        {c.name}
                      </span>
                    ))}
                  </div>
                )}

                <motion.form onSubmit={(e) => { e.preventDefault(); submitGuess(); }} className="flex gap-2"
                  animate={shake ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                  transition={{ duration: 0.35 }}>
                  <input
                    ref={inputRef}
                    value={inputVal}
                    onChange={(e) => { setInputVal(e.target.value); setFeedback(null); }}
                    placeholder="Type a country…"
                    autoComplete="off"
                    spellCheck={false}
                    className="flex-1 rounded-full px-4 py-2 text-sm border border-(--color-border) bg-(--color-surface) outline-none focus:border-(--color-blue) transition-colors"
                    style={{ fontFamily: "var(--font-sans)" }}
                  />
                  <button type="submit"
                    className="rounded-full px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 shrink-0"
                    style={{ ...F, background: FIGMA_BLUE }}>
                    →
                  </button>
                </motion.form>

                <AnimatePresence mode="wait">
                  {feedback && (
                    <motion.p key={feedback.msg}
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="text-xs" style={{ ...F, color: feedback.ok ? "#22c55e" : "#ef4444" }}>
                      {feedback.msg}
                    </motion.p>
                  )}
                </AnimatePresence>

                <button type="button" onClick={giveUp}
                  className="text-[11px] tracking-[0.12em] uppercase text-(--color-muted) hover:opacity-60 transition-opacity text-left"
                  style={F}>
                  Give up →
                </button>
              </motion.div>
            )}

            {phase === "result" && lastResult && (
              <motion.div key="result" className="mt-5 flex flex-col gap-3"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

                <div className="flex items-center gap-2 flex-wrap">
                  <RoundDots round={round} completedCount={results.length} />
                  <SizeBadge label={cell.sizeLabel} />
                </div>

                <div>
                  <p className="text-[10px] tracking-[0.2em] uppercase" style={{ ...F, color: "#aaa" }}>Score</p>
                  <p className="text-[3rem] font-black leading-none tabular-nums" style={{ ...F, color: FIGMA_BLUE }}>
                    {lastResult.score.toFixed(0)}
                    <span className="text-xl ml-1 font-semibold" style={{ color: "#bbb" }}>/100</span>
                  </p>
                </div>

                <div>
                  <p className="text-[10px] tracking-[0.2em] uppercase mb-1.5" style={{ ...F, color: "#aaa" }}>
                    Countries in cell ({cell.targets.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {cell.targets.map((c) => {
                      const wasFound = cell.found.some((f) => f.id === c.id);
                      return (
                        <span key={c.id} className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                          style={{ ...F,
                            background: wasFound ? "#22c55e" : cell.gaveUp ? "#f59e0b" : "#fee2e2",
                            color: (wasFound || cell.gaveUp) ? "#fff" : "#991b1b",
                          }}>
                          {c.name}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {cell.gaveUp && (
                  <p className="text-xs" style={{ ...F, color: "#aaa" }}>
                    Missed countries shown in orange on the map.
                  </p>
                )}

                <button type="button" onClick={nextRound}
                  className="mt-1 rounded-full px-7 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 self-start"
                  style={{ ...F, background: FIGMA_BLUE }}>
                  {round + 1 >= TOTAL_ROUNDS ? "See results" : "Next round →"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: map */}
        <motion.div
          className="w-full rounded-2xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.12)]"
          style={{ aspectRatio: "7/4" }}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <Suspense fallback={<div className="w-full h-full bg-[#c8dff0] rounded-2xl" />}>
            {phase === "intro" ? (
              <IntroMap />
            ) : (
              <WorldMap
                cols={cell.cols}
                rows={cell.rows}
                activeCol={cell.colIdx}
                activeRow={cell.rowIdx}
                foundIds={foundIds}
                revealIds={revealIds}
              />
            )}
          </Suspense>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Small UI pieces ──────────────────────────────────────────────────────────

function SizeBadge({ label }: { label: string }) {
  return (
    <span className="text-[10px] tracking-[0.18em] uppercase px-2 py-0.5 rounded-full"
      style={{ fontFamily: FONT, fontWeight: 700, background: "#e8edf8", color: FIGMA_BLUE }}>
      {label}
    </span>
  );
}

function RoundDots({ round, completedCount }: { round: number; completedCount: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center justify-center rounded-[24px] px-2.5 py-0.5 text-[16px] font-semibold tabular-nums leading-none shrink-0"
        style={{ ...F, background: FIGMA_CREAM, color: FIGMA_BLUE }}>
        {round + 1}/{TOTAL_ROUNDS}
      </span>
      <div className="flex items-center gap-1">
        {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => {
          const filled = i < completedCount || i === round;
          return (
            <div key={i} className="h-2 w-2 rounded-full shrink-0"
              style={filled ? { background: FIGMA_BLUE } : { border: `1px solid ${FIGMA_BLUE}`, background: "transparent" }} />
          );
        })}
      </div>
    </div>
  );
}

function IntroMap() {
  return (
    <div className="w-full h-full bg-[#c8dff0] flex items-center justify-center rounded-2xl">
      <div className="text-center opacity-40">
        <svg width="72" height="56" viewBox="0 0 72 56" fill="none" aria-hidden="true">
          <rect x="4" y="4" width="64" height="48" rx="4" stroke="#145df5" strokeWidth="2" fill="none" />
          {[18, 36, 54].map((x) => <line key={x} x1={x} y1="4" x2={x} y2="52" stroke="#145df5" strokeWidth="1.5" />)}
          {[20, 36].map((y) => <line key={y} x1="4" y1={y} x2="68" y2={y} stroke="#145df5" strokeWidth="1.5" />)}
          <rect x="36" y="20" width="18" height="16" fill="#145df5" opacity="0.4" rx="1" />
        </svg>
        <p className="mt-3 text-sm font-bold" style={{ fontFamily: FONT, color: "#145df5" }}>World Grid</p>
      </div>
    </div>
  );
}

// ─── Final screen ─────────────────────────────────────────────────────────────

function FinalScreen({ results, totalScore, onRestart }: {
  results: RoundResult[]; totalScore: number; onRestart: () => void;
}) {
  return (
    <div className="relative z-10 px-4 sm:px-8 pt-2 pb-10">
      <h1 className="text-[clamp(3.25rem,10vw,8rem)] font-black leading-[0.82] tracking-tight mb-6 sm:mb-8"
        style={{ color: FIGMA_BLUE, fontFamily: "var(--font-display)" }}>
        Grid<br />Guesser
      </h1>

      <div className="flex flex-col items-center mb-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[960px] rounded-3xl border border-(--color-border) bg-(--color-surface) p-4 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
        >
          <div className="mb-6">
            <p className="text-[10px] tracking-[0.25em] uppercase text-(--color-muted) mb-1" style={F}>Average score</p>
            <div className="flex items-baseline gap-1.5">
              <p className="text-[2.5rem] sm:text-[4rem] font-black leading-none tabular-nums"
                style={{ fontFamily: FONT, fontWeight: 700, color: FIGMA_BLUE }}>
                {totalScore.toFixed(1)}
              </p>
              <span className="text-2xl font-semibold text-(--color-muted)" style={F}>/ 100</span>
            </div>
          </div>

          <div className="space-y-3">
            {results.map((r, i) => (
              <div key={i} className="rounded-xl border border-(--color-border) px-4 py-3">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs text-(--color-muted) w-14 shrink-0" style={F}>Round {i + 1}</span>
                  <SizeBadge label={r.cell.sizeLabel} />
                  <div className="flex-1 h-1.5 rounded-full bg-(--color-border) overflow-hidden">
                    <div className="h-full rounded-full"
                      style={{ width: `${r.score}%`, background: r.score >= 80 ? "#22c55e" : r.score >= 50 ? FIGMA_BLUE : "#f59e0b" }} />
                  </div>
                  <span className="text-sm font-bold w-10 text-right shrink-0 tabular-nums" style={F}>
                    {r.score.toFixed(0)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {r.cell.targets.map((c) => {
                    const wasFound = r.cell.found.some((f) => f.id === c.id);
                    return (
                      <span key={c.id} className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{ ...F, background: wasFound ? "#22c55e" : "#fee2e2", color: wasFound ? "#fff" : "#991b1b" }}>
                        {c.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={onRestart}
            className="mt-6 w-full rounded-full py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity"
            style={{ ...F, background: FIGMA_BLUE }}>
            Play again
          </button>
        </motion.div>
      </div>
    </div>
  );
}
