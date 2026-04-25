"use client";

import dynamic from "next/dynamic";
import GameLoading from "@/components/games/GameLoading";

const ColorGuesser = dynamic(() => import("@/components/games/ColorGuesser"), {
  ssr: false,
  loading: () => <GameLoading />,
});

export default function ColorPage() {
  return (
    <div className="relative z-40 min-h-[calc(100vh-5rem)] overflow-hidden">
      <ColorGuesser />
    </div>
  );
}
