"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import { WATERFALLS } from "@/data/waterfalls";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import MiniLeaderboard from "@/components/ui/MiniLeaderboard";
import IcelandMap, { distanceKm } from "./IcelandMap";

const copy = {
  en: {
    title: "Waterfall",
    subtitle: "A new Icelandic waterfall every day. Click the map to place your guess.",
    solved: "Well done!",
    reset: "Play again",
    heading: "Your result",
    km: "km off",
    xpLabel: (xp: number) => `+${xp} XP`,
  },
  is: {
    title: "Fossar",
    subtitle: "Nýr íslenskur foss á hverjum degi. Smelltu á kortið til að giska.",
    solved: "Vel gert!",
    reset: "Spila aftur",
    heading: "Niðurstaðan þín",
    km: "km frá",
    xpLabel: (xp: number) => `+${xp} XP`,
  },
} as const;

/** XP based on distance: closer = more XP */
function distanceToXp(km: number): number {
  if (km <= 10) return 1000;
  if (km <= 25) return 800;
  if (km <= 50) return 600;
  if (km <= 100) return 400;
  if (km <= 200) return 200;
  return 50;
}

function distanceLabel(km: number): string {
  if (km < 1) return "< 1 km";
  return `${Math.round(km)} km`;
}

function ymdNow() { return new Date().toISOString().slice(0, 10); }

function seededIndex(seed: string, mod: number) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h) % mod;
}

interface SavedState {
  guessLng?: number;
  guessLat?: number;
  distKm?: number;
  xp?: number;
}

export default function WaterfallGuesser() {
  const locale = (useLocale() as "en" | "is") || "en";
  const t = copy[locale];
  const { user } = useAuth();

  const day = useMemo(() => ymdNow(), []);
  const storageKey = `waterfall-guesser:${day}`;
  const target = useMemo(() => WATERFALLS[seededIndex(day + "waterfall", WATERFALLS.length)]!, [day]);

  const [submitted, setSubmitted] = useState<SavedState | null>(null);
  const [earnedXp, setEarnedXp] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const scoreSavedRef = useRef(false);
  const confettiFiredRef = useRef(false);

  // Fetch image from Wikipedia summary API — always returns a working thumbnail
  useEffect(() => {
    setImageUrl(null);
    const title = encodeURIComponent(target.name.replace(/ /g, "_"));
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.thumbnail?.source) setImageUrl(data.thumbnail.source);
        else if (data?.originalimage?.source) setImageUrl(data.originalimage.source);
      })
      .catch(() => {});
  }, [target.name]);

  // Restore from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SavedState;
      if (parsed.guessLng !== undefined) setSubmitted(parsed);
    } catch {}
  }, [storageKey]);

  function handleSubmit(pin: { lng: number; lat: number }) {
    const km = distanceKm(pin, { lng: target.lng, lat: target.lat });
    const xp = distanceToXp(km);
    const state: SavedState = { guessLng: pin.lng, guessLat: pin.lat, distKm: km, xp };
    setSubmitted(state);
    try { window.localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
  }

  // Save score to Supabase once per day
  useEffect(() => {
    if (!submitted || scoreSavedRef.current || !user) return;
    scoreSavedRef.current = true;
    const xp = submitted.xp ?? 0;
    supabase.from("game_scores")
      .insert({ user_id: user.id, game_type: "waterfall", game_date: day, guesses: 1, xp, won: true })
      .then(({ error: err }) => { if (!err) setEarnedXp(xp); });
  }, [submitted, user, day]);

  // Confetti on very good result (≤25km)
  useEffect(() => {
    if (!submitted || confettiFiredRef.current) return;
    if ((submitted.distKm ?? 999) > 25) return;
    confettiFiredRef.current = true;
    import("canvas-confetti").then(({ default: confetti }) => {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ["#2b5ceb", "#22c55e", "#f59e0b", "#ffffff"] });
      setTimeout(() => confetti({ particleCount: 60, spread: 100, origin: { y: 0.55 }, colors: ["#2b5ceb", "#22c55e", "#f59e0b"] }), 300);
    });
  }, [submitted]);

  function clearDay() {
    setSubmitted(null);
    setEarnedXp(null);
    scoreSavedRef.current = false;
    confettiFiredRef.current = false;
    try { window.localStorage.removeItem(storageKey); } catch {}
  }

  const guessPin = submitted?.guessLng !== undefined
    ? { lng: submitted.guessLng!, lat: submitted.guessLat! }
    : null;
  const targetPin = submitted ? { lng: target.lng, lat: target.lat } : null;

  return (
    <>
      {/* ── Right: Iceland map (self-positioned absolutely) ──────── */}
      <IcelandMap
        onSubmit={handleSubmit}
        resultPin={guessPin}
        targetPin={targetPin}
        disabled={!!submitted}
      />

      {/* ── Left: Game UI ────────────────────────────────────────── */}
      <div className="relative z-10 max-w-sm px-8 pt-2 pb-10">

        {/* Title */}
        <div className="mb-6">
          <motion.h1
            className="text-[clamp(2.5rem,8vw,4.5rem)] font-black leading-[0.95] tracking-tight text-(--color-blue) mb-3"
            style={{ fontFamily: "var(--font-display)" }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            {t.title}
          </motion.h1>
          <motion.p
            className="text-sm text-(--color-muted) leading-relaxed"
            style={{ fontFamily: "var(--font-sans)" }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            {t.subtitle}
          </motion.p>
          <motion.p
            className="text-[10px] tracking-[0.25em] text-(--color-muted) mt-4 opacity-80"
            style={{ fontFamily: "var(--font-sans)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {new Intl.DateTimeFormat("en-US", { weekday: "short", month: "long", day: "numeric" }).format(new Date())}
          </motion.p>
        </div>

        {/* Waterfall photo */}
        <motion.div
          key={target.name}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6"
        >
          <div
            className="rounded-2xl overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.22)] bg-(--color-surface)"
            style={{ aspectRatio: "16/9" }}
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="Mystery waterfall" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-(--color-blue) border-t-transparent animate-spin" />
              </div>
            )}
          </div>
          {submitted && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              className="mt-2 space-y-0.5"
            >
              <p className="text-base font-black tracking-tight text-(--color-foreground)" style={{ fontFamily: "var(--font-display)" }}>
                {target.name}
              </p>
              <p className="text-xs text-(--color-muted)">
                {target.region} · {target.height_m}m · {target.river}
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Result banner */}
        {submitted && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-5 rounded-2xl border border-(--color-border) bg-(--color-surface) px-4 py-3 flex items-center justify-between gap-4"
          >
            <div>
              <p className="font-bold" style={{ color: (submitted.distKm ?? 999) <= 25 ? "#22c55e" : "var(--color-foreground)" }}>
                {(submitted.distKm ?? 999) <= 10
                  ? "Spot on!"
                  : (submitted.distKm ?? 999) <= 50
                  ? t.solved
                  : "Not bad"}
                {" "}— {distanceLabel(submitted.distKm ?? 0)} {t.km}
              </p>
              <p className="text-xs text-(--color-muted) mt-0.5">{target.name}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {(earnedXp !== null || submitted.xp) && (
                <div className="rounded-xl bg-(--color-blue) text-white px-3 py-1.5 text-center">
                  <p className="text-[10px] font-semibold opacity-70 leading-none">XP</p>
                  <p className="text-lg font-black leading-none">{t.xpLabel(earnedXp ?? submitted.xp ?? 0)}</p>
                </div>
              )}
              <button
                type="button"
                onClick={clearDay}
                className="text-[11px] tracking-[0.14em] uppercase font-semibold hover:opacity-60 transition-opacity"
                style={{ color: "var(--color-muted)", fontFamily: "var(--font-sans)" }}
              >
                {t.reset}
              </button>
            </div>
          </motion.div>
        )}

        {/* XP scale hint */}
        {!submitted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="flex gap-2 flex-wrap mb-6"
          >
            {[
              { label: "≤10 km", xp: 1000 },
              { label: "≤50 km", xp: 600 },
              { label: "≤100 km", xp: 400 },
              { label: ">100 km", xp: 200 },
            ].map((row) => (
              <span
                key={row.label}
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: "var(--color-tag)", color: "var(--color-muted)", fontFamily: "var(--font-sans)" }}
              >
                {row.label} → {row.xp} XP
              </span>
            ))}
          </motion.div>
        )}

        {/* Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <MiniLeaderboard />
        </motion.div>
      </div>
    </>
  );
}
