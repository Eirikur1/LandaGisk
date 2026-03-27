"use client";

import { useEffect, useRef, useState } from "react";
import { TbInfoCircle } from "react-icons/tb";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { worldXpTable } from "@/lib/xp";

// ── Types ──────────────────────────────────────────────────────────────────

type TodayRow = {
  username: string;
  guesses: number;
  xp: number;
};

type AllTimeRow = {
  username: string;
  world_xp: number;
  waterfall_xp: number;
  flags_xp: number;
  total_xp: number;
};

type Tab = "world" | "all";

// ── Helpers ────────────────────────────────────────────────────────────────

function ymdNow() {
  return new Date().toISOString().slice(0, 10);
}

// ── XP info popover ────────────────────────────────────────────────────────

function XpInfoButton() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="How country-guess XP works"
        onClick={() => setOpen((o) => !o)}
        className="rounded-md p-1 text-(--color-muted) transition-colors hover:text-(--color-blue)"
      >
        <TbInfoCircle size={17} strokeWidth={1.75} />
      </button>
      {open ? (
        <div
          className="absolute right-0 top-[calc(100%+6px)] z-30 w-[min(calc(100vw-2rem),13rem)] rounded-lg border border-(--color-border) bg-white px-3 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
          role="dialog"
          aria-label="XP per game"
        >
          <p
            className="text-[10px] font-medium uppercase tracking-[0.18em] text-(--color-muted) mb-2"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            Country guess XP
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
                  <td className="py-1.5 pr-2 text-(--color-muted)">{label}</td>
                  <td className="py-1.5 text-right font-semibold tabular-nums text-(--color-blue)">
                    {xp}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p
            className="mt-2 text-[10px] leading-snug text-(--color-muted) opacity-90"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            One XP award per win, per day.
          </p>
        </div>
      ) : null}
    </div>
  );
}

// ── Sub-tabs (minimal) ─────────────────────────────────────────────────────

function MiniTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <div
      className="flex gap-1 border-b border-(--color-border)"
      role="tablist"
    >
      {options.map((o) => {
        const on = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.id)}
            className="-mb-px border-b-2 px-2 pb-2 text-[11px] font-medium transition-colors"
            style={{
              fontFamily: "var(--font-sans)",
              borderColor: on ? "var(--color-blue)" : "transparent",
              color: on ? "var(--color-blue)" : "var(--color-muted)",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── World tab ──────────────────────────────────────────────────────────────

function WorldTab({ currentUsername }: { currentUsername: string | null }) {
  const [todayRows, setTodayRows] = useState<TodayRow[] | null>(null);
  const [allRows, setAllRows] = useState<AllTimeRow[] | null>(null);
  const [view, setView] = useState<"today" | "alltime">("today");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const today = ymdNow();

      const { data: todayData } = await supabase
        .from("game_scores")
        .select("user_id, guesses, xp, profiles(username)")
        .eq("game_type", "world")
        .eq("game_date", today)
        .order("guesses", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(20);

      if (todayData) {
        setTodayRows(
          todayData.map((r) => ({
            username:
              (r.profiles as unknown as { username: string } | null)?.username ?? "—",
            guesses: r.guesses as number,
            xp: r.xp as number,
          }))
        );
      }

      const { data: allData } = await supabase
        .from("leaderboard")
        .select("username, world_xp, waterfall_xp, flags_xp, total_xp")
        .order("world_xp", { ascending: false })
        .limit(20);

      if (allData) setAllRows(allData as AllTimeRow[]);
      setLoading(false);
    }
    void load();
  }, []);

  return (
    <div>
      <MiniTabs
        value={view}
        onChange={setView}
        options={[
          { id: "today", label: "Today" },
          { id: "alltime", label: "All time" },
        ]}
      />

      {loading ? (
        <p className="text-xs text-(--color-muted) py-4 text-center">Loading…</p>
      ) : view === "today" ? (
        todayRows && todayRows.length > 0 ? (
          <>
            <div
              className="mt-3 flex gap-2 pb-1 text-[9px] font-medium uppercase tracking-wide text-(--color-muted)"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              <span className="w-4 shrink-0">#</span>
              <span className="min-w-0 flex-1">Player</span>
              <span className="w-5 shrink-0 text-center">G</span>
              <span className="w-12 shrink-0 text-right">XP</span>
            </div>
            <ul className="divide-y divide-(--color-border)">
            {todayRows.map((row, i) => {
              const isMe = row.username === currentUsername;
              return (
                <li
                  key={i}
                  className="flex items-center gap-2 py-2 text-xs first:pt-1"
                >
                  <span className="w-4 shrink-0 tabular-nums text-(--color-muted)">
                    {i + 1}
                  </span>
                  <span
                    className="min-w-0 flex-1 truncate font-medium"
                    style={{
                      color: isMe ? "var(--color-blue)" : undefined,
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {row.username}
                    {isMe ? (
                      <span className="ml-1 font-normal text-(--color-muted)">· you</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 tabular-nums text-(--color-muted)">
                    {row.guesses}
                  </span>
                  <span className="w-12 shrink-0 text-right font-semibold tabular-nums text-(--color-blue)">
                    +{row.xp}
                  </span>
                </li>
              );
            })}
            </ul>
          </>
        ) : (
          <p className="text-xs text-(--color-muted) py-6 text-center leading-relaxed">
            No scores today yet.
          </p>
        )
      ) : allRows && allRows.length > 0 ? (
        <>
          <div
            className="mt-3 flex gap-2 pb-1 text-[9px] font-medium uppercase tracking-wide text-(--color-muted)"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            <span className="w-4 shrink-0">#</span>
            <span className="min-w-0 flex-1">Player</span>
            <span className="w-10 shrink-0 text-right">World</span>
          </div>
          <ul className="divide-y divide-(--color-border)">
            {allRows
            .filter((r) => r.world_xp > 0)
            .map((row, i) => {
              const isMe = row.username === currentUsername;
              return (
                <li
                  key={i}
                  className="flex items-center gap-2 py-2 text-xs first:pt-1"
                >
                  <span className="w-4 shrink-0 tabular-nums text-(--color-muted)">
                    {i + 1}
                  </span>
                  <span
                    className="min-w-0 flex-1 truncate font-medium"
                    style={{
                      color: isMe ? "var(--color-blue)" : undefined,
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {row.username}
                    {isMe ? (
                      <span className="ml-1 font-normal text-(--color-muted)">· you</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-(--color-blue)">
                    {row.world_xp.toLocaleString()}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="text-xs text-(--color-muted) py-6 text-center">
          No scores yet.
        </p>
      )}
    </div>
  );
}

// ── All games tab ────────────────────────────────────────────────────────────

function AllGamesTab({ currentUsername }: { currentUsername: string | null }) {
  const [rows, setRows] = useState<AllTimeRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("leaderboard")
        .select("username, world_xp, waterfall_xp, flags_xp, total_xp")
        .gt("total_xp", 0)
        .order("total_xp", { ascending: false })
        .limit(20);
      setRows((data as AllTimeRow[]) ?? []);
      setLoading(false);
    }
    void load();
  }, []);

  if (loading) {
    return (
      <p className="text-xs text-(--color-muted) py-4 text-center">Loading…</p>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <p className="text-xs text-(--color-muted) py-6 text-center">No scores yet.</p>
    );
  }

  return (
    <>
      <div
        className="mt-3 flex gap-2 pb-1 text-[9px] font-medium uppercase tracking-wide text-(--color-muted)"
        style={{ fontFamily: "var(--font-sans)" }}
      >
        <span className="w-4 shrink-0">#</span>
        <span className="min-w-0 flex-1">Player</span>
        <span className="w-8 shrink-0 text-right">Ctry</span>
        <span className="w-14 shrink-0 text-right">Total</span>
      </div>
      <ul className="divide-y divide-(--color-border)">
      {rows.map((row, i) => {
        const isMe = row.username === currentUsername;
        return (
          <li key={i} className="flex items-center gap-2 py-2 text-xs first:pt-1">
            <span className="w-4 shrink-0 tabular-nums text-(--color-muted)">
              {i + 1}
            </span>
            <span
              className="min-w-0 flex-1 truncate font-medium"
              style={{
                color: isMe ? "var(--color-blue)" : undefined,
                fontFamily: "var(--font-sans)",
              }}
            >
              {row.username}
              {isMe ? (
                <span className="ml-1 font-normal text-(--color-muted)">· you</span>
              ) : null}
            </span>
            <span className="shrink-0 tabular-nums text-(--color-muted)">
              {row.world_xp > 0 ? row.world_xp.toLocaleString() : "—"}
            </span>
            <span className="w-14 shrink-0 text-right font-semibold tabular-nums text-(--color-blue)">
              {row.total_xp.toLocaleString()}
            </span>
          </li>
        );
      })}
      </ul>
    </>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function Leaderboard() {
  const { username } = useAuth();
  const [tab, setTab] = useState<Tab>("world");

  return (
    <div className="rounded-xl border border-(--color-border) bg-white/70 px-3 py-3 sm:px-4 sm:py-3.5">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h2
          className="text-[11px] font-semibold uppercase tracking-[0.2em] text-(--color-muted)"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          Leaderboard
        </h2>
        <XpInfoButton />
      </div>

      <MiniTabs
        value={tab}
        onChange={setTab}
        options={[
          { id: "world", label: "Country" },
          { id: "all", label: "All games" },
        ]}
      />

      <div className="mt-1">
        {tab === "world" ? (
          <WorldTab currentUsername={username} />
        ) : (
          <AllGamesTab currentUsername={username} />
        )}
      </div>
    </div>
  );
}
