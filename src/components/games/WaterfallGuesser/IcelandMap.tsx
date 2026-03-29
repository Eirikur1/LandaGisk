"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoJSONSource, StyleSpecification } from "maplibre-gl";
import type { FeatureCollection, Point, LineString } from "geojson";

/**
 * Free basemap: CARTO Voyager (raster) + OSM data — no API key.
 * @see https://carto.com/basemaps/
 */
const ICELAND_FREE_STYLE = {
  version: 8,
  name: "Carto Voyager",
  glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
  sources: {
    basemap: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution:
        '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap</a> · <a href="https://carto.com/attributions/">© CARTO</a>',
    },
  },
  layers: [
    {
      id: "basemap",
      type: "raster",
      source: "basemap",
      minzoom: 0,
      maxzoom: 22,
    },
  ],
} satisfies StyleSpecification;

/** Tight box — used to frame Iceland on load (fitBounds + padding). */
const ICELAND_FIT_BOUNDS: [[number, number], [number, number]] = [[-24.5, 63.3], [-13.3, 66.6]];
/**
 * Looser than `ICELAND_FIT_BOUNDS` so maxBounds does not force a high minimum zoom
 * (the engine raises min zoom when the viewport would show area outside maxBounds).
 */
const ICELAND_PAN_BOUNDS: [[number, number], [number, number]] = [[-27.2, 61.8], [-11.8, 67.8]];

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

const TOWNS: Array<{ name: string; lng: number; lat: number }> = [
  { name: "Reykjavik", lng: -21.9426, lat: 64.1466 },
  { name: "Keflavik", lng: -22.5686, lat: 64.0049 },
  { name: "Akranes", lng: -22.0749, lat: 64.3218 },
  { name: "Borgarnes", lng: -21.9167, lat: 64.5383 },
  { name: "Selfoss", lng: -21.0014, lat: 63.9331 },
  { name: "Hella", lng: -20.3981, lat: 63.8356 },
  { name: "Vik", lng: -19.0060, lat: 63.4186 },
  { name: "Akureyri", lng: -18.0878, lat: 65.6885 },
  { name: "Husavik", lng: -17.3386, lat: 66.0449 },
  { name: "Egilsstadir", lng: -14.3948, lat: 65.2671 },
  { name: "Hofn", lng: -15.2139, lat: 64.2539 },
  { name: "Isafjordur", lng: -23.1240, lat: 66.0748 },
];

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
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapLoadedRef = useRef(false);
  const interactionRef = useRef({ disabled: false, hasResult: false });
  const [pin, setPin] = useState<Pin | null>(null);

  useEffect(() => {
    interactionRef.current = { disabled: !!disabled, hasResult: resultPin != null };
  }, [disabled, resultPin]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: ICELAND_FREE_STYLE,
      center: [-19.0, 64.95],
      zoom: 3.5,
      minZoom: 3,
      maxZoom: 11,
      maxBounds: ICELAND_PAN_BOUNDS,
      attributionControl: false,
      pitchWithRotate: false,
      dragRotate: false,
    });
    mapRef.current = map;
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");

    map.on("load", () => {
      const towns: FeatureCollection<Point> = {
        type: "FeatureCollection",
        features: TOWNS.map((t) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [t.lng, t.lat] },
          properties: { name: t.name },
        })),
      };
      map.addSource("towns", { type: "geojson", data: towns });
      map.addLayer({
        id: "town-points",
        type: "circle",
        source: "towns",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 2.2, 9, 5.5],
          "circle-color": "#2b5ceb",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.2,
        },
      });
      map.addLayer({
        id: "town-labels",
        type: "symbol",
        source: "towns",
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 3, 8.5, 10, 13],
          "text-offset": [0.7, -0.8],
          "text-anchor": "left",
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#0f2d5c",
          "text-halo-color": "rgba(255, 255, 255, 0.92)",
          "text-halo-width": 1.2,
          "text-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0.45, 6.5, 0.95],
        },
      });

      const emptyGame: FeatureCollection<Point | LineString> = { type: "FeatureCollection", features: [] };
      map.addSource("game", { type: "geojson", data: emptyGame });
      map.addLayer({
        id: "game-line",
        type: "line",
        source: "game",
        filter: ["==", ["geometry-type"], "LineString"],
        paint: {
          "line-color": "rgba(43, 92, 235, 0.75)",
          "line-width": 2.2,
          "line-dasharray": [2.2, 1.8],
        },
      });
      map.addLayer({
        id: "game-glow",
        type: "circle",
        source: "game",
        filter: ["all", ["==", ["geometry-type"], "Point"], ["==", ["get", "kind"], "guess"]],
        paint: { "circle-radius": 12, "circle-color": "rgba(43,92,235,0.28)" },
      });
      map.addLayer({
        id: "game-guess",
        type: "circle",
        source: "game",
        filter: ["all", ["==", ["geometry-type"], "Point"], ["==", ["get", "kind"], "guess"]],
        paint: {
          "circle-radius": 6,
          "circle-color": "#2b5ceb",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });
      map.addLayer({
        id: "game-target-glow",
        type: "circle",
        source: "game",
        filter: ["all", ["==", ["geometry-type"], "Point"], ["==", ["get", "kind"], "target"]],
        paint: { "circle-radius": 14, "circle-color": "rgba(34,197,94,0.3)" },
      });
      map.addLayer({
        id: "game-target",
        type: "circle",
        source: "game",
        filter: ["all", ["==", ["geometry-type"], "Point"], ["==", ["get", "kind"], "target"]],
        paint: {
          "circle-radius": 7,
          "circle-color": "#22c55e",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });
      map.resize();
      map.fitBounds(ICELAND_FIT_BOUNDS, {
        padding: { top: 72, bottom: 72, left: 72, right: 72 },
        duration: 0,
        maxZoom: 12,
      });
      mapLoadedRef.current = true;
    });

    map.on("click", (e) => {
      const { disabled: d, hasResult } = interactionRef.current;
      if (d || hasResult) return;
      setPin({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      mapLoadedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;

    const features: FeatureCollection<Point | LineString>["features"] = [];
    const guess = resultPin ?? pin;
    if (guess) {
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [guess.lng, guess.lat] },
        properties: { kind: "guess" },
      });
    }
    if (targetPin) {
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [targetPin.lng, targetPin.lat] },
        properties: { kind: "target" },
      });
    }
    if (resultPin && targetPin) {
      features.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [resultPin.lng, resultPin.lat],
            [targetPin.lng, targetPin.lat],
          ],
        },
        properties: { kind: "line" },
      });
    }
    const src = map.getSource("game") as GeoJSONSource | undefined;
    if (src) src.setData({ type: "FeatureCollection", features });
  }, [pin, resultPin, targetPin]);

  return (
    <motion.div
      className="absolute"
      style={{
        right: "max(2vw, 1rem)",
        top: "40%",
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
        className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-200/90 shadow-[0_24px_80px_rgba(15,23,42,0.1)]"
        style={{ minHeight: 0 }}
      >
        {/* Prompt overlay */}
        <AnimatePresence>
          {!pin && !resultPin && !disabled && (
            <motion.div
              className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 z-10"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <p
                className="text-sm font-semibold px-4 py-2 rounded-xl whitespace-nowrap border border-slate-200/90"
                style={{
                  background: "rgba(255,255,255,0.94)",
                  color: "#0f2d5c",
                  backdropFilter: "blur(8px)",
                  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
                }}
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
              className="absolute bottom-4 right-4 z-10"
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
