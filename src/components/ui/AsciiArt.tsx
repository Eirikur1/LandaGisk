"use client";

import { useEffect, useRef, useState } from "react";

import createGlobe from "cobe";

const ROT_SPEED      = 0.003;
const ROT_SPEED_FAST = 0.09;

const LEFT_FADE =
  "linear-gradient(to right, var(--color-background) 0%, var(--color-background) 28%, transparent 100%)";

export default function AsciiArt() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const canvas    = canvasRef.current;
    if (!container || !canvas) return;

    let disposed = false;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
    let phi = 0.6;

    const size = () => Math.max(160, Math.round(container.getBoundingClientRect().width));
    let w = size();

    const globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width: w, height: w,
      phi, theta: 0.28,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 6000,
      mapBrightness: 8,
      mapBaseBrightness: 0.15,
      baseColor: [0.17, 0.36, 0.92],   // #2c5ceb — ocean
      markerColor: [1, 1, 1],
      glowColor: [0.17, 0.36, 0.92],
      markers: [],
    });

    const startTime = performance.now();

    const tick = () => {
      if (disposed) return;
      raf = requestAnimationFrame(tick);
      const elapsed = (performance.now() - startTime) / 1000;
      const t = Math.min(elapsed / 2.5, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const speed = ROT_SPEED_FAST + (ROT_SPEED - ROT_SPEED_FAST) * eased;
      phi += speed;
      globe.update({ phi });
    };

    raf = requestAnimationFrame(tick);

    const ro = new ResizeObserver(() => {
      if (disposed) return;
      w = size();
      globe.update({ width: w, height: w, devicePixelRatio: dpr });
    });
    ro.observe(container);

    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (!disposed) setReady(true);
      })
    );

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      globe.destroy();
    };
  }, []);

  return (
    <div
      id="globe-root"
      className="pointer-events-none absolute inset-y-0 right-0 select-none overflow-visible"
      style={{ width: "min(96vw, 1680px)" }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-y-0 left-0 z-10"
        style={{ width: "min(56vw, 24rem)", background: LEFT_FADE }}
      />

      <div
        className="absolute will-change-transform"
        style={{
          width: "min(120vmin, min(118dvh, 1160px))",
          height: "min(120vmin, min(118dvh, 1160px))",
          right: "max(-17vw, -9.5rem)",
          bottom: "max(-26dvh, -11rem)",
        }}
      >
        <div
          ref={containerRef}
          className="absolute inset-0 overflow-hidden rounded-full"
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full"
            style={{
              opacity: ready ? 1 : 0,
              transition: "opacity 1.1s ease, filter 1.4s cubic-bezier(0.16, 1, 0.3, 1)",
              filter: ready ? "none" : "blur(8px)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
