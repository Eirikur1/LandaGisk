"use client";

import dynamic from "next/dynamic";
import GameLoading from "@/components/games/GameLoading";

const EuroFlagRun = dynamic(() => import("@/components/games/EuroFlagRun"), {
  ssr: false,
  loading: () => <GameLoading />,
});

export default function EuroFlagsPage() {
  return (
    <div className="relative z-40 min-h-[calc(100vh-5rem)] overflow-hidden">
      <EuroFlagRun />
    </div>
  );
}
