"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import * as d3geo from "d3-geo";

const GEO_URL = "/countries-110m.json";

interface Props {
  guessedProximity: Map<string, number>;
  targetCcn3: string;
  won: boolean;
  panTo?: { lat: number; lon: number } | null;
}

// proximity 0–100 → light blue → app blue → green at 100
function proximityColor(proximity: number): string {
  if (proximity >= 90) return "#22c55e";
  if (proximity >= 60) return "#2b5ceb";
  if (proximity >= 30) return "#5b8af5";
  return "#93b4f8";
}

function getFill(id: string, guessedProximity: Map<string, number>, targetCcn3: string, won: boolean) {
  if (won && id === targetCcn3) return "#22c55e";
  const p = guessedProximity.get(id);
  if (p !== undefined) return proximityColor(p);
  return "#c8d8ea";
}

function getStroke(id: string, guessedProximity: Map<string, number>, targetCcn3: string, won: boolean) {
  if (won && id === targetCcn3) return "#16a34a";
  const p = guessedProximity.get(id);
  if (p !== undefined) return proximityColor(p);
  return "#7a9db8";
}

export default function GlobeMap({ guessedProximity, targetCcn3, won, panTo }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const rotateRef = useRef<[number, number, number]>([-10, -40, 0]);
  const dragging = useRef(false);
  const lastPos = useRef<[number, number]>([0, 0]);
  const panningRef = useRef(false);
  const panStartRef = useRef<[number, number, number]>([-10, -40, 0]);
  const panTargetRef = useRef<[number, number, number]>([-10, -40, 0]);
  const panProgressRef = useRef(0);
  const lastPanToRef = useRef<{ lat: number; lon: number } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [features, setFeatures] = useState<any[]>([]);
  const [size, setSize] = useState(600);
  const animFrameRef = useRef<number>(0);

  // Load geo data
  useEffect(() => {
    Promise.all([
      import("topojson-client"),
      fetch(GEO_URL).then((r) => r.json()),
    ]).then(([topojson, topo]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const geo = (topojson as any).feature(topo, (topo as any).objects.countries);
      setFeatures(geo.features);
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
          if (panProgressRef.current >= 1) panningRef.current = false;
        }
        draw();
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(animFrameRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [features, size, guessedProximity, targetCcn3, won]);

  const draw = useCallback(() => {
    const svg = svgRef.current;
    if (!svg || features.length === 0) return;
    const cx = size / 2;
    const projection = d3geo.geoOrthographic()
      .scale(cx * 0.96)
      .translate([cx, cx])
      .clipAngle(90)
      .rotate(rotateRef.current);
    const path = d3geo.geoPath(projection);

    // Graticule
    const grat = svg.querySelector<SVGPathElement>(".globe-graticule");
    if (grat) grat.setAttribute("d", path(d3geo.geoGraticule()()) ?? "");

    // Countries
    const countryEls = svg.querySelectorAll<SVGPathElement>("[data-id]");
    countryEls.forEach((el) => {
      const id = el.getAttribute("data-id") ?? "";
      const feat = features.find((f) => f.id === id);
      if (!feat) return;
      el.setAttribute("d", path(feat) ?? "");
      el.setAttribute("fill", getFill(id, guessedProximity, targetCcn3, won));
      el.setAttribute("stroke", getStroke(id, guessedProximity, targetCcn3, won));
    });
  }, [features, size, guessedProximity, targetCcn3, won]);

  // Drag to rotate
  function onPointerDown(e: React.PointerEvent) {
    dragging.current = true;
    lastPos.current = [e.clientX, e.clientY];
    (e.target as Element).setPointerCapture(e.pointerId);
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
    draw();
  }
  function onPointerUp() { dragging.current = false; }

  const cx = size / 2;

  return (
    <motion.div
      className="absolute cursor-grab active:cursor-grabbing"
      style={{
        width: "min(80vmin, min(75dvh, 720px))",
        height: "min(80vmin, min(75dvh, 720px))",
        right: "max(4vw, 2rem)",
        top: "50%",
        translateY: "-50%",
      }}
      initial={{ opacity: 0, scale: 0.92, x: "18vw" }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ duration: 1.2, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
    >
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ display: "block", width: "100%", height: "100%", background: "transparent" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <defs>
          <clipPath id="globe-clip">
            <circle cx={cx} cy={cx} r={cx * 0.96} />
          </clipPath>
        </defs>

        {/* Everything clipped to the circle */}
        <g clipPath="url(#globe-clip)">
          {/* Ocean fill */}
          <circle cx={cx} cy={cx} r={cx * 0.96} fill="#1a3a6e" />
          {/* Graticule */}
          <path className="globe-graticule" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
          {/* Countries */}
          {features.map((f, i) => (
            <path
              key={`${f.id}-${i}`}
              data-id={f.id}
              fill={getFill(f.id, guessedProximity, targetCcn3, won)}
              stroke={getStroke(f.id, guessedProximity, targetCcn3, won)}
              strokeWidth={0.5}
            />
          ))}
        </g>

        {/* Sphere outline */}
        <circle
          cx={cx} cy={cx} r={cx * 0.96}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={1.5}
        />
      </svg>
    </motion.div>
  );
}
