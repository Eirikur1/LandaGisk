"use client";

import Lottie from "lottie-react";
import animationData from "@/assets/lottie/StaringIntoLottie.json";

const SIZE = "min(135vmin, min(133dvh, 1260px))";

export default function HeroAbyssClient() {
  return (
    <div
      className="pointer-events-none absolute top-0 right-0 select-none overflow-visible z-[-1]"
      style={{ width: "min(96vw, 1680px)", height: "100%" }}
      aria-hidden="true"
    >
      <div
        className="sticky top-0 flex items-end justify-end overflow-visible"
        style={{ height: "100dvh" }}
      >
        <div
          style={{
            width: SIZE,
            height: SIZE,
            right: "max(-20vw, -12rem)",
            transform: "translateX(min(5vw, 2rem))",
            flexShrink: 0,
          }}
        >
          <Lottie
            animationData={animationData}
            loop={false}
            autoplay
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      </div>
    </div>
  );
}
