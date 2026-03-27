"use client";

import {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
  type CSSProperties,
} from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PixelHoverGridProps {
  gridSize?: number;
  colors?: string[];
  backgroundColor?: string;
  animationDuration?: number;
  maxOpacity?: number;
  borderColor?: string;
  className?: string;
  style?: CSSProperties;
}

export default function PixelHoverGrid({
  gridSize = 22,
  colors = ["#58cc02", "#1cb0f6", "#ce82ff", "#ffc800", "#ff9600"],
  backgroundColor = "transparent",
  animationDuration = 0.75,
  maxOpacity = 0.85,
  borderColor = "#e5e5e5",
  className = "",
  style,
}: PixelHoverGridProps) {
  const [animatingPixels, setAnimatingPixels] = useState<Set<string>>(
    new Set()
  );
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [inside, setInside] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      const r = containerRef.current!.getBoundingClientRect();
      setDimensions({ width: r.width, height: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Calculate columns and rows to fill the container with square cells
  const cellSize = Math.max(
    Math.floor(Math.min(dimensions.width, dimensions.height) / gridSize),
    10
  );
  const cols = dimensions.width > 0 ? Math.ceil(dimensions.width / cellSize) : gridSize;
  const rows = dimensions.height > 0 ? Math.ceil(dimensions.height / cellSize) : gridSize;

  const pixels = useMemo(() => {
    const arr = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        arr.push({ id: `${r}-${c}`, row: r, col: c });
      }
    }
    return arr;
  }, [rows, cols]);

  const getColor = useCallback(
    (id: string) => {
      const hash = id.split("-").reduce((a, v) => a + parseInt(v), 0);
      return colors[hash % colors.length];
    },
    [colors]
  );

  const handlePixelEnter = useCallback((id: string) => {
    setAnimatingPixels((prev) => new Set(prev).add(id));
  }, []);

  const handleDone = useCallback((id: string) => {
    setAnimatingPixels((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      setCursorPos({ x: e.clientX - r.left, y: e.clientY - r.top });
    },
    []
  );

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor,
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
        overflow: "hidden",
        cursor: "none",
        userSelect: "none",
        ...style,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setInside(true)}
      onMouseLeave={() => setInside(false)}
    >
      {pixels.map((pixel) => (
        <div
          key={pixel.id}
          style={{
            width: cellSize,
            height: cellSize,
            position: "relative",
            border: `1px solid ${borderColor}`,
          }}
          onMouseEnter={() => handlePixelEnter(pixel.id)}
        >
          <AnimatePresence>
            {animatingPixels.has(pixel.id) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{
                  opacity: [0, maxOpacity, maxOpacity * 0.6, 0],
                  scale: [0.7, 1, 1.1, 1.2],
                }}
                exit={{ opacity: 0, scale: 1.3 }}
                transition={{
                  duration: animationDuration,
                  ease: "easeOut",
                  times: [0, 0.25, 0.65, 1],
                }}
                onAnimationComplete={() => handleDone(pixel.id)}
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: getColor(pixel.id),
                  borderRadius: 3,
                }}
              />
            )}
          </AnimatePresence>
        </div>
      ))}

      {/* Custom dot cursor */}
      <AnimatePresence>
        {inside && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              width: 14,
              height: 14,
              borderRadius: "50%",
              backgroundColor: "#3c3c3c",
              pointerEvents: "none",
              zIndex: 10,
              left: cursorPos.x - 7,
              top: cursorPos.y - 7,
              boxShadow: "0 0 0 3px white, 0 0 0 5px #3c3c3c",
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
