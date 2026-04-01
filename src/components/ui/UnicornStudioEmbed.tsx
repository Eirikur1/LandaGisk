"use client";

import { useEffect, useRef } from "react";

interface Props {
  projectId: string;
  width?: number;
  height?: number;
  className?: string;
}

export default function UnicornStudioEmbed({ projectId, width = 1440, height = 900, className }: Props) {
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    const us = (window as any).UnicornStudio;
    if (us?.init) {
      us.init();
      return;
    }

    (window as any).UnicornStudio = { isInitialized: false };
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.1.5/dist/unicornStudio.umd.js";
    script.onload = () => { ((window as any).UnicornStudio as any).init(); };
    (document.head || document.body).appendChild(script);
  }, []);

  return (
    <div
      data-us-project={projectId}
      style={{ width, height }}
      className={className}
    />
  );
}
