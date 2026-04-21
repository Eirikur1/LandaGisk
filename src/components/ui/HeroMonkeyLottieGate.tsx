"use client";

import dynamic from "next/dynamic";

/** Server pages cannot use `dynamic(..., { ssr: false })`; this client shell wraps that. */
const HeroMonkeyLottieClient = dynamic(
  () => import("@/components/ui/HeroMonkeyLottieClient"),
  { ssr: false, loading: () => null }
);

export default function HeroMonkeyLottieGate() {
  return <HeroMonkeyLottieClient />;
}
