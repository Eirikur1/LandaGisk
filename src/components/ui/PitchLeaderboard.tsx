"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase, isSupabasePlaceholder } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

type ScoreRow = {
  username: string;
  avatar_url: string | null;
  xp: number;
};

type Data = {
  allTime: ScoreRow[];
  today: ScoreRow[];
};

const CACHE_TTL = 60_000;
let cache: (Data & { ts: number }) | null = null;
const listeners = new Set<() => void>();

function ymdNow() {
  return new Date().toISOString().slice(0, 10);
}

async function fetchPitchScores(force = false) {
  if (!force && cache && Date.now() - cache.ts < CACHE_TTL) return;

  const todayStr = ymdNow();

  const [allTimeRes, todayRes] = await Promise.all([
    supabase
      .from("game_scores")
      .select("xp, profiles(username, avatar_url)")
      .eq("game_type", "pitch")
      .order("xp", { ascending: false })
      .limit(10),
    supabase
      .from("game_scores")
      .select("xp, profiles(username, avatar_url)")
      .eq("game_type", "pitch")
      .eq("game_date", todayStr)
      .order("xp", { ascending: false })
      .limit(10),
  ]);

  function toRows(data: any[] | null): ScoreRow[] {
    if (!data) return [];
    return data.map((r) => {
      const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      return {
        username: profile?.username ?? "—",
        avatar_url: profile?.avatar_url ?? null,
        xp: r.xp as number,
      };
    });
  }

  cache = {
    allTime: toRows(allTimeRes.data),
    today: toRows(todayRes.data),
    ts: Date.now(),
  };
  listeners.forEach((fn) => fn());
}

export function invalidatePitchLeaderboard() {
  cache = null;
  void fetchPitchScores(true);
}

const FIGMA_BLUE = "#145df5";
const FONT = "'Avenir Next', Avenir, Nunito, system-ui, sans-serif";
const F = { fontFamily: FONT } as const;

function ScoreList({ rows, username }: { rows: ScoreRow[]; username: string | null }) {
  if (rows.length === 0) {
    return <p className="text-xs text-(--color-muted) py-2" style={F}>No scores yet.</p>;
  }
  return (
    <ul className="space-y-0">
      {rows.map((row, i) => {
        const isMe = row.username === username;
        return (
          <li
            key={`${row.username}-${i}`}
            className="flex items-center gap-3 py-2 border-b border-(--color-border) last:border-0"
          >
            <span className="w-4 shrink-0 text-[11px] tabular-nums text-(--color-muted)" style={F}>
              {i + 1}
            </span>
            <span
              className="flex-1 truncate text-sm font-semibold"
              style={{ ...F, color: isMe ? FIGMA_BLUE : "var(--color-foreground)" }}
            >
              {row.username}
              {isMe && (
                <span className="ml-1 font-normal text-[11px] text-(--color-muted)">you</span>
              )}
            </span>
            <span className="text-[11px] font-semibold tabular-nums shrink-0" style={{ ...F, color: FIGMA_BLUE }}>
              {row.xp.toLocaleString()} XP
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function PitchLeaderboard() {
  const { username } = useAuth();
  const [data, setData] = useState<Data | null>(cache);
  const [loading, setLoading] = useState(cache === null);
  const [tab, setTab] = useState<"today" | "alltime">("today");

  const sync = useCallback((force = false) => {
    void fetchPitchScores(force).then(() => {
      setData(cache);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (isSupabasePlaceholder()) return;
    const onUpdate = () => { setData({ ...cache! }); setLoading(false); };
    listeners.add(onUpdate);
    if (!cache) {
      sync();
    } else {
      setData(cache);
      setLoading(false);
      if (Date.now() - cache.ts > CACHE_TTL) sync(true);
    }
    return () => { listeners.delete(onUpdate); };
  }, [sync]);

  const rows = tab === "today" ? (data?.today ?? []) : (data?.allTime ?? []);

  return (
    <div className="mt-8 pt-6 border-t border-(--color-border)">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] tracking-[0.25em] uppercase text-(--color-muted)" style={F}>
          Pitch Match
        </p>
        <div className="flex gap-3">
          {(["today", "alltime"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="text-[10px] tracking-[0.14em] uppercase font-semibold transition-opacity"
              style={{ ...F, color: tab === t ? FIGMA_BLUE : "var(--color-muted)", opacity: tab === t ? 1 : 0.5 }}
            >
              {t === "today" ? "Today" : "All time"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2.5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-4 h-2.5 rounded bg-(--color-tag)" />
              <div className="flex-1 h-2.5 rounded bg-(--color-tag)" />
              <div className="w-10 h-2.5 rounded bg-(--color-tag)" />
            </div>
          ))}
        </div>
      ) : (
        <ScoreList rows={rows} username={username} />
      )}
    </div>
  );
}
