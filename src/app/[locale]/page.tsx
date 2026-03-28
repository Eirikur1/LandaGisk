import { getTranslations } from "next-intl/server";
import HeroGlobe from "@/components/ui/HeroGlobe";
import HeroSplitText from "@/components/ui/HeroSplitText";
import GameList from "@/components/ui/GameList";
import HomeLeaderboard from "@/components/ui/HomeLeaderboard";

const GAMES = [
  { slug: "waterfall", titleKey: "games.waterfall.title", descriptionKey: "games.waterfall.description", color: "navy"   as const, available: true },
  { slug: "flags",     titleKey: "games.flags.title",     descriptionKey: "games.flags.description",     color: "forest" as const, available: true },
  { slug: "world",     titleKey: "games.world.title",     descriptionKey: "games.world.description",     color: "amber"  as const, available: true },
] as const;

function getTodayStringByLocale(locale: "en" | "is") {
  const dateLocale = locale === "is" ? "is-IS" : "en-US";
  return new Intl.DateTimeFormat(dateLocale, {
    weekday: "short",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const currentLocale = locale === "is" ? "is" : "en";
  const t = await getTranslations("home");

  return (
    <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden">
      {/* ASCII art — right half, absolute */}
      <HeroGlobe />

      {/* Left content column */}
      <div className="relative z-10 max-w-xl px-8 pt-2 pb-10">

        {/* Title block — Dagrun: big serif wordmark + quiet subtitle */}
        <div className="mb-12">
          <HeroSplitText
            as="h1"
            text={t("title")}
            className="text-[clamp(3.25rem,10vw,5.5rem)] font-black leading-[0.95] tracking-tight text-(--color-blue) mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          />
          <HeroSplitText
            as="p"
            text={t("subtitle")}
            className="text-sm text-(--color-muted) max-w-sm leading-relaxed"
            style={{ fontFamily: "var(--font-sans)" }}
          />
          <p
            className="text-[10px] tracking-[0.25em] text-(--color-muted) mt-6 opacity-80"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {getTodayStringByLocale(currentLocale)}
          </p>
        </div>

        <GameList games={GAMES} />


        {/* Stats — wide tracking labels like reference */}
        <div className="mt-6 pt-4 grid grid-cols-3 gap-6">
          {(
            [
              { id: "daily", msgKey: "statDailyStreak" as const, value: "0" },
              { id: "xp", msgKey: "statTotalXp" as const, value: "0" },
              { id: "rank", msgKey: "statRankOverall" as const, value: "—" },
            ] as const
          ).map(({ id, msgKey, value }) => (
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

        <HomeLeaderboard />
      </div>
    </div>
  );
}
