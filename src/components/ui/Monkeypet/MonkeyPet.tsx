"use client";

import { useEffect, useRef, useState } from "react";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import animationData from "./PixelMonoWalking.json";

export default function MonkeyPet() {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const [posX, setPosX] = useState(40);
  const [direction, setDirection] = useState<1 | -1>(1);

  // Randomly reverse direction occasionally
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() < 0.15) {
        setDirection((d) => (d === 1 ? -1 : 1));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Walk
  useEffect(() => {
    const interval = setInterval(() => {
      setPosX((x) => {
        const next = x + direction * 0.5;
        if (next > 88) { setDirection(-1); return 88; }
        if (next < 5)  { setDirection(1);  return 5; }
        return next;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [direction]);

  // Set animation to play in reverse (fixes walk cycle)
  const onReady = () => {
    lottieRef.current?.setDirection(-1);
    lottieRef.current?.play();
  };

  return (
    <div
      className="absolute z-10 select-none"
      style={{
        top: "-56px",
        left: `${posX}%`,
        transform: "translateX(-50%)",
        transition: "left 0.2s linear",
      }}
    >
      <div
        className="w-14 h-14"
        style={{
          transform: `scaleX(${direction === 1 ? -1 : 1})`,
          filter: "invert(19%) sepia(99%) saturate(7496%) hue-rotate(225deg) brightness(97%) contrast(104%)",
        }}
      >
        <Lottie
          lottieRef={lottieRef}
          animationData={animationData}
          loop
          autoplay={false}
          onDOMLoaded={onReady}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
}
