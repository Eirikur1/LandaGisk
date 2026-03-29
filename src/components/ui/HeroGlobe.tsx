"use client";

import dynamic from "next/dynamic";

const HeroGlobeCanvas = dynamic(() => import("@/components/ui/HeroGlobeCanvas"), { ssr: false });

export default function HeroGlobe() {
  return <HeroGlobeCanvas />;
}
