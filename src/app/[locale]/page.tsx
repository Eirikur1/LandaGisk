import { getTranslations } from "next-intl/server";
// Swap to `HeroGlobeClient` to restore the D3 globe hero (static import + `<HeroGlobeClient />`).
import HeroMonkeyLottieGate from "@/components/ui/HeroMonkeyLottieGate";
import HeroSplitText from "@/components/ui/HeroSplitText";
import GameList from "@/components/ui/GameList";
import HomeLeaderboard from "@/components/ui/HomeLeaderboard";
import UserStats from "@/components/ui/UserStats";

const GAMES = [
  { slug: "waterfall", titleKey: "games.waterfall.title", descriptionKey: "games.waterfall.description", color: "navy"   as const, available: true },
  { slug: "flags",     titleKey: "games.flags.title",     descriptionKey: "games.flags.description",     color: "forest" as const, available: true },
  { slug: "world",     titleKey: "games.world.title",     descriptionKey: "games.world.description",     color: "amber"  as const, available: true },
  { slug: "mushroom",  titleKey: "games.mushroom.title",  descriptionKey: "games.mushroom.description",  color: "forest" as const, available: true },
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
      <HeroMonkeyLottieGate />

      {/* Left content column */}
      <div className="relative z-10 max-w-xl xl:max-w-2xl px-8 pt-2 pb-10">

        {/* Title block — Dagrun: big serif wordmark + quiet subtitle */}
        <div className="relative mb-12">
          <HeroSplitText
            as="h1"
            text={t("title")}
            className="text-[clamp(3.25rem,10vw,8rem)] font-black leading-[0.95] tracking-tight text-(--color-blue) mb-4"
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


        <UserStats />

        <HomeLeaderboard />
      </div>
    </div>
  );
}
