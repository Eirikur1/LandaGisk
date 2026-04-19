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
  username: string;
  world_xp: number;
  flags_xp: number;
  waterfall_xp: number;
  mushroom_xp: number;
  total_xp: number;
};

export type TodayRow = {
  username: string;
  game_type: string;
  guesses: number;
  xp: number;
};

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

  const [atResult, todayResult] =
    await Promise.all([
      // All-time top 50 — only columns the original queries used successfully
      supabase
        .from("leaderboard")
        .select("username, world_xp, flags_xp, waterfall_xp, mushroom_xp, total_xp")
        .gt("total_xp", 0)
        .order("total_xp", { ascending: false })
        .limit(50),

      // Today's scores
      supabase
        .from("game_scores")
        .select("user_id, game_type, guesses, xp, profiles(username, avatar_url)")
        .eq("won", true)
        .eq("game_date", todayStr)
        .order("xp", { ascending: false })
        .limit(200),
    ]);

  console.log("[leaderboard] atResult", { data: atResult.data, error: atResult.error });
  console.log("[leaderboard] todayResult", { data: todayResult.data, error: todayResult.error });

  const atData = atResult.data;
  const todayData = todayResult.data;

  // All-time leaders — used by home widget, mini widget, and full leaderboard page
  const allTimeDetailed: AllTimeRow[] = atData
    ? atData.map((r: any) => ({
        username: r.username ?? "—",
        world_xp: Number(r.world_xp) || 0,
        flags_xp: Number(r.flags_xp) || 0,
        waterfall_xp: Number(r.waterfall_xp) || 0,
        mushroom_xp: Number(r.mushroom_xp) || 0,
        total_xp: Number(r.total_xp) || 0,
      }))
    : [];

  // Compact form for home/mini widgets (username as synthetic user_id key since view may lack user_id)
  const allTime: Leader[] = allTimeDetailed.map((r) => ({
    user_id: r.username,
    username: r.username,
    avatar_url: null,
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
    for (const row of todayData as any[]) {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
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

    todayDetailed = (todayData as any[]).map((r) => {
      const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      return {
        username: profile?.username ?? "—",
        game_type: r.game_type as string,
        guesses: r.guesses as number,
        xp: r.xp as number,
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
      .subscribe((status, err) => {
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
    void fetchAndCache(force).then(() => {
      if (mountedRef.current) {
        setData(cache);
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Register as listener for shared cache updates
    const onUpdate = () => {
      if (mountedRef.current) {
        setData({ ...cache! });
        setLoading(false);
      }
    };
    listeners.add(onUpdate);

    // Initial load
    if (!cache) {
      sync();
    } else {
      setData(cache);
      setLoading(false);
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
