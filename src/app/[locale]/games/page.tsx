import { getTranslations } from "next-intl/server";
import GameCard from "@/components/ui/GameCard";

const ALL_GAMES = [
  { slug: "waterfall", titleKey: "games.waterfall.title", descriptionKey: "games.waterfall.description", color: "navy"   as const, available: true  },
  { slug: "flags",     titleKey: "games.flags.title",     descriptionKey: "games.flags.description",     color: "forest" as const, available: true  },
  { slug: "world",     titleKey: "games.world.title",     descriptionKey: "games.world.description",     color: "amber"  as const, available: true  },
  { slug: "birds",     titleKey: "games.birds.title",     descriptionKey: "games.birds.description",     color: "forest" as const, available: false },
  { slug: "plants",    titleKey: "games.plants.title",    descriptionKey: "games.plants.description",    color: "rust"   as const, available: false },
  { slug: "mountains", titleKey: "games.mountains.title", descriptionKey: "games.mountains.description", color: "navy"   as const, available: false },
];

export default async function GamesPage() {
  const t = await getTranslations("home");

  const available = ALL_GAMES.filter((g) => g.available);
  const comingSoon = ALL_GAMES.filter((g) => !g.available);

  return (
    <div className="max-w-xl px-8 pt-10 pb-16">

      <div className="mb-10">
        <h1
          className="text-[clamp(2.5rem,8vw,4rem)] font-black leading-[0.95] tracking-tight text-(--color-blue) mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("seeAllGames").replace(" →", "")}
        </h1>
        <p className="text-sm text-(--color-muted)" style={{ fontFamily: "var(--font-sans)" }}>
          {available.length} games available · {comingSoon.length} coming soon
        </p>
      </div>

      {/* Available */}
      <div className="border-t border-(--color-border)">
        <p
          className="text-[10px] tracking-[0.25em] uppercase text-(--color-muted) pt-5 pb-1"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          Available now
        </p>
        {available.map((game, i) => (
          <GameCard key={game.slug} {...game} index={i} />
        ))}
      </div>

      {/* Coming soon */}
      <div className="border-t border-(--color-border) mt-4">
        <p
          className="text-[10px] tracking-[0.25em] uppercase text-(--color-muted) pt-5 pb-1"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          {t("comingSoon")}
        </p>
        {comingSoon.map((game, i) => (
          <GameCard key={game.slug} {...game} index={i} />
        ))}
      </div>

    </div>
  );
}
