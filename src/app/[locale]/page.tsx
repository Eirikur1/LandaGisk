import { useTranslations } from "next-intl";
import GameCard from "@/components/ui/GameCard";
import AsciiArt from "@/components/ui/AsciiArt";

const GAMES = [
  { slug: "waterfall", titleKey: "games.waterfall.title", descriptionKey: "games.waterfall.description", color: "navy"   as const, available: true  },
  { slug: "flags",     titleKey: "games.flags.title",     descriptionKey: "games.flags.description",     color: "forest" as const, available: true  },
  { slug: "world",     titleKey: "games.world.title",     descriptionKey: "games.world.description",     color: "amber"  as const, available: true  },
] as const;

function getTodayString() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export default function HomePage() {
  const t = useTranslations("home");

  return (
    <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden">
      {/* ASCII art — right half, absolute */}
      <AsciiArt />

      {/* Left content column */}
      <div className="relative z-10 max-w-xl px-8 py-10">

        {/* Title block — Landly: big serif wordmark + quiet subtitle */}
        <div className="mb-12">
          <h1
            className="text-[clamp(3.25rem,10vw,5.5rem)] font-black leading-[0.95] tracking-tight text-(--color-blue) mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("title")}
          </h1>
          <p
            className="text-sm text-(--color-muted) max-w-sm leading-relaxed"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {t("subtitle")}
          </p>
          <p
            className="text-[10px] tracking-[0.25em] uppercase text-(--color-muted) mt-6 opacity-80"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {getTodayString()}
          </p>
        </div>

        {/* Game list */}
        <div className="border-t border-(--color-border)">
          {GAMES.map((game, i) => (
            <GameCard key={game.slug} {...game} index={i} />
          ))}
        </div>

        {/* Stats — wide tracking labels like reference */}
        <div className="mt-12 pt-8 border-t border-(--color-border) grid grid-cols-3 gap-6">
          {[
            { label: "Day streak",  value: "0" },
            { label: "Total XP",    value: "0" },
            { label: "Best streak", value: "—" },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-1.5">
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
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
