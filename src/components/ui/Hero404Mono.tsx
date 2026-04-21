"use client";

import Lottie from "lottie-react";
import animationData from "@/assets/lottie/404Mono.json";

export default function Hero404Mono() {
  return (
    <div
      className="w-full flex justify-center"
      style={{ marginTop: "calc(1rem + 2.75rem)" }}
    >
      <Lottie
        animationData={animationData}
        loop
        autoplay
        style={{ width: "100%", maxWidth: 600 }}
      />
    </div>
  );
}
