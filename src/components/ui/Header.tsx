"use client";

import React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { OptimizedAvatar } from "@/components/ui/OptimizedAvatar";
import Lottie from "lottie-react";
import monkeyAnim from "@/assets/lottie/PlainSwingingMonkey.json";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuPopup,
  NavigationMenuPositioner,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu-1";
import { User, Settings, LogOut, Trophy, Waves, Flag, Globe2, Bird, Leaf, Mountain, Dog, Car, Sprout, Palette, CalendarDays, ArrowRight, MinusCircle, Music2, Grid3x3, MapPin } from "lucide-react";
import { AiFillMeh, AiFillSmile } from "react-icons/ai";
import { BsEmojiSmileUpsideDownFill } from "react-icons/bs";
import { FaSmileWink } from "react-icons/fa";
import { FaGamepad } from "react-icons/fa6";
import {
  PiSmileyAngryFill,
  PiSmileyBlankFill,
  PiSmileyNervousFill,
  PiSmileyWinkFill,
  PiSmileyXEyesFill,
} from "react-icons/pi";
import { RiUserSmileFill } from "react-icons/ri";

/** Random home logo — picked once when the header mounts. */
const LOGO_ICONS = [
  AiFillMeh,
  AiFillSmile,
  PiSmileyAngryFill,
  FaSmileWink,
  BsEmojiSmileUpsideDownFill,
  PiSmileyNervousFill,
  PiSmileyXEyesFill,
  PiSmileyWinkFill,
  PiSmileyBlankFill,
  RiUserSmileFill,
] as const;

const menuItemVariants = {
  rest: {},
  hover: {},
};

const menuIcon = {
  rest: { rotate: 0, scale: 1, y: 0 },
  hover: {
    rotate: -14,
    scale: 1.3,
    y: -2,
    transition: { type: "spring" as const, stiffness: 380, damping: 10 },
  },
};

const menuArrow = {
  rest: { x: -4, opacity: 0 },
  hover: {
    x: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 350, damping: 22 },
  },
};

type DropdownItemProps =
  | { variant: "game" | "plain"; href: string; icon: React.ElementType; label: React.ReactNode; active?: boolean; fontFamily?: string; fontWeight?: number; onClick?: never; onClose?: () => void }
  | { variant: "destructive"; href?: never; icon: React.ElementType; label: React.ReactNode; onClick: () => void; active?: never; fontFamily?: string; fontWeight?: never; onClose?: never };

function DropdownItem({ icon: Icon, label, variant, active, fontFamily, fontWeight, onClose, ...rest }: DropdownItemProps) {
  if (variant === "destructive") {
    const { onClick } = rest as { onClick: () => void };
    return (
      <motion.div variants={menuItemVariants} initial="rest" whileHover="hover" className="w-full group">
        <button
          type="button"
          onClick={onClick}
          className="w-full flex flex-row items-center justify-between gap-2.5 rounded-sm p-2 text-sm hover:bg-red-50 transition-colors cursor-pointer"
          style={{ fontFamily }}
        >
          <span className="flex items-center gap-2.5 text-red-600 group-hover:text-red-700 transition-colors duration-200">
            <motion.span variants={menuIcon} className="inline-flex">
              <Icon size={14} />
            </motion.span>
            {label}
          </span>
          <motion.span variants={menuArrow} className="inline-flex">
            <ArrowRight size={12} className="text-red-500" />
          </motion.span>
        </button>
      </motion.div>
    );
  }

  const { href } = rest as { href: string };

  if (variant === "game") {
    return (
      <motion.div variants={menuItemVariants} initial="rest" whileHover="hover" className="w-full group">
        <NavigationMenuLink
          className="flex-row! items-center"
          render={
            <Link
              href={href}
              onClick={onClose}
              className="flex flex-row items-center justify-between gap-2.5 w-full rounded-sm p-2 text-sm hover:bg-accent transition-colors"
              style={{ fontFamily, fontWeight: active ? 700 : (fontWeight ?? 500) }}
            />
          }
        >
          <span className="flex items-center gap-2.5 group-hover:text-(--color-blue) transition-colors duration-200">
            <motion.span variants={menuIcon} className="inline-flex">
              <Icon size={14} />
            </motion.span>
            {label}
          </span>
          <motion.span variants={menuArrow} className="inline-flex">
            <ArrowRight size={12} className="text-(--color-blue)" />
          </motion.span>
        </NavigationMenuLink>
      </motion.div>
    );
  }

  return (
    <NavigationMenuLink
      className="flex-row! items-center gap-2.5"
      render={
        <Link
          href={href}
          className="flex flex-row items-center gap-2.5 w-full rounded-sm p-2 text-sm hover:bg-accent transition-colors"
          style={{ fontFamily, fontWeight }}
        />
      }
    >
      <Icon size={14} className="opacity-70" />
      {label}
    </NavigationMenuLink>
  );
}

const GAMES = [
  { href: "waterfall", titleKey: "games.waterfall.title", available: true, icon: Waves },
  { href: "flags", titleKey: "games.flags.title", available: true, icon: Flag },
  { href: "world", titleKey: "games.world.title", available: true, icon: Globe2 },
  { href: "birds", titleKey: "games.birds.title", available: false, icon: Bird },
  { href: "plants", titleKey: "games.plants.title", available: false, icon: Leaf },
  { href: "dogbreed", titleKey: "games.dogbreed.title", available: false, icon: Dog },
  { href: "car", titleKey: "games.car.title", available: false, icon: Car },
  { href: "mushroom", titleKey: "games.mushroom.title", available: true, icon: Sprout },
  { href: "color", titleKey: "games.color.title", available: true, icon: Palette },
  { href: "year", titleKey: "games.year.title", available: true, icon: CalendarDays },
  { href: "pitch", titleKey: "games.pitch.title", available: true, icon: Music2 },
  { href: "grid",  titleKey: "games.grid.title",  available: true, icon: Grid3x3 },
  { href: "territory", titleKey: "games.territory.title", available: true, icon: MapPin },
  { href: "mountains", titleKey: "games.mountains.title", available: false, icon: Mountain },
];


function HangingMonkey({ logoRef }: { logoRef: React.RefObject<HTMLAnchorElement | null> }) {
  const [left, setLeft] = React.useState<number | null>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const id = setTimeout(() => setVisible(true), 4000);
    return () => clearTimeout(id);
  }, []);

  React.useEffect(() => {
    const measure = () => {
      const el = logoRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setLeft(rect.left + rect.width / 2 + 40);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [logoRef]);

  const node = (
    <div
      className="pointer-events-none fixed w-28 h-28"
      style={{
        top: "calc(1rem + 2.75rem - 20px)",
        left: left !== null ? left : "50%",
        transform: "translateX(-50%)",
        zIndex: 49,
      }}
      aria-hidden
    >
      <Lottie
        animationData={monkeyAnim}
        loop
        autoplay
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );

  if (typeof document === "undefined" || !visible) return null;
  return createPortal(node, document.body);
}

export default function Header() {
  const locale = useLocale() as "en" | "is";
  const t = useTranslations();
  const tNav = useTranslations("nav");
  const pathname = usePathname();
  const { user, username, avatarUrl, signOut } = useAuth();
  const logoRef = React.useRef<HTMLAnchorElement>(null);
  const [gamesMenuOpen, setGamesMenuOpen] = React.useState("");
  const [LogoIcon, setLogoIcon] = React.useState<(typeof LOGO_ICONS)[number]>(() => LOGO_ICONS[0]!);
  React.useEffect(() => {
    setLogoIcon(() => LOGO_ICONS[Math.floor(Math.random() * LOGO_ICONS.length)]!);
  }, []);

  const otherLocale = locale === "en" ? "is" : "en";
  const otherLocalePath = pathname.replace(`/${locale}`, `/${otherLocale}`);

  const gamesBase = `/${locale}`;
  const allGamesPath = `${gamesBase}/games`;
  const gamesRoutes = GAMES.filter((g) => g.available).map((g) => `${gamesBase}/${g.href}`);
  const gamesHubActive =
    pathname === allGamesPath ||
    pathname.startsWith(`${allGamesPath}/`) ||
    gamesRoutes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const leaderboardPath = `${gamesBase}/leaderboard`;
  const leaderboardActive = pathname === leaderboardPath || pathname.startsWith(`${leaderboardPath}/`);
  const archivePath = `${gamesBase}/archive`;
  const archiveActive = pathname === archivePath || pathname.startsWith(`${archivePath}/`);
  const navBtnClass =
    "inline-flex h-6 max-h-6 min-h-6 items-center justify-center whitespace-nowrap text-[11px] leading-none tracking-[0.18em] uppercase transition-opacity hover:opacity-60";
  const navTriggerClass = `${navBtnClass} !h-6 !min-h-6 !max-h-6 !rounded-none !bg-transparent !px-0 !py-0 !shadow-none hover:!bg-transparent focus:!bg-transparent data-[popup-open]:!bg-transparent`;
  /** Icon-only account control: fill header row height so the glyph centers vertically (no text underline offsets). */
  const accountIconTriggerClass =
    "inline-flex h-11 min-h-11 max-h-11 w-auto items-center justify-center !rounded-none !bg-transparent !px-0 !py-0 !shadow-none hover:!bg-transparent focus:!bg-transparent data-[popup-open]:!bg-transparent";

  // Hide on auth pages
  if (pathname.includes("/auth")) return null;

  return (
    <motion.div
      className="fixed top-4 left-0 right-0 z-50 flex justify-center pointer-events-none"
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <header
        className="pointer-events-auto grid items-center px-5 h-11"
        style={{
          gridTemplateColumns: "auto 1fr auto",
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: "100px",
          boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
          minWidth: "min(600px, calc(100vw - 2rem))",
          maxWidth: "calc(100vw - 2rem)",
          gap: "20px",
        }}
      >
        {/* Logo */}
        <Link
          ref={logoRef}
          href={`/${locale}`}
          className="text-(--color-blue) flex items-center"
          aria-label="Dagrun home"
        >
          <motion.span
            className="relative block h-5 w-5 shrink-0"
            whileHover={{
              scale: 1.12,
              rotate: -8,
              transition: { type: "spring", stiffness: 420, damping: 14 },
            }}
            whileTap={{ scale: 0.92, transition: { type: "spring", stiffness: 500, damping: 18 } }}
          >
            <LogoIcon size={20} className="block" aria-hidden />
          </motion.span>
        </Link>

        {/* Center nav: Games ▾ · Leaderboard · Archive */}
        <nav className="flex items-center justify-center gap-5 sm:gap-6">
          <NavigationMenu
            className="flex-none"
            closeDelay={300}
            value={gamesMenuOpen}
            onValueChange={setGamesMenuOpen}
          >
            <NavigationMenuList aria-orientation={undefined}>
              <NavigationMenuItem>
                <NavigationMenuTrigger
                  className={navTriggerClass}
                  style={{
                    fontFamily: "var(--font-sans)",
                    color: gamesHubActive ? "var(--color-blue)" : "var(--color-muted)",
                    borderBottom: gamesHubActive ? "1px solid var(--color-blue)" : "1px solid transparent",
                    paddingBottom: "1px",
                  }}
                >
                  <span className="inline-flex h-full items-center">{tNav("games")}</span>
                </NavigationMenuTrigger>
                <NavigationMenuContent className="p-0 w-auto min-w-56">
                  <ul className="grid gap-0.5 p-1.5">
                    <li>
                      <DropdownItem
                        href={allGamesPath}
                        icon={FaGamepad}
                        label={locale === "is" ? "Allir leikir" : "All games"}
                        variant="game"
                        active={pathname === allGamesPath || pathname.startsWith(`${allGamesPath}/`)}
                        fontFamily="var(--font-sans)"
                        fontWeight={600}
                        onClose={() => setGamesMenuOpen("")}
                      />
                    </li>
                    <li className="my-1 h-px bg-border" />
                    {GAMES.map(({ href, titleKey, available, icon: GameIcon }) => {
                      const full = `/${locale}/${href}`;
                      const active = available && (pathname === full || pathname.startsWith(`${full}/`));
                      return (
                        <li key={href}>
                          {available ? (
                            <DropdownItem
                              href={full}
                              icon={GameIcon}
                              label={t(titleKey as Parameters<typeof t>[0])}
                              variant="game"
                              active={active}
                              fontFamily="var(--font-sans)"
                              onClose={() => setGamesMenuOpen("")}
                            />
                          ) : (
                            <div
                              className="flex items-center justify-between rounded-sm p-2 text-sm text-(--color-muted)"
                              style={{ fontFamily: "var(--font-sans)" }}
                            >
                              <span className="flex items-center gap-2.5">
                                <GameIcon size={14} className="opacity-60" />
                                <span>{t(titleKey as Parameters<typeof t>[0])}</span>
                              </span>
                              <MinusCircle size={13} className="opacity-40" />
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
            <NavigationMenuPositioner>
              <NavigationMenuPopup
                className="bg-white/96 backdrop-blur-xl shadow-lg outline outline-black/10"
              />
            </NavigationMenuPositioner>
          </NavigationMenu>

          <Link
            href={leaderboardPath}
            className={navBtnClass}
            style={{
              fontFamily: "var(--font-sans)",
              color: leaderboardActive ? "var(--color-blue)" : "var(--color-muted)",
              borderBottom: leaderboardActive ? "1px solid var(--color-blue)" : "1px solid transparent",
              paddingBottom: "1px",
            }}
          >
            {tNav("leaderboard")}
          </Link>

          <Link
            href={archivePath}
            className={navBtnClass}
            style={{
              fontFamily: "var(--font-sans)",
              color: archiveActive ? "var(--color-blue)" : "var(--color-muted)",
              borderBottom: archiveActive ? "1px solid var(--color-blue)" : "1px solid transparent",
              paddingBottom: "1px",
            }}
          >
            {tNav("archive")}
          </Link>
        </nav>

        {/* Right: Account dropdown */}
        <div className="flex h-full min-h-0 self-stretch items-center justify-end">
          <NavigationMenu className="flex h-full flex-none items-center">
            <NavigationMenuList className="h-full items-center" aria-orientation={undefined}>
              <NavigationMenuItem className="flex h-full items-center">
                <NavigationMenuTrigger
                  hideChevron
                  aria-label={tNav("accountMenu")}
                  className={accountIconTriggerClass}
                  style={{
                    fontFamily: "var(--font-sans)",
                    color: "var(--color-muted)",
                  }}
                >
                  <span className="flex size-6 items-center justify-center">
                    {user && avatarUrl ? (
                      <OptimizedAvatar
                        src={avatarUrl}
                        alt=""
                        width={24}
                        height={24}
                        className="size-6 rounded-full object-cover ring-1 ring-black/10"
                      />
                    ) : user ? (
                      <span
                        className="size-6 rounded-full flex items-center justify-center font-black text-[9px] text-white bg-(--color-blue) ring-1 ring-black/10"
                        style={{ fontFamily: "var(--font-sans)" }}
                        aria-hidden
                      >
                        {(username ?? user.email ?? "?").slice(0, 2).toUpperCase()}
                      </span>
                    ) : (
                      <User className="size-[18px] text-(--color-muted)" strokeWidth={1.75} aria-hidden />
                    )}
                  </span>
                </NavigationMenuTrigger>
                <NavigationMenuContent className="p-0 w-auto min-w-56">
                  <ul className="grid gap-0.5 p-1.5">
                    <li>
                      <DropdownItem
                        href={otherLocalePath}
                        icon={() => (
                          <Image
                            src={locale === "en" ? "/flags/is.svg" : "/flags/gb.svg"}
                            alt=""
                            width={14}
                            height={14}
                            className="rounded-sm"
                          />
                        )}
                        label={otherLocale.toUpperCase()}
                        variant="plain"
                        fontFamily="var(--font-sans)"
                      />
                    </li>
                    {user ? (
                      <>
                        <li className="my-1 h-px bg-border" />
                        <li className="px-2 py-1">
                          <p className="text-xs text-muted-foreground">Signed in as</p>
                          <p className="text-sm font-semibold text-foreground truncate">{username ?? user.email}</p>
                        </li>
                        <li className="my-1 h-px bg-border" />
                        <li>
                          <DropdownItem href={`/${locale}/account`} icon={Settings} label={tNav("profile")} variant="game" fontFamily="var(--font-sans)" />
                        </li>
                        <li>
                          <DropdownItem href={`/${locale}/leaderboard`} icon={Trophy} label="Leaderboard" variant="game" fontFamily="var(--font-sans)" />
                        </li>
                        <li className="my-1 h-px bg-border" />
                        <li>
                          <DropdownItem icon={LogOut} label="Sign out" variant="destructive" onClick={() => void signOut()} fontFamily="var(--font-sans)" />
                        </li>
                      </>
                    ) : (
                      <>
                        <li className="my-1 h-px bg-border" />
                        <li>
                          <DropdownItem
                            href={`/${locale}/auth`}
                            icon={User}
                            label="Sign in"
                            variant="game"
                            fontFamily="var(--font-sans)"
                            fontWeight={600}
                          />
                        </li>
                      </>
                    )}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
            <NavigationMenuPositioner sideOffset={6}>
              <NavigationMenuPopup className="bg-white/96 backdrop-blur-xl shadow-lg outline outline-black/10" />
            </NavigationMenuPositioner>
          </NavigationMenu>
        </div>
      </header>

      {/* Monkey hanging below the navbar */}
      <HangingMonkey logoRef={logoRef} />
    </motion.div>
  );
}
