"use client";

import Lottie from "lottie-react";
import sleepData from "@/assets/lottie/64bitSleepingMono.json";

export default function SleepingMonkeyLottie() {
  return (
    <div className="w-48 h-48 overflow-hidden">
      <Lottie
        animationData={sleepData}
        loop
        autoplay
        style={{ width: "100%", height: "100%", marginLeft: "-15%" }}
      />
    </div>
  );
}
