"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import createGlobe from "cobe";

const LAND_COLOR: [number, number, number] = [0.35, 0.55, 1.0];
const GLOW_COLOR: [number, number, number] = [0.18, 0.3, 0.7];
const ROT_SPEED = 0.003;

export default function AuthGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let disposed = false;
    let raf = 0;
    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 2);
    let phi = 0.6;

    const size = Math.max(160, Math.round(container.getBoundingClientRect().width));

    const globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width: size,
      height: size,
      phi,
      theta: 0.28,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 1.4,
      baseColor: LAND_COLOR,
      markerColor: LAND_COLOR,
      glowColor: GLOW_COLOR,
      markers: [],
    });

    const tick = () => {
      if (disposed) return;
      raf = requestAnimationFrame(tick);
      phi += ROT_SPEED;
      globe.update({ phi });
    };
    raf = requestAnimationFrame(tick);

    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (!disposed) setReady(true);
      })
    );

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      globe.destroy();
    };
  }, []);

  return (
    <motion.div
      ref={containerRef}
      className="w-[min(80vmin,560px)] h-[min(80vmin,560px)] rounded-full overflow-hidden"
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.3, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{
          opacity: ready ? 1 : 0,
          transition: "opacity 1.1s ease, filter 1.4s cubic-bezier(0.16,1,0.3,1)",
          filter: ready ? "none" : "blur(8px)",
        }}
      />
    </motion.div>
  );
}
