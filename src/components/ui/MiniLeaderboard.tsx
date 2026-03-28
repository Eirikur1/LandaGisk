"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

type Row = { username: string; total_xp: number };

export default function MiniLeaderboard() {
  const { username } = useAuth();
  const params = useParams();
  const locale = (params?.locale as string) ?? "en";
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    supabase
      .from("leaderboard")
      .select("username, total_xp")
      .gt("total_xp", 0)
      .order("total_xp", { ascending: false })
      .limit(5)
      .then(({ data }) => setRows((data as Row[]) ?? []));
  }, []);

  return (
    <div className="mt-8 pt-6 border-t border-(--color-border)">
      <div className="flex items-center justify-between mb-3">
        <p
          className="text-[10px] tracking-[0.25em] uppercase text-(--color-muted)"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          Leaderboard
        </p>
        <Link
          href={`/${locale}/leaderboard`}
          className="text-[10px] tracking-[0.14em] uppercase font-semibold text-(--color-blue) hover:opacity-60 transition-opacity"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          Full →
        </Link>
      </div>

      {rows === null ? (
        <div className="space-y-2.5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-4 h-2.5 rounded bg-(--color-tag)" />
              <div className="flex-1 h-2.5 rounded bg-(--color-tag)" />
              <div className="w-10 h-2.5 rounded bg-(--color-tag)" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-xs text-(--color-muted) py-2">No scores yet.</p>
      ) : (
        <ul className="space-y-0">
          {rows.map((row, i) => {
            const isMe = row.username === username;
            return (
              <li
                key={row.username}
                className="flex items-center gap-3 py-2 border-b border-(--color-border) last:border-0"
              >
                <span
                  className="w-4 shrink-0 text-[11px] tabular-nums text-(--color-muted)"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  {i + 1}
                </span>
                <span
                  className="flex-1 truncate text-sm font-semibold"
                  style={{
                    fontFamily: "var(--font-sans)",
                    color: isMe ? "var(--color-blue)" : "var(--color-foreground)",
                  }}
                >
                  {row.username}
                  {isMe && (
                    <span className="ml-1 font-normal text-[11px] text-(--color-muted)">you</span>
                  )}
                </span>
                <span
                  className="text-[11px] font-semibold tabular-nums text-(--color-blue) shrink-0"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  {row.total_xp.toLocaleString()}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
