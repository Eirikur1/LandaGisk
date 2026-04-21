"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import * as d3geo from "d3-geo";

const GEO_URL_LO = "/countries-110m.json";
const GEO_URL_HI = "/countries-50m.json";

interface Props {
  guessedProximity: Map<string, number>;
  targetCcn3: string;
  won: boolean;
  panTo?: { lat: number; lon: number } | null;
  inline?: boolean;
}

// Digital Blue palette mapped to proximity 0–100
// Scale is compressed toward the top: most guesses are light, only very close ones go dark.
// Adjacent countries score ~97–99, so #002966 only appears for neighbours / near-misses.
function proximityColor(proximity: number): string {
  if (proximity >= 97) return "#002966"; // 900 — adjacent / essentially correct
  if (proximity >= 93) return "#003D99"; // 700 — ~500 km away
  if (proximity >= 88) return "#0052CC"; // 600 — ~1 500 km away
  if (proximity >= 80) return "#0066FF"; // 500 — ~2 500 km away
  if (proximity >= 68) return "#3385FF"; // 400 — ~4 000 km away
  if (proximity >= 50) return "#68A3FF"; // 300 — ~6 000 km away
  if (proximity >= 25) return "#99C2FF"; // 200 — far
  return "#E5F0FF";                      // 50 — very far
}

function getFill(id: string, guessedProximity: Map<string, number>, targetCcn3: string, won: boolean) {
  if (won && id === targetCcn3) return "#22c55e";
  const p = guessedProximity.get(id);
  if (p !== undefined) return proximityColor(p);
  return "#ffffff";
}

export default function GlobeMap({ guessedProximity, targetCcn3, won, panTo, inline }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const rotateRef = useRef<[number, number, number]>([-10, -40, 0]);
  const scaleRef = useRef(1);
  const needsRenderRef = useRef(true);
  const dragging = useRef(false);
  const lastPos = useRef<[number, number]>([0, 0]);
  const panningRef = useRef(false);
  const panStartRef = useRef<[number, number, number]>([-10, -40, 0]);
  const panTargetRef = useRef<[number, number, number]>([-10, -40, 0]);
  const panProgressRef = useRef(0);
  const lastPanToRef = useRef<{ lat: number; lon: number } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [featuresLo, setFeaturesLo] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [featuresHi, setFeaturesHi] = useState<any[]>([]);
  const [size, setSize] = useState(600);
  const animFrameRef = useRef<number>(0);
  const wheelFrameRef = useRef<number>(0);
  const wheelSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Separate "render resolution" from zoom scale so we only switch to hi-res
  // after zooming stops, avoiding expensive path recomputation every frame.
  const renderHiResRef = useRef(false);

  // features to actually render — hi-res when zoomed in past 1.8×
  // NOTE: read inside draw() via refs so the callback always picks the right set
  const featuresLoRef = useRef(featuresLo);
  const featuresHiRef = useRef(featuresHi);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const featureMapLoRef = useRef<Map<string, any>>(new Map());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const featureMapHiRef = useRef<Map<string, any>>(new Map());
  useEffect(() => { featuresLoRef.current = featuresLo; }, [featuresLo]);
  useEffect(() => { featuresHiRef.current = featuresHi; }, [featuresHi]);
  useEffect(() => {
    featureMapLoRef.current = new Map(featuresLo.map((f) => [String(f.id), f]));
  }, [featuresLo]);
  useEffect(() => {
    featureMapHiRef.current = new Map(featuresHi.map((f) => [String(f.id), f]));
  }, [featuresHi]);

  // Load both resolutions
  useEffect(() => {
    import("topojson-client").then((topojson) => {
      // Low-res loads first for fast initial render
      fetch(GEO_URL_LO).then((r) => r.json()).then((topo) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const geo = (topojson as any).feature(topo, (topo as any).objects.countries);
        setFeaturesLo(geo.features);
      });
      // High-res loads in background
      fetch(GEO_URL_HI).then((r) => r.json()).then((topo) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const geo = (topojson as any).feature(topo, (topo as any).objects.countries);
        setFeaturesHi(geo.features);
      });
    });
  }, []);

  // Measure container
  useEffect(() => {
    const el = svgRef.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize(Math.round(el.getBoundingClientRect().width));
    });
    ro.observe(el);
    setSize(Math.round(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);

  // Trigger pan when panTo changes
  useEffect(() => {
    if (!panTo) return;
    if (lastPanToRef.current?.lat === panTo.lat && lastPanToRef.current?.lon === panTo.lon) return;
    lastPanToRef.current = panTo;
    panStartRef.current = [...rotateRef.current] as [number, number, number];
    panTargetRef.current = [-panTo.lon, -panTo.lat, 0];
    panProgressRef.current = 0;
    panningRef.current = true;
    needsRenderRef.current = true;
  }, [panTo]);

  // Auto-rotate / pan
  useEffect(() => {
    let running = true;
    const tick = () => {
      if (!running) return;
      if (!dragging.current) {
        if (panningRef.current) {
          panProgressRef.current = Math.min(panProgressRef.current + 0.025, 1);
          const t = 1 - Math.pow(1 - panProgressRef.current, 3); // ease out cubic
          rotateRef.current = [
            panStartRef.current[0] + (panTargetRef.current[0] - panStartRef.current[0]) * t,
            panStartRef.current[1] + (panTargetRef.current[1] - panStartRef.current[1]) * t,
            0,
          ];
          needsRenderRef.current = true;
          if (panProgressRef.current >= 1) panningRef.current = false;
        }
        if (needsRenderRef.current) {
          draw();
          needsRenderRef.current = false;
        }
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(animFrameRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featuresLo, featuresHi, size, guessedProximity, targetCcn3, won]);

  useEffect(() => {
    needsRenderRef.current = true;
  }, [featuresLo, featuresHi, size, guessedProximity, targetCcn3, won]);

  const draw = useCallback(() => {
    const svg = svgRef.current;
    const useHiRes = renderHiResRef.current && featuresHiRef.current.length > 0;
    const activeFeatures = useHiRes ? featuresHiRef.current : featuresLoRef.current;
    if (!svg || activeFeatures.length === 0) return;
    const cx = size / 2;
    const projection = d3geo.geoOrthographic()
      .scale(cx * 0.96 * scaleRef.current)
      .translate([cx, cx])
      .clipAngle(90)
      .rotate(rotateRef.current);
    const path = d3geo.geoPath(projection);

    // Update ocean and clip radius to match zoom
    const r = cx * 0.96 * scaleRef.current;
    svg.querySelector<SVGCircleElement>(".globe-ocean")?.setAttribute("r", String(r));
    svg.querySelector<SVGCircleElement>(".globe-clip-circle")?.setAttribute("r", String(r));

    // Graticule
    const grat = svg.querySelector<SVGPathElement>(".globe-graticule");
    if (grat) grat.setAttribute("d", path(d3geo.geoGraticule()()) ?? "");

    // Build a fast lookup map from feature id → feature
    const featMap = useHiRes ? featureMapHiRef.current : featureMapLoRef.current;

    // Countries
    const countryEls = svg.querySelectorAll<SVGPathElement>("[data-id]");
    countryEls.forEach((el) => {
      const id = el.getAttribute("data-id") ?? "";
      const feat = featMap.get(id);
      if (!feat) return;
      el.setAttribute("d", path(feat) ?? "");
      el.setAttribute("fill", getFill(id, guessedProximity, targetCcn3, won));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, guessedProximity, targetCcn3, won]);

  // Drag to rotate
  function onPointerDown(e: React.PointerEvent) {
    dragging.current = true;
    lastPos.current = [e.clientX, e.clientY];
    svgRef.current?.setPointerCapture(e.pointerId);
    if (svgRef.current) svgRef.current.style.cursor = "grabbing";
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current[0];
    const dy = e.clientY - lastPos.current[1];
    lastPos.current = [e.clientX, e.clientY];
    rotateRef.current = [
      rotateRef.current[0] + dx * 0.4,
      Math.max(-90, Math.min(90, rotateRef.current[1] - dy * 0.4)),
      rotateRef.current[2],
    ];
    needsRenderRef.current = true;
    draw();
  }
  function onPointerUp() {
    dragging.current = false;
    if (svgRef.current) svgRef.current.style.cursor = "grab";
  }

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      dragging.current = true;
      lastPos.current = [e.touches[0].clientX, e.touches[0].clientY];
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!dragging.current || e.touches.length !== 1) return;
      e.preventDefault();
      const dx = e.touches[0].clientX - lastPos.current[0];
      const dy = e.touches[0].clientY - lastPos.current[1];
      lastPos.current = [e.touches[0].clientX, e.touches[0].clientY];
      rotateRef.current = [
        rotateRef.current[0] + dx * 0.4,
        Math.max(-90, Math.min(90, rotateRef.current[1] - dy * 0.4)),
        rotateRef.current[2],
      ];
      needsRenderRef.current = true;
      draw();
    };
    const onTouchEnd = () => { dragging.current = false; };
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [draw]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      scaleRef.current = Math.max(1, Math.min(4, scaleRef.current * (e.deltaY < 0 ? 1.1 : 0.9)));
      needsRenderRef.current = true;
      if (wheelFrameRef.current) return;
      wheelFrameRef.current = requestAnimationFrame(() => {
        wheelFrameRef.current = 0;
        draw();
        needsRenderRef.current = false;
      });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => {
      el.removeEventListener("wheel", handler);
      if (wheelFrameRef.current) cancelAnimationFrame(wheelFrameRef.current);
    };
  }, [draw]);

  const cx = size / 2;

  return (
    <motion.div
      style={inline ? {
        position: "relative",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      } : {
        position: "absolute",
        width: "min(80vmin, min(75dvh, 720px))",
        height: "min(80vmin, min(75dvh, 720px))",
        right: "max(4vw, 2rem)",
        top: "50%",
        translateY: "-50%",
      }}
      initial={{ opacity: 0, scale: 0.92, x: inline ? 0 : "18vw" }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ duration: 1.2, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
    >
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ display: "block", width: "100%", height: "100%", background: "transparent", borderRadius: "50%", overflow: "hidden", cursor: "grab", touchAction: "none", pointerEvents: "auto" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <defs>
          <clipPath id="globe-clip">
            <circle className="globe-clip-circle" cx={cx} cy={cx} r={cx * 0.96} />
          </clipPath>
        </defs>

        {/* Everything clipped to the circle */}
        <g clipPath="url(#globe-clip)">
          {/* Ocean fill */}
          <circle className="globe-ocean" cx={cx} cy={cx} r={cx * 0.96} fill="#c8dcea" />
          {/* Graticule intentionally hidden for a cleaner globe look */}
          <path className="globe-graticule" fill="none" stroke="none" />
          {/* Countries — DOM nodes keyed by id; draw() updates paths each frame */}
          {featuresLo.map((f, i) => (
            <path
              key={`${f.id}-${i}`}
              data-id={f.id}
              fill={getFill(f.id, guessedProximity, targetCcn3, won)}
              stroke="none"
            />
          ))}
        </g>


      </svg>
    </motion.div>
  );
}
