"use client";

import { useEffect, useRef, useState } from "react";
import * as d3geo from "d3-geo";
import { ALL_COUNTRIES } from "./worldCountries";

interface Props {
  cols: number;
  rows: number;
  activeCol: number;
  activeRow: number;
  foundIds: string[];
  revealIds: string[];
  width?: number;
  height?: number;
}

const KNOWN_IDS = new Set(ALL_COUNTRIES.map((c) => c.id));

function cellPolygon(
  colIdx: number,
  rowIdx: number,
  cols: number,
  rows: number
): GeoJSON.Feature<GeoJSON.Polygon> {
  const cellW = 360 / cols;
  const cellH = 180 / rows;
  const west  = -180 + colIdx * cellW;
  const east  = west + cellW;
  const north = 90 - rowIdx * cellH;
  const south = north - cellH;

  // Dense ring so the curved projection renders accurately
  const steps = 32;
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i++) ring.push([west + (east - west) * i / steps, north]);
  for (let i = 0; i <= steps; i++) ring.push([east, north + (south - north) * i / steps]);
  for (let i = 0; i <= steps; i++) ring.push([east + (west - east) * i / steps, south]);
  for (let i = 0; i <= steps; i++) ring.push([west, south + (north - south) * i / steps]);
  ring.push([west, north]);

  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } };
}

function gridLines(cols: number, rows: number): GeoJSON.Feature<GeoJSON.MultiLineString> {
  const cellW = 360 / cols;
  const cellH = 180 / rows;
  const steps = 32;
  const lines: [number, number][][] = [];

  // Vertical lines (meridians)
  for (let c = 0; c <= cols; c++) {
    const lon = -180 + c * cellW;
    const seg: [number, number][] = [];
    for (let i = 0; i <= steps; i++) seg.push([lon, 90 - 180 * i / steps]);
    lines.push(seg);
  }

  // Horizontal lines (parallels)
  for (let r = 0; r <= rows; r++) {
    const lat = 90 - r * cellH;
    const seg: [number, number][] = [];
    for (let i = 0; i <= steps; i++) seg.push([-180 + 360 * i / steps, lat]);
    lines.push(seg);
  }

  return { type: "Feature", properties: {}, geometry: { type: "MultiLineString", coordinates: lines } };
}

export default function WorldMap({
  cols, rows, activeCol, activeRow, foundIds, revealIds, width = 700, height = 380,
}: Props) {
  const [features, setFeatures] = useState<{ id: string; d: string }[]>([]);
  const loadedRef = useRef(false);

  const proj = makeProjection(width, height);
  const path = d3geo.geoPath(proj);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    fetch("/countries-50m.json")
      .then((r) => r.json())
      .then((topo) => {
        import("topojson-client").then(({ feature }) => {
          const collection = feature(topo, topo.objects.countries) as unknown as GeoJSON.FeatureCollection;
          const result: { id: string; d: string }[] = [];
          for (const f of collection.features) {
            const id = String(f.id ?? "");
            const d = path(f);
            if (d) result.push({ id, d });
          }
          setFeatures(result);
        });
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const foundSet  = new Set(foundIds);
  const revealSet = new Set(revealIds);

  const gridPath  = path(gridLines(cols, rows)) ?? "";
  const cellPath  = path(cellPolygon(activeCol, activeRow, cols, rows)) ?? "";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      style={{ display: "block", userSelect: "none" }}
      aria-label="World map with grid"
    >
      {/* Ocean */}
      <rect width={width} height={height} fill="#c8dff0" rx={10} />

      {/* Countries */}
      {features.map(({ id, d }, i) => {
        const isFound    = foundSet.has(id);
        const isRevealed = revealSet.has(id);
        return (
          <path
            key={`${id}-${i}`}
            d={d}
            fill={isFound ? "#22c55e" : isRevealed ? "#f59e0b" : "#e8ead6"}
            stroke="#c8dff0"
            strokeWidth={0.4}
          />
        );
      })}

      {/* Grid lines */}
      <path d={gridPath} fill="none" stroke="rgba(20,93,245,0.15)" strokeWidth={0.6} />

      {/* Active cell */}
      <path d={cellPath} fill="rgba(20,93,245,0.15)" stroke="#145df5" strokeWidth={1.5} />
    </svg>
  );
}

function makeProjection(width: number, height: number) {
  // Equirectangular: degrees map linearly to pixels, so grid cells align with country bbox detection.
  // 360° → width, 180° → height/2*2 = height (with padding)
  const scale = Math.min(width / (2 * Math.PI), height / Math.PI);
  return d3geo.geoEquirectangular()
    .scale(scale)
    .translate([width / 2, height / 2])
    .precision(0.1);
}
