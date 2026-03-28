"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

// Module-level cache — survives re-renders and client-side navigation
let dotCache: { lng: number; lat: number }[] | null = null;

const LEFT_FADE =
  "linear-gradient(to right, var(--color-background) 0%, var(--color-background) 28%, transparent 100%)";

const ROT_SPEED = 0.08;
const ROT_SPEED_FAST = 9;

export default function HeroGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    let timer: d3.Timer | null = null;

    const init = async () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const context = canvas.getContext("2d");
      if (!context) return;

      const dpr = Math.min(window.devicePixelRatio ?? 1, 2);

      // Wait one frame for CSS layout to settle
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (disposed) return;

      const size = Math.max(160, Math.round(container.getBoundingClientRect().width));
      const radius = size / 2;

      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      context.scale(dpr, dpr);

      const bgColor =
        getComputedStyle(document.documentElement).getPropertyValue("--color-background").trim() ||
        "#0d0d0d";

      const projection = d3
        .geoOrthographic()
        .scale(radius)
        .translate([size / 2, size / 2])
        .clipAngle(90);

      const allDots: { lng: number; lat: number }[] = [];
      const rotation = [0, 0];
      const startTime = performance.now();

      const render = () => {
        context.clearRect(0, 0, size, size);
        const currentScale = projection.scale();
        const sf = currentScale / radius;

        context.beginPath();
        context.arc(size / 2, size / 2, currentScale, 0, 2 * Math.PI);
        context.fillStyle = bgColor;
        context.fill();

        if (!allDots.length) return;

        const rot = projection.rotate();
        const center: [number, number] = [-rot[0], -rot[1]];

        allDots.forEach((dot) => {
          if (d3.geoDistance([dot.lng, dot.lat], center) > Math.PI / 2) return;
          const projected = projection([dot.lng, dot.lat]);
          if (!projected) return;
          context.beginPath();
          context.arc(projected[0], projected[1], 1.2 * sf, 0, 2 * Math.PI);
          context.fillStyle = "#2c5ceb";
          context.fill();
        });
      };

      timer = d3.timer(() => {
        if (disposed) return;
        const elapsed = (performance.now() - startTime) / 1000;
        const t = Math.min(elapsed / 2.5, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const speed = ROT_SPEED_FAST + (ROT_SPEED - ROT_SPEED_FAST) * eased;
        rotation[0] += speed;
        projection.rotate(rotation);
        render();
      });

      // Load dots — use cache if available, otherwise use a Web Worker
      const loadDots = (): Promise<{ lng: number; lat: number }[]> =>
        new Promise((resolve, reject) => {
          const worker = new Worker("/globe-worker.js");
          worker.onmessage = (e) => {
            worker.terminate();
            if (e.data.error) reject(new Error(e.data.error));
            else resolve(e.data.dots);
          };
          worker.onerror = (e) => { worker.terminate(); reject(e); };
          worker.postMessage(null);
        });

      try {
        const dots = dotCache ?? await loadDots();
        if (disposed) return;
        dotCache = dots;
        allDots.push(...dots);
        render();
        // Wait for browser to paint the off-state before triggering the transition
        await new Promise<void>((resolve) => setTimeout(resolve, 50));
        if (!disposed) setReady(true);
      } catch {
        if (!disposed) setReady(true);
      }
    };

    init();

    return () => {
      disposed = true;
      timer?.stop();
    };
  }, []);

  return (
    <div
      id="globe-root"
      className="pointer-events-none absolute top-0 right-0 select-none overflow-visible"
      style={{ width: "min(96vw, 1680px)", height: "100dvh" }}
      aria-hidden="true"
    >
      {/* Left fade overlay */}
      <div
        className="absolute top-0 bottom-0 left-0 z-10"
        style={{ width: "min(56vw, 24rem)", background: LEFT_FADE }}
      />

      <div
        className="absolute will-change-transform"
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
        <div ref={containerRef} className="absolute inset-0 overflow-hidden rounded-full">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full"
            style={{
              filter: ready ? "none" : "blur(8px)",
              transition: "filter 1.4s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
