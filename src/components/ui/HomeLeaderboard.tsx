"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { OptimizedAvatar } from "@/components/ui/OptimizedAvatar";
import { useLeaderboard, type Leader } from "@/lib/useLeaderboard";

function Avatar({ leader }: { leader: Leader }) {
  const initials = (leader.username ?? "?").slice(0, 2).toUpperCase();
  if (leader.avatar_url) {
    return (
      <OptimizedAvatar
        src={leader.avatar_url}
        alt=""
        width={28}
        height={28}
        className="size-7 rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 font-black text-white bg-(--color-blue) text-[10px]"
      style={{ width: 28, height: 28 }}
    >
      {initials}
    </div>
  );
}

function SkeletonRows() {
  return (
    <ul className="space-y-0">
      {[...Array(5)].map((_, i) => (
        <li key={i} className="flex items-center gap-3 py-2 border-b border-(--color-border) last:border-0">
          <div className="w-4 h-2.5 rounded bg-(--color-tag) animate-pulse shrink-0" />
          <div className="w-7 h-7 rounded-full bg-(--color-tag) animate-pulse shrink-0" />
          <div className="flex-1 h-2.5 rounded bg-(--color-tag) animate-pulse" />
          <div className="w-10 h-2.5 rounded bg-(--color-tag) animate-pulse shrink-0" />
        </li>
      ))}
    </ul>
  );
}

export default function HomeLeaderboard() {
  const t = useTranslations("home");
  const { username } = useAuth();
  const [tab, setTab] = useState<"alltime" | "today">("alltime");
  const { data, loading } = useLeaderboard();

  const allTime = (data?.allTime ?? []).slice(0, 5);
  const today = (data?.today ?? []).slice(0, 5);
  const rows = tab === "alltime" ? allTime : today;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="mt-6 pt-5 border-t border-(--color-border)"
    >
      {/* Header + tabs */}
      <div className="flex items-center justify-between mb-4">
        <p
          className="text-[10px] tracking-[0.25em] uppercase text-(--color-muted)"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          {t("leaderboardTitle")}
        </p>
        <div className="flex gap-1">
          {([["alltime", t("leaderboardAllTime")], ["today", t("leaderboardToday")]] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-[0.12em] uppercase transition-colors"
              style={{
                fontFamily: "var(--font-sans)",
                background: tab === id ? "var(--color-blue)" : "var(--color-tag)",
                color: tab === id ? "#fff" : "var(--color-tag-text)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <SkeletonRows />
      ) : rows.length === 0 ? (
        <p className="text-xs text-(--color-muted) py-4" style={{ fontFamily: "var(--font-sans)" }}>
          {t("leaderboardEmpty")}
        </p>
      ) : (
        <ul className="space-y-0">
          {rows.map((leader, i) => {
            const isMe = leader.username === username;
            return (
              <motion.li
                key={leader.user_id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="flex items-center gap-3 py-2 border-b border-(--color-border) last:border-0"
              >
                <span
                  className="w-4 shrink-0 text-[11px] tabular-nums text-(--color-muted)"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  {i + 1}
                </span>
                <Avatar leader={leader} />
                <span
                  className="flex-1 truncate text-sm font-semibold"
                  style={{
                    fontFamily: "var(--font-sans)",
                    color: isMe ? "var(--color-blue)" : "var(--color-foreground)",
                  }}
                >
                  {leader.username ?? "—"}
                  {isMe && (
                    <span className="ml-1 font-normal text-[11px] text-(--color-muted)">you</span>
                  )}
                </span>
                <span
                  className="text-[11px] font-semibold tabular-nums text-(--color-blue) shrink-0"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  {leader.xp.toLocaleString()} XP
                </span>
              </motion.li>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}
