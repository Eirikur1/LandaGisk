"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

/** adamsky/globe Earth template (ASCII texture source). */
const EARTH_TEMPLATE_TXT =
  "https://raw.githubusercontent.com/adamsky/globe/master/globe/textures/earth.txt";

/** Page cream — keep in sync with `--color-background` in globals.css */
const BG_HEX = "#f2f0e6";
const BG_RGB = { r: 0xf2, g: 0xf0, b: 0xe6 };

const ASCII_FPS = 12;
const MIN_ASCII_MS = 1000 / ASCII_FPS;

/** Build a globe texture from adamsky/globe's earth.txt template. */
function landOceanContrastTexture(
  THREE: typeof import("three"),
  asciiText: string
) {
  const rows = asciiText
    .split("\n")
    .map((line) => line.replace(/\r/g, ""))
    .filter((line) => line.length > 0);
  if (rows.length === 0) return null;
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const im = ctx.createImageData(w, h);
  const d = im.data;
  for (let y = 0; y < h; y++) {
    const row = rows[y] ?? "";
    for (let x = 0; x < w; x++) {
      const ch = row[x] ?? ".";
      const o = (y * w + x) * 4;
      let v = 0;

      if (ch === "." || ch === " ") {
        d[o] = BG_RGB.r;
        d[o + 1] = BG_RGB.g;
        d[o + 2] = BG_RGB.b;
        d[o + 3] = 255;
        continue;
      } else if (ch === "@") {
        v = 18;
      } else if (ch === "g") {
        v = 44;
      } else if (ch === "H") {
        v = 70;
      } else {
        v = 56;
      }

      d[o] = v;
      d[o + 1] = v;
      d[o + 2] = v;
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(im, 0, 0);
  const out = new THREE.CanvasTexture(canvas);
  out.colorSpace = THREE.SRGBColorSpace;
  out.magFilter = THREE.NearestFilter;
  out.minFilter = THREE.NearestFilter;
  out.needsUpdate = true;
  return out;
}

const CHAR_RAMP = " .'`^,:;+=xX$#%@";

/**
 * Custom ASCII: ocean = space, coastline = strong glyph, interior = sparse texture.
 */
function rasterToAscii(
  data: Uint8ClampedArray,
  cols: number,
  rows: number
): string {
  const n = cols * rows;
  const gray = new Float32Array(n);
  const land = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const r8 = data[o];
    const g8 = data[o + 1];
    const b8 = data[o + 2];
    const r = r8 / 255;
    const g = g8 / 255;
    const b = b8 / 255;

    // Ocean/background detection should be based on "how close to paper color",
    // not blue-vs-red, because the texture is preprocessed to grayscale.
    const bgDist =
      (Math.abs(r8 - BG_RGB.r) +
        Math.abs(g8 - BG_RGB.g) +
        Math.abs(b8 - BG_RGB.b)) /
      3;
    const isOcean = bgDist < 16;

    land[i] = isOcean ? 0 : 1;
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
  const L = CHAR_RAMP.length - 1;
  const lines: string[] = [];
  for (let y = 0; y < rows; y++) {
    let row = "";
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      if (!land[i]) {
        row += " ";
        continue;
      }

      const leftOcean = x === 0 || !land[i - 1];
      const rightOcean = x === cols - 1 || !land[i + 1];
      const upOcean = y === 0 || !land[i - cols];
      const downOcean = y === rows - 1 || !land[i + cols];
      const coastline = leftOcean || rightOcean || upOcean || downOcean;
      if (coastline) {
        row += "@";
        continue;
      }

      // Sparse interior so continents read as shape, not dense blobs.
      if ((x + y) % 3 !== 0) {
        row += " ";
        continue;
      }
      const g = gray[i];
      const idx = Math.round((1 - g) * (L - 2));
      row += CHAR_RAMP[Math.max(1, Math.min(L - 1, idx + 1))]!;
    }
    lines.push(row);
  }
  return lines.join("\n");
}

const GLOBE_MASK =
  "radial-gradient(ellipse 56% 58% at 48% 42%, #000 0%, #000 76%, rgba(0,0,0,0.82) 82%, rgba(0,0,0,0.42) 88%, transparent 96%)";

function gridDimensions(cssW: number, cssH: number) {
  const cols = Math.min(
    300,
    Math.max(120, Math.floor(cssW / 4.4))
  );
  const rows = Math.max(
    72,
    Math.min(260, Math.floor((cols * cssH) / (cssW * 1.5)))
  );
  return { cols, rows };
}

export default function AsciiArt() {
  const dishRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dish = dishRef.current;
    const mount = mountRef.current;
    if (!dish || !mount) return;

    let disposed = false;
    let raf = 0;
    let resizeRaf = 0;
    let renderer: import("three").WebGLRenderer | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let geometry: import("three").SphereGeometry | null = null;
    let material: import("three").MeshBasicMaterial | null = null;
    let lastW = 0;
    let lastH = 0;
    let camera: import("three").PerspectiveCamera | null = null;
    let lastAsciiTime = performance.now();

    let sampleCanvas: HTMLCanvasElement | null = null;
    let sampleCtx: CanvasRenderingContext2D | null = null;
    let cols = 0;
    let rows = 0;

    const pre = document.createElement("pre");
    pre.style.cssText = [
      "margin:0",
      "padding:0",
      "width:100%",
      "height:100%",
      "overflow:hidden",
      "white-space:pre",
      "pointer-events:none",
      "color:var(--color-blue)",
      "opacity:0.94",
      "font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace",
      "line-height:1.05",
      "letter-spacing:0",
      "box-sizing:border-box",
      "filter:blur(0.22px)",
    ].join(";");
    pre.style.webkitMaskImage = GLOBE_MASK;
    pre.style.maskImage = GLOBE_MASK;
    pre.style.webkitMaskRepeat = "no-repeat";
    pre.style.maskRepeat = "no-repeat";
    pre.style.webkitMaskSize = "100% 100%";
    pre.style.maskSize = "100% 100%";

    const readSize = () => {
      const rect = dish.getBoundingClientRect();
      return {
        w: Math.max(1, Math.round(rect.width)),
        h: Math.max(1, Math.round(rect.height)),
      };
    };

    const applySize = (nw: number, nh: number) => {
      if (!renderer || !camera) return;
      if (nw === lastW && nh === lastH) return;
      lastW = nw;
      lastH = nh;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh, false);

      const g = gridDimensions(nw, nh);
      cols = g.cols;
      rows = g.rows;
      if (!sampleCanvas) {
        sampleCanvas = document.createElement("canvas");
        sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
      }
      sampleCanvas.width = cols;
      sampleCanvas.height = rows;
      const fs = Math.min(9.5, Math.max(4.4, nw / cols / 0.62));
      pre.style.fontSize = `${fs}px`;
    };

    (async () => {
      const THREE = await import("three");

      if (disposed || !dishRef.current || !mountRef.current) return;

      let { w, h } = readSize();

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(BG_HEX);

      camera = new THREE.PerspectiveCamera(53, w / h, 0.1, 100);
      camera.position.set(0, 0.24, 2.05);

      geometry = new THREE.SphereGeometry(0.96, 128, 128);
      material = new THREE.MeshBasicMaterial({ color: 0x2b5ceb });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.rotation.x = 0.34;
      sphere.rotation.y = 4.6;
      sphere.position.set(0.26, -0.07, 0);
      scene.add(sphere);
      camera.lookAt(0.26, -0.01, 0);

      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(1);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.NoToneMapping;

      applySize(w, h);

      const glCanvas = renderer.domElement;
      glCanvas.style.cssText =
        "position:absolute;inset:0;width:100%;height:100%;opacity:0;pointer-events:none";

      mount.appendChild(glCanvas);
      mount.appendChild(pre);

      void fetch(EARTH_TEMPLATE_TXT)
        .then((r) => r.text())
        .then((txt) => {
          if (disposed || !material) return;
          const processed = landOceanContrastTexture(THREE, txt);
          if (!processed) return;
          processed.anisotropy = Math.min(
            8,
            renderer!.capabilities.getMaxAnisotropy()
          );
          material.map = processed;
          material.color.set(0xffffff);
          material.needsUpdate = true;
        })
        .catch(() => {
          /* keep fallback base color if template fails */
        });

      const ROT_PER_SEC = 0.04;
      const tick = () => {
        if (disposed) return;
        raf = requestAnimationFrame(tick);
        const now = performance.now();
        if (now - lastAsciiTime < MIN_ASCII_MS) return;
        const dt = (now - lastAsciiTime) / 1000;
        lastAsciiTime = now;
        sphere.rotation.y += ROT_PER_SEC * Math.min(dt, 0.12);

        renderer!.render(scene, camera!);
        if (!sampleCanvas || !sampleCtx || cols < 8 || rows < 8) return;
        sampleCtx.drawImage(glCanvas, 0, 0, cols, rows);
        const img = sampleCtx.getImageData(0, 0, cols, rows);
        pre.textContent = rasterToAscii(img.data, cols, rows);
      };
      raf = requestAnimationFrame(tick);

      const onResizeObserved = () => {
        cancelAnimationFrame(resizeRaf);
        resizeRaf = requestAnimationFrame(() => {
          if (disposed) return;
          const { w: nw, h: nh } = readSize();
          applySize(nw, nh);
        });
      };

      resizeObserver = new ResizeObserver(onResizeObserved);
      resizeObserver.observe(dish);
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(resizeRaf);
      resizeObserver?.disconnect();

      if (renderer && mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      if (mount.contains(pre)) mount.removeChild(pre);

      material?.map?.dispose();
      material?.dispose();
      geometry?.dispose();
      renderer?.dispose();
      renderer = null;
      geometry = null;
      material = null;
      sampleCanvas = null;
      sampleCtx = null;
    };
  }, []);

  return (
    <div
      id="ascii-art-root"
      className="pointer-events-none absolute inset-y-0 right-0 select-none overflow-visible"
      style={{
        width: "min(96vw, 1680px)",
      }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-y-0 left-0 z-10"
        style={{
          width: "min(56vw, 24rem)",
          background:
            "linear-gradient(to right, var(--color-background) 0%, var(--color-background) 28%, transparent 100%)",
        }}
      />
      <motion.div
        ref={dishRef}
        className="absolute overflow-hidden rounded-full will-change-transform"
        style={{
          width: "min(120vmin, min(118dvh, 1160px))",
          height: "min(120vmin, min(118dvh, 1160px))",
          right: "max(-17vw, -9.5rem)",
          bottom: "max(-26dvh, -11rem)",
        }}
        initial={{ opacity: 0, scale: 0.95, x: "22vw" }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{
          duration: 1.2,
          delay: 0.14,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <div ref={mountRef} className="absolute inset-0" />
      </motion.div>
    </div>
  );
}
