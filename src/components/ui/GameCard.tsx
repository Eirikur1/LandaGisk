"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { TbDroplet, TbFlag3, TbWorld, TbArrowUpRight } from "react-icons/tb";
import type { IconType } from "react-icons";

type GameColor = "navy" | "forest" | "amber" | "rust";

const gameIcons: Record<string, IconType> = {
  waterfall: TbDroplet,
  flags:     TbFlag3,
  world:     TbWorld,
};

const gameTags: Record<string, string[]> = {
  waterfall: ["Iceland", "Nature", "Daily"],
  flags:     ["World",   "Flags",  "Daily"],
  world:     ["World",   "Geography", "Daily"],
};

type GameCardProps = {
  slug: string;
  titleKey: string;
  descriptionKey: string;
  color: GameColor;
  available?: boolean;
  index?: number;
};

export default function GameCard({
  slug,
  titleKey,
  descriptionKey,
  available = true,
  index = 0,
}: GameCardProps) {
  const locale = useLocale();
  const t = useTranslations();
  const Icon = gameIcons[slug] ?? TbWorld;
  const tags = gameTags[slug] ?? [];

  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25, ease: "easeOut" }}
      className="group flex items-start justify-between gap-4 py-6 border-b border-(--color-border)"
      style={{ opacity: available ? 1 : 0.4, cursor: available ? "pointer" : "default" }}
    >
      {/* Left: icon + content */}
      <div className="flex items-start gap-4 min-w-0">
        <div className="mt-1 shrink-0">
          <Icon size={15} className="text-(--color-muted) group-hover:text-(--color-blue) transition-colors" />
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap mb-2">
            <h3
              className="text-xl font-bold text-(--color-foreground) group-hover:text-(--color-blue) transition-colors leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t(titleKey as Parameters<typeof t>[0])}
            </h3>
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full shrink-0"
                style={{ background: "var(--color-tag)", color: "var(--color-muted)" }}
              >
                {tag}
              </span>
            ))}
          </div>
          <p className="text-sm text-(--color-muted) leading-relaxed">
            {t(descriptionKey as Parameters<typeof t>[0])}
          </p>
        </div>
      </div>

      {/* Arrow */}
      <div className="shrink-0 pt-1">
        {available ? (
          <TbArrowUpRight size={17} className="text-(--color-muted) group-hover:text-(--color-blue) transition-colors" />
        ) : (
          <span className="text-[10px] font-semibold tracking-wide text-(--color-muted)">
            {t("home.comingSoon")}
          </span>
        )}
      </div>
    </motion.div>
  );

  if (!available) return inner;
  return <Link href={`/${locale}/${slug}`}>{inner}</Link>;
}
