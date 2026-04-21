"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import locoMono from "@/assets/lottie/LocoMonoito.svg";

const LEFT_FADE =
  "linear-gradient(to right, var(--color-background) 0%, var(--color-background) 28%, transparent 100%)";

export default function HeroMonkeyLottieClient() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      id="hero-monkey-root"
      className="pointer-events-none absolute top-0 right-0 select-none overflow-visible"
      style={{ width: "min(96vw, 1680px)", height: "100dvh" }}
      aria-hidden="true"
    >
      <div
        className="absolute top-0 bottom-0 left-0 z-10"
        style={{ width: "min(56vw, 24rem)", background: LEFT_FADE }}
      />

      <div
        className="absolute flex items-center justify-center will-change-transform overflow-visible"
        style={{
          width: "min(120vmin, min(118dvh, 1160px))",
          height: "min(120vmin, min(118dvh, 1160px))",
          right: "max(-17vw, -9.5rem)",
          top: "50%",
          transform: ready ? "translateY(-38%) translateX(0)" : "translateY(20%) translateX(100vw)",
          opacity: ready ? 1 : 0,
          transition: "opacity 1.4s ease, transform 2.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div className="relative h-full w-full max-h-full max-w-full overflow-visible">
          <Image
            src={locoMono}
            alt=""
            fill
            priority
            className="object-contain scale-[1.02]"
            style={{
              filter: ready ? "none" : "blur(8px)",
              transition: "filter 1.4s cubic-bezier(0.16, 1, 0.3, 1)",
              imageRendering: "pixelated",
            }}
          />
        </div>
      </div>
    </div>
  );
}
