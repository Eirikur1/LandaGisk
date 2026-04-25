"use client";

import dynamic from "next/dynamic";
import GameLoading from "@/components/games/GameLoading";

const PitchGuesser = dynamic(() => import("@/components/games/PitchGuesser"), {
  ssr: false,
  loading: () => <GameLoading />,
});

export default function PitchPage() {
  return (
    <div className="relative z-40 min-h-[calc(100vh-5rem)] overflow-hidden">
      <PitchGuesser />
    </div>
  );
}
