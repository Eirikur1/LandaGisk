"use client";

import { useRef, useEffect, useState, type CSSProperties } from "react";

type RetroGridProps = {
  angle?: number;
  cellSize?: number;
  opacity?: number;
  lineColor?: string;
  animationSpeed?: number;
  perspective?: number;
  fadeHeight?: number;
  fadeColor?: string;
  animationDirection?: "horizontal" | "vertical" | "both";
  className?: string;
};

export default function RetroGrid({
  angle = 65,
  cellSize = 60,
  opacity = 0.18,
  lineColor = "#3ecfaa",
  animationSpeed = 6,
  perspective = 300,
  fadeHeight = 85,
  fadeColor = "#09090f",
  animationDirection = "both",
  className = "",
}: RetroGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const name = `gridMove-${Date.now()}`;
    let kf = "";

    if (animationDirection === "horizontal") {
      kf = `@keyframes ${name} { from { background-position: 0 0; } to { background-position: ${cellSize}px 0; } }`;
    } else if (animationDirection === "vertical") {
      kf = `@keyframes ${name} { from { background-position: 0 0; } to { background-position: 0 ${cellSize}px; } }`;
    } else {
      kf = `@keyframes ${name} { from { background-position: 0 0; } to { background-position: ${cellSize}px ${cellSize}px; } }`;
    }

    const style = document.createElement("style");
    style.innerHTML = kf;
    document.head.appendChild(style);

    if (gridRef.current) {
      gridRef.current.style.animation = `${name} ${animationSpeed}s linear infinite`;
    }

    return () => {
      try {
        document.head.removeChild(style);
      } catch {}
    };
  }, [cellSize, animationSpeed, animationDirection]);

  const containerStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    overflow: "hidden",
    pointerEvents: "none",
    perspective: `${perspective}px`,
    opacity,
  };

  const wrapperStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    transform: `rotateX(${angle}deg)`,
    transformOrigin: "bottom center",
    width: "100%",
    height: "150%",
  };

  const gridStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    backgroundImage: `
      linear-gradient(to right, ${lineColor} 1px, transparent 1px),
      linear-gradient(to bottom, ${lineColor} 1px, transparent 1px)
    `,
    backgroundSize: `${cellSize}px ${cellSize}px`,
    width: "100%",
    height: "100%",
  };

  const overlayStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    background: `linear-gradient(to top, ${fadeColor} 0%, transparent ${fadeHeight}%)`,
    pointerEvents: "none",
  };

  return (
    <div style={containerStyle} className={className}>
      <div style={wrapperStyle}>
        <div style={gridStyle} ref={gridRef} />
      </div>
      <div style={overlayStyle} />
    </div>
  );
}
