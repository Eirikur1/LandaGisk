"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useTranslations } from "next-intl";

type Stats = {
  streak: number;
  totalXp: number;
  rank: number | null;
};

export default function UserStats() {
  const { user } = useAuth();
  const t = useTranslations("home");
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!user) return;

    async function load() {
      // Total XP for this user
      const { data: scores } = await supabase
        .from("game_scores")
        .select("xp, game_date, game_type")
        .eq("user_id", user!.id)
        .eq("won", true)
        .order("game_date", { ascending: false });

      if (!scores) return;

      const totalXp = scores.reduce((sum, r) => sum + (r.xp ?? 0), 0);

      // Daily streak — count consecutive days with at least one win (any game)
      const daySet = new Set(scores.map((r) => r.game_date as string));
      const days = [...daySet].sort((a, b) => (a > b ? -1 : 1));
      let streak = 0;
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      // Streak only counts if they played today or yesterday
      if (days[0] === today || days[0] === yesterday) {
        let cursor = new Date(days[0]);
        for (let i = 0; i < days.length; i++) {
          const expected = new Date(cursor);
          expected.setDate(expected.getDate() - i);
          const expectedStr = expected.toISOString().slice(0, 10);
          if (days[i] === expectedStr) {
            streak++;
          } else {
            break;
          }
        }
      }

      // Rank — count users with higher total_xp than this user
      const { data: rankData } = await supabase
        .from("leaderboard")
        .select("user_id, total_xp")
        .gt("total_xp", totalXp);

      const rank = totalXp > 0 ? (rankData?.length ?? 0) + 1 : null;

      setStats({ streak, totalXp, rank });
    }

    void load();
  }, [user]);

  const items = [
    { id: "daily", msgKey: "statDailyStreak" as const, value: stats ? String(stats.streak) : "0" },
    { id: "xp",    msgKey: "statTotalXp" as const,     value: stats ? stats.totalXp.toLocaleString() : "0" },
    { id: "rank",  msgKey: "statRankOverall" as const,  value: stats?.rank != null ? `#${stats.rank}` : "—" },
  ];

  return (
    <div className="mt-6 pt-4 grid grid-cols-3 gap-6">
      {items.map(({ id, msgKey, value }) => (
        <div key={id} className="flex flex-col gap-1.5">
          <span
            className="text-3xl font-black tabular-nums text-(--color-blue) leading-none"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {value}
          </span>
          <span
            className="text-[10px] tracking-[0.2em] uppercase text-(--color-muted)"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {t(msgKey)}
          </span>
        </div>
      ))}
    </div>
  );
}
