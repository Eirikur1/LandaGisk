"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { worldXpTable } from "@/lib/xp";
import { TbInfoCircle } from "react-icons/tb";
import { useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────────────

type TodayRow = { username: string; game_type: string; guesses: number; xp: number };
type AllTimeRow = {
  username: string;
  world_xp: number;
  flags_xp: number;
  waterfall_xp: number;
  mushroom_xp: number;
  total_xp: number;
};
type Tab = "today" | "alltime";

function ymdNow() { return new Date().toISOString().slice(0, 10); }

// ── XP Info ────────────────────────────────────────────────────────────────

function XpInfo() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-1 text-(--color-muted) hover:text-(--color-blue) transition-colors"
      >
        <TbInfoCircle size={16} strokeWidth={1.75} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-48 rounded-xl border border-(--color-border) bg-white px-3 py-2.5 shadow-lg">
          <p className="text-[10px] uppercase tracking-[0.18em] text-(--color-muted) mb-2" style={{ fontFamily: "var(--font-sans)" }}>
            XP per game
          </p>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-[9px] uppercase tracking-wide text-(--color-muted)">
                <th className="pb-1.5 text-left font-medium">Guesses</th>
                <th className="pb-1.5 text-right font-medium">XP</th>
              </tr>
            </thead>
            <tbody>
              {worldXpTable().map(({ label, xp }) => (
                <tr key={label} className="border-t border-(--color-border)">
                  <td className="py-1.5 text-(--color-muted)">{label}</td>
                  <td className="py-1.5 text-right font-semibold tabular-nums text-(--color-blue)">{xp}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[10px] text-(--color-muted)" style={{ fontFamily: "var(--font-sans)" }}>
            One award per win, per day.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const { username } = useAuth();
  const [tab, setTab] = useState<Tab>("today");
  const [todayRows, setTodayRows] = useState<TodayRow[] | null>(null);
  const [allRows, setAllRows] = useState<AllTimeRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const today = ymdNow();

      const [{ data: todayData }, { data: allData }] = await Promise.all([
        supabase
          .from("game_scores")
          .select("user_id, game_type, guesses, xp, profiles(username)")
          .eq("won", true)
          .eq("game_date", today)
          .order("xp", { ascending: false })
          .limit(50),
        supabase
          .from("leaderboard")
          .select("username, world_xp, flags_xp, waterfall_xp, mushroom_xp, total_xp")
          .gt("total_xp", 0)
          .order("total_xp", { ascending: false })
          .limit(50),
      ]);

      if (todayData) {
        setTodayRows(
          todayData.map((r) => ({
            username: (r.profiles as unknown as { username: string } | null)?.username ?? "—",
            game_type: r.game_type as string,
            guesses: r.guesses as number,
            xp: r.xp as number,
          }))
        );
      }

      if (allData) setAllRows(allData as AllTimeRow[]);
      setLoading(false);
    }
    void load();
  }, []);

  const gameLabel: Record<string, string> = {
    world: "Country",
    flags: "Flag",
    waterfall: "Waterfall",
    mushroom: "Mushroom",
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1
              className="text-[clamp(2rem,6vw,3rem)] font-black leading-none tracking-tight text-(--color-blue)"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Leaderboard
            </h1>
            <p className="text-sm text-(--color-muted) mt-1" style={{ fontFamily: "var(--font-sans)" }}>
              {new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}
            </p>
          </div>
          <XpInfo />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-(--color-border) mb-6">
          {([["today", "Today"], ["alltime", "All time"]] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="-mb-px border-b-2 px-3 pb-3 text-sm font-medium transition-colors"
              style={{
                fontFamily: "var(--font-sans)",
                borderColor: tab === id ? "var(--color-blue)" : "transparent",
                color: tab === id ? "var(--color-blue)" : "var(--color-muted)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-2">
                <div className="w-5 h-3 rounded bg-(--color-tag)" />
                <div className="flex-1 h-3 rounded bg-(--color-tag)" />
                <div className="w-16 h-3 rounded bg-(--color-tag)" />
              </div>
            ))}
          </div>
        ) : tab === "today" ? (
          todayRows && todayRows.length > 0 ? (
            <>
              <div
                className="flex gap-4 pb-2 text-[9px] font-medium uppercase tracking-wide text-(--color-muted) border-b border-(--color-border)"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                <span className="w-5 shrink-0">#</span>
                <span className="flex-1">Player</span>
                <span className="w-16 shrink-0">Game</span>
                <span className="w-8 shrink-0 text-center">G</span>
                <span className="w-14 shrink-0 text-right">XP</span>
              </div>
              <ul className="divide-y divide-(--color-border)">
                {todayRows.map((row, i) => {
                  const isMe = row.username === username;
                  return (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.03 }}
                      className="flex items-center gap-4 py-3 text-sm"
                    >
                      <span className="w-5 shrink-0 tabular-nums text-(--color-muted)" style={{ fontFamily: "var(--font-sans)" }}>
                        {i + 1}
                      </span>
                      <span
                        className="flex-1 truncate font-semibold"
                        style={{ color: isMe ? "var(--color-blue)" : "var(--color-foreground)", fontFamily: "var(--font-sans)" }}
                      >
                        {row.username}
                        {isMe && <span className="ml-1.5 font-normal text-xs text-(--color-muted)">you</span>}
                      </span>
                      <span className="w-16 shrink-0 text-xs text-(--color-muted)" style={{ fontFamily: "var(--font-sans)" }}>
                        {gameLabel[row.game_type] ?? row.game_type}
                      </span>
                      <span className="w-8 shrink-0 text-center tabular-nums text-(--color-muted) text-xs">
                        {row.guesses}
                      </span>
                      <span className="w-14 shrink-0 text-right font-bold tabular-nums text-(--color-blue)">
                        +{row.xp}
                      </span>
                    </motion.li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="text-sm text-(--color-muted) py-12 text-center" style={{ fontFamily: "var(--font-sans)" }}>
              No scores today yet. Be the first!
            </p>
          )
        ) : allRows && allRows.length > 0 ? (
          <>
            <div
              className="flex gap-2 sm:gap-4 pb-2 text-[9px] font-medium uppercase tracking-wide text-(--color-muted) border-b border-(--color-border)"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              <span className="w-5 shrink-0">#</span>
              <span className="min-w-0 flex-1">Player</span>
              <span className="w-11 sm:w-12 shrink-0 text-right">Country</span>
              <span className="w-9 sm:w-10 shrink-0 text-right">Flag</span>
              <span className="w-11 sm:w-14 shrink-0 text-right hidden sm:block">Water.</span>
              <span className="w-11 sm:w-14 shrink-0 text-right hidden sm:block">Mush.</span>
              <span className="w-12 sm:w-14 shrink-0 text-right font-semibold text-(--color-foreground)">Total</span>
            </div>
            <ul className="divide-y divide-(--color-border)">
              {allRows.map((row, i) => {
                const isMe = row.username === username;
                return (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.03 }}
                    className="flex items-center gap-2 sm:gap-4 py-3 text-sm"
                  >
                    <span className="w-5 shrink-0 tabular-nums text-(--color-muted)" style={{ fontFamily: "var(--font-sans)" }}>
                      {i + 1}
                    </span>
                    <span
                      className="min-w-0 flex-1 truncate font-semibold"
                      style={{ color: isMe ? "var(--color-blue)" : "var(--color-foreground)", fontFamily: "var(--font-sans)" }}
                    >
                      {row.username}
                      {isMe && <span className="ml-1.5 font-normal text-xs text-(--color-muted)">you</span>}
                    </span>
                    <span className="w-11 sm:w-12 shrink-0 text-right tabular-nums text-xs text-(--color-muted)">
                      {row.world_xp > 0 ? row.world_xp.toLocaleString() : "—"}
                    </span>
                    <span className="w-9 sm:w-10 shrink-0 text-right tabular-nums text-xs text-(--color-muted)">
                      {row.flags_xp > 0 ? row.flags_xp.toLocaleString() : "—"}
                    </span>
                    <span className="w-11 sm:w-14 shrink-0 text-right tabular-nums text-xs text-(--color-muted) hidden sm:block">
                      {row.waterfall_xp > 0 ? row.waterfall_xp.toLocaleString() : "—"}
                    </span>
                    <span className="w-11 sm:w-14 shrink-0 text-right tabular-nums text-xs text-(--color-muted) hidden sm:block">
                      {row.mushroom_xp > 0 ? row.mushroom_xp.toLocaleString() : "—"}
                    </span>
                    <span className="w-12 sm:w-14 shrink-0 text-right font-bold tabular-nums text-(--color-blue)">
                      {row.total_xp.toLocaleString()}
                    </span>
                  </motion.li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="text-sm text-(--color-muted) py-12 text-center" style={{ fontFamily: "var(--font-sans)" }}>
            No scores yet.
          </p>
        )}
      </motion.div>
    </div>
  );
}
