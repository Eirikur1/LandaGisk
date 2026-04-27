"use client";

/**
 * Shared leaderboard data hook with Supabase Realtime sync.
 *
 * All leaderboard components import from here so every view stays in sync:
 * - Supabase Realtime channel fires on INSERT to game_scores → refresh immediately
 * - Polling every 60 s as a fallback when the socket can't connect
 * - Focus / visibility refresh so tabs that were backgrounded catch up
 * - Module-level cache so client-side navigation doesn't trigger extra fetches
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, isSupabasePlaceholder } from "@/lib/supabase";

export type Leader = {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  xp: number;
};

export type AllTimeRow = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  world_xp: number;
  flags_xp: number;
  waterfall_xp: number;
  mushroom_xp: number;
  language_xp: number;
  total_xp: number;
};

export type TodayRow = {
  username: string;
  avatar_url: string | null;
  game_type: string;
  guesses: number;
  xp: number;
};

type ProfileRow = {
  username?: string | null;
  avatar_url?: string | null;
};

type ScoreRow = {
  user_id: string;
  game_type: string;
  xp: number | null;
  guesses?: number | null;
  profiles?: ProfileRow | ProfileRow[] | null;
};

function rowProfile(row: ScoreRow): ProfileRow | null {
  return Array.isArray(row.profiles) ? (row.profiles[0] ?? null) : (row.profiles ?? null);
}

// ── Module-level cache shared across all hook instances ───────────────────────

const CACHE_TTL = 60_000;

type CachedData = {
  allTime: Leader[];
  today: Leader[];
  allTimeDetailed: AllTimeRow[];
  todayDetailed: TodayRow[];
  ts: number;
};

let cache: CachedData | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

function ymdNow() {
  return new Date().toISOString().slice(0, 10);
}

async function fetchAndCache(force = false): Promise<void> {
  if (!force && cache && Date.now() - cache.ts < CACHE_TTL) return;

  const todayStr = ymdNow();

  let allScoresResult: { data: unknown; error: unknown };
  let todayResult: { data: unknown; error: unknown };

  try {
    [allScoresResult, todayResult] = await Promise.all([
      supabase
        .from("game_scores")
        .select("user_id, game_type, xp, profiles(username, avatar_url)")
        .eq("won", true),

      supabase
        .from("game_scores")
        .select("user_id, game_type, guesses, xp, profiles(username, avatar_url)")
        .eq("won", true)
        .eq("game_date", todayStr)
        .order("xp", { ascending: false })
        .limit(200),
    ]);
  } catch (e) {
    console.warn("[leaderboard] fetch failed", e);
    if (!cache) {
      cache = {
        allTime: [],
        today: [],
        allTimeDetailed: [],
        todayDetailed: [],
        ts: Date.now(),
      };
      notifyListeners();
    }
    return;
  }

  const allScoresData = allScoresResult.data as ScoreRow[] | null;
  const todayData = todayResult.data as ScoreRow[] | null;

  // All-time leaders — used by home widget, mini widget, and full leaderboard page
  const allTimeMap = new Map<string, AllTimeRow>();
  for (const row of allScoresData ?? []) {
    const profile = rowProfile(row);
    const current = allTimeMap.get(row.user_id) ?? {
      user_id: row.user_id as string,
      username: profile?.username ?? "—",
      avatar_url: profile?.avatar_url ?? null,
      world_xp: 0,
      flags_xp: 0,
      waterfall_xp: 0,
      mushroom_xp: 0,
      language_xp: 0,
      total_xp: 0,
    };
    const xp = Number(row.xp) || 0;
    if (row.game_type === "world") current.world_xp += xp;
    else if (row.game_type === "flags") current.flags_xp += xp;
    else if (row.game_type === "waterfall") current.waterfall_xp += xp;
    else if (row.game_type === "mushroom") current.mushroom_xp += xp;
    else if (row.game_type === "language") current.language_xp += xp;
    current.total_xp += xp;
    allTimeMap.set(row.user_id, current);
  }
  const allTimeDetailed = [...allTimeMap.values()]
    .filter((row) => row.total_xp > 0)
    .sort((a, b) => b.total_xp - a.total_xp)
    .slice(0, 50);

  // Compact form for home/mini widgets (username as synthetic user_id key since view may lack user_id)
  const allTime: Leader[] = allTimeDetailed.map((r) => ({
    user_id: r.user_id,
    username: r.username,
    avatar_url: r.avatar_url,
    xp: r.total_xp,
  }));

  // Today aggregated per user (compact form for home widget)
  let today: Leader[] = [];
  let todayDetailed: TodayRow[] = [];

  if (todayData) {
    const map = new Map<
      string,
      { xp: number; username: string | null; avatar_url: string | null }
    >();
    for (const row of todayData) {
      const profile = rowProfile(row);
      const prev = map.get(row.user_id);
      map.set(row.user_id, {
        xp: (prev?.xp ?? 0) + (row.xp ?? 0),
        username: profile?.username ?? prev?.username ?? null,
        avatar_url: profile?.avatar_url ?? prev?.avatar_url ?? null,
      });
    }
    today = [...map.entries()]
      .sort((a, b) => b[1].xp - a[1].xp)
      .map(([user_id, v]) => ({ user_id, ...v }));

    todayDetailed = todayData.map((r) => {
      const profile = rowProfile(r);
      return {
        username: profile?.username ?? "—",
        avatar_url: profile?.avatar_url ?? null,
        game_type: r.game_type,
        guesses: Number(r.guesses) || 0,
        xp: Number(r.xp) || 0,
      };
    });
  }

  cache = { allTime, today, allTimeDetailed, todayDetailed, ts: Date.now() };
  notifyListeners();
}

// ── Realtime channel (one shared subscription) ────────────────────────────────

let realtimeSetup = false;

function setupRealtime() {
  if (realtimeSetup || isSupabasePlaceholder()) return;
  realtimeSetup = true;

  // Re-attempt setup if the channel errors
  function subscribe() {
    supabase
      .channel("leaderboard-sync")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "game_scores" },
        () => {
          // Invalidate cache and fetch fresh data
          cache = null;
          void fetchAndCache(true);
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          // Silent — polling handles the fallback; no console spam
          realtimeSetup = false;
        }
      });
  }

  subscribe();
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useLeaderboard() {
  const [data, setData] = useState<CachedData | null>(cache);
  const [loading, setLoading] = useState(cache === null);
  const mountedRef = useRef(true);

  const sync = useCallback((force = false) => {
    void fetchAndCache(force)
      .then(() => {
        if (mountedRef.current) {
          setData(cache);
          setLoading(false);
        }
      })
      .catch((e) => {
        console.warn("[leaderboard] sync failed", e);
        if (mountedRef.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Register as listener for shared cache updates
    const onUpdate = () => {
      if (mountedRef.current && cache) {
        setData({ ...cache });
        setLoading(false);
      }
    };
    listeners.add(onUpdate);

    // Initial load
    if (!cache) {
      sync();
    } else {
      queueMicrotask(() => {
        if (!mountedRef.current) return;
        setData(cache);
        setLoading(false);
      });
      // Silently refresh if cache is stale
      if (Date.now() - cache.ts > CACHE_TTL) sync(true);
    }

    // Setup Realtime (idempotent)
    setupRealtime();

    // Polling fallback (60 s, only when visible)
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") sync();
    }, 60_000);

    const onFocus = () => sync();
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      mountedRef.current = false;
      listeners.delete(onUpdate);
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [sync]);

  return { data, loading };
}

/** Call this after a score is submitted to immediately invalidate and re-fetch. */
export function invalidateLeaderboard() {
  cache = null;
  void fetchAndCache(true);
}
