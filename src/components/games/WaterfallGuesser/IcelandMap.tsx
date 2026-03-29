"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as d3geo from "d3-geo";

const GEO_URL = "/iceland.geojson";

// Iceland bounding box [lng_min, lat_min, lng_max, lat_max]
const ICELAND_BOUNDS: [[number, number], [number, number]] = [[-24.5, 63.3], [-13.3, 66.6]];

interface Pin {
  lng: number;
  lat: number;
}

interface Props {
  onSubmit: (pin: Pin) => void;
  resultPin?: Pin | null;
  targetPin?: Pin | null;
  disabled?: boolean;
}

function distanceKm(a: Pin, b: Pin): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export { distanceKm };

export default function IcelandMap({ onSubmit, resultPin, targetPin, disabled }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [icelandFeature, setIcelandFeature] = useState<any>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [pin, setPin] = useState<Pin | null>(null);
  const projRef = useRef<d3geo.GeoProjection | null>(null);

  // Load geo data
  useEffect(() => {
    fetch(GEO_URL)
      .then((r) => r.json())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((geojson: any) => {
        const feature = geojson.features?.[0] ?? geojson;
        setIcelandFeature(feature);
      });
  }, []);

  // Measure container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setSize({ w: Math.round(rect.width), h: Math.round(rect.height) });
    });
    ro.observe(el);
    const rect = el.getBoundingClientRect();
    setSize({ w: Math.round(rect.width), h: Math.round(rect.height) });
    return () => ro.disconnect();
  }, []);

  // Build projection fitted to Iceland
  const getProjection = useCallback(() => {
    const pad = 24;
    const fitTarget = icelandFeature ?? {
      type: "Feature" as const,
      geometry: { type: "Polygon" as const, coordinates: [[
        [ICELAND_BOUNDS[0][0], ICELAND_BOUNDS[0][1]],
        [ICELAND_BOUNDS[1][0], ICELAND_BOUNDS[0][1]],
        [ICELAND_BOUNDS[1][0], ICELAND_BOUNDS[1][1]],
        [ICELAND_BOUNDS[0][0], ICELAND_BOUNDS[1][1]],
        [ICELAND_BOUNDS[0][0], ICELAND_BOUNDS[0][1]],
      ]] },
      properties: {},
    };
    const proj = d3geo
      .geoMercator()
      .fitExtent([[pad, pad], [size.w - pad, size.h - pad]], fitTarget);
    projRef.current = proj;
    return proj;
  }, [size, icelandFeature]);

  // Convert screen click → [lng, lat]
  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    if (disabled) return;
    if (resultPin) return;
    const svg = svgRef.current;
    if (!svg || !projRef.current) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = size.w / rect.width;
    const scaleY = size.h / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const coords = projRef.current.invert?.([x, y]);
    if (!coords) return;
    setPin({ lng: coords[0], lat: coords[1] });
  }

  const proj = size.w > 0 ? getProjection() : null;
  const path = proj ? d3geo.geoPath(proj) : null;

  const pinXY = (pin && proj) ? proj([pin.lng, pin.lat]) : null;
  const resultXY = (resultPin && proj) ? proj([resultPin.lng, resultPin.lat]) : null;
  const targetXY = (targetPin && proj) ? proj([targetPin.lng, targetPin.lat]) : null;

  return (
    <motion.div
      className="absolute"
      style={{
        right: "max(2vw, 1rem)",
        top: "50%",
        translateY: "-50%",
        width: "min(68vw, calc(100vw - 440px))",
        height: "min(70vh, 620px)",
      }}
      initial={{ opacity: 0, x: "8vw" }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 1.1, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        ref={containerRef}
        className="relative w-full h-full rounded-2xl overflow-hidden border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
        style={{ background: "#1a3a6e", cursor: disabled || resultPin ? "default" : "crosshair", minHeight: 0 }}
      >
        <svg
          ref={svgRef}
          width={size.w}
          height={size.h}
          viewBox={`0 0 ${size.w} ${size.h}`}
          style={{ display: "block", width: "100%", height: "100%" }}
          onClick={handleClick}
        >
          {/* Ocean */}
          <rect width={size.w} height={size.h} fill="#1a3a6e" />

          {/* Iceland polygon */}
          {icelandFeature && path && (
            <path
              d={path(icelandFeature) ?? ""}
              fill="#c8d8ea"
              stroke="#7a9db8"
              strokeWidth={1}
            />
          )}

          {/* Line from guess to target (shown after result) */}
          {resultXY && targetXY && (
            <line
              x1={resultXY[0]} y1={resultXY[1]}
              x2={targetXY[0]} y2={targetXY[1]}
              stroke="rgba(255,255,255,0.5)"
              strokeWidth={2}
              strokeDasharray="5 4"
            />
          )}

          {/* User pin (before submit) */}
          {pinXY && !resultPin && (
            <g>
              <circle cx={pinXY[0]} cy={pinXY[1]} r={12} fill="#2b5ceb" fillOpacity={0.25} />
              <circle cx={pinXY[0]} cy={pinXY[1]} r={6} fill="#2b5ceb" stroke="white" strokeWidth={2} />
            </g>
          )}

          {/* Result: user guess pin */}
          {resultXY && (
            <g>
              <circle cx={resultXY[0]} cy={resultXY[1]} r={12} fill="#2b5ceb" fillOpacity={0.25} />
              <circle cx={resultXY[0]} cy={resultXY[1]} r={6} fill="#2b5ceb" stroke="white" strokeWidth={2} />
            </g>
          )}

          {/* Result: target pin */}
          {targetXY && (
            <g>
              <circle cx={targetXY[0]} cy={targetXY[1]} r={14} fill="#22c55e" fillOpacity={0.25} />
              <circle cx={targetXY[0]} cy={targetXY[1]} r={7} fill="#22c55e" stroke="white" strokeWidth={2} />
            </g>
          )}
        </svg>

        {/* Prompt overlay */}
        <AnimatePresence>
          {!pin && !resultPin && !disabled && (
            <motion.div
              className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <p
                className="text-sm font-semibold px-4 py-2 rounded-xl whitespace-nowrap"
                style={{ background: "rgba(0,0,0,0.55)", color: "rgba(255,255,255,0.85)", backdropFilter: "blur(6px)" }}
              >
                Click to place your guess
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit button — bottom-right of the map */}
        <AnimatePresence>
          {pin && !resultPin && !disabled && (
            <motion.div
              className="absolute bottom-4 right-4"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2 }}
            >
              <button
                type="button"
                onClick={() => { if (pin) onSubmit(pin); }}
                className="rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-opacity hover:opacity-90"
                style={{ background: "#2b5ceb" }}
              >
                Submit guess
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
