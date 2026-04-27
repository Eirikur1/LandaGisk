"use client";

import dynamic from "next/dynamic";
import GameLoading from "@/components/games/GameLoading";

const LanguageGuesser = dynamic(() => import("@/components/games/LanguageGuesser"), {
  ssr: false,
  loading: () => <GameLoading />,
});

export default function LanguagePage() {
  return (
    <div className="relative z-40 min-h-[calc(100vh-5rem)] overflow-hidden">
      <LanguageGuesser />
    </div>
  );
}
