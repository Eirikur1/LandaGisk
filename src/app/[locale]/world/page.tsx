"use client";

import dynamic from "next/dynamic";
import GameLoading from "@/components/games/GameLoading";

const WorldGuesser = dynamic(() => import("@/components/games/WorldGuesser"), {
  ssr: false,
  loading: () => <GameLoading />,
});

export default function WorldPage() {
  return (
    <div className="relative z-40 min-h-[calc(100vh-5rem)] overflow-hidden">
      <WorldGuesser />
    </div>
  );
}
