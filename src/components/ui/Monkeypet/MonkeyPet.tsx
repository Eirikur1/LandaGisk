"use client";

import { useEffect, useState } from "react";
import Lottie from "lottie-react";
import walkData from "@/assets/lottie/BlueWalkingMonkey.json";
import sleepData from "@/assets/lottie/64bitSleepingMono.json";

type Phase = "walking" | "sleeping";

function randomSleepDelay() {
  // Sleep after 15–45 seconds of walking
  return (15 + Math.random() * 30) * 1000;
}

const SLEEP_LOOP_DURATION_MS = (207 / 60) * 1000; // ~3.45s per loop

function randomSleepDuration() {
  // At least 3 full loops, then up to 3 extra loops randomly
  return SLEEP_LOOP_DURATION_MS * (3 + Math.random() * 3);
}

export default function MonkeyPet() {
  const [posX, setPosX] = useState(40);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [phase, setPhase] = useState<Phase>("walking");

  // Schedule random sleep
  useEffect(() => {
    let sleepTimer: ReturnType<typeof setTimeout>;
    let wakeTimer: ReturnType<typeof setTimeout>;

    function scheduleSleep() {
      sleepTimer = setTimeout(() => {
        setPhase("sleeping");
        wakeTimer = setTimeout(() => {
          setPhase("walking");
          scheduleSleep();
        }, randomSleepDuration());
      }, randomSleepDelay());
    }

    scheduleSleep();
    return () => {
      clearTimeout(sleepTimer);
      clearTimeout(wakeTimer);
    };
  }, []);

  // Randomly reverse direction occasionally (only while walking)
  useEffect(() => {
    if (phase !== "walking") return;
    const interval = setInterval(() => {
      if (Math.random() < 0.15) {
        setDirection((d) => (d === 1 ? -1 : 1));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // Walk (only while walking)
  useEffect(() => {
    if (phase !== "walking") return;
    const interval = setInterval(() => {
      setPosX((x) => {
        const next = x + direction * 0.5;
        if (next > 45) { setDirection(-1); return 45; }
        if (next < 5)  { setDirection(1);  return 5; }
        return next;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [direction, phase]);

  const isSleeping = phase === "sleeping";

  return (
    <div
      className="absolute z-10 select-none"
      style={{
        top: isSleeping ? "-48px" : "-56px",
        left: `${posX}%`,
        transform: "translateX(-50%)",
        transition: "left 0.2s linear, top 0.3s ease",
      }}
    >
      {/* Walk — always mounted to avoid flicker on direction change */}
      <div
        className="w-16 h-16"
        style={{
          transform: `scaleX(${direction === 1 ? -1 : 1})`,
          display: isSleeping ? "none" : "block",
        }}
      >
        <Lottie
          animationData={walkData}
          loop
          autoplay
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {/* Sleep — always mounted to avoid remount on wake */}
      <div
        className="w-20 h-20"
        style={{ display: isSleeping ? "block" : "none" }}
      >
        <Lottie
          animationData={sleepData}
          loop
          autoplay
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
}
