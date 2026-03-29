"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { TbDroplet, TbFlag3, TbWorld, TbArrowRight, TbFeather, TbLeaf, TbMountain } from "react-icons/tb";
import type { IconType } from "react-icons";

type GameColor = "navy" | "forest" | "amber" | "rust";

const gameIcons: Record<string, IconType> = {
  waterfall: TbDroplet,
  flags:     TbFlag3,
  world:     TbWorld,
  birds:     TbFeather,
  plants:    TbLeaf,
  mountains: TbMountain,
};

const gameTags: Record<string, string[]> = {
  waterfall: ["Iceland", "Nature",    "Daily"],
  flags:     ["World",   "Flags",     "Daily"],
  world:     ["World",   "Geography", "Daily"],
  birds:     ["Nature",  "Wildlife",  "Daily"],
  plants:    ["Nature",  "Botany",    "Daily"],
  mountains: ["Nature",  "Geography", "Daily"],
};

// ── Variants ───────────────────────────────────────────────────────────────

const card = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  hover:   { x: 5 },
};

const leftIcon = {
  animate: { rotate: 0, scale: 1, y: 0 },
  hover: {
    rotate: -14,
    scale: 1.3,
    y: -3,
    transition: { type: "spring" as const, stiffness: 380, damping: 10 },
  },
};

const rightArrow = {
  animate: { x: 0, opacity: 0.4 },
  hover: {
    x: 5,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 350, damping: 22 },
  },
};

// ── Component ──────────────────────────────────────────────────────────────

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
      variants={card}
      initial="initial"
      animate="animate"
      whileHover={available ? "hover" : undefined}
      transition={{ delay: index * 0.07, duration: 0.28, ease: "easeOut" }}
      className="group flex items-start justify-between gap-4 py-6 border-b border-(--color-border)"
      style={{ opacity: available ? 1 : 0.4, cursor: available ? "pointer" : "default" }}
    >
      {/* Left: icon + content */}
      <div className="flex items-start gap-4 min-w-0">
        {/* Animated game-type icon */}
        <motion.div variants={leftIcon} className="mt-1 shrink-0">
          <Icon
            size={16}
            className="text-(--color-muted) group-hover:text-(--color-blue) transition-colors duration-200"
          />
        </motion.div>

        <div className="min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap mb-2">
            <h3
              className="text-xl font-bold text-(--color-foreground) group-hover:text-(--color-blue) transition-colors duration-200 leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t(titleKey as Parameters<typeof t>[0])}
            </h3>
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full shrink-0"
                style={{ background: "var(--color-tag)", color: "var(--color-tag-text)" }}
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

      {/* Right: animated arrow */}
      <div className="shrink-0 pt-1">
        {available ? (
          <motion.div variants={rightArrow}>
            <TbArrowRight
              size={20}
              className="text-(--color-blue)"
              strokeWidth={2}
            />
          </motion.div>
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
