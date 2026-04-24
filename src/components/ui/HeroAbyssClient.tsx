"use client";

import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import staringIntoTheAbiss from "@/assets/lottie/StaringIntoTheAbiss.svg";

const LEFT_FADE =
  "linear-gradient(to right, var(--color-background) 0%, var(--color-background) 28%, transparent 100%)";

export default function HeroAbyssClient() {
  const [ready, setReady] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    function onScroll() {
      const el = wrapperRef.current;
      if (!el) return;
      const scrolled = window.scrollY;
      const pageHeight = document.documentElement.scrollHeight;
      const viewportHeight = window.innerHeight;
      const threshold = pageHeight - viewportHeight - 300;
      const overshoot = Math.max(0, scrolled - threshold);
      el.style.transform = overshoot > 0 ? `translateY(-${overshoot}px)` : "";
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="pointer-events-none fixed top-0 right-0 select-none overflow-visible will-change-transform"
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
          transform: ready ? "translateY(-30%) translateX(min(18vw, 10rem))" : "translateY(20%) translateX(100vw)",
          opacity: ready ? 1 : 0,
          transition: "opacity 1.4s ease, transform 2.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div className="relative h-full w-full max-h-full max-w-full overflow-visible">
          <Image
            src={staringIntoTheAbiss}
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
