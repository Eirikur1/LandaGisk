"use client";

import React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image, { type StaticImageData } from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { OptimizedAvatar } from "@/components/ui/OptimizedAvatar";
import dynamic from "next/dynamic";
import monoIcon from "@/assets/lottie/MonoIcon.svg";

const Lottie = dynamic(() => import("lottie-react").then((m) => m.default), {
  ssr: false,
  loading: () => null,
});
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
import { User, Settings, LogOut, Trophy, ArrowRight, MinusCircle } from "lucide-react";
import flagsIcon from "@/assets/lottie/ApaBiz_icons/FlagGuess.svg";
import worldIcon from "@/assets/lottie/ApaBiz_icons/CountryGuess.svg";
import mushroomIcon from "@/assets/lottie/ApaBiz_icons/plant Id.svg";
import colorIcon from "@/assets/lottie/ApaBiz_icons/colormatchnew.svg";
import allGamesIcon from "@/assets/lottie/ApaBiz_icons/Games.svg";
import pitchIcon from "@/assets/lottie/ApaBiz_icons/PitchMatch.svg";
import gridIcon from "@/assets/lottie/ApaBiz_icons/GridGuesser.svg";
import territoryIcon from "@/assets/lottie/ApaBiz_icons/FlagGuess.svg";
import yearIcon from "@/assets/lottie/ApaBiz_icons/icon.svg";


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

type MenuDropdownIcon = React.ComponentType<{ size?: number; className?: string }>;
type MenuIconProps = { size?: number; className?: string };

type DropdownItemProps =
  | { variant: "game" | "plain"; href: string; icon: MenuDropdownIcon; label: React.ReactNode; active?: boolean; fontFamily?: string; fontWeight?: number; onClick?: never; onClose?: () => void }
  | { variant: "destructive"; href?: never; icon: MenuDropdownIcon; label: React.ReactNode; onClick: () => void; active?: never; fontFamily?: string; fontWeight?: never; onClose?: never };

function DropdownItem({ icon: Icon, label, variant, active, fontFamily, fontWeight, onClose, ...rest }: DropdownItemProps) {
  if (variant === "destructive") {
    const { onClick } = rest as { onClick: () => void };
    return (
      <motion.div variants={menuItemVariants} initial="rest" whileHover="hover" className="w-full group">
        <button
          type="button"
          onClick={onClick}
          className="w-full flex flex-row items-center justify-between gap-2.5 rounded-sm p-2 hover:bg-red-50 transition-colors cursor-pointer"
          style={{ fontFamily, fontSize: "16px" }}
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
              className="flex flex-row items-center justify-between gap-2.5 w-full rounded-sm p-2 hover:bg-accent transition-colors"
              style={{ fontFamily, fontSize: "16px", fontWeight: active ? 700 : (fontWeight ?? 500) }}
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
          className="flex flex-row items-center gap-2.5 w-full rounded-sm p-2 hover:bg-accent transition-colors"
          style={{ fontFamily, fontSize: "16px", fontWeight }}
        />
      }
    >
      <Icon size={14} className="opacity-70" />
      {label}
    </NavigationMenuLink>
  );
}

function SvgIcon({
  src,
  size = 14,
  className,
}: {
  src: StaticImageData;
  size?: number;
  className?: string;
}) {
  return <Image src={src} alt="" width={size} height={size} className={className} />;
}

const GAMES = [
  { href: "flags",     titleKey: "games.flags.title",     available: true, icon: (p: MenuIconProps) => <SvgIcon src={flagsIcon} {...p} /> },
  { href: "world",     titleKey: "games.world.title",     available: true, icon: (p: MenuIconProps) => <SvgIcon src={worldIcon} {...p} /> },
  { href: "mushroom",  titleKey: "games.mushroom.title",  available: true, icon: (p: MenuIconProps) => <SvgIcon src={mushroomIcon} {...p} /> },
  { href: "color",     titleKey: "games.color.title",     available: true, icon: (p: MenuIconProps) => <SvgIcon src={colorIcon} {...p} /> },
  { href: "year",      titleKey: "games.year.title",      available: true, icon: (p: MenuIconProps) => <SvgIcon src={yearIcon} {...p} /> },
  { href: "pitch",     titleKey: "games.pitch.title",     available: true, icon: (p: MenuIconProps) => <SvgIcon src={pitchIcon} {...p} /> },
  { href: "grid",      titleKey: "games.grid.title",      available: true, icon: (p: MenuIconProps) => <SvgIcon src={gridIcon} {...p} /> },
  { href: "territory", titleKey: "games.territory.title", available: true, icon: (p: MenuIconProps) => <SvgIcon src={territoryIcon} {...p} /> },
  { href: "language",  titleKey: "games.language.title",  available: true, icon: (p: MenuIconProps) => <SvgIcon src={allGamesIcon} {...p} /> },
];


type MonkeyInstance = {
  id: number;
  left: number;
  anim: object;
  duration: number;
};

function HangingMonkey({ logoRef }: { logoRef: React.RefObject<HTMLAnchorElement | null> }) {
  const [mounted, setMounted] = React.useState(false);
  const [navbarLeft, setNavbarLeft] = React.useState<number | null>(null);
  const [navbarRight, setNavbarRight] = React.useState<number | null>(null);
  const [monkeys, setMonkeys] = React.useState<MonkeyInstance[]>([]);
  const nextId = React.useRef(0);
  const animsRef = React.useRef<{ plain: object; swingIn: object } | null>(null);

  React.useEffect(() => { setMounted(true); }, []);

  // Measure the navbar pill edges so monkeys stay within them
  React.useEffect(() => {
    const measure = () => {
      const el = logoRef.current;
      if (!el) return;
      const navbar = el.closest("header");
      if (!navbar) return;
      const rect = navbar.getBoundingClientRect();
      setNavbarLeft(rect.left + 56);   // a bit inset from the left edge
      setNavbarRight(rect.right - 56); // a bit inset from the right edge
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [logoRef]);

  // Spawn monkeys on intervals after an initial delay
  React.useEffect(() => {
    if (navbarLeft === null || navbarRight === null) return;

    const timeoutIds = new Set<ReturnType<typeof setTimeout>>();
    let cancelled = false;

    const track = (id: ReturnType<typeof setTimeout>) => { timeoutIds.add(id); return id; };

    const spawn = async () => {
      if (cancelled) return;
      if (!animsRef.current) {
        const [plain, swingIn] = await Promise.all([
          import("@/assets/lottie/PlainSwingingMonkey.json").then((m) => m.default),
          import("@/assets/lottie/SwingInMonkey.json").then((m) => m.default),
        ]);
        animsRef.current = { plain, swingIn };
      }
      if (cancelled) return;
      const { plain, swingIn } = animsRef.current;
      const left = navbarLeft + Math.random() * (navbarRight - navbarLeft);
      const isSwing = Math.random() < 0.5;
      const anim = isSwing ? swingIn : plain;
      const duration = isSwing ? 5000 : 11110;
      const id = nextId.current++;
      setMonkeys((prev) => [...prev, { id, left, anim, duration }]);

      // Wait for animation to finish, then remove and schedule next spawn
      const gap = 6000 + Math.random() * 8000;
      track(setTimeout(() => {
        setMonkeys((prev) => prev.filter((m) => m.id !== id));
        if (!cancelled) track(setTimeout(spawn, gap));
      }, duration));
    };

    // Initial delay before first monkey
    track(setTimeout(spawn, 4000));
    return () => {
      cancelled = true;
      timeoutIds.forEach(clearTimeout);
      setMonkeys([]);
    };
  }, [navbarLeft, navbarRight]);

  if (!mounted) return null;

  return createPortal(
    <>
      {monkeys.map((m) => (
        <div
          key={m.id}
          className="pointer-events-none fixed w-28 h-28 hidden sm:block"
          style={{
            top: "calc(1rem + 2.75rem - 20px)",
            left: m.left,
            transform: "translateX(-50%)",
            zIndex: 49,
          }}
          aria-hidden
        >
          <Lottie animationData={m.anim} loop={m.duration === 11110} autoplay style={{ width: "100%", height: "100%" }} />
        </div>
      ))}
    </>,
    document.body
  );
}

export default function Header() {
  const locale = useLocale() as "en" | "is";
  const t = useTranslations();
  const tNav = useTranslations("nav");
  const pathname = usePathname();
  const { user, username, avatarUrl, signOut } = useAuth();
  const logoRef = React.useRef<HTMLAnchorElement>(null);
  const [gamesMenuOpen, setGamesMenuOpen] = React.useState("");
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
    "inline-flex h-6 max-h-6 min-h-6 items-center justify-center whitespace-nowrap text-[12px] sm:text-[15px] leading-none tracking-[0.12em] sm:tracking-[0.18em] uppercase transition-opacity hover:opacity-60";
  const navTriggerClass = `${navBtnClass} !h-6 !min-h-6 !max-h-6 !rounded-none !bg-transparent !px-0 !py-0 !shadow-none hover:!bg-transparent focus:!bg-transparent data-[popup-open]:!bg-transparent`;
  /** Icon-only account control: fill header row height so the glyph centers vertically (no text underline offsets). */
  const accountIconTriggerClass =
    "inline-flex h-11 min-h-11 max-h-11 w-auto items-center justify-center !rounded-none !bg-transparent !px-0 !py-0 !shadow-none hover:!bg-transparent focus:!bg-transparent data-[popup-open]:!bg-transparent";

  React.useEffect(() => {
    setGamesMenuOpen("");
  }, [pathname]);

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
        className="pointer-events-auto grid items-center px-3 sm:px-5 h-11"
        style={{
          gridTemplateColumns: "auto 1fr auto",
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: "100px",
          boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
          minWidth: "min(480px, calc(100vw - 2rem))",
          maxWidth: "calc(100vw - 2rem)",
          gap: "20px",
        }}
      >
        {/* Logo */}
        <Link
          ref={logoRef}
          href={`/${locale}`}
          className="text-(--color-blue) flex items-center self-stretch"
          aria-label="ApaBiz home"
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
            <Image src={monoIcon} alt="" width={20} height={20} className="block" style={{ transform: "translateY(-3px)" }} aria-hidden />
          </motion.span>
        </Link>

        {/* Center nav: Games ▾ · Leaderboard · Archive */}
        <nav className="flex items-center justify-center gap-3 sm:gap-5 md:gap-6">
          <NavigationMenu
            className="flex-none flex items-center"
            closeDelay={300}
            value={gamesMenuOpen}
            onValueChange={setGamesMenuOpen}
          >
            <NavigationMenuList aria-orientation={undefined} className="flex items-center">
              <NavigationMenuItem className="flex items-center">
                <NavigationMenuTrigger
                  className={navTriggerClass}
                  style={{
                    fontFamily: "var(--font-jersey15)",
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
                        icon={(p: MenuIconProps) => <SvgIcon src={allGamesIcon} {...p} />}
                        label={locale === "is" ? "Allir leikir" : "All games"}
                        variant="game"
                        active={pathname === allGamesPath || pathname.startsWith(`${allGamesPath}/`)}
                        fontFamily="var(--font-jersey15)"
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
                              fontFamily="var(--font-jersey15)"
                              onClose={() => setGamesMenuOpen("")}
                            />
                          ) : (
                            <div
                              className="flex items-center justify-between rounded-sm p-2 text-(--color-muted)"
                              style={{ fontFamily: "var(--font-jersey15)", fontSize: "16px" }}
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
              fontFamily: "var(--font-jersey15)",
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
              fontFamily: "var(--font-jersey15)",
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
                    fontFamily: "var(--font-jersey15)",
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
                        style={{ fontFamily: "var(--font-jersey15)" }}
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
                        icon={({ size, className }: MenuIconProps) => (
                          <Image
                            src={locale === "en" ? "/flags/is.svg" : "/flags/gb.svg"}
                            alt=""
                            width={size ?? 14}
                            height={size ?? 14}
                            className={["rounded-sm", className].filter(Boolean).join(" ")}
                          />
                        )}
                        label={otherLocale.toUpperCase()}
                        variant="plain"
                        fontFamily="var(--font-jersey15)"
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
                          <DropdownItem href={`/${locale}/account`} icon={Settings} label={tNav("profile")} variant="game" fontFamily="var(--font-jersey15)" />
                        </li>
                        <li>
                          <DropdownItem href={`/${locale}/leaderboard`} icon={Trophy} label="Leaderboard" variant="game" fontFamily="var(--font-jersey15)" />
                        </li>
                        <li className="my-1 h-px bg-border" />
                        <li>
                          <DropdownItem icon={LogOut} label="Sign out" variant="destructive" onClick={() => void signOut()} fontFamily="var(--font-jersey15)" />
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
                            fontFamily="var(--font-jersey15)"
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
