import { getTranslations } from "next-intl/server";
import GameCard from "@/components/ui/GameCard";
import GameCardMobile from "@/components/ui/GameCardMobile";
import HeroAbyssClient from "@/components/ui/HeroAbyssClient";

const ALL_GAMES = [
  { slug: "flags",     titleKey: "games.flags.title",     descriptionKey: "games.flags.description",     color: "forest" as const, available: true  },
  { slug: "world",     titleKey: "games.world.title",     descriptionKey: "games.world.description",     color: "amber"  as const, available: true  },
  { slug: "mushroom",  titleKey: "games.mushroom.title",  descriptionKey: "games.mushroom.description",  color: "forest" as const, available: true  },
  { slug: "color",    titleKey: "games.color.title",    descriptionKey: "games.color.description",    color: "rust"   as const, available: true  },
  { slug: "pitch",    titleKey: "games.pitch.title",    descriptionKey: "games.pitch.description",    color: "navy"   as const, available: true  },
  { slug: "grid",     titleKey: "games.grid.title",     descriptionKey: "games.grid.description",     color: "forest" as const, available: true  },
  { slug: "year",      titleKey: "games.year.title",      descriptionKey: "games.year.description",      color: "navy"   as const, available: true  },
  { slug: "territory", titleKey: "games.territory.title", descriptionKey: "games.territory.description", color: "rust"   as const, available: true  },
  { slug: "language",  titleKey: "games.language.title",  descriptionKey: "games.language.description",  color: "amber"  as const, available: true  },
  { slug: "waterfall", titleKey: "games.waterfall.title", descriptionKey: "games.waterfall.description", color: "navy"   as const, available: false },
  { slug: "birds",     titleKey: "games.birds.title",     descriptionKey: "games.birds.description",     color: "forest" as const, available: false },
  { slug: "plants",    titleKey: "games.plants.title",    descriptionKey: "games.plants.description",    color: "rust"   as const, available: false },
  { slug: "dogbreed",  titleKey: "games.dogbreed.title",  descriptionKey: "games.dogbreed.description",  color: "amber"  as const, available: false },
  { slug: "car",       titleKey: "games.car.title",       descriptionKey: "games.car.description",       color: "navy"   as const, available: false },
  { slug: "mountains", titleKey: "games.mountains.title", descriptionKey: "games.mountains.description", color: "navy"   as const, available: false },
];

export default async function GamesPage() {
  const t = await getTranslations("home");

  const available = ALL_GAMES.filter((g) => g.available);
  const comingSoon = ALL_GAMES.filter((g) => !g.available);

  return (
    <div className="relative z-40 min-h-[calc(100vh-5rem)]">
      <HeroAbyssClient />
    <div className="relative z-10 max-w-xl px-8 pt-10 pb-16">

      <div className="mb-10">
        <h1
          className="text-[clamp(2.5rem,8vw,4rem)] font-black leading-[0.95] tracking-tight text-(--color-blue) mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          All games
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
        <div className="sm:hidden flex flex-col pt-2">
          {available.map((game, i) => (
            <GameCardMobile key={game.slug} {...game} index={i} />
          ))}
        </div>
        <div className="hidden sm:block">
          {available.map((game, i) => (
            <GameCard key={game.slug} {...game} index={i} />
          ))}
        </div>
      </div>

      {/* Coming soon */}
      <div className="border-t border-(--color-border) mt-4">
        <p
          className="text-[10px] tracking-[0.25em] uppercase text-(--color-muted) mt-5 mb-1 w-fit px-2 py-1 border border-(--color-border) rounded-md bg-(--color-background)"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          {t("comingSoon")}
        </p>
        <div className="sm:hidden flex flex-col pt-2">
          {comingSoon.map((game, i) => (
            <GameCardMobile key={game.slug} {...game} index={i} />
          ))}
        </div>
        <div className="hidden sm:block">
          {comingSoon.map((game, i) => (
            <GameCard key={game.slug} {...game} index={i} />
          ))}
        </div>
      </div>

    </div>
    </div>
  );
}
