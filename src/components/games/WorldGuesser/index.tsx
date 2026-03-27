"use client";

import { useMemo, useState, useEffect, useRef, useLayoutEffect } from "react";
import { useLocale } from "next-intl";
import { WORLD_COUNTRIES, type WorldCountry } from "@/data/worldCountries";

type GuessRow = {
  name: string;
  distanceKm: number;
  direction: string;
  proximity: number;
  exact: boolean;
};

const copy = {
  en: {
    title: "Guess the country",
    subtitle:
      "Daily country challenge. Enter a country and get distance + direction hints.",
    input: "Type a country",
    guess: "Guess",
    solved: "Solved!",
    solvedText: "You found today's country.",
    reset: "Clear today's guesses",
    noMatch: "Country not found in list.",
    already: "Already guessed that one.",
    heading: "Past guesses",
    distance: "Distance",
    dir: "Direction",
    proximity: "Proximity",
  },
  is: {
    title: "Giskaðu á landið",
    subtitle:
      "Dagleg landsáskorun. Sláðu inn land og fáðu fjarlægð og átt sem vísbendingu.",
    input: "Skrifaðu land",
    guess: "Giska",
    solved: "Leyst!",
    solvedText: "Þú fannst land dagsins.",
    reset: "Hreinsa getgátur dagsins",
    noMatch: "Land fannst ekki á lista.",
    already: "Þú hefur þegar giskað á þetta.",
    heading: "Fyrri getgátur",
    distance: "Fjarlægð",
    dir: "Átt",
    proximity: "Nánd",
  },
} as const;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function distanceKm(a: WorldCountry, b: WorldCountry) {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function bearingDeg(a: WorldCountry, b: WorldCountry) {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLon = toRad(b.lon - a.lon);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

function directionArrow(bearing: number) {
  const dirs = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  const idx = Math.round(bearing / 45) % 8;
  return dirs[idx]!;
}

function ymdNow() {
  return new Date().toISOString().slice(0, 10);
}

function seededIndex(seed: string, mod: number) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % mod;
}

function InteractiveWorldGlobe({
  guessedCountries,
  target,
  won,
}: {
  guessedCountries: WorldCountry[];
  target: WorldCountry;
  won: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapHostId = "world-svg-map";
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!isMounted) return;
    let disposed = false;
    let raf = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const host = hostRef.current;
    if (!host) return;
    host.id = mapHostId;

    const values: Record<string, { status: number; color: string }> = {};
    guessedCountries.forEach((c) => {
      values[c.code.toUpperCase()] = { status: 1, color: "#f59e0b" };
    });
    if (won) {
      values[target.code.toUpperCase()] = { status: 2, color: "#22c55e" };
    }

    let attempt = 0;
    const initMap = async () => {
      if (disposed) return;
      // svgMap can fail on refresh if initialized before layout size settles.
      if ((host.clientWidth === 0 || host.clientHeight === 0) && attempt < 10) {
        attempt += 1;
        raf = requestAnimationFrame(() => {
          void initMap();
        });
        return;
      }
      const mod = await import("svgmap");
      if (disposed) return;
      const SvgMapCtor = (mod as { default?: new (opts: unknown) => unknown })
        .default;
      if (!SvgMapCtor) return;
      try {
        host.innerHTML = "";
        new SvgMapCtor({
          targetElementID: mapHostId,
          minZoom: 1,
          maxZoom: 20,
          initialZoom: 1.22,
          initialPan: { x: 0, y: 12 },
          showContinentSelector: false,
          showZoomReset: false,
          mouseWheelZoomEnabled: true,
          colorNoData: "#eef2ff",
          colorMin: "#dbeafe",
          colorMax: "#2563eb",
          countries: { EH: false },
          noDataText: "",
          hideFlag: true,
          onGetTooltip: (): string => "",
          data: {
            data: {
              status: { name: "status", format: "{0}" },
            },
            applyData: "status",
            values,
          },
        } as unknown as never);
        // Some refreshes race with style/layout; verify an SVG was actually mounted.
        if (!host.querySelector("svg") && attempt < 3) {
          attempt += 1;
          retryTimer = setTimeout(() => {
            void initMap();
          }, 120);
        }
      } catch {
        if (attempt < 3) {
          attempt += 1;
          raf = requestAnimationFrame(() => {
            void initMap();
          });
        }
      }
    };
    void initMap();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      if (retryTimer) clearTimeout(retryTimer);
      host.innerHTML = "";
    };
  }, [guessedCountries, target.code, won, isMounted]);

  return (
    <div className="mb-5 rounded-2xl border border-(--color-border) bg-white p-2">
      <div
        ref={hostRef}
        className="h-[260px] sm:h-[320px] w-full rounded-xl overflow-hidden bg-white"
      >
        {!isMounted ? (
          <div className="h-full w-full bg-[radial-gradient(circle_at_35%_30%,#f7f9ff_0%,#f0f2f8_55%,#e8ebf4_100%)]" />
        ) : null}
      </div>
      <p className="mt-2 text-[11px] text-(--color-muted) text-center uppercase tracking-widest">
        Pan and zoom
      </p>
    </div>
  );
}

export default function WorldGuesser() {
  const locale = (useLocale() as "en" | "is") || "en";
  const t = copy[locale];
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [guesses, setGuesses] = useState<string[]>([]);

  const day = useMemo(() => ymdNow(), []);
  const storageKey = `world-guesser:${day}`;
  const target = useMemo(
    () => WORLD_COUNTRIES[seededIndex(day, WORLD_COUNTRIES.length)]!,
    [day]
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed)) setGuesses(parsed);
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(guesses));
    } catch {}
  }, [guesses, storageKey]);

  const rows = useMemo<GuessRow[]>(() => {
    return guesses
      .map((name) => WORLD_COUNTRIES.find((c) => c.name === name))
      .filter((c): c is WorldCountry => Boolean(c))
      .map((g) => {
        const d = distanceKm(g, target);
        const b = bearingDeg(g, target);
        const p = Math.max(0, Math.round((1 - d / 20015) * 100));
        const exact = g.code === target.code;
        return {
          name: g.name,
          distanceKm: Math.round(d),
          direction: exact ? "✓" : directionArrow(b),
          proximity: exact ? 100 : p,
          exact,
        };
      });
  }, [guesses, target]);
  const guessedCountries = useMemo(
    () =>
      guesses
        .map((name) => WORLD_COUNTRIES.find((c) => c.name === name))
        .filter((c): c is WorldCountry => Boolean(c)),
    [guesses]
  );
  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    return WORLD_COUNTRIES.filter((c) => c.name.toLowerCase().includes(q)).slice(
      0,
      8
    );
  }, [value]);

  const won = rows.some((r) => r.exact);

  function onGuess() {
    const normalized = value.trim().toLowerCase();
    if (!normalized || won) return;
    const match = WORLD_COUNTRIES.find(
      (c) => c.name.toLowerCase() === normalized
    );
    if (!match) {
      setError(t.noMatch);
      return;
    }
    if (guesses.includes(match.name)) {
      setError(t.already);
      return;
    }
    setError("");
    setGuesses((g) => [match.name, ...g]);
    setValue("");
  }

  function clearDay() {
    setGuesses([]);
    setError("");
    try {
      window.localStorage.removeItem(storageKey);
    } catch {}
  }

  return (
    <div className="border border-(--color-border) rounded-2xl bg-(--color-surface) p-5 sm:p-6">
      <div className="mb-5">
        <h2
          className="text-2xl font-black text-(--color-foreground) tracking-tight mb-1"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t.title}
        </h2>
        <p className="text-sm text-(--color-muted)">{t.subtitle}</p>
      </div>

      <InteractiveWorldGlobe
        guessedCountries={guessedCountries}
        target={target}
        won={won}
      />

      <div className="mb-3">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onGuess();
          }}
          placeholder={t.input}
          className="flex-1 rounded-xl border border-(--color-border) bg-white px-4 py-2.5 text-sm outline-none focus:border-(--color-blue)"
          disabled={won}
        />
        <button
          type="button"
          onClick={onGuess}
          className="rounded-xl px-4 py-2.5 text-sm font-bold text-white bg-(--color-blue) disabled:opacity-50"
          disabled={won}
        >
          {t.guess}
        </button>
      </div>
      {!won && suggestions.length > 0 ? (
        <div className="mt-2 rounded-xl border border-(--color-border) bg-white p-1">
          {suggestions.map((s) => (
            <button
              key={s.code}
              type="button"
              onClick={() => {
                setValue(s.name);
                setError("");
              }}
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-(--color-blue-light)"
            >
              {s.name}
            </button>
          ))}
        </div>
      ) : null}
      </div>

      {error ? <p className="text-xs text-red-600 mb-4">{error}</p> : null}

      {won ? (
        <div className="mb-5 rounded-xl border border-(--color-border) bg-white px-4 py-3">
          <p className="font-bold text-(--color-blue)">{t.solved}</p>
          <p className="text-sm text-(--color-muted)">
            {t.solvedText} ({target.name})
          </p>
        </div>
      ) : null}

      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-widest text-(--color-muted) font-bold">
          {t.heading}
        </h3>
        <button
          type="button"
          onClick={clearDay}
          className="text-xs underline text-(--color-muted)"
        >
          {t.reset}
        </button>
      </div>

      <div className="space-y-2">
        {rows.map((r) => (
          <div
            key={r.name}
            className="grid grid-cols-[1.2fr_.9fr_.6fr_.7fr] items-center gap-2 rounded-xl border border-(--color-border) bg-white px-3 py-2.5"
          >
            <div className="font-semibold">{r.name}</div>
            <div className="text-sm text-(--color-muted)">
              {t.distance}: {r.distanceKm.toLocaleString()} km
            </div>
            <div className="text-lg text-center" title={t.dir}>
              {r.direction}
            </div>
            <div className="text-right text-sm font-bold text-(--color-blue)">
              {r.proximity}%
            </div>
          </div>
        ))}
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-(--color-border) px-3 py-6 text-center text-sm text-(--color-muted)">
            {t.input}
          </div>
        ) : null}
      </div>
    </div>
  );
}
