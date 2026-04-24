"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Lottie = dynamic(() => import("lottie-react").then((m) => m.default), {
  ssr: false,
  loading: () => null,
});

const LEFT_FADE =
  "linear-gradient(to right, var(--color-background) 0%, var(--color-background) 28%, transparent 100%)";

export default function HeroMonkeyLottieClient() {
  const [heroData, setHeroData] = useState<object | null>(null);

  useEffect(() => {
    // Component is hidden on mobile (sm:block) — skip the 110KB fetch entirely
    if (window.matchMedia("(max-width: 639px)").matches) return;

    import("@/assets/lottie/finalfinalMonkey.json").then((m) =>
      setHeroData(m.default)
    );
  }, []);

  return (
    <div
      id="hero-monkey-root"
      className="pointer-events-none absolute top-0 right-0 select-none overflow-hidden hidden sm:block"
      style={{ width: "100vw", height: "100dvh" }}
      aria-hidden="true"
    >
      <div
        className="absolute top-0 bottom-0 left-0 z-10"
        style={{ width: "min(56vw, 24rem)", background: LEFT_FADE }}
      />

      <div
        className="absolute will-change-transform"
        style={{
          width: "120dvh",
          height: "120dvh",
          right: "-60px",
          top: "50%",
          transform: "translateY(-50%)",
        }}
      >
        {heroData && (
          <Lottie
            animationData={heroData}
            loop={false}
            autoplay
            style={{ width: "100%", height: "100%" }}
          />
        )}
      </div>
    </div>
  );
}
