"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";

function logHomeLbError(tag: string, err: unknown) {
  const e = err as { message?: string; code?: string; details?: string; hint?: string } | null;
  console.error(
    `[HomeLeaderboard] ${tag}`,
    e?.message ?? String(err),
    e?.code ? `code=${e.code}` : "",
    e?.details ? `details=${e.details}` : "",
    e?.hint ? `hint=${e.hint}` : ""
  );
}

/** True if error is probably missing avatar_url column / view not migrated */
function isAvatarColumnError(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? err).toLowerCase();
  return (
    msg.includes("avatar_url") ||
    (msg.includes("column") && msg.includes("does not exist")) ||
    (msg.includes("schema cache") && msg.includes("avatar")) ||
    (err as { code?: string })?.code === "42703"
  );
}

type Leader = {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  xp: number;
};

function Avatar({ leader, size = 48 }: { leader: Leader; size?: number }) {
  const initials = (leader.username ?? "?").slice(0, 2).toUpperCase();
  if (leader.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={leader.avatar_url}
        alt=""
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 font-black text-white bg-(--color-blue)"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}

function LeaderCard({
  label,
  leader,
  loading,
  emptyText,
  delay,
}: {
  label: string;
  leader: Leader | null;
  loading: boolean;
  emptyText: string;
  delay: number;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-(--color-border) bg-(--color-surface) px-4 py-3">
        <div className="w-11 h-11 rounded-full bg-(--color-tag) shrink-0 animate-pulse" />
        <div className="min-w-0 flex-1">
          <div className="h-3 w-24 rounded bg-(--color-tag) mb-1.5 animate-pulse" />
          <div className="h-2.5 w-16 rounded bg-(--color-tag) animate-pulse" />
        </div>
        <div
          className="ml-auto text-[10px] tracking-[0.18em] uppercase text-(--color-muted) shrink-0"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          {label}
        </div>
      </div>
    );
  }

  if (!leader) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center gap-4 rounded-2xl border border-(--color-border) bg-(--color-surface) px-4 py-3"
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs text-(--color-muted)" style={{ fontFamily: "var(--font-sans)" }}>
            {emptyText}
          </p>
        </div>
        <div
          className="ml-auto text-[10px] tracking-[0.18em] uppercase text-(--color-muted) shrink-0"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          {label}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key={leader.user_id + label}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-4 rounded-2xl border border-(--color-border) bg-(--color-surface) px-4 py-3"
    >
      <Avatar leader={leader} size={44} />
      <div className="min-w-0">
        <p
          className="font-bold text-sm text-(--color-foreground) truncate"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {leader.username ?? "—"}
        </p>
        <p
          className="text-[11px] text-(--color-muted) mt-0.5 tabular-nums"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          {leader.xp.toLocaleString()} XP
        </p>
      </div>
      <div className="ml-auto shrink-0 text-right">
        <p
          className="text-[10px] tracking-[0.18em] uppercase text-(--color-muted)"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          {label}
        </p>
      </div>
    </motion.div>
  );
}

export default function HomeLeaderboard() {
  const t = useTranslations("home");
  const [allTime, setAllTime] = useState<Leader | null>(null);
  const [today, setToday] = useState<Leader | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (silent: boolean) => {
    if (!silent) setLoading(true);
    const todayStr = new Date().toISOString().slice(0, 10);

    try {
      let allRows: Record<string, unknown>[] = [];
      let allTimeFailed = false;
      {
        const first = await supabase
          .from("leaderboard")
          .select("user_id, username, total_xp, avatar_url")
          .gt("total_xp", 0)
          .order("total_xp", { ascending: false })
          .limit(1);

        if (first.error && isAvatarColumnError(first.error)) {
          const second = await supabase
            .from("leaderboard")
            .select("user_id, username, total_xp")
            .gt("total_xp", 0)
            .order("total_xp", { ascending: false })
            .limit(1);
          if (second.error) {
            logHomeLbError("all-time", second.error);
            allTimeFailed = true;
            setAllTime(null);
          } else {
            allRows = (second.data ?? []) as Record<string, unknown>[];
          }
        } else if (first.error) {
          logHomeLbError("all-time", first.error);
          allTimeFailed = true;
          setAllTime(null);
        } else {
          allRows = (first.data ?? []) as Record<string, unknown>[];
        }
      }

      if (!allTimeFailed) {
        const row = allRows[0];
        if (row && row.user_id) {
          setAllTime({
            user_id: row.user_id as string,
            username: (row.username as string) ?? null,
            avatar_url: (row.avatar_url as string | null) ?? null,
            xp: Number(row.total_xp) || 0,
          });
        } else {
          setAllTime(null);
        }
      }

      let todayData: Record<string, unknown>[] = [];
      let todayFailed = false;
      {
        const first = await supabase
          .from("game_scores")
          .select("user_id, xp, profiles(username, avatar_url)")
          .eq("won", true)
          .eq("game_date", todayStr)
          .order("xp", { ascending: false });

        if (first.error && isAvatarColumnError(first.error)) {
          const second = await supabase
            .from("game_scores")
            .select("user_id, xp, profiles(username)")
            .eq("won", true)
            .eq("game_date", todayStr)
            .order("xp", { ascending: false });
          if (second.error) {
            logHomeLbError("today", second.error);
            todayFailed = true;
            setToday(null);
          } else {
            todayData = (second.data ?? []) as Record<string, unknown>[];
          }
        } else if (first.error) {
          logHomeLbError("today", first.error);
          todayFailed = true;
          setToday(null);
        } else {
          todayData = (first.data ?? []) as Record<string, unknown>[];
        }
      }

      if (!todayFailed && todayData.length > 0) {
        const map = new Map<
          string,
          { xp: number; username: string | null; avatar_url: string | null }
        >();
        for (const row of todayData) {
          const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
          const prev = map.get(row.user_id as string);
          const pr = profile as { username?: string; avatar_url?: string | null } | null;
          map.set(row.user_id as string, {
            xp: (prev?.xp ?? 0) + (row.xp as number ?? 0),
            username: pr?.username ?? prev?.username ?? null,
            avatar_url: pr?.avatar_url ?? prev?.avatar_url ?? null,
          });
        }
        const top = [...map.entries()].sort((a, b) => b[1].xp - a[1].xp)[0];
        if (top) {
          setToday({
            user_id: top[0],
            username: top[1].username,
            avatar_url: top[1].avatar_url,
            xp: top[1].xp,
          });
        } else {
          setToday(null);
        }
      } else if (!todayFailed) {
        setToday(null);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("home-leaderboard-game_scores")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_scores" },
        () => {
          void load(true);
        }
      )
      .subscribe();

    const onFocus = () => {
      void load(true);
    };
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
      void supabase.removeChannel(channel);
    };
  }, [load]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="mt-6 pt-5 border-t border-(--color-border)"
    >
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="text-[10px] tracking-[0.25em] uppercase text-(--color-muted) mb-4"
        style={{ fontFamily: "var(--font-sans)" }}
      >
        {t("leaderboardTitle")}
      </motion.p>
      <div className="flex flex-col gap-3">
        <LeaderCard
          label={t("leaderboardAllTime")}
          leader={allTime}
          loading={loading}
          emptyText={t("leaderboardEmpty")}
          delay={0.05}
        />
        <LeaderCard
          label={t("leaderboardToday")}
          leader={today}
          loading={loading}
          emptyText={t("leaderboardEmpty")}
          delay={0.12}
        />
      </div>
    </motion.div>
  );
}
