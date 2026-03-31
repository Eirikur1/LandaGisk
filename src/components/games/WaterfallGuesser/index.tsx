"use client";

import { useMemo, useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { parseGameDateParam, ymdUtcNow } from "@/lib/game-date";
import { WATERFALLS } from "@/data/waterfalls";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import MiniLeaderboard from "@/components/ui/MiniLeaderboard";
import IcelandMap, { distanceKm } from "./IcelandMap";

function distanceToXp(km: number): number {
  if (km <= 10) return 1000;
  if (km <= 25) return 800;
  if (km <= 50) return 600;
  if (km <= 100) return 400;
  if (km <= 200) return 200;
  return 50;
}

const NAME_BONUS_XP = 300;

function distanceLabel(km: number): string {
  if (km < 1) return "< 1 km";
  return `${Math.round(km)} km`;
}

function seededIndex(seed: string, mod: number) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h) % mod;
}

interface SavedState {
  guessLng: number;
  guessLat: number;
  distKm: number;
  locationXp: number;
  nameGuess?: string;
  nameCorrect?: boolean;
  nameSkipped?: boolean;
  totalXp: number;
}

function WaterfallGuesserInner() {
  const locale = (useLocale() as "en" | "is") || "en";
  const t = useTranslations("games.waterfall");
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  const day = useMemo(() => parseGameDateParam(dateParam) ?? ymdUtcNow(), [dateParam]);
  const isArchive = useMemo(() => day !== ymdUtcNow(), [day]);
  const { user } = useAuth();
  const helpSeenKey = "help-seen:waterfall";
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(helpSeenKey)) setShowHelp(true);
    } catch {}
  }, []);

  function dismissHelp(permanent: boolean) {
    setShowHelp(false);
    if (permanent) {
      try { window.localStorage.setItem(helpSeenKey, "1"); } catch {}
    }
  }

  const storageKey = `waterfall-guesser:${day}`;
  const target = useMemo(() => WATERFALLS[seededIndex(day + "waterfall", WATERFALLS.length)]!, [day]);

  const [saved, setSaved] = useState<SavedState | null>(null);
  const [earnedXp, setEarnedXp] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null | "error">(null);
  const [imageAspect, setImageAspect] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const scoreSavedRef = useRef(false);
  const confettiFiredRef = useRef(false);
  const prevUserRef = useRef<string | null | undefined>(undefined);

  // Reset game when user logs in (discard anonymous play)
  useEffect(() => {
    const prev = prevUserRef.current;
    prevUserRef.current = user?.id ?? null;
    if (prev === undefined) return; // initial mount, skip
    if (!prev && user) {
      // Transitioned from logged-out to logged-in — clear saved state
      try { window.localStorage.removeItem(storageKey); } catch {}
      setSaved(null);
      setEarnedXp(null);
      setNameValue("");
      scoreSavedRef.current = false;
      confettiFiredRef.current = false;
    }
  }, [user, storageKey]);

  useEffect(() => {
    setImageUrl(null);
    setImageAspect(null);
    if (target.wikimedia_image_url) {
      setImageUrl(target.wikimedia_image_url);
      return;
    }
    const title = encodeURIComponent(target.name.replace(/ /g, "_"));
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.thumbnail?.source) setImageUrl(data.thumbnail.source);
        else if (data?.originalimage?.source) setImageUrl(data.originalimage.source);
      })
      .catch(() => {});
  }, [target.name, target.wikimedia_image_url]);

  useEffect(() => {
    setSaved(null);
    setEarnedXp(null);
    setNameValue("");
    scoreSavedRef.current = false;
    confettiFiredRef.current = false;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SavedState;
      if (parsed.guessLng !== undefined) setSaved(parsed);
    } catch {}
  }, [storageKey]);

  function persist(state: SavedState) {
    try { window.localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
  }

  function handleMapSubmit(pin: { lng: number; lat: number }) {
    const km = distanceKm(pin, { lng: target.lng, lat: target.lat });
    const locationXp = distanceToXp(km);
    const state: SavedState = { guessLng: pin.lng, guessLat: pin.lat, distKm: km, locationXp, totalXp: locationXp };
    setSaved(state);
    persist(state);
  }

  function handleNameGuess() {
    if (!saved || saved.nameGuess !== undefined) return;
    const correct = nameValue.trim().toLowerCase() === target.name.toLowerCase();
    const updated: SavedState = {
      ...saved,
      nameGuess: nameValue.trim(),
      nameCorrect: correct,
      totalXp: saved.locationXp + (correct ? NAME_BONUS_XP : 0),
    };
    setSaved(updated);
    persist(updated);
  }

  function handleNameSkip() {
    if (!saved || saved.nameGuess !== undefined) return;
    const updated: SavedState = { ...saved, nameSkipped: true };
    setSaved(updated);
    persist(updated);
  }

  const nameDone = saved && (saved.nameGuess !== undefined || saved.nameSkipped);

  useEffect(() => {
    if (!nameDone || !saved || scoreSavedRef.current || !user) return;
    scoreSavedRef.current = true;
    supabase.from("game_scores")
      .insert({ user_id: user.id, game_type: "waterfall", game_date: day, guesses: 1, xp: saved.totalXp, won: true })
      .then(({ error: err }) => { if (!err) setEarnedXp(saved.totalXp); });
  }, [nameDone, saved, user, day]);

  useEffect(() => {
    if (!nameDone || !saved || confettiFiredRef.current) return;
    if (saved.distKm > 50 && !saved.nameCorrect) return;
    confettiFiredRef.current = true;
    import("canvas-confetti").then(({ default: confetti }) => {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ["#2b5ceb", "#22c55e", "#f59e0b", "#ffffff"] });
      setTimeout(() => confetti({ particleCount: 60, spread: 100, origin: { y: 0.55 }, colors: ["#2b5ceb", "#22c55e", "#f59e0b"] }), 300);
    });
  }, [nameDone, saved]);

  useEffect(() => {
    const q = nameValue.trim().toLowerCase();
    if (!q) { setNameSuggestions([]); return; }
    setNameSuggestions(WATERFALLS.map((w) => w.name).filter((n) => n.toLowerCase().includes(q)).slice(0, 6));
  }, [nameValue]);

  function clearDay() {
    setSaved(null); setEarnedXp(null); setNameValue("");
    scoreSavedRef.current = false; confettiFiredRef.current = false;
    try { window.localStorage.removeItem(storageKey); } catch {}
  }

  const guessPin = saved ? { lng: saved.guessLng, lat: saved.guessLat } : null;
  const targetPin = saved ? { lng: target.lng, lat: target.lat } : null;

  return (
    <>
      <IcelandMap
        onSubmit={handleMapSubmit}
        resultPin={guessPin}
        targetPin={targetPin}
        disabled={!!saved}
      />
      <button
        type="button"
        onClick={() => setShowHelp(true)}
        className="fixed top-4 right-4 z-20 w-8 h-8 rounded-full border border-(--color-border) bg-(--color-surface) text-(--color-muted) text-sm font-bold hover:opacity-70 transition-opacity flex items-center justify-center shadow-sm"
        aria-label="How to play"
      >
        ?
      </button>

      <div className="relative z-10 max-w-sm px-8 pt-2 pb-10">

        {isArchive && (
          <div
            className="mb-4 rounded-xl border border-(--color-border) bg-(--color-surface) px-3 py-2 text-xs text-(--color-muted)"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            <span className="text-(--color-foreground) font-semibold">{day}</span>
            {" · "}
            <Link href={`/${locale}/waterfall`} className="underline underline-offset-2 hover:opacity-70 transition-opacity">
              Today&apos;s puzzle
            </Link>
          </div>
        )}

        {/* Help modal */}
        {showHelp && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
            onClick={() => dismissHelp(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-sm mx-4 rounded-2xl border border-(--color-border) bg-(--color-surface) p-6 shadow-[0_20px_60px_rgba(0,0,0,0.15)]"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-black mb-4 text-(--color-foreground)" style={{ fontFamily: "var(--font-display)" }}>
                How to play
              </h2>
              <div className="space-y-3 text-sm text-(--color-muted) leading-relaxed">
                <p>A mystery waterfall photo is shown. <strong className="text-(--color-foreground)">Click on the Iceland map</strong> to place your guess where you think it is located.</p>
                <p>After guessing the location, you get a chance to <strong className="text-(--color-foreground)">name the waterfall</strong> for a bonus XP reward.</p>
                <p>A new waterfall is picked every day — come back tomorrow for a fresh challenge.</p>
              </div>
              <div className="mt-5 pt-4 border-t border-(--color-border)">
                <p className="text-[11px] uppercase tracking-[0.18em] text-(--color-muted) font-semibold mb-2">XP scoring</p>
                <div className="flex flex-wrap gap-2">
                  {[{ label: "≤10 km", xp: 1000 }, { label: "≤25 km", xp: 800 }, { label: "≤50 km", xp: 600 }, { label: "≤100 km", xp: 400 }, { label: "≤200 km", xp: 200 }, { label: ">200 km", xp: 50 }, { label: "Correct name", xp: 300 }].map((r) => (
                    <span key={r.label} className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "var(--color-tag)", color: "var(--color-tag-text)", fontFamily: "var(--font-sans)" }}>
                      {r.label} → +{r.xp}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => dismissHelp(false)}
                  className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white bg-(--color-blue) hover:opacity-90 transition-opacity"
                >
                  Got it
                </button>
                <button
                  type="button"
                  onClick={() => dismissHelp(true)}
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold border border-(--color-border) text-(--color-muted) hover:opacity-60 transition-opacity"
                >
                  Don&apos;t show again
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Title */}
        <div className="mb-5">
          <motion.h1
            className="text-[clamp(2.5rem,8vw,4.5rem)] font-black leading-[0.95] tracking-tight text-(--color-blue) mb-2"
            style={{ fontFamily: "var(--font-display)" }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            {t("title")}
          </motion.h1>
          <motion.p
            className="text-sm text-(--color-muted) leading-relaxed"
            style={{ fontFamily: "var(--font-sans)" }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            {!saved
              ? "Click the map to guess where this waterfall is."
              : !nameDone
              ? "Now guess its name for bonus XP."
              : "Come back tomorrow for a new waterfall."}
          </motion.p>
          <motion.p
            className="text-[10px] tracking-[0.25em] text-(--color-muted) mt-3 opacity-70"
            style={{ fontFamily: "var(--font-sans)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
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
          className="mb-5"
        >
          <div
            className="rounded-2xl overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.22)] bg-(--color-surface)"
            style={{ aspectRatio: imageAspect ?? 16 / 9, cursor: imageUrl && imageUrl !== "error" ? "zoom-in" : "default" }}
            onClick={() => { if (imageUrl && imageUrl !== "error") setLightbox(true); }}
          >
            {imageUrl && imageUrl !== "error" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt="Mystery waterfall"
                className="w-full h-full object-cover"
                onLoad={(e) => {
                  const { naturalWidth, naturalHeight } = e.currentTarget;
                  if (naturalWidth && naturalHeight) setImageAspect(naturalWidth / naturalHeight);
                }}
                onError={() => {
                  // Direct Wikimedia URL failed — fall back to Wikipedia API
                  const title = encodeURIComponent(target.name.replace(/ /g, "_"));
                  fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`)
                    .then((r) => r.json())
                    .then((data) => {
                      if (data?.thumbnail?.source) setImageUrl(data.thumbnail.source);
                      else if (data?.originalimage?.source) setImageUrl(data.originalimage.source);
                      else setImageUrl("error");
                    })
                    .catch(() => setImageUrl("error"));
                }}
              />
            ) : imageUrl === "error" ? (
              <div className="w-full h-full flex items-center justify-center text-(--color-muted) text-sm">
                No image available
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-(--color-blue) border-t-transparent animate-spin" />
              </div>
            )}
          </div>
          {nameDone && (
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
                {target.height_m}m · {target.region} · {target.river}
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Lightbox */}
        {lightbox && imageUrl && imageUrl !== "error" && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setLightbox(false)}
          >
            <motion.img
              src={imageUrl}
              alt="Waterfall"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-[90vw] max-h-[90vh] rounded-2xl shadow-2xl object-contain"
              style={{ cursor: "zoom-out" }}
            />
          </div>
        )}

        {/* Phase 1 result */}
        <AnimatePresence>
          {saved && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-3 rounded-2xl border border-(--color-border) bg-(--color-surface) px-4 py-3 flex items-center justify-between gap-3"
            >
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-(--color-muted) font-semibold mb-0.5" style={{ fontFamily: "var(--font-sans)" }}>Location</p>
                <p className="font-bold text-(--color-foreground)">{distanceLabel(saved.distKm)} off</p>
              </div>
              <div className="rounded-xl bg-(--color-blue) text-white px-3 py-1.5 text-center shrink-0">
                <p className="text-[10px] font-semibold opacity-70 leading-none">XP</p>
                <p className="text-lg font-black leading-none">+{saved.locationXp}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase 2: name guess input */}
        <AnimatePresence>
          {saved && !nameDone && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="mb-3 rounded-2xl border border-(--color-border) bg-(--color-surface) px-4 py-4"
            >
              <p className="text-[10px] uppercase tracking-[0.14em] text-(--color-muted) font-semibold mb-3" style={{ fontFamily: "var(--font-sans)" }}>
                Name it — +{NAME_BONUS_XP} XP bonus
              </p>
              <div className="flex gap-2 relative">
                <div className="flex-1 relative">
                  <input
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleNameGuess(); }}
                    placeholder="Type a waterfall name…"
                    className="w-full rounded-xl border border-(--color-border) bg-white px-3 py-2 text-sm outline-none focus:border-(--color-blue) transition-colors"
                  />
                  {nameSuggestions.length > 0 && (
                    <div className="absolute top-full mt-1 left-0 right-0 rounded-xl border border-(--color-border) bg-white shadow-lg overflow-hidden z-20">
                      {nameSuggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => { setNameValue(s); setNameSuggestions([]); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-(--color-blue-light) transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleNameGuess}
                  disabled={!nameValue.trim()}
                  className="rounded-xl px-4 py-2 text-sm font-bold text-white bg-(--color-blue) disabled:opacity-40 transition-opacity shrink-0"
                >
                  Guess
                </button>
              </div>
              <button
                type="button"
                onClick={handleNameSkip}
                className="mt-2 text-[11px] tracking-[0.14em] uppercase font-semibold text-(--color-muted) hover:opacity-60 transition-opacity"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Skip
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase 2 result */}
        <AnimatePresence>
          {nameDone && !saved?.nameSkipped && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-3 rounded-2xl border border-(--color-border) bg-(--color-surface) px-4 py-3 flex items-center justify-between gap-3"
            >
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-(--color-muted) font-semibold mb-0.5" style={{ fontFamily: "var(--font-sans)" }}>Name</p>
                <p className="font-bold" style={{ color: saved?.nameCorrect ? "#22c55e" : "var(--color-muted)" }}>
                  {saved?.nameCorrect ? "Correct!" : `Wrong — ${target.name}`}
                </p>
              </div>
              {saved?.nameCorrect && (
                <div className="rounded-xl bg-green-500 text-white px-3 py-1.5 text-center shrink-0">
                  <p className="text-[10px] font-semibold opacity-80 leading-none">BONUS</p>
                  <p className="text-lg font-black leading-none">+{NAME_BONUS_XP}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Total + reset */}
        <AnimatePresence>
          {nameDone && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="mb-5 rounded-2xl border border-(--color-border) bg-(--color-surface) px-4 py-3 flex items-center justify-between gap-4"
            >
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-(--color-muted) font-semibold mb-0.5" style={{ fontFamily: "var(--font-sans)" }}>Total</p>
                <p className="font-bold text-(--color-foreground)">{saved!.totalXp} XP earned</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {earnedXp !== null && (
                  <div className="rounded-xl bg-(--color-blue) text-white px-3 py-1.5 text-center">
                    <p className="text-[10px] font-semibold opacity-70 leading-none">XP</p>
                    <p className="text-lg font-black leading-none">+{earnedXp}</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={clearDay}
                  className="text-[11px] tracking-[0.14em] uppercase font-semibold hover:opacity-60 transition-opacity"
                  style={{ color: "var(--color-muted)", fontFamily: "var(--font-sans)" }}
                >
                  Play again
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* XP hint */}
        {!saved && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="flex gap-2 flex-wrap mb-5"
          >
            {[
              { label: "≤10 km", xp: 1000 },
              { label: "≤50 km", xp: 600 },
              { label: "≤100 km", xp: 400 },
              { label: "Name", xp: 300 },
            ].map((row) => (
              <span
                key={row.label}
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: "var(--color-tag)", color: "var(--color-tag-text)", fontFamily: "var(--font-sans)" }}
              >
                {row.label} → +{row.xp} XP
              </span>
            ))}
          </motion.div>
        )}

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

export default function WaterfallGuesser() {
  return (
    <Suspense
      fallback={
        <div
          className="relative min-h-[40vh] grid place-items-center text-(--color-muted) text-sm"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          Loading…
        </div>
      }
    >
      <WaterfallGuesserInner />
    </Suspense>
  );
}
