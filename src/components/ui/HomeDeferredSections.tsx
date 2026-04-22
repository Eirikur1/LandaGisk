"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import GameList from "@/components/ui/GameList";

const UserStats = dynamic(() => import("@/components/ui/UserStats"), { ssr: false });
const HomeLeaderboard = dynamic(() => import("@/components/ui/HomeLeaderboard"), { ssr: false });

type Game = {
  slug: string;
  titleKey: string;
  descriptionKey: string;
  color: "navy" | "forest" | "amber" | "rust";
  available: boolean;
};

export default function HomeDeferredSections({ games }: { games: readonly Game[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <GameList games={games} />
      <UserStats />
      <HomeLeaderboard />
    </>
  );
}
