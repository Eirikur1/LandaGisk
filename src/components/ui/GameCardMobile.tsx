"use client";

import Link from "next/link";
import Image, { StaticImageData } from "next/image";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

import waterfallIcon from "@/assets/lottie/ApaBiz_icons/waterfall.svg";
import flagsIcon from "@/assets/lottie/ApaBiz_icons/FlagGuess.svg";
import worldIcon from "@/assets/lottie/ApaBiz_icons/CountryGuess.svg";
import mushroomIcon from "@/assets/lottie/ApaBiz_icons/plant Id.svg";
import colorIcon from "@/assets/lottie/ApaBiz_icons/colormatchnew.svg";
import pitchIcon from "@/assets/lottie/ApaBiz_icons/PitchMatch.svg";
import gridIcon from "@/assets/lottie/ApaBiz_icons/GridGuesser.svg";
import territoryIcon from "@/assets/lottie/ApaBiz_icons/FlagGuess.svg";
import yearIcon from "@/assets/lottie/ApaBiz_icons/icon.svg";
import birdsIcon from "@/assets/lottie/ApaBiz_icons/Bird Spotter.svg";
import plantsIcon from "@/assets/lottie/ApaBiz_icons/plant Id.svg";
import carIcon from "@/assets/lottie/ApaBiz_icons/Car Guess.svg";
import mountainsIcon from "@/assets/lottie/ApaBiz_icons/peakFInder.svg";
import dogIcon from "@/assets/lottie/ApaBiz_icons/Dog.svg";

type GameColor = "navy" | "forest" | "amber" | "rust";

const gameIcons: Record<string, StaticImageData> = {
  waterfall: waterfallIcon,
  flags: flagsIcon,
  world: worldIcon,
  mushroom: mushroomIcon,
  color: colorIcon,
  pitch: pitchIcon,
  grid: gridIcon,
  territory: territoryIcon,
  year: yearIcon,
  birds: birdsIcon,
  plants: plantsIcon,
  car: carIcon,
  mountains: mountainsIcon,
  dogbreed: dogIcon,
};

const gameTags: Record<string, string[]> = {
  waterfall: ["Iceland", "Nature",    "Daily"],
  flags:     ["World",   "Flags",     "Daily"],
  world:     ["World",   "Geography", "Daily"],
  birds:     ["Nature",  "Wildlife",  "Daily"],
  plants:    ["Nature",  "Botany",    "Daily"],
  dogbreed:  ["Animals", "Breeds",    "Daily"],
  car:       ["Cars",    "Models",    "Daily"],
  mushroom:  ["Nature",  "Fungi",     "Daily"],
  mountains: ["Nature",  "Geography", "Daily"],
  territory: ["World",   "Flags",     "Daily"],
};

const card = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
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

type GameCardMobileProps = {
  slug: string;
  titleKey: string;
  descriptionKey: string;
  color: GameColor;
  available?: boolean;
  index?: number;
};

export default function GameCardMobile({
  slug,
  titleKey,
  descriptionKey,
  available = true,
  index = 0,
}: GameCardMobileProps) {
  const locale = useLocale();
  const t = useTranslations();
  const icon = gameIcons[slug];
  const tags = gameTags[slug] ?? [];

  const inner = (
    <motion.div
      variants={card}
      initial="initial"
      animate="animate"
      transition={{ delay: index * 0.07, duration: 0.28, ease: "easeOut" }}
      className={`flex items-center justify-between gap-4 px-4 py-4 rounded-2xl border border-(--color-border) mb-3${available ? "" : " opacity-40"}`}
      style={{ cursor: available ? "pointer" : "default", background: "var(--color-surface)" }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0">
          {icon && (
            <Image src={icon} alt="" width={20} height={20} className="filter-[invert(24%)_sepia(94%)_saturate(2000%)_hue-rotate(214deg)_brightness(90%)_contrast(110%)]" />
          )}
        </div>
        <h3
          className="text-base font-bold text-(--color-foreground) leading-tight truncate"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t(titleKey as Parameters<typeof t>[0])}
        </h3>
      </div>

      <div className="shrink-0">
        {available ? (
          <ArrowRight size={18} className="text-(--color-blue)" strokeWidth={2} />
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
