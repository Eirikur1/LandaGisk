import { getTranslations } from "next-intl/server";
// Swap to `HeroGlobeClient` to restore the D3 globe hero (static import + `<HeroGlobeClient />`).
import HeroMonkeyLottieGate from "@/components/ui/HeroMonkeyLottieGate";
import HeroSplitText from "@/components/ui/HeroSplitText";
import GameList from "@/components/ui/GameList";
import HomeLeaderboard from "@/components/ui/HomeLeaderboard";
import UserStats from "@/components/ui/UserStats";

const GAMES = [
  { slug: "flags",     titleKey: "games.flags.title",     descriptionKey: "games.flags.description",     color: "forest" as const, available: true },
  { slug: "world",     titleKey: "games.world.title",     descriptionKey: "games.world.description",     color: "amber"  as const, available: true },
  { slug: "pitch",     titleKey: "games.pitch.title",     descriptionKey: "games.pitch.description",     color: "navy"   as const, available: true },
  { slug: "color",     titleKey: "games.color.title",     descriptionKey: "games.color.description",     color: "rust"   as const, available: true },
] as const;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;
  const t = await getTranslations("home");

  return (
    <div className="relative min-h-[calc(100vh-5rem)] flex items-start overflow-x-hidden overflow-y-visible sm:items-center sm:overflow-hidden">
      {/* ASCII art — right half, absolute */}
      <HeroMonkeyLottieGate />

      {/* Left content column */}
      <div className="relative z-10 max-w-xl xl:max-w-2xl px-5 sm:px-8 py-8 sm:py-10">

        {/* Title block — Dagrun: big serif wordmark + quiet subtitle */}
        <div className="relative mb-6">
          <HeroSplitText
            as="h1"
            text={t("title")}
            className="text-[clamp(2.5rem,10vw,8rem)] font-black leading-[0.95] tracking-tight text-(--color-blue) mb-1"
            style={{ fontFamily: "var(--font-display)" }}
          />
          <HeroSplitText
            as="p"
            text={t("subtitle")}
            className="text-lg font-semibold text-(--color-muted) max-w-sm leading-relaxed"
            style={{ fontFamily: "var(--font-sans)" }}
          />
        </div>

        <GameList games={GAMES} />


        <UserStats />

        <HomeLeaderboard />
      </div>
    </div>
  );
}
