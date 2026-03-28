"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

type Leader = {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  xp: number;
};

function Avatar({ leader, size = 48 }: { leader: Leader; size?: number }) {
  const initials = (leader.username ?? "?").slice(0, 2).toUpperCase();
  return leader.avatar_url ? (
    <img
      src={leader.avatar_url}
      alt={leader.username ?? "Player"}
      className="rounded-full object-cover shrink-0"
      style={{ width: size, height: size }}
    />
  ) : (
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
  delay,
}: {
  label: string;
  leader: Leader | null;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-4 rounded-2xl border border-(--color-border) bg-(--color-surface) px-4 py-3"
    >
      {leader ? (
        <>
          <Avatar leader={leader} size={44} />
          <div className="min-w-0">
            <p
              className="font-bold text-sm text-(--color-foreground) truncate"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {leader.username ?? "Anonymous"}
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
        </>
      ) : (
        <>
          <div className="w-11 h-11 rounded-full bg-(--color-tag) shrink-0" />
          <div className="min-w-0">
            <div className="h-3 w-24 rounded bg-(--color-tag) mb-1.5" />
            <div className="h-2.5 w-16 rounded bg-(--color-tag)" />
          </div>
          <div className="ml-auto text-[10px] tracking-[0.18em] uppercase text-(--color-muted)" style={{ fontFamily: "var(--font-sans)" }}>
            {label}
          </div>
        </>
      )}
    </motion.div>
  );
}

export default function HomeLeaderboard() {
  const [allTime, setAllTime] = useState<Leader | null>(null);
  const [today, setToday] = useState<Leader | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);

    async function fetchLeaders() {
      // All-time: sum XP per user, pick top
      const { data: atData } = await supabase
        .from("game_scores")
        .select("user_id, xp, profiles(username, avatar_url)")
        .eq("won", true)
        .order("xp", { ascending: false });

      if (atData && atData.length > 0) {
        // Aggregate by user_id
        const map = new Map<string, { xp: number; username: string | null; avatar_url: string | null }>();
        for (const row of atData) {
          const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
          const prev = map.get(row.user_id);
          map.set(row.user_id, {
            xp: (prev?.xp ?? 0) + (row.xp ?? 0),
            username: profile?.username ?? prev?.username ?? null,
            avatar_url: profile?.avatar_url ?? prev?.avatar_url ?? null,
          });
        }
        const top = [...map.entries()].sort((a, b) => b[1].xp - a[1].xp)[0];
        if (top) {
          setAllTime({ user_id: top[0], ...top[1] });
        }
      }

      // Today: sum XP per user for today
      const { data: todayData } = await supabase
        .from("game_scores")
        .select("user_id, xp, profiles(username, avatar_url)")
        .eq("won", true)
        .eq("game_date", todayStr)
        .order("xp", { ascending: false });

      if (todayData && todayData.length > 0) {
        const map = new Map<string, { xp: number; username: string | null; avatar_url: string | null }>();
        for (const row of todayData) {
          const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
          const prev = map.get(row.user_id);
          map.set(row.user_id, {
            xp: (prev?.xp ?? 0) + (row.xp ?? 0),
            username: profile?.username ?? prev?.username ?? null,
            avatar_url: profile?.avatar_url ?? prev?.avatar_url ?? null,
          });
        }
        const top = [...map.entries()].sort((a, b) => b[1].xp - a[1].xp)[0];
        if (top) {
          setToday({ user_id: top[0], ...top[1] });
        }
      }

      setLoaded(true);
    }

    void fetchLeaders();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="mt-10 pt-8 border-t border-(--color-border)"
    >
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="text-[10px] tracking-[0.25em] uppercase text-(--color-muted) mb-4"
        style={{ fontFamily: "var(--font-sans)" }}
      >
        Leaderboard
      </motion.p>
      <div className="flex flex-col gap-3">
        <LeaderCard label="All Time" leader={loaded ? allTime : null} delay={0.05} />
        <LeaderCard label="Today" leader={loaded ? today : null} delay={0.12} />
      </div>
    </motion.div>
  );
}
