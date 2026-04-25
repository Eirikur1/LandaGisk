"use client";

import dynamic from "next/dynamic";
import GameLoading from "@/components/games/GameLoading";

const FlagGuesser = dynamic(() => import("@/components/games/FlagGuesser"), {
  ssr: false,
  loading: () => <GameLoading />,
});

export default function FlagsPage() {
  return (
    <div className="relative z-40 min-h-[calc(100vh-5rem)] overflow-hidden">
      <FlagGuesser />
    </div>
  );
}
