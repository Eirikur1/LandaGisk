"use client";

import { useEffect, useRef, useState } from "react";
import * as d3geo from "d3-geo";
import { ALL_COUNTRIES, type WorldCountryEntry } from "./worldCountries";

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
  // path is stable (recreated same way each render), but we only need this once
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cell rectangle in pixel space
  const cellW = 360 / cols;
  const cellH = 180 / rows;
  const cellWestDeg  = -180 + activeCol * cellW;
  const cellEastDeg  = cellWestDeg + cellW;
  const cellNorthDeg = 90 - activeRow * cellH;
  const cellSouthDeg = cellNorthDeg - cellH;

  const [px0, py0] = proj([cellWestDeg, cellNorthDeg]) ?? [0, 0];
  const [px1, py1] = proj([cellEastDeg, cellSouthDeg]) ?? [0, 0];
  const rx = Math.min(px0, px1);
  const ry = Math.min(py0, py1);
  const rw = Math.abs(px1 - px0);
  const rh = Math.abs(py1 - py0);

  // Grid lines
  const vLines: [number, number, number, number][] = [];
  for (let c = 0; c <= cols; c++) {
    const lon = -180 + c * cellW;
    const [x0, y0] = proj([lon, 85]) ?? [0, 0];
    const [x1, y1] = proj([lon, -85]) ?? [0, 0];
    vLines.push([x0, y0, x1, y1]);
  }
  const hLines: [number, number, number, number][] = [];
  for (let r = 0; r <= rows; r++) {
    const lat = 90 - r * cellH;
    const [x0, y0] = proj([-180, lat]) ?? [0, 0];
    const [x1, y1] = proj([180, lat]) ?? [0, 0];
    hLines.push([x0, y0, x1, y1]);
  }

  const foundSet = new Set(foundIds);
  const revealSet = new Set(revealIds);

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
        const isFound   = foundSet.has(id);
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
      {vLines.map(([x0, y0, x1, y1], i) => (
        <line key={`v${i}`} x1={x0} y1={y0} x2={x1} y2={y1} stroke="rgba(20,93,245,0.15)" strokeWidth={0.6} />
      ))}
      {hLines.map(([x0, y0, x1, y1], i) => (
        <line key={`h${i}`} x1={x0} y1={y0} x2={x1} y2={y1} stroke="rgba(20,93,245,0.15)" strokeWidth={0.6} />
      ))}

      {/* Active cell */}
      <rect
        x={rx} y={ry} width={rw} height={rh}
        fill="rgba(20,93,245,0.15)"
        stroke="#145df5"
        strokeWidth={1.5}
        rx={1}
      />
    </svg>
  );
}

function makeProjection(width: number, height: number) {
  return d3geo.geoNaturalEarth1()
    .scale(width / 6.3)
    .translate([width / 2, height / 2]);
}
