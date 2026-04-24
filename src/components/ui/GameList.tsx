"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import GameCard from "@/components/ui/GameCard";
import GameCardMobile from "@/components/ui/GameCardMobile";

type Game = {
  slug: string;
  titleKey: string;
  descriptionKey: string;
  color: "navy" | "forest" | "amber" | "rust";
  available: boolean;
};

export default function GameList({ games }: { games: readonly Game[] }) {
  const locale = useLocale();
  const t = useTranslations("home");

  return (
    <div className="border-t border-(--color-border)">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between pt-5 pb-1"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <h2
          className="text-4xl font-bold tracking-widest"
          style={{ fontFamily: "var(--font-jersey10)", color: "var(--color-blue)" }}
        >
          {t("topGamesThisWeek")}
        </h2>
      </motion.div>

      <div className="sm:hidden flex flex-col">
        {games.map((game, i) => (
          <GameCardMobile key={game.slug} {...game} index={i} />
        ))}
      </div>
      <div className="hidden sm:block">
        {games.map((game, i) => (
          <GameCard key={game.slug} {...game} index={i} />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="pt-3 pb-1"
      >
        <motion.div whileHover={{ x: 6 }} transition={{ type: "spring", stiffness: 400, damping: 20 }} className="inline-block">
          <Link
            href={`/${locale}/games`}
            className="text-[11px] tracking-[0.18em] uppercase font-semibold"
            style={{ color: "var(--color-foreground)", fontFamily: "var(--font-sans)" }}
          >
            {t("seeAllGames")}
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
